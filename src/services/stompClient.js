// v9.0 PROD - Native WebSocket, No SockJS
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Client } from '@stomp/stompjs';

const WebSocketContext = createContext(null);
export const useWebSocket = () => useContext(WebSocketContext);

const getToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token') || null;

export const WebSocketProvider = ({ children }) => {
  const [status, setStatus] = useState('disconnected');
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const reconnectRef = useRef(0);
  const timerRef = useRef(null);
  const manualCloseRef = useRef(false);

  const getWsUrl = useCallback(() => {
    // Prod env madhun direct wss URL
    return process.env.REACT_APP_WS_URL || 'wss://api.quickks.in/quickks/ws';
  }, []);

  const connect = useCallback(() => {
    if (clientRef.current?.active) return;

    const token = getToken();
    if (!token) {
      setStatus('auth_error');
      return;
    }

    const client = new Client({
      brokerURL: getWsUrl(),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Client-Id': `web_${Date.now()}`,
      },
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 0, // amhi manual karu
      onConnect: () => {
        setIsConnected(true);
        setStatus('connected');
        reconnectRef.current = 0;

        // Default admin topics
        ['/topic/admin/dashboard','/topic/admin/stats','/topic/admin/alerts'].forEach(t => {
          client.subscribe(t, (msg) => {
            try { console.log(t, JSON.parse(msg.body)); } catch {}
          });
        });
      },
      onStompError: (frame) => {
        const msg = frame.headers?.message || '';
        if (msg.toLowerCase().includes('auth') || msg.toLowerCase().includes('jwt')) {
          setStatus('auth_error');
          manualCloseRef.current = true; // auth error var reconnect nako
        } else {
          setStatus('error');
          scheduleReconnect();
        }
      },
      onWebSocketClose: () => {
        if (manualCloseRef.current) return;
        setIsConnected(false);
        setStatus('disconnected');
        scheduleReconnect();
      }
    });

    client.activate();
    clientRef.current = client;
  }, [getWsUrl]);

  const scheduleReconnect = useCallback(() => {
    if (manualCloseRef.current || reconnectRef.current >= 10) return;
    const delay = Math.min(1000 * Math.pow(1.5, reconnectRef.current), 30000);
    reconnectRef.current++;
    setStatus('reconnecting');
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => connect(), delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    clearTimeout(timerRef.current);
    clientRef.current?.deactivate();
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  const reconnect = useCallback(() => {
    manualCloseRef.current = false;
    reconnectRef.current = 0;
    disconnect();
    setTimeout(connect, 500);
  }, [connect, disconnect]);

  const sendMessage = useCallback((dest, body) => {
    if (!clientRef.current?.connected) return false;
    clientRef.current.publish({
      destination: dest.startsWith('/app')? dest : `/app${dest}`,
      body: JSON.stringify(body),
    });
    return true;
  }, []);

  useEffect(() => {
    if (process.env.REACT_APP_ENABLE_WEBSOCKET!== 'true') return;
    if (getToken()) connect();
    return () => disconnect();
  }, [connect, disconnect]);

  // token change in other tab
  useEffect(() => {
    const onStorage = () => { if (getToken()) reconnect(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reconnect]);

  const value = useMemo(() => ({
    isConnected,
    connectionStatus: status,
    isReady: isConnected,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    stompClient: clientRef.current,
  }), [isConnected, status, connect, disconnect, reconnect, sendMessage]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};