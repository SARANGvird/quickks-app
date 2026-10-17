// src/contexts/WebSocketProvider.js - v54 FINAL PROD - SockJS + STOMP - 【entity-Amazon¦canonical_name=Amazon】
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import tokenManager from '../utils/tokenManager';

export const CONNECTION_STATUS = {
  CONNECTING: 'connecting', CONNECTED: 'connected', DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting', ERROR: 'error', FAILED: 'failed', AUTH_ERROR: 'auth_error'
};

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    return {
      isConnected: false,
      connectionStatus: CONNECTION_STATUS.DISCONNECTED,
      isConnecting: false,
      sendMessage: () => false,
      isReady: false,
      stompClient: null,
      connect: () => {}, disconnect: () => {}, reconnect: () => {},
      subscribe: () => null,
    };
  }
  return ctx;
};

export const useWebSocketSubscription = (topic, handler) => {
  const { stompClient, isConnected } = useWebSocket();
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!topic || !isConnected || !stompClient?.connected) return;
    try {
      const sub = stompClient.subscribe(topic, (msg) => {
        try { handlerRef.current(JSON.parse(msg.body)); }
        catch { handlerRef.current(msg.body); }
      });
      return () => { try { sub.unsubscribe(); } catch {} };
    } catch (e) {
      console.warn(`[WS] Subscribe failed ${topic}`, e);
    }
  }, [topic, isConnected, stompClient]);
};

const getWsBaseUrl = () => {
  const viteWs = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_WS_URL;
  if (viteWs) return viteWs.replace(/\/+$/, "").replace(/\/quickks\/ws/, "/ws");
  const base = (import.meta.env.VITE_API_BASE_URL || "https://api.quickks.in").replace(/\/+$/, "").replace(/\/api\/v1/, "").replace(/\/api/, "");
  return `${base}/ws`;
};

const getSockBaseUrl = () => {
  const base = (import.meta.env.VITE_API_BASE_URL || "https://api.quickks.in").replace(/\/+$/, "").replace(/\/api\/v1/, "").replace(/\/api/, "");
  // SockJS needs http/https, not ws
  return `${base}/ws`;
};

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const clientRef = useRef(null);
  const reconnectTimer = useRef(null);
  const attemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const subsRef = useRef([]);
  const [status, setStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const clearSubs = useCallback(() => {
    subsRef.current.forEach(s => { try { s.unsubscribe(); } catch {} });
    subsRef.current = [];
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    clearSubs();
    if (clientRef.current) {
      try { clientRef.current.deactivate(); } catch {}
      clientRef.current = null;
    }
    if (mountedRef.current) {
      setIsConnected(false);
      setIsConnecting(false);
      setStatus(CONNECTION_STATUS.DISCONNECTED);
    }
  }, [clearSubs]);

  const connectInternal = useCallback(() => {
    if (!mountedRef.current || clientRef.current?.active) return;
    const token = tokenManager.getAccessToken() || localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token || !isAuthenticated) {
      setStatus(CONNECTION_STATUS.AUTH_ERROR);
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setStatus(attemptsRef.current > 0 ? CONNECTION_STATUS.RECONNECTING : CONNECTION_STATUS.CONNECTING);

    const sockUrl = getSockBaseUrl();
    const wsUrl = getWsBaseUrl();
    console.log('🌐 WS Connecting:', sockUrl);

    const client = new Client({
      // ✅ SockJS factory - NO token in URL - secure header only
      webSocketFactory: () => new SockJS(sockUrl, null, {
        transports: ['websocket', 'xhr-streaming'],
      }),
      // ✅ Fallback brokerURL for native (if SockJS fails)
      brokerURL: wsUrl,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        token: token,
      },
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 0,
      debug: () => {},

      onConnect: () => {
        if (!mountedRef.current) return;
        attemptsRef.current = 0;
        setIsConnected(true);
        setIsConnecting(false);
        setStatus(CONNECTION_STATUS.CONNECTED);
        console.log('✅ WS CONNECTED', sockUrl);
      },

      onStompError: (frame) => {
        if (!mountedRef.current) return;
        const msg = (frame.headers?.message || '').toLowerCase();
        console.error('❌ STOMP Error:', msg, frame.body);
        if (msg.includes('auth') || msg.includes('jwt') || msg.includes('unauthorized') || msg.includes('expired')) {
          setStatus(CONNECTION_STATUS.AUTH_ERROR);
          setIsConnecting(false);
          setIsConnected(false);
        } else if (attemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(1.5, attemptsRef.current), 10000);
          attemptsRef.current++;
          reconnectTimer.current = setTimeout(() => connectInternal(), delay);
          setStatus(CONNECTION_STATUS.RECONNECTING);
        } else {
          setStatus(CONNECTION_STATUS.FAILED);
          setIsConnecting(false);
          setIsConnected(false);
        }
      },

      onWebSocketClose: () => {
        if (!mountedRef.current) return;
        clearSubs();
        setIsConnected(false);
        setIsConnecting(false);
        const authStatus = status;
        if (authStatus !== CONNECTION_STATUS.AUTH_ERROR && attemptsRef.current < 5 && isAuthenticated) {
          const delay = Math.min(1000 * Math.pow(1.5, attemptsRef.current), 10000);
          attemptsRef.current++;
          reconnectTimer.current = setTimeout(() => connectInternal(), delay);
          setStatus(CONNECTION_STATUS.RECONNECTING);
        } else if (authStatus !== CONNECTION_STATUS.AUTH_ERROR) {
          setStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      },
    });

    clientRef.current = client;
    client.activate();
  }, [isAuthenticated, clearSubs, status]);

  const connect = useCallback(() => {
    attemptsRef.current = 0;
    connectInternal();
  }, [connectInternal]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      attemptsRef.current = 0;
      connectInternal();
    }, 500);
  }, [disconnect, connectInternal]);

  useEffect(() => {
    mountedRef.current = true;
    if (isAuthenticated) {
      const t = setTimeout(() => connectInternal(), 1500);
      return () => { clearTimeout(t); mountedRef.current = false; disconnect(); };
    } else {
      disconnect();
    }
    return () => { mountedRef.current = false; disconnect(); };
  }, [isAuthenticated, connectInternal, disconnect]);

  const sendMessage = useCallback((dest, body) => {
    if (!clientRef.current?.connected) return false;
    try {
      clientRef.current.publish({
        destination: dest.startsWith('/app') ? dest : `/app${dest.startsWith('/') ? dest : `/${dest}`}`,
        body: JSON.stringify(body || {}),
      });
      return true;
    } catch { return false; }
  }, []);

  const subscribe = useCallback((topic, cb) => {
    if (!clientRef.current?.connected) return null;
    try {
      const sub = clientRef.current.subscribe(topic, (msg) => {
        try { cb(JSON.parse(msg.body), msg); }
        catch { cb(msg.body, msg); }
      });
      subsRef.current.push(sub);
      return sub;
    } catch { return null; }
  }, []);

  const value = useMemo(() => ({
    isConnected,
    isConnecting,
    connectionStatus: status,
    stompClient: clientRef.current,
    isReady: isConnected && status === CONNECTION_STATUS.CONNECTED,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    subscribe,
  }), [isConnected, isConnecting, status, connect, disconnect, reconnect, sendMessage, subscribe]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export default WebSocketProvider;