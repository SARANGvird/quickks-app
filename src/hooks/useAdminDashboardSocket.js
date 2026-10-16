// src/hooks/useAdminDashboardSocket.js - v7.0 PUNE SENIOR FINAL
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-toastify';
import { TokenManager, API_BASE_URL, WS_URL, SOCKJS_BASE } from '../api/api';

const CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  HEARTBEAT: 10000,
  TIMEOUT: 15000,
  MAX_ALERTS: 50,
};

export const TOPICS = {
  ADMIN_ALERTS: '/topic/admin/alerts',
  ADMIN_STATS: '/topic/admin/stats',
  ADMIN_DASHBOARD: '/topic/admin/dashboard',
  BOOKINGS: '/topic/bookings',
  PROVIDERS: '/topic/providers',
  USERS: '/topic/users',
};

export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  FAILED: 'failed',
  AUTH_ERROR: 'auth_error',
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const getToken = () => TokenManager.getAccessToken();

const shouldRefreshToken = (token) => {
  if (!token) return true;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 - Date.now() < 60000;
  } catch { return true; }
};

export default function useAdminDashboardSocket(options = {}) {
  const {
    enableRealTime = true,
    autoConnect = true,
    maxAlerts = CONFIG.MAX_ALERTS,
    onAlert,
    onStatsUpdate,
    onConnectionChange,
    debug = import.meta.env.DEV,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);

  const clientRef = useRef(null);
  const subsRef = useRef(new Map());
  const mountedRef = useRef(true);
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef(null);
  const heartbeatTimer = useRef(null);
  const isConnectingRef = useRef(false);

  const callbacksRef = useRef({ onAlert, onStatsUpdate, onConnectionChange });
  useEffect(() => {
    callbacksRef.current = { onAlert, onStatsUpdate, onConnectionChange };
  }, [onAlert, onStatsUpdate, onConnectionChange]);

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
    reconnectTimer.current = null;
    heartbeatTimer.current = null;
    isConnectingRef.current = false;
  }, []);

  const handleAlert = useCallback((data) => {
    if (!mountedRef.current) return;
    const alert = { id: data.id || genId(), timestamp: new Date().toISOString(), read: false,...data };
    setAlerts(prev => {
      if (prev.some(a => a.id === alert.id)) return prev;
      return [alert,...prev].slice(0, maxAlerts);
    });
    setLastUpdated(new Date());
    callbacksRef.current.onAlert?.(alert);

    // Toast only for critical
    if (data.severity === 'critical') {
      toast.error(`🔴 ${data.title || data.message}`, { autoClose: false, toastId: `crit-${alert.id}` });
    }
  }, [maxAlerts]);

  const subscribe = useCallback((client) => {
    if (!client?.connected) return;

    // Clear old subs
    subsRef.current.forEach(s => { try { s.unsubscribe(); } catch {} });
    subsRef.current.clear();

    const configs = [
      { topic: TOPICS.ADMIN_DASHBOARD, handler: (d) => { setLastUpdated(new Date()); callbacksRef.current.onStatsUpdate?.(d); } },
      { topic: TOPICS.ADMIN_STATS, handler: (d) => { setLastUpdated(new Date()); callbacksRef.current.onStatsUpdate?.(d); } },
      { topic: TOPICS.ADMIN_ALERTS, handler: handleAlert },
    ];

    configs.forEach(({ topic, handler }) => {
      try {
        const sub = client.subscribe(topic, (msg) => {
          try { handler(JSON.parse(msg.body)); } catch (e) { console.error(`Parse ${topic}`, e); }
        });
        subsRef.current.set(topic, sub);
        debug && console.log(`✅ Sub ${topic}`);
      } catch (e) { console.error(`Sub fail ${topic}`, e); }
    });
  }, [handleAlert, debug]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current ||!enableRealTime) return;
    if (reconnectAttempts.current >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      setConnectionState(CONNECTION_STATE.FAILED);
      setError('Realtime failed. Refresh page.');
      setIsConnecting(false);
      callbacksRef.current.onConnectionChange?.({ connected: false, state: CONNECTION_STATE.FAILED });
      return;
    }
    reconnectAttempts.current++;
    const delay = Math.min(CONFIG.BASE_DELAY * Math.pow(1.6, reconnectAttempts.current - 1), CONFIG.MAX_DELAY);
    debug && console.log(`🔄 Reconnect ${reconnectAttempts.current} in ${delay}ms`);

    setConnectionState(CONNECTION_STATE.RECONNECTING);
    cleanup();
    reconnectTimer.current = setTimeout(() => {
      if (mountedRef.current &&!isConnected &&!isConnectingRef.current) connect();
    }, delay);
  }, [enableRealTime, debug, cleanup, isConnected]);

  const connect = useCallback(() => {
    if (!enableRealTime) return;
    if (isConnectingRef.current || clientRef.current?.connected) return;

    const token = getToken();
    if (!token) {
      setConnectionState(CONNECTION_STATE.AUTH_ERROR);
      setError('Auth required for realtime');
      return;
    }

    if (shouldRefreshToken(token)) {
      debug && console.log('Token expiring soon');
    }

    isConnectingRef.current = true;
    setIsConnecting(true);
    setError(null);
    setConnectionState(CONNECTION_STATE.CONNECTING);

    try {
      // SENIOR FIX: SockJS needs HTTP URL, NOT WSS
      // And SockJS 2nd param is NOT options - it's reserved!
      // Wrong: new SockJS(url, null, {transports:[]}) -> causes [object Object] bug
      // Correct: new SockJS(url)
      const httpUrl = `${SOCKJS_BASE}/ws`;
      debug && console.log('🌐 SockJS URL (HTTP):', httpUrl);

      const socket = new SockJS(httpUrl); // FIXED: Only URL param

      const client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Client-Type': 'admin-dashboard',
          'X-Connection-Id': `admin-${genId()}`,
        },
        reconnectDelay: 0, // We handle reconnect
        heartbeatIncoming: CONFIG.HEARTBEAT,
        heartbeatOutgoing: CONFIG.HEARTBEAT,
        debug: (str) => {
          if (debug &&!str.includes('PING') &&!str.includes('PONG')) {
            // console.log('STOMP:', str);
          }
        },
      });

      client.onConnect = () => {
        if (!mountedRef.current) return;
        console.log('✅ WS Connected');
        isConnectingRef.current = false;
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionState(CONNECTION_STATE.CONNECTED);
        setLastUpdated(new Date());
        setError(null);
        reconnectAttempts.current = 0;
        cleanup();

        subscribe(client);

        // Heartbeat publish
        heartbeatTimer.current = setInterval(() => {
          if (client.connected) {
            try { client.publish({ destination: '/app/heartbeat', body: JSON.stringify({ ts: Date.now() }) }); } catch {}
          }
        }, CONFIG.HEARTBEAT);

        callbacksRef.current.onConnectionChange?.({ connected: true, state: CONNECTION_STATE.CONNECTED });
        toast.success('Live connected', { autoClose: 2000, toastId: 'ws-ok' });
      };

      client.onStompError = (frame) => {
        if (!mountedRef.current) return;
        const msg = frame.headers?.message || 'STOMP error';
        const isAuth = /auth|jwt|unauthorized|invalid token/i.test(msg);

        console.error('STOMP error', msg);
        isConnectingRef.current = false;
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionState(isAuth? CONNECTION_STATE.AUTH_ERROR : CONNECTION_STATE.ERROR);
        setError(isAuth? 'Auth failed for realtime' : msg);

        if (isAuth) {
          toast.error('Session expired for live updates', { toastId: 'ws-auth' });
        } else {
          scheduleReconnect();
        }
      };

      client.onWebSocketError = () => {
        if (!mountedRef.current) return;
        isConnectingRef.current = false;
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionState(CONNECTION_STATE.ERROR);
        scheduleReconnect();
      };

      client.onDisconnect = () => {
        if (!mountedRef.current) return;
        if (heartbeatTimer.current) clearInterval(heartbeatTimer.current);
        isConnectingRef.current = false;
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionState(CONNECTION_STATE.DISCONNECTED);
        scheduleReconnect();
      };

      client.activate();
      clientRef.current = client;

      // Connection timeout
      setTimeout(() => {
        if (isConnectingRef.current &&!client.connected) {
          try { client.deactivate(); } catch {}
          scheduleReconnect();
        }
      }, CONFIG.TIMEOUT);

    } catch (e) {
      console.error('WS create fail', e);
      isConnectingRef.current = false;
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionState(CONNECTION_STATE.ERROR);
      setError(e.message);
      scheduleReconnect();
    }
  }, [enableRealTime, debug, subscribe, scheduleReconnect, cleanup]);

  const disconnect = useCallback(() => {
    cleanup();
    subsRef.current.forEach(s => { try { s.unsubscribe(); } catch {} });
    subsRef.current.clear();
    if (clientRef.current) { try { clientRef.current.deactivate(); } catch {} }
    clientRef.current = null;
    isConnectingRef.current = false;
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionState(CONNECTION_STATE.DISCONNECTED);
    reconnectAttempts.current = 0;
  }, [cleanup]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => mountedRef.current && enableRealTime && connect(), 500);
  }, [disconnect, connect, enableRealTime]);

  // Lifecycle
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; disconnect(); };
  }, [disconnect]);

  useEffect(() => {
    if (!enableRealTime ||!autoConnect) return;
    const token = getToken();
    if (token) {
      const t = setTimeout(() => { if (!isConnectingRef.current &&!clientRef.current?.connected) connect(); }, 300);
      return () => clearTimeout(t);
    }
  }, [enableRealTime, autoConnect, connect]);

  // Token change listener
  useEffect(() => {
    const handler = () => { if (enableRealTime && getToken()) reconnect(); };
    window.addEventListener('token-refreshed', handler);
    window.addEventListener('auth:login', handler);
    return () => {
      window.removeEventListener('token-refreshed', handler);
      window.removeEventListener('auth:login', handler);
    };
  }, [enableRealTime, reconnect]);

  return {
    connected: isConnected,
    connecting: isConnecting,
    connectionState,
    error,
    lastUpdated,
    alerts,
    unreadCount: useMemo(() => alerts.filter(a =>!a.read).length, [alerts]),
    markAlertAsRead: useCallback((id) => setAlerts(p => p.map(a => a.id === id? {...a, read: true } : a)), []),
    markAllAlertsAsRead: useCallback(() => setAlerts(p => p.map(a => ({...a, read: true }))), []),
    clearAlerts: useCallback(() => setAlerts([]), []),
    connect,
    disconnect,
    reconnect,
    isHealthy: isConnected &&!error,
  };
}