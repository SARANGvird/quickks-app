// src/contexts/WebSocketProvider.js - IMPROVED VERSION
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

// ==========================================================
// CONSTANTS & ENUMS
// ==========================================================
export const WS_READY_STATE = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

export const WS_CLOSE_CODES = {
  NORMAL: 1000,
  GOING_AWAY: 1001,
  PROTOCOL_ERROR: 1002,
  UNSUPPORTED_DATA: 1003,
  NO_STATUS: 1005,
  ABNORMAL: 1006,
  INVALID_PAYLOAD: 1007,
  POLICY_VIOLATION: 1008,
  MESSAGE_TOO_BIG: 1009,
  MANDATORY_EXT: 1010,
  INTERNAL_ERROR: 1011,
  SERVICE_RESTART: 1012,
  TRY_AGAIN_LATER: 1013,
  BAD_GATEWAY: 1014,
  TLS_HANDSHAKE: 1015
};

export const CONNECTION_STATUS = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  FAILED: 'failed'
};

const RECONNECT_CONFIG = {
  MAX_ATTEMPTS: 5,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  JITTER: 0.1,
  BACKOFF_MULTIPLIER: 2
};

const HEARTBEAT_CONFIG = {
  INTERVAL: 30000,
  TIMEOUT: 5000
};

const CONNECTION_CONFIG = {
  TIMEOUT: 10000,
  RETRY_DELAY: 2000
};

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const generateClientId = () => {
  return `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const calculateReconnectDelay = (attempt) => {
  const exponentialDelay = RECONNECT_CONFIG.BASE_DELAY * Math.pow(RECONNECT_CONFIG.BACKOFF_MULTIPLIER, attempt);
  const cappedDelay = Math.min(exponentialDelay, RECONNECT_CONFIG.MAX_DELAY);
  const jitter = cappedDelay * RECONNECT_CONFIG.JITTER * Math.random();
  return Math.floor(cappedDelay + jitter);
};

// Check if WebSocket is supported
const isWebSocketSupported = () => {
  return typeof WebSocket !== 'undefined';
};

// ==========================================================
// CONTEXT CREATION
// ==========================================================
const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

// ==========================================================
// WEBSOCKET PROVIDER
// ==========================================================
export const WebSocketProvider = ({ children, options = {} }) => {
  const {
    autoConnect = true,
    enableHeartbeat = true,
    enableReconnection = true,
    enableLogging = process.env.NODE_ENV === 'development',
    maxReconnectAttempts = RECONNECT_CONFIG.MAX_ATTEMPTS,
    baseReconnectDelay = RECONNECT_CONFIG.BASE_DELAY,
    maxReconnectDelay = RECONNECT_CONFIG.MAX_DELAY,
    heartbeatInterval = HEARTBEAT_CONFIG.INTERVAL,
    heartbeatTimeout = HEARTBEAT_CONFIG.TIMEOUT,
    connectionTimeout = CONNECTION_CONFIG.TIMEOUT,
    onConnect: externalOnConnect,
    onDisconnect: externalOnDisconnect,
    onError: externalOnError,
    onMessage: externalOnMessage,
    onReconnect: externalOnReconnect
  } = options;

  const { token, isAuthenticated, user } = useAuth();

  // ==========================================================
  // STATE
  // ==========================================================
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(CONNECTION_STATUS.DISCONNECTED);
  const [latency, setLatency] = useState(null);
  const [connectionStats, setConnectionStats] = useState({
    connectedAt: null,
    disconnectedAt: null,
    messagesSent: 0,
    messagesReceived: 0,
    reconnectAttempts: 0,
    lastHeartbeat: null
  });

  // ==========================================================
  // REFS
  // ==========================================================
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const clientIdRef = useRef(generateClientId());
  const isConnectingRef = useRef(false);
  const reconnectFunctionRef = useRef(null);
  const connectFunctionRef = useRef(null);
  const disconnectFunctionRef = useRef(null);
  const messageQueueRef = useRef([]);
  const subscriptionsRef = useRef(new Map());

  // ==========================================================
  // LOGGING UTILITY
  // ==========================================================
  const log = useCallback((level, message, data = null) => {
    if (!enableLogging) return;
    
    const prefix = `[WebSocket:${clientIdRef.current}]`;
    const timestamp = new Date().toISOString();
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.log(`${prefix} ${message}`, data || '');
        break;
      case 'debug':
        console.debug(`${prefix} ${message}`, data || '');
        break;
      default:
        console.log(`${prefix} ${message}`, data || '');
    }
  }, [enableLogging]);

  // ==========================================================
  // SAFE WEBSOCKET OPERATIONS
  // ==========================================================
  const safeClose = useCallback(() => {
    if (wsRef.current) {
      try {
        const ws = wsRef.current;
        const readyState = ws.readyState;
        
        if (readyState === WS_READY_STATE.OPEN || readyState === WS_READY_STATE.CONNECTING) {
          ws.close(WS_CLOSE_CODES.NORMAL, 'Normal closure');
        }
      } catch (err) {
        log('error', 'Error closing WebSocket', err);
      } finally {
        wsRef.current = null;
      }
    }
  }, [log]);

  const safeSend = useCallback((data) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WS_READY_STATE.OPEN) {
      return false;
    }
    try {
      ws.send(data);
      return true;
    } catch (err) {
      log('error', 'Error sending message', err);
      return false;
    }
  }, [log]);

  // ==========================================================
  // MESSAGE QUEUE
  // ==========================================================
  const queueMessage = useCallback((message) => {
    messageQueueRef.current.push({
      id: Date.now(),
      data: message,
      timestamp: new Date().toISOString()
    });
    
    // Limit queue size
    if (messageQueueRef.current.length > 100) {
      messageQueueRef.current = messageQueueRef.current.slice(-100);
    }
    
    log('debug', 'Message queued', { queueSize: messageQueueRef.current.length });
  }, [log]);

  const flushMessageQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;
    
    const messages = [...messageQueueRef.current];
    messageQueueRef.current = [];
    
    messages.forEach(msg => {
      const success = safeSend(msg.data);
      if (!success) {
        queueMessage(msg.data);
      }
    });
    
    log('debug', 'Message queue flushed', { processedCount: messages.length });
  }, [safeSend, queueMessage, log]);

  // ==========================================================
  // STOP HEARTBEAT
  // ==========================================================
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // ==========================================================
  // DISCONNECT FUNCTION
  // ==========================================================
  const disconnect = useCallback(() => {
    log('info', 'Disconnecting...');
    
    stopHeartbeat();
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    
    safeClose();
    
    if (mountedRef.current) {
      setIsConnected(false);
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      setConnectionStats(prev => ({
        ...prev,
        disconnectedAt: Date.now()
      }));
    }
    
    isConnectingRef.current = false;
    reconnectAttemptsRef.current = 0;
    log('info', 'Disconnected');
  }, [log, stopHeartbeat, safeClose]);

  // ==========================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================
  const subscribe = useCallback((channel, handler) => {
    if (!channel || typeof handler !== 'function') {
      log('error', 'Invalid subscription parameters');
      return () => {};
    }
    
    if (!subscriptionsRef.current.has(channel)) {
      subscriptionsRef.current.set(channel, new Set());
    }
    subscriptionsRef.current.get(channel).add(handler);
    
    // Send subscription message if connected
    if (isConnected) {
      sendMessage({
        type: 'subscribe',
        channel,
        timestamp: Date.now()
      });
    }
    
    log('debug', 'Subscribed to channel', { channel });
    
    // Return unsubscribe function
    return () => {
      if (subscriptionsRef.current.has(channel)) {
        subscriptionsRef.current.get(channel).delete(handler);
        if (subscriptionsRef.current.get(channel).size === 0) {
          subscriptionsRef.current.delete(channel);
        }
      }
      
      if (isConnected) {
        sendMessage({
          type: 'unsubscribe',
          channel,
          timestamp: Date.now()
        });
      }
      
      log('debug', 'Unsubscribed from channel', { channel });
    };
  }, [isConnected, sendMessage, log]);

  // ==========================================================
  // SEND HEARTBEAT
  // ==========================================================
  const sendHeartbeat = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WS_READY_STATE.OPEN) {
      return;
    }
    
    const pingTimestamp = Date.now();
    
    const heartbeatMessage = JSON.stringify({
      type: 'heartbeat',
      timestamp: pingTimestamp,
      clientId: clientIdRef.current
    });
    
    if (safeSend(heartbeatMessage)) {
      log('debug', 'Heartbeat sent', { timestamp: pingTimestamp });
      
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      
      heartbeatTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current && reconnectFunctionRef.current) {
          log('warn', 'Heartbeat timeout, reconnecting...');
          reconnectFunctionRef.current();
        }
      }, heartbeatTimeout);
    }
  }, [heartbeatTimeout, safeSend, log]);

  // ==========================================================
  // START HEARTBEAT
  // ==========================================================
  const startHeartbeat = useCallback(() => {
    if (!enableHeartbeat) return;
    stopHeartbeat();
    
    heartbeatIntervalRef.current = setInterval(() => {
      const ws = wsRef.current;
      if (ws && ws.readyState === WS_READY_STATE.OPEN && mountedRef.current) {
        sendHeartbeat();
      }
    }, heartbeatInterval);
  }, [enableHeartbeat, heartbeatInterval, sendHeartbeat, stopHeartbeat]);

  // ==========================================================
  // HANDLE HEARTBEAT RESPONSE
  // ==========================================================
  const handleHeartbeatResponse = useCallback((data) => {
    if (data.type === 'pong' && data.timestamp) {
      const currentLatency = Date.now() - data.timestamp;
      setLatency(currentLatency);
      setConnectionStats(prev => ({
        ...prev,
        lastHeartbeat: Date.now()
      }));
      log('debug', 'Heartbeat received', { latency: currentLatency });
    }
  }, [log]);

  // ==========================================================
  // GET WEBSOCKET URL
  // ==========================================================
  const getWebSocketUrl = useCallback(() => {
    // Check if WebSocket is supported
    if (!isWebSocketSupported()) {
      log('error', 'WebSocket not supported in this browser');
      return null;
    }
    
    const baseUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8081/quickks/ws';
    
    try {
      const url = new URL(baseUrl);
      
      if (token) {
        url.searchParams.append('token', token);
      }
      
      url.searchParams.append('clientId', clientIdRef.current);
      url.searchParams.append('userId', user?.id || 'anonymous');
      url.searchParams.append('platform', 'web');
      url.searchParams.append('timestamp', Date.now().toString());
      url.searchParams.append('version', process.env.REACT_APP_VERSION || '1.0.0');
      
      return url.toString();
    } catch (e) {
      log('error', 'Failed to construct WebSocket URL', e);
      return `${baseUrl}?token=${token}&clientId=${clientIdRef.current}&platform=web`;
    }
  }, [token, user, log]);

  // ==========================================================
  // CONNECT FUNCTION
  // ==========================================================
  const connect = useCallback(() => {
    // Check WebSocket support
    if (!isWebSocketSupported()) {
      log('error', 'WebSocket not supported in this browser');
      setError('WebSocket not supported in this browser');
      setConnectionStatus(CONNECTION_STATUS.FAILED);
      return;
    }
    
    // Prevent multiple connection attempts
    if (isConnectingRef.current) {
      log('debug', 'Connection already in progress');
      return;
    }
    
    if (!token || !isAuthenticated) {
      log('warn', 'No authentication token available');
      setError('No authentication token available');
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
      return;
    }
    
    // Check if already connected
    if (wsRef.current && wsRef.current.readyState === WS_READY_STATE.OPEN) {
      log('info', 'Already connected');
      return;
    }
    
    // Close existing connection
    safeClose();
    
    isConnectingRef.current = true;
    
    if (mountedRef.current) {
      setConnectionStatus(CONNECTION_STATUS.CONNECTING);
      setError(null);
    }
    
    const wsUrl = getWebSocketUrl();
    if (!wsUrl) {
      isConnectingRef.current = false;
      return;
    }
    
    log('info', 'Connecting...', { url: wsUrl.replace(/token=[^&]+/, 'token=***') });
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Connection timeout
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      connectionTimeoutRef.current = setTimeout(() => {
        const currentWs = wsRef.current;
        if (mountedRef.current && currentWs === ws && ws.readyState !== WS_READY_STATE.OPEN && isConnectingRef.current) {
          log('error', 'Connection timeout');
          setError('Connection timeout');
          setConnectionStatus(CONNECTION_STATUS.ERROR);
          
          try {
            if (ws.readyState === WS_READY_STATE.CONNECTING) {
              ws.close(WS_CLOSE_CODES.TRY_AGAIN_LATER, 'Connection timeout');
            }
          } catch (err) {
            // Ignore close errors
          }
          
          isConnectingRef.current = false;
          
          if (enableReconnection && reconnectFunctionRef.current) {
            setTimeout(() => {
              if (mountedRef.current && reconnectFunctionRef.current) {
                reconnectFunctionRef.current();
              }
            }, 2000);
          }
        }
      }, connectionTimeout);
      
      ws.onopen = () => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        log('info', 'Connected successfully');
        setIsConnected(true);
        setConnectionStatus(CONNECTION_STATUS.CONNECTED);
        setError(null);
        isConnectingRef.current = false;
        
        setConnectionStats(prev => ({
          ...prev,
          connectedAt: Date.now(),
          reconnectAttempts: reconnectAttemptsRef.current
        }));
        
        reconnectAttemptsRef.current = 0;
        
        if (enableHeartbeat) {
          startHeartbeat();
        }
        
        // Flush message queue
        flushMessageQueue();
        
        // Resubscribe to channels
        if (subscriptionsRef.current.size > 0) {
          subscriptionsRef.current.forEach((handlers, channel) => {
            sendMessage({
              type: 'subscribe',
              channel,
              timestamp: Date.now()
            });
          });
        }
        
        externalOnConnect?.();
      };
      
      ws.onclose = (event) => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
        }
        
        stopHeartbeat();
        
        log('info', 'Disconnected', {
          code: event.code,
          reason: event.reason || 'No reason',
          wasClean: event.wasClean
        });
        
        setIsConnected(false);
        setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
        setConnectionStats(prev => ({
          ...prev,
          disconnectedAt: Date.now()
        }));
        
        externalOnDisconnect?.(event);
        isConnectingRef.current = false;
        
        if (enableReconnection && !event.wasClean && event.code !== WS_CLOSE_CODES.NORMAL) {
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = calculateReconnectDelay(reconnectAttemptsRef.current);
            setConnectionStatus(CONNECTION_STATUS.RECONNECTING);
            log('info', `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
            
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
            }
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountedRef.current) {
                reconnectAttemptsRef.current++;
                setConnectionStats(prev => ({
                  ...prev,
                  reconnectAttempts: reconnectAttemptsRef.current
                }));
                externalOnReconnect?.({ attempt: reconnectAttemptsRef.current, delay });
                connect();
              }
            }, delay);
          } else {
            setError('Maximum reconnection attempts reached. Please refresh the page.');
            setConnectionStatus(CONNECTION_STATUS.FAILED);
            log('error', 'Maximum reconnection attempts reached');
          }
        }
      };
      
      ws.onerror = (event) => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        log('error', 'WebSocket error', event);
        setError('WebSocket connection error');
        setConnectionStatus(CONNECTION_STATUS.ERROR);
        externalOnError?.(event);
      };
      
      ws.onmessage = (event) => {
        if (!mountedRef.current || wsRef.current !== ws) return;
        
        try {
          const data = JSON.parse(event.data);
          
          setConnectionStats(prev => ({
            ...prev,
            messagesReceived: prev.messagesReceived + 1
          }));
          
          if (data.type === 'pong') {
            handleHeartbeatResponse(data);
            return;
          }
          
          // Handle subscription messages
          if (data.channel && subscriptionsRef.current.has(data.channel)) {
            const handlers = subscriptionsRef.current.get(data.channel);
            handlers.forEach(handler => {
              try {
                handler(data);
              } catch (err) {
                log('error', 'Error in subscription handler', err);
              }
            });
          }
          
          setLastMessage(data);
          externalOnMessage?.(data);
        } catch (error) {
          log('error', 'Failed to parse message', error);
        }
      };
      
    } catch (error) {
      if (!mountedRef.current) return;
      log('error', 'Connection failed', error);
      setError(error.message || 'Failed to establish WebSocket connection');
      setConnectionStatus(CONNECTION_STATUS.ERROR);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  }, [token, isAuthenticated, getWebSocketUrl, connectionTimeout, enableHeartbeat, startHeartbeat, 
      enableReconnection, maxReconnectAttempts, safeClose, stopHeartbeat, handleHeartbeatResponse,
      flushMessageQueue, sendMessage, externalOnConnect, externalOnDisconnect, externalOnError, 
      externalOnMessage, externalOnReconnect, log]);

  // ==========================================================
  // RECONNECT FUNCTION
  // ==========================================================
  const reconnect = useCallback(() => {
    log('info', 'Manual reconnect requested');
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(() => {
      if (mountedRef.current) {
        connect();
      }
    }, 500);
  }, [disconnect, connect, log]);

  // ==========================================================
  // SEND MESSAGE
  // ==========================================================
  const sendMessage = useCallback((data, options = {}) => {
    const { queue = true, priority = false } = options;
    
    const message = typeof data === 'string' ? data : JSON.stringify({
      ...data,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      clientId: clientIdRef.current
    });
    
    if (safeSend(message)) {
      setConnectionStats(prev => ({
        ...prev,
        messagesSent: prev.messagesSent + 1
      }));
      return true;
    }
    
    if (queue) {
      if (priority) {
        messageQueueRef.current.unshift({ id: Date.now(), data: message, timestamp: new Date().toISOString() });
      } else {
        queueMessage(message);
      }
      log('debug', 'Message queued for later delivery');
      return false;
    }
    
    return false;
  }, [safeSend, queueMessage, log]);

  // ==========================================================
  // GET CONNECTION INFO
  // ==========================================================
  const getConnectionInfo = useCallback(() => {
    return {
      status: connectionStatus,
      isConnected,
      readyState: wsRef.current?.readyState,
      reconnectAttempts: reconnectAttemptsRef.current,
      maxReconnectAttempts,
      latency,
      stats: connectionStats,
      clientId: clientIdRef.current,
      messageQueueSize: messageQueueRef.current.length,
      subscriptions: subscriptionsRef.current.size
    };
  }, [connectionStatus, isConnected, latency, connectionStats, maxReconnectAttempts]);

  // ==========================================================
  // STORE FUNCTIONS IN REFS
  // ==========================================================
  useEffect(() => {
    reconnectFunctionRef.current = reconnect;
    connectFunctionRef.current = connect;
    disconnectFunctionRef.current = disconnect;
  }, [reconnect, connect, disconnect]);

  // ==========================================================
  // SET MOUNTED REF
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      stopHeartbeat();
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WS_READY_STATE.OPEN || 
              wsRef.current.readyState === WS_READY_STATE.CONNECTING) {
            wsRef.current.close(WS_CLOSE_CODES.NORMAL, 'Component unmounting');
          }
        } catch (err) {
          // Ignore close errors on unmount
        }
        wsRef.current = null;
      }
    };
  }, [stopHeartbeat]);

  // ==========================================================
  // AUTO-CONNECT ON AUTH
  // ==========================================================
  useEffect(() => {
    if (autoConnect && isAuthenticated && token && mountedRef.current) {
      const timer = setTimeout(() => {
        connect();
      }, 500);
      return () => clearTimeout(timer);
    } else if (!isAuthenticated && mountedRef.current) {
      disconnect();
    }
  }, [autoConnect, isAuthenticated, token, connect, disconnect]);

  // ==========================================================
  // NETWORK STATUS HANDLING
  // ==========================================================
  useEffect(() => {
    const handleOnline = () => {
      log('info', 'Network online, reconnecting...');
      if (!isConnected && mountedRef.current && reconnectFunctionRef.current) {
        setTimeout(() => {
          if (mountedRef.current && reconnectFunctionRef.current) {
            reconnectFunctionRef.current();
          }
        }, 1000);
      }
    };
    
    const handleOffline = () => {
      log('info', 'Network offline');
      setConnectionStatus(CONNECTION_STATUS.DISCONNECTED);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, log]);

  // ==========================================================
  // PAGE VISIBILITY HANDLING
  // ==========================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page hidden, reduce heartbeat frequency
        if (enableHeartbeat && heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }
      } else {
        // Page visible, restore heartbeat
        if (enableHeartbeat && isConnected && !heartbeatIntervalRef.current) {
          startHeartbeat();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enableHeartbeat, isConnected, startHeartbeat]);

  // ==========================================================
  // MEMOIZED CONTEXT VALUE
  // ==========================================================
  const value = useMemo(() => ({
    // State
    isConnected,
    connectionStatus,
    lastMessage,
    error,
    latency,
    connectionStats,
    
    // Core methods
    connect,
    disconnect,
    reconnect,
    sendMessage,
    
    // Subscription methods
    subscribe,
    
    // Utility methods
    getConnectionInfo,
    
    // Flags
    isReady: isConnected && wsRef.current?.readyState === WS_READY_STATE.OPEN,
    
    // Info
    info: {
      clientId: clientIdRef.current,
      reconnectAttempts: reconnectAttemptsRef.current,
      maxReconnectAttempts,
      messageQueueSize: messageQueueRef.current.length,
      subscriptions: subscriptionsRef.current.size
    }
  }), [
    isConnected, connectionStatus, lastMessage, error, latency, connectionStats,
    connect, disconnect, reconnect, sendMessage, subscribe, getConnectionInfo, maxReconnectAttempts
  ]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// ==========================================================
// CUSTOM HOOKS
// ==========================================================

export const useWebSocketStatus = () => {
  const { isConnected, connectionStatus, latency, error } = useWebSocket();
  return { isConnected, connectionStatus, latency, error };
};

export const useWebSocketChannel = (channel, onMessage) => {
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    if (!channel || !onMessage) return;
    const unsubscribe = subscribe(channel, onMessage);
    return unsubscribe;
  }, [channel, onMessage, subscribe]);
};

// ==========================================================
// EXPORTS
// ==========================================================
export const WebSocketConstants = {
  READY_STATE: WS_READY_STATE,
  CLOSE_CODES: WS_CLOSE_CODES,
  CONNECTION_STATUS,
  RECONNECT_CONFIG,
  HEARTBEAT_CONFIG,
  CONNECTION_CONFIG
};

export default WebSocketProvider;