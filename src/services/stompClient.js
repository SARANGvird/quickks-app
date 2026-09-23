// src/contexts/WebSocketProvider.js
// 🚀 QUICKKS WEBSOCKET PROVIDER - v8.0 FINAL
// ✅ FIXED: Token sent in Authorization header
// ✅ FIXED: Proper reconnection logic
// ✅ FIXED: Error handling
// ✅ FIXED: Memory leaks
// ✅ PRODUCTION READY

import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import { toast } from 'react-toastify';

// ================================================================
// 🔧 CONSTANTS
// ================================================================

export const CONNECTION_STATUS = {
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
    FAILED: 'failed',
    AUTH_ERROR: 'auth_error'
};

// ================================================================
// 📝 CONTEXT
// ================================================================

const WebSocketContext = createContext(null);

export const useWebSocket = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        console.warn('⚠️ useWebSocket must be used within a WebSocketProvider - using mock');
        return {
            isConnected: false,
            connectionStatus: CONNECTION_STATUS.DISCONNECTED,
            isConnecting: false,
            lastMessage: null,
            error: null,
            connectionStats: { messagesSent: 0, messagesReceived: 0 },
            connect: () => {},
            disconnect: () => {},
            reconnect: () => {},
            sendMessage: () => false,
            getConnectionInfo: () => ({}),
            isReady: false,
            info: { reconnectAttempts: 0, maxReconnectAttempts: 5 },
            stompClient: null,
        };
    }
    return context;
};

// ================================================================
// 🔐 TOKEN MANAGER
// ================================================================

const tokenManager = {
    getAccessToken: () => {
        try {
            const token = localStorage.getItem('accessToken') ||
                         localStorage.getItem('token') ||
                         sessionStorage.getItem('accessToken');
            if (token && token !== 'undefined' && token !== 'null' && token !== '') {
                return token;
            }
            return null;
        } catch (e) {
            return null;
        }
    },
    getRefreshToken: () => {
        try {
            return localStorage.getItem('refreshToken') || null;
        } catch (e) {
            return null;
        }
    },
    isAuthenticated: () => {
        try {
            const token = tokenManager.getAccessToken();
            return !!token && token !== 'undefined' && token !== 'null';
        } catch {
            return false;
        }
    }
};

// ================================================================
// 🚀 WEBSOCKET PROVIDER - v8.0 FINAL
// ================================================================

export const WebSocketProvider = ({ children, options = {} }) => {
    const {
        autoConnect = true,
        enableHeartbeat = true,
        enableReconnection = true,
        enableLogging = process.env.NODE_ENV === 'development',
        maxReconnectAttempts = 10,
        heartbeatInterval = 4000,
        connectionTimeout = 15000,
        transports = ['websocket', 'xhr-streaming', 'xhr-polling'],
        onConnect: externalOnConnect,
        onDisconnect: externalOnDisconnect,
        onError: externalOnError,
        onAuthFailure: externalOnAuthFailure,
    } = options;

    // ================================================================
    // 📦 STATE
    // ================================================================

    const [state, setState] = useState({
        isConnected: false,
        isConnecting: false,
        connectionStatus: CONNECTION_STATUS.DISCONNECTED,
        lastMessage: null,
        error: null,
        latency: null,
        connectionStats: {
            connectedAt: null,
            disconnectedAt: null,
            messagesSent: 0,
            messagesReceived: 0,
            reconnectAttempts: 0,
            lastHeartbeat: null
        }
    });

    // ================================================================
    // 🔄 REFS
    // ================================================================

    const stompClientRef = useRef(null);
    const subscriptionsRef = useRef(new Map());
    const reconnectTimerRef = useRef(null);
    const heartbeatIntervalRef = useRef(null);
    const connectionTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const mountedRef = useRef(true);
    const clientIdRef = useRef(`web_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
    const isConnectingRef = useRef(false);
    const isConnectedRef = useRef(false);
    const isManualDisconnectRef = useRef(false);
    const authErrorRef = useRef(false);

    // ================================================================
    // 📝 LOGGER
    // ================================================================

    const log = useCallback((level, message, data = null) => {
        if (!enableLogging) return;
        const prefix = `[WebSocket:${clientIdRef.current}]`;
        const logFn = level === 'error' ? console.error :
                     level === 'warn' ? console.warn :
                     level === 'info' ? console.info : console.debug;
        logFn(`${prefix} ${message}`, data || '');
    }, [enableLogging]);

    // ================================================================
    // 🧹 CLEANUP
    // ================================================================

    const cleanup = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
        isConnectingRef.current = false;
    }, []);

    // ================================================================
    // ✅ GET WEBSOCKET URL
    // ================================================================

    const getWebSocketUrl = useCallback(() => {
        const ENV = process.env.NODE_ENV || 'development';
        
        if (ENV === 'development') {
            const envUrl = process.env.REACT_APP_WS_URL;
            if (envUrl && typeof envUrl === 'string') {
                return envUrl.replace(/\/+$/, '');
            }
            return '/quickks';
        }

        const envUrl = process.env.REACT_APP_WS_URL;
        if (envUrl && typeof envUrl === 'string') {
            return envUrl.replace(/\/+$/, '');
        }

        if (typeof window !== 'undefined') {
            const origin = window.location.origin;
            if (origin && origin.startsWith('http')) {
                return `${origin}/quickks`;
            }
        }

        return '/quickks';
    }, []);

    // ================================================================
    // 🔄 HANDLE RECONNECTION
    // ================================================================

    const handleReconnection = useCallback(() => {
        if (!mountedRef.current || !enableReconnection || isManualDisconnectRef.current) return;

        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            log('error', 'Max reconnection attempts reached');
            setState(prev => ({
                ...prev,
                connectionStatus: CONNECTION_STATUS.FAILED,
                error: 'Unable to establish connection. Please refresh the page.',
            }));
            toast.error('🔌 Connection failed after multiple attempts. Please refresh the page.', {
                autoClose: false,
                toastId: 'ws-max-retries',
            });
            return;
        }

        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        
        log('info', `Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        setState(prev => ({
            ...prev,
            connectionStatus: CONNECTION_STATUS.RECONNECTING,
        }));

        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
        }
        reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current && !isManualDisconnectRef.current) {
                connect();
            }
        }, delay);
    }, [enableReconnection, maxReconnectAttempts, log]);

    // ================================================================
    // ✅ CONNECT FUNCTION - CRITICAL FIX: Token sent properly
    // ================================================================

    const connect = useCallback(() => {
        if (isConnectingRef.current) {
            log('debug', 'Connection already in progress');
            return;
        }

        if (isConnectedRef.current) {
            log('debug', 'Already connected');
            return;
        }

        // ✅ Get token
        const accessToken = tokenManager.getAccessToken();
        if (!accessToken) {
            log('warn', 'No authentication token available');
            setState(prev => ({
                ...prev,
                error: 'No authentication token available',
                connectionStatus: CONNECTION_STATUS.AUTH_ERROR,
            }));
            externalOnAuthFailure?.();
            return;
        }

        // ✅ Clean up existing connection
        if (stompClientRef.current) {
            try {
                stompClientRef.current.deactivate();
            } catch (e) { /* Ignore */ }
            stompClientRef.current = null;
        }

        isConnectingRef.current = true;
        isManualDisconnectRef.current = false;
        authErrorRef.current = false;

        setState(prev => ({
            ...prev,
            isConnecting: true,
            connectionStatus: CONNECTION_STATUS.CONNECTING,
            error: null,
        }));

        try {
            const sockJsUrl = getWebSocketUrl();
            
            log('info', '🌐 Connecting to WebSocket:', sockJsUrl);

            const socket = new SockJS(sockJsUrl, null, {
                transports: transports,
                timeout: connectionTimeout,
                heartbeat: heartbeatInterval,
                debug: enableLogging,
            });

            let user = null;
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    user = JSON.parse(userStr);
                }
            } catch { /* Ignore */ }

            // ✅ CRITICAL FIX: Create STOMP client with Authorization header
            const stompClient = new Client({
                webSocketFactory: () => socket,
                connectHeaders: {
                    // ✅ THIS IS THE KEY FIX - Send token in Authorization header
                    Authorization: `Bearer ${accessToken}`,
                    'X-Client-Id': clientIdRef.current,
                    'X-Client-Type': 'web-app',
                    'X-User-Id': user?.id || '',
                    'X-User-Role': user?.role || '',
                    'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
                },
                heartbeatIncoming: heartbeatInterval,
                heartbeatOutgoing: heartbeatInterval,
                reconnectDelay: 0,
                debug: enableLogging ? (str) => {
                    if (!str.includes('PING') && !str.includes('PONG') && !str.includes('heartbeat')) {
                        log('debug', 'STOMP: ' + str);
                    }
                } : () => {},
            });

            stompClient.onConnect = () => {
                if (!mountedRef.current) return;

                log('info', '✅ WebSocket connected successfully');
                
                if (connectionTimeoutRef.current) {
                    clearTimeout(connectionTimeoutRef.current);
                }

                isConnectedRef.current = true;
                isConnectingRef.current = false;
                authErrorRef.current = false;
                
                setState(prev => ({
                    ...prev,
                    isConnected: true,
                    isConnecting: false,
                    connectionStatus: CONNECTION_STATUS.CONNECTED,
                    error: null,
                    connectionStats: {
                        ...prev.connectionStats,
                        connectedAt: Date.now(),
                        reconnectAttempts: reconnectAttemptsRef.current
                    }
                }));
                
                reconnectAttemptsRef.current = 0;

                // ✅ Subscribe to default topics
                const defaultTopics = [
                    '/topic/admin/dashboard',
                    '/topic/admin/stats',
                    '/topic/admin/alerts',
                    '/topic/admin/notifications',
                    '/topic/admin/bookings',
                    '/topic/admin/providers',
                ];
                
                defaultTopics.forEach(topic => {
                    try {
                        const sub = stompClient.subscribe(topic, (message) => {
                            try {
                                const data = JSON.parse(message.body);
                                setState(prev => ({
                                    ...prev,
                                    lastMessage: data,
                                    connectionStats: {
                                        ...prev.connectionStats,
                                        messagesReceived: prev.connectionStats.messagesReceived + 1
                                    }
                                }));
                                
                                if (topic === '/topic/admin/alerts' && data.message) {
                                    toast.info(`🔔 ${data.message}`, {
                                        position: 'bottom-right',
                                        autoClose: 5000,
                                    });
                                }
                            } catch (e) {
                                // Ignore parse errors
                            }
                        });
                        subscriptionsRef.current.set(topic, sub);
                        log('debug', `✅ Subscribed to ${topic}`);
                    } catch (e) {
                        log('error', `Failed to subscribe to ${topic}`, e);
                    }
                });

                // ✅ Send connection confirmation
                try {
                    stompClient.publish({
                        destination: '/app/admin/connect',
                        body: JSON.stringify({
                            type: 'CONNECT',
                            timestamp: Date.now(),
                            clientId: clientIdRef.current,
                            userRole: user?.role || 'UNKNOWN',
                        }),
                    });
                } catch (e) { /* Ignore */ }

                // ✅ Start heartbeat
                if (enableHeartbeat) {
                    if (heartbeatIntervalRef.current) {
                        clearInterval(heartbeatIntervalRef.current);
                    }
                    heartbeatIntervalRef.current = setInterval(() => {
                        if (stompClient.connected && mountedRef.current) {
                            try {
                                stompClient.publish({
                                    destination: '/app/heartbeat',
                                    body: JSON.stringify({
                                        timestamp: Date.now(),
                                        clientId: clientIdRef.current,
                                        type: 'HEARTBEAT',
                                    }),
                                });
                            } catch (e) { /* Ignore */ }
                        }
                    }, heartbeatInterval);
                }

                if (!localStorage.getItem('ws_connected_toast_shown')) {
                    toast.success('🔌 Real-time connection established', {
                        icon: '🔌',
                        autoClose: 3000,
                        toastId: 'ws-connected',
                    });
                    localStorage.setItem('ws_connected_toast_shown', 'true');
                }

                externalOnConnect?.();
            };

            stompClient.onStompError = (frame) => {
                if (!mountedRef.current) return;
                log('error', 'STOMP error', frame);

                const errorMsg = frame.headers?.message || 'STOMP protocol error';
                const isAuthError = errorMsg.toLowerCase().includes('authentication') ||
                                   errorMsg.toLowerCase().includes('jwt') ||
                                   errorMsg.toLowerCase().includes('authorization') ||
                                   errorMsg.toLowerCase().includes('unauthorized') ||
                                   errorMsg.toLowerCase().includes('invalid');

                setState(prev => ({
                    ...prev,
                    error: errorMsg,
                    connectionStatus: isAuthError ? CONNECTION_STATUS.AUTH_ERROR : CONNECTION_STATUS.ERROR,
                }));

                if (isAuthError) {
                    authErrorRef.current = true;
                    externalOnAuthFailure?.();
                    if (!sessionStorage.getItem('ws_auth_error_shown')) {
                        toast.error('🔐 Authentication failed. Please refresh and login again.', {
                            autoClose: 5000,
                            toastId: 'ws-auth-error',
                        });
                        sessionStorage.setItem('ws_auth_error_shown', 'true');
                    }
                } else {
                    log('warn', 'STOMP error (non-auth):', errorMsg);
                }

                externalOnError?.(frame);
            };

            stompClient.onWebSocketError = (event) => {
                if (!mountedRef.current) return;
                log('error', 'WebSocket error', event);
                setState(prev => ({
                    ...prev,
                    error: 'WebSocket connection error',
                    connectionStatus: CONNECTION_STATUS.ERROR,
                }));
                externalOnError?.(event);
            };

            stompClient.onDisconnect = () => {
                if (!mountedRef.current || isManualDisconnectRef.current) return;
                log('info', 'Disconnected');
                
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }

                isConnectedRef.current = false;
                isConnectingRef.current = false;
                
                setState(prev => ({
                    ...prev,
                    isConnected: false,
                    isConnecting: false,
                    connectionStatus: CONNECTION_STATUS.DISCONNECTED,
                    connectionStats: {
                        ...prev.connectionStats,
                        disconnectedAt: Date.now()
                    }
                }));

                externalOnDisconnect?.();

                if (enableReconnection && !isManualDisconnectRef.current && !authErrorRef.current) {
                    handleReconnection();
                }
            };

            // ✅ Connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                if (isConnectingRef.current && !isConnectedRef.current) {
                    log('error', 'Connection timeout');
                    setState(prev => ({
                        ...prev,
                        error: 'Connection timeout',
                        connectionStatus: CONNECTION_STATUS.ERROR,
                        isConnecting: false,
                    }));
                    try { stompClient.deactivate(); } catch (e) { /* Ignore */ }
                    isConnectingRef.current = false;
                    
                    if (enableReconnection) {
                        handleReconnection();
                    }
                }
            }, connectionTimeout);

            stompClientRef.current = stompClient;
            stompClient.activate();

        } catch (error) {
            log('error', 'Connection failed', error);
            isConnectingRef.current = false;
            setState(prev => ({
                ...prev,
                isConnecting: false,
                error: error.message || 'Connection failed',
                connectionStatus: CONNECTION_STATUS.ERROR,
            }));
            externalOnError?.(error);
            
            if (enableReconnection) {
                setTimeout(() => { if (mountedRef.current) connect(); }, 2000);
            }
        }
    }, [
        transports, 
        connectionTimeout, 
        heartbeatInterval, 
        enableReconnection, 
        enableHeartbeat,
        enableLogging, 
        log, 
        getWebSocketUrl,
        externalOnConnect,
        externalOnDisconnect,
        externalOnError,
        externalOnAuthFailure,
        handleReconnection,
    ]);

    // ================================================================
    // 🔄 DISCONNECT
    // ================================================================

    const disconnect = useCallback(() => {
        log('info', 'Disconnecting...');
        isManualDisconnectRef.current = true;

        cleanup();

        subscriptionsRef.current.forEach((sub) => {
            try {
                if (sub && typeof sub.unsubscribe === 'function') {
                    sub.unsubscribe();
                }
            } catch (e) { /* Ignore */ }
        });
        subscriptionsRef.current.clear();

        if (stompClientRef.current) {
            try {
                if (stompClientRef.current.connected) {
                    stompClientRef.current.deactivate();
                }
            } catch (error) {
                log('error', 'Error deactivating client', error);
            }
            stompClientRef.current = null;
        }

        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }

        isConnectedRef.current = false;
        isConnectingRef.current = false;
        
        setState(prev => ({
            ...prev,
            isConnected: false,
            isConnecting: false,
            connectionStatus: CONNECTION_STATUS.DISCONNECTED,
            error: null,
        }));
        
        reconnectAttemptsRef.current = 0;
        isManualDisconnectRef.current = false;
        
        log('info', 'Disconnected');
    }, [cleanup, log]);

    // ================================================================
    // 🔄 RECONNECT
    // ================================================================

    const reconnect = useCallback(() => {
        log('info', 'Manual reconnect requested');
        isManualDisconnectRef.current = false;
        authErrorRef.current = false;
        reconnectAttemptsRef.current = 0;
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }
        sessionStorage.removeItem('ws_auth_error_shown');
        localStorage.removeItem('ws_connected_toast_shown');
        disconnect();
        setTimeout(() => { if (mountedRef.current) connect(); }, 500);
    }, [connect, disconnect, log]);

    // ================================================================
    // 📤 SEND MESSAGE
    // ================================================================

    const sendMessage = useCallback((destination, payload = {}) => {
        const client = stompClientRef.current;
        if (!client || !client.connected) {
            log('warn', 'Cannot send message: not connected');
            return false;
        }

        try {
            const dest = destination.startsWith('/app') ? destination : `/app${destination}`;
            client.publish({
                destination: dest,
                body: JSON.stringify({
                    ...payload,
                    timestamp: Date.now(),
                    clientId: clientIdRef.current,
                }),
                headers: {
                    'content-type': 'application/json',
                    'X-Client-Id': clientIdRef.current,
                },
            });
            setState(prev => ({
                ...prev,
                connectionStats: {
                    ...prev.connectionStats,
                    messagesSent: prev.connectionStats.messagesSent + 1
                }
            }));
            return true;
        } catch (error) {
            log('error', `Failed to send message to ${destination}`, error);
            return false;
        }
    }, [log]);

    // ================================================================
    // 📊 GET CONNECTION INFO
    // ================================================================

    const getConnectionInfo = useCallback(() => ({
        status: state.connectionStatus,
        connected: state.isConnected,
        connecting: state.isConnecting,
        error: state.error,
        stats: state.connectionStats,
        clientId: clientIdRef.current,
        reconnectAttempts: reconnectAttemptsRef.current,
        maxReconnectAttempts: maxReconnectAttempts,
        authError: authErrorRef.current,
        subscriptions: Array.from(subscriptionsRef.current.keys()),
        subscriptionCount: subscriptionsRef.current.size,
    }), [state, maxReconnectAttempts]);

    // ================================================================
    // 🔄 LIFECYCLE
    // ================================================================

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [disconnect]);

    // ✅ Auto-connect
    useEffect(() => {
        if (!autoConnect) return;

        const hasValidToken = tokenManager.isAuthenticated();
        if (!hasValidToken) {
            log('debug', 'No valid token, skipping auto-connect');
            return;
        }

        if (mountedRef.current && !isConnectedRef.current && !isConnectingRef.current) {
            const timer = setTimeout(() => {
                if (mountedRef.current && !isConnectedRef.current && !isConnectingRef.current) {
                    log('info', 'Auto-connecting...');
                    connect();
                }
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [autoConnect, connect, log]);

    // ✅ Handle token changes
    useEffect(() => {
        const handleTokenChange = () => {
            const newToken = tokenManager.getAccessToken();
            if (newToken && tokenManager.isAuthenticated() && mountedRef.current) {
                log('info', 'Token changed, reconnecting...');
                if (stompClientRef.current?.connected) {
                    reconnect();
                } else {
                    connect();
                }
            }
        };

        const handleAuthLogout = () => {
            log('info', 'Auth logout event');
            authErrorRef.current = true;
            disconnect();
        };

        const handleAuthLogin = () => {
            log('info', 'Auth login event');
            authErrorRef.current = false;
            reconnectAttemptsRef.current = 0;
            sessionStorage.removeItem('ws_auth_error_shown');
            localStorage.removeItem('ws_connected_toast_shown');
            reconnect();
        };

        window.addEventListener('storage', handleTokenChange);
        window.addEventListener('token-refreshed', handleTokenChange);
        window.addEventListener('auth:login', handleAuthLogin);
        window.addEventListener('auth:logout', handleAuthLogout);

        return () => {
            window.removeEventListener('storage', handleTokenChange);
            window.removeEventListener('token-refreshed', handleTokenChange);
            window.removeEventListener('auth:login', handleAuthLogin);
            window.removeEventListener('auth:logout', handleAuthLogout);
        };
    }, [connect, disconnect, reconnect, log]);

    // ✅ Network status handling
    useEffect(() => {
        const handleOnline = () => {
            log('info', 'Network online, reconnecting...');
            if (!state.isConnected && mountedRef.current && !authErrorRef.current) {
                reconnectAttemptsRef.current = 0;
                reconnect();
            }
        };

        const handleOffline = () => {
            log('info', 'Network offline');
            setState(prev => ({
                ...prev,
                connectionStatus: CONNECTION_STATUS.DISCONNECTED,
            }));
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [state.isConnected, log, reconnect]);

    // ================================================================
    // 📤 CONTEXT VALUE
    // ================================================================

    const value = useMemo(() => ({
        isConnected: state.isConnected,
        isConnecting: state.isConnecting,
        connectionStatus: state.connectionStatus,
        lastMessage: state.lastMessage,
        error: state.error,
        latency: state.latency,
        connectionStats: state.connectionStats,
        connect,
        disconnect,
        reconnect,
        sendMessage,
        getConnectionInfo,
        isReady: state.isConnected && stompClientRef.current?.connected === true,
        info: {
            clientId: clientIdRef.current,
            reconnectAttempts: reconnectAttemptsRef.current,
            maxReconnectAttempts,
            subscriptions: Array.from(subscriptionsRef.current.keys()),
            subscriptionCount: subscriptionsRef.current.size,
            authError: authErrorRef.current,
        },
        stompClient: stompClientRef.current,
    }), [state, connect, disconnect, reconnect, sendMessage, getConnectionInfo, maxReconnectAttempts]);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

// ================================================================
// 📤 CUSTOM HOOKS
// ================================================================

export const useWebSocketStatus = () => {
    const { isConnected, isConnecting, connectionStatus, error, info } = useWebSocket();
    return { isConnected, isConnecting, connectionStatus, error, info };
};

export const useWebSocketSender = () => {
    const { sendMessage, isReady, isConnected } = useWebSocket();
    return { sendMessage, isReady, isConnected };
};

export const useWebSocketSubscription = (topic, handler) => {
    const { stompClient, isConnected } = useWebSocket();
    const subscriptionRef = useRef(null);

    useEffect(() => {
        if (!topic || !handler || !isConnected || !stompClient) return;

        try {
            const sub = stompClient.subscribe(topic, (message) => {
                try {
                    const data = JSON.parse(message.body);
                    handler(data);
                } catch (e) {
                    handler(message.body);
                }
            });
            subscriptionRef.current = sub;

            return () => {
                if (subscriptionRef.current && typeof subscriptionRef.current.unsubscribe === 'function') {
                    subscriptionRef.current.unsubscribe();
                }
            };
        } catch (e) {
            console.error(`Failed to subscribe to ${topic}:`, e);
        }
    }, [topic, handler, isConnected, stompClient]);
};

export default WebSocketProvider;