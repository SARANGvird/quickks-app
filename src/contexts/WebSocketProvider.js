// src/contexts/WebSocketProvider.js - v10.0 FINAL - PRODUCTION
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
      connect: () => {}, disconnect: () => {} 
    };
  }
  return ctx;
};

// ✅ CRITICAL - This was missing and causing webpack error
export const useWebSocketSubscription = (topic, handler) => {
  const { stompClient, isConnected } = useWebSocket();
  const subRef = useRef(null);

  useEffect(() => {
    if (!topic || !handler || !isConnected || !stompClient?.connected) return;
    try {
      const sub = stompClient.subscribe(topic, (msg) => {
        try { handler(JSON.parse(msg.body)); } 
        catch { handler(msg.body); }
      });
      subRef.current = sub;
      return () => { try { sub.unsubscribe(); } catch {} };
    } catch (e) {
      console.warn(`[WS] Subscribe failed ${topic}`, e);
    }
  }, [topic, handler, isConnected, stompClient]);
};

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const clientRef = useRef(null);
  const reconnectTimer = useRef(null);
  const attemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const getUrl = useCallback(() => {
    const token = tokenManager.getAccessToken();
    // ✅ FIX: /quickks nahi, /quickks/ws pahije
    return token ? `/quickks/ws?token=${encodeURIComponent(token)}` : '/quickks/ws';
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    if (clientRef.current) {
      try { clientRef.current.deactivate(); } catch {}
      clientRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    setStatus(CONNECTION_STATUS.DISCONNECTED);
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || clientRef.current?.active) return;
    const token = tokenManager.getAccessToken();
    if (!token || !isAuthenticated) {
      setStatus(CONNECTION_STATUS.AUTH_ERROR);
      return;
    }

    setIsConnecting(true);
    setStatus(attemptsRef.current > 0 ? CONNECTION_STATUS.RECONNECTING : CONNECTION_STATUS.CONNECTING);
    
    const sockUrl = getUrl();
    console.log('🌐 WS Connecting to:', sockUrl);

    const client = new Client({
      webSocketFactory: () => new SockJS(sockUrl, null, {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling'],
      }),
      connectHeaders: { 
        Authorization: `Bearer ${token}`,
        token: token
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
        console.log('✅ WS CONNECTED');
      },

      onStompError: (frame) => {
        if (!mountedRef.current) return;
        const msg = frame.headers?.message || '';
        console.error('❌ STOMP Error:', msg);
        if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('jwt')) {
          setStatus(CONNECTION_STATUS.AUTH_ERROR);
          setIsConnecting(false);
        } else if (attemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(1.5, attemptsRef.current), 10000);
          attemptsRef.current++;
          reconnectTimer.current = setTimeout(() => connect(), delay);
          setStatus(CONNECTION_STATUS.RECONNECTING);
        } else {
          setStatus(CONNECTION_STATUS.FAILED);
          setIsConnecting(false);
        }
      },

      onWebSocketClose: () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        setIsConnecting(false);
        if (status !== CONNECTION_STATUS.AUTH_ERROR && attemptsRef.current < 5 && isAuthenticated) {
          const delay = Math.min(1000 * Math.pow(1.5, attemptsRef.current), 10000);
          attemptsRef.current++;
          reconnectTimer.current = setTimeout(() => connect(), delay);
          setStatus(CONNECTION_STATUS.RECONNECTING);
        } else {
          setStatus(CONNECTION_STATUS.DISCONNECTED);
        }
      },
    });

    clientRef.current = client;
    client.activate();
  }, [isAuthenticated, getUrl, disconnect, status]);

  useEffect(() => {
    mountedRef.current = true;
    if (isAuthenticated) {
      const t = setTimeout(connect, 1500);
      return () => { clearTimeout(t); mountedRef.current = false; disconnect(); };
    } else {
      disconnect();
    }
    return () => { mountedRef.current = false; disconnect(); };
  }, [isAuthenticated, connect, disconnect]);

  const value = useMemo(() => ({
    isConnected,
    isConnecting,
    connectionStatus: status,
    stompClient: clientRef.current,
    isReady: isConnected,
    connect,
    disconnect,
    sendMessage: (dest, body) => {
      if (!clientRef.current?.connected) return false;
      try {
        clientRef.current.publish({ 
          destination: dest.startsWith('/app') ? dest : `/app${dest}`, 
          body: JSON.stringify(body || {}) 
        });
        return true;
      } catch { return false; }
    },
  }), [isConnected, isConnecting, status, connect, disconnect]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export default WebSocketProvider;