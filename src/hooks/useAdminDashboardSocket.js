// src/hooks/useAdminDashboardSocket.js - PRODUCTION LEVEL v6.2 - COMPLETE FIX
// ✅ FIXED: SockJS uses HTTP URL, not WS URL

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'react-toastify';
import tokenManager from '../utils/tokenManager';

// ==========================================================
// ⚙️ CONFIGURATION
// ==========================================================

const CONFIG = {
    MAX_RECONNECT_ATTEMPTS: 5,
    BASE_RECONNECT_DELAY: 2000,
    MAX_RECONNECT_DELAY: 30000,
    HEARTBEAT_INTERVAL: 4000,
    CONNECTION_TIMEOUT: 15000,
    MAX_ALERTS: 50,
    SOCKJS_TRANSPORTS: ['websocket', 'xhr-streaming', 'xhr-polling'],
    TOKEN_REFRESH_THRESHOLD: 60000,
};

// ==========================================================
// 📡 TOPICS
// ==========================================================

export const TOPICS = {
    ADMIN_ALERTS: '/topic/admin/alerts',
    ADMIN_STATS: '/topic/admin/stats',
    ADMIN_DASHBOARD: '/topic/admin/dashboard',
    SYSTEM_UPDATES: '/topic/system/updates',
    BOOKINGS: '/topic/bookings',
    PROVIDERS: '/topic/providers',
    USERS: '/topic/users',
    REVENUE: '/topic/revenue',
    PROVIDER_STATUS: '/topic/admin/provider-status',
    BOOKING_EVENTS: '/topic/admin/booking-events',
    USER_ACTIVITY: '/topic/admin/user-activity',
    SYSTEM_HEALTH: '/topic/admin/system-health',
};

// ==========================================================
// 🚨 ALERT SEVERITY
// ==========================================================

export const ALERT_SEVERITY = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    CRITICAL: 'critical',
};

// ==========================================================
// 📊 CONNECTION STATES
// ==========================================================

export const CONNECTION_STATE = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    ERROR: 'error',
    FAILED: 'failed',
    AUTH_ERROR: 'auth_error',
};

// ==========================================================
// 🔧 HELPER FUNCTIONS - ✅ FIXED
// ==========================================================

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// ✅ SockJS requires HTTP/HTTPS URL
const getSockJSUrl = () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081';
    const contextPath = process.env.REACT_APP_CONTEXT_PATH || '/quickks';
    const cleanBaseUrl = apiUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}${contextPath}/ws`;
    console.log('🌐 SockJS URL (HTTP):', url);
    return url;
};

// ✅ Native WebSocket uses WS/WSS URL
const getNativeWsUrl = () => {
    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8081';
    const contextPath = process.env.REACT_APP_CONTEXT_PATH || '/quickks';
    const cleanBaseUrl = wsUrl.replace(/\/+$/, '');
    const url = `${cleanBaseUrl}${contextPath}/ws`;
    console.log('🔌 Native WebSocket URL (WS):', url);
    return url;
};

const getAuthToken = () => {
    return tokenManager.getAccessToken();
};

const needsTokenRefresh = (token) => {
    if (!token) return true;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const now = Date.now();
        return expiryTime - now < CONFIG.TOKEN_REFRESH_THRESHOLD;
    } catch {
        return true;
    }
};

// ==========================================================
// 🎣 CUSTOM HOOK - COMPLETE FIXED VERSION
// ==========================================================

const useAdminDashboardSocket = (options = {}) => {
    // ==========================================================
    // 🎯 OPTIONS WITH DEFAULTS
    // ==========================================================

    const {
        enableRealTime = true,
        maxAlerts = CONFIG.MAX_ALERTS,
        onAlert: externalOnAlert,
        onStatsUpdate: externalOnStatsUpdate,
        onBookingUpdate: externalOnBookingUpdate,
        onProviderUpdate: externalOnProviderUpdate,
        onUserUpdate: externalOnUserUpdate,
        onRevenueUpdate: externalOnRevenueUpdate,
        onError: externalOnError,
        onConnectionChange: externalOnConnectionChange,
        autoConnect = true,
        debug = process.env.NODE_ENV === 'development',
        maxReconnectAttempts = CONFIG.MAX_RECONNECT_ATTEMPTS,
        heartbeatInterval = CONFIG.HEARTBEAT_INTERVAL,
    } = options;

    // ==========================================================
    // 📦 STATE
    // ==========================================================

    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);

    // ==========================================================
    // 🔄 REFS - STABLE REFERENCES
    // ==========================================================

    const clientRef = useRef(null);
    const subscriptionsRef = useRef(new Map());
    const mountedRef = useRef(true);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimerRef = useRef(null);
    const connectionTimeoutRef = useRef(null);
    const connectionAttemptRef = useRef(0);
    const isConnectingRef = useRef(false);
    const isConnectedRef = useRef(false);
    const heartbeatIntervalRef = useRef(null);
    const reconnectInProgressRef = useRef(false);
    const authErrorRef = useRef(false);

    // ✅ Store callbacks in refs
    const callbacksRef = useRef({
        onAlert: externalOnAlert,
        onStatsUpdate: externalOnStatsUpdate,
        onBookingUpdate: externalOnBookingUpdate,
        onProviderUpdate: externalOnProviderUpdate,
        onUserUpdate: externalOnUserUpdate,
        onRevenueUpdate: externalOnRevenueUpdate,
        onError: externalOnError,
        onConnectionChange: externalOnConnectionChange,
    });

    // ✅ Update callback refs
    useEffect(() => {
        callbacksRef.current = {
            onAlert: externalOnAlert,
            onStatsUpdate: externalOnStatsUpdate,
            onBookingUpdate: externalOnBookingUpdate,
            onProviderUpdate: externalOnProviderUpdate,
            onUserUpdate: externalOnUserUpdate,
            onRevenueUpdate: externalOnRevenueUpdate,
            onError: externalOnError,
            onConnectionChange: externalOnConnectionChange,
        };
    }, [
        externalOnAlert,
        externalOnStatsUpdate,
        externalOnBookingUpdate,
        externalOnProviderUpdate,
        externalOnUserUpdate,
        externalOnRevenueUpdate,
        externalOnError,
        externalOnConnectionChange,
    ]);

    // ==========================================================
    // 📊 DERIVED VALUES
    // ==========================================================

    const unreadCount = useMemo(
        () => alerts.filter(alert => !alert.read).length,
        [alerts]
    );

    const hasCriticalAlerts = useMemo(
        () => alerts.some(alert => alert.severity === ALERT_SEVERITY.CRITICAL && !alert.read),
        [alerts]
    );

    const recentAlerts = useMemo(
        () => alerts.slice(0, 10),
        [alerts]
    );

    // ==========================================================
    // 🧹 CLEANUP FUNCTION
    // ==========================================================

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
        reconnectInProgressRef.current = false;
    }, []);

    // ==========================================================
    // 🚨 ALERT HANDLER
    // ==========================================================

    const handleNewAlert = useCallback((alertData) => {
        if (!mountedRef.current) return;

        const newAlert = {
            id: alertData.id || generateUniqueId(),
            timestamp: alertData.timestamp || new Date().toISOString(),
            read: false,
            ...alertData,
        };

        setAlerts(prev => {
            const exists = prev.some(a => a.id === newAlert.id);
            if (exists) return prev;
            return [newAlert, ...prev].slice(0, maxAlerts);
        });

        setLastUpdated(new Date());

        const onAlertCallback = callbacksRef.current.onAlert;
        if (onAlertCallback) {
            onAlertCallback(newAlert);
        }

        const toastOptions = {
            position: 'top-right',
            autoClose: alertData.severity === ALERT_SEVERITY.CRITICAL ? false : 5000,
            toastId: `alert-${newAlert.id}`,
            className: alertData.severity === ALERT_SEVERITY.CRITICAL ? 'critical-alert' : '',
        };

        const title = alertData.title || alertData.message || 'Notification';
        const message = alertData.message || alertData.body || '';

        switch (alertData.severity) {
            case ALERT_SEVERITY.CRITICAL:
                toast.error(`🔴 CRITICAL: ${title}${message ? ' - ' + message : ''}`, toastOptions);
                break;
            case ALERT_SEVERITY.ERROR:
                toast.error(`❌ ${title}${message ? ' - ' + message : ''}`, toastOptions);
                break;
            case ALERT_SEVERITY.WARNING:
                toast.warning(`⚠️ ${title}${message ? ' - ' + message : ''}`, toastOptions);
                break;
            case ALERT_SEVERITY.SUCCESS:
                toast.success(`✅ ${title}${message ? ' - ' + message : ''}`, toastOptions);
                break;
            default:
                toast.info(`ℹ️ ${title}${message ? ' - ' + message : ''}`, toastOptions);
        }
    }, [maxAlerts]);

    // ==========================================================
    // 📡 SUBSCRIPTION MANAGEMENT
    // ==========================================================

    const subscribeToTopics = useCallback((client) => {
        if (!client || !client.connected) {
            if (debug) console.warn('⚠️ Cannot subscribe: client not connected');
            return;
        }

        subscriptionsRef.current.forEach((subscription, topic) => {
            try {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                    if (debug) console.log(`🔓 Unsubscribed from ${topic}`);
                }
            } catch (error) {
                console.error(`Error unsubscribing from ${topic}:`, error);
            }
        });
        subscriptionsRef.current.clear();

        if (debug) console.log('📡 Subscribing to topics...');

        const subscriptionConfigs = [
            {
                topic: TOPICS.ADMIN_DASHBOARD,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onStatsUpdate = callbacksRef.current.onStatsUpdate;
                    const onRevenueUpdate = callbacksRef.current.onRevenueUpdate;
                    const onBookingUpdate = callbacksRef.current.onBookingUpdate;
                    const onProviderUpdate = callbacksRef.current.onProviderUpdate;
                    const onUserUpdate = callbacksRef.current.onUserUpdate;

                    if (data.dashboardStats && onStatsUpdate) onStatsUpdate(data);
                    if (data.revenueTrend && onRevenueUpdate) onRevenueUpdate(data.revenueTrend);
                    if (data.bookings && onBookingUpdate) onBookingUpdate(data.bookings);
                    if (data.providers && onProviderUpdate) onProviderUpdate(data.providers);
                    if (data.users && onUserUpdate) onUserUpdate(data.users);
                },
            },
            {
                topic: TOPICS.ADMIN_STATS,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onStatsUpdate = callbacksRef.current.onStatsUpdate;
                    if (onStatsUpdate) onStatsUpdate(data);
                },
            },
            {
                topic: TOPICS.ADMIN_ALERTS,
                handler: (data) => {
                    handleNewAlert(data);
                },
            },
            {
                topic: TOPICS.SYSTEM_UPDATES,
                handler: (data) => {
                    setLastUpdated(new Date());
                    if (data.type === 'alert' || data.severity) {
                        handleNewAlert(data);
                    }
                },
            },
            {
                topic: TOPICS.BOOKINGS,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onBookingUpdate = callbacksRef.current.onBookingUpdate;
                    if (onBookingUpdate) onBookingUpdate(data);
                    
                    if (data.type === 'NEW_BOOKING' || data.event === 'NEW_BOOKING') {
                        toast.info(`📋 New booking: #${data.id || data.bookingId || 'Unknown'}`, {
                            position: 'top-right',
                            autoClose: 5000,
                            toastId: `booking-${data.id || Date.now()}`,
                        });
                    } else if (data.type === 'BOOKING_CANCELLED' || data.event === 'BOOKING_CANCELLED') {
                        toast.warning(`❌ Booking cancelled: #${data.id || data.bookingId || 'Unknown'}`, {
                            position: 'top-right',
                            autoClose: 4000,
                        });
                    } else if (data.type === 'BOOKING_COMPLETED' || data.event === 'BOOKING_COMPLETED') {
                        toast.success(`✅ Booking completed: #${data.id || data.bookingId || 'Unknown'}`, {
                            position: 'top-right',
                            autoClose: 3000,
                        });
                    }
                },
            },
            {
                topic: TOPICS.PROVIDERS,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onProviderUpdate = callbacksRef.current.onProviderUpdate;
                    if (onProviderUpdate) onProviderUpdate(data);
                    
                    if (data.type === 'PROVIDER_VERIFIED' || data.event === 'PROVIDER_VERIFIED') {
                        toast.success(`✅ Provider verified: ${data.name || data.providerName || 'Provider'}`, {
                            autoClose: 3000,
                        });
                    } else if (data.type === 'PROVIDER_APPLICATION' || data.event === 'PROVIDER_APPLICATION') {
                        toast.info(`📝 New provider application: ${data.name || data.providerName || 'Provider'}`, {
                            autoClose: 4000,
                        });
                    }
                },
            },
            {
                topic: TOPICS.USERS,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onUserUpdate = callbacksRef.current.onUserUpdate;
                    if (onUserUpdate) onUserUpdate(data);
                    
                    if (data.type === 'NEW_USER' || data.event === 'NEW_USER') {
                        toast.info(`👤 New user registered: ${data.email || data.name || 'User'}`, {
                            autoClose: 4000,
                        });
                    }
                },
            },
            {
                topic: TOPICS.REVENUE,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onRevenueUpdate = callbacksRef.current.onRevenueUpdate;
                    if (onRevenueUpdate) onRevenueUpdate(data);
                },
            },
            {
                topic: TOPICS.PROVIDER_STATUS,
                handler: (data) => {
                    setLastUpdated(new Date());
                },
            },
            {
                topic: TOPICS.BOOKING_EVENTS,
                handler: (data) => {
                    setLastUpdated(new Date());
                    const onBookingUpdate = callbacksRef.current.onBookingUpdate;
                    if (onBookingUpdate) onBookingUpdate(data);
                },
            },
            {
                topic: TOPICS.USER_ACTIVITY,
                handler: (data) => {
                    setLastUpdated(new Date());
                },
            },
            {
                topic: TOPICS.SYSTEM_HEALTH,
                handler: (data) => {
                    setLastUpdated(new Date());
                    if (data.status === 'critical' || data.status === 'error') {
                        toast.error(`⚠️ System health alert: ${data.message || 'System issue detected'}`, {
                            autoClose: false,
                        });
                    }
                },
            },
        ];

        subscriptionConfigs.forEach(({ topic, handler }) => {
            try {
                const subscription = client.subscribe(topic, (message) => {
                    try {
                        const data = JSON.parse(message.body);
                        handler(data);
                    } catch (error) {
                        console.error(`Error parsing ${topic} message:`, error);
                    }
                });
                subscriptionsRef.current.set(topic, subscription);
                if (debug) console.log(`✅ Subscribed to ${topic}`);
            } catch (error) {
                console.error(`Failed to subscribe to ${topic}:`, error);
            }
        });

        if (debug) {
            console.log(`✅ Subscribed to ${subscriptionsRef.current.size} topics`);
        }
    }, [debug, handleNewAlert]);

    // ==========================================================
    // 🔌 CONNECTION MANAGEMENT
    // ==========================================================

    const scheduleReconnection = useCallback(() => {
        if (!mountedRef.current || !enableRealTime || reconnectInProgressRef.current) return;

        if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
            if (debug) {
                console.warn('⚠️ Max reconnect attempts reached');
            }
            setConnectionState(CONNECTION_STATE.FAILED);
            setError('Unable to establish real-time connection. Please refresh the page.');
            setIsConnecting(false);
            
            const onConnectionChange = callbacksRef.current.onConnectionChange;
            if (onConnectionChange) {
                onConnectionChange({ connected: false, state: CONNECTION_STATE.FAILED });
            }
            return;
        }

        reconnectAttemptsRef.current++;
        const delay = Math.min(
            CONFIG.BASE_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current - 1),
            CONFIG.MAX_RECONNECT_DELAY
        );

        if (debug) {
            console.log(`🔄 Reconnect ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
        }

        setConnectionState(CONNECTION_STATE.RECONNECTING);
        reconnectInProgressRef.current = true;

        cleanup();
        reconnectTimerRef.current = setTimeout(() => {
            reconnectInProgressRef.current = false;
            if (mountedRef.current && !isConnectedRef.current && !isConnectingRef.current && enableRealTime) {
                connect();
            }
        }, delay);
    }, [enableRealTime, debug, cleanup, maxReconnectAttempts]);

    // ==========================================================
    // 🔑 AUTHENTICATION HANDLING
    // ==========================================================

    const handleAuthError = useCallback(() => {
        authErrorRef.current = true;
        setConnectionState(CONNECTION_STATE.AUTH_ERROR);
        setError('Authentication failed. Please refresh the page or login again.');
        
        const onConnectionChange = callbacksRef.current.onConnectionChange;
        if (onConnectionChange) {
            onConnectionChange({ connected: false, state: CONNECTION_STATE.AUTH_ERROR });
        }
        
        toast.error('Authentication failed. Please refresh the page.', {
            autoClose: false,
            toastId: 'ws-auth-error',
        });
    }, []);

    // ==========================================================
    // ✅ FIXED: CONNECT FUNCTION - SockJS uses HTTP URL
    // ==========================================================

    const connect = useCallback(() => {
        // ✅ Don't connect if real-time is disabled
        if (!enableRealTime) {
            if (debug) console.log('ℹ️ Real-time updates disabled');
            return;
        }

        // ✅ Check if already connected or connecting
        if (isConnectedRef.current) {
            if (debug) console.log('✅ Already connected');
            return;
        }

        if (isConnectingRef.current) {
            if (debug) console.log('⏳ Connection already in progress');
            return;
        }

        // ✅ Get token
        const token = getAuthToken();
        if (!token) {
            if (debug) console.log('❌ No token available for WebSocket');
            setError('Authentication required for real-time updates');
            setConnectionState(CONNECTION_STATE.AUTH_ERROR);
            return;
        }

        // ✅ Check if token needs refresh
        if (needsTokenRefresh(token)) {
            if (debug) console.log('🔄 Token needs refresh, attempting...');
            const refreshToken = tokenManager.getRefreshToken();
            if (!refreshToken) {
                if (debug) console.log('❌ No refresh token available');
                setError('Session expired. Please login again.');
                return;
            }
        }

        isConnectingRef.current = true;
        connectionAttemptRef.current++;
        setIsConnecting(true);
        setError(null);
        setConnectionState(CONNECTION_STATE.CONNECTING);

        if (debug) console.log(`🔌 Connecting to WebSocket (attempt ${connectionAttemptRef.current})...`);

        try {
            // ✅ FIXED: SockJS uses HTTP URL (NOT ws://)
            const httpUrl = getSockJSUrl();
            console.log('🌐 Connecting via SockJS to:', httpUrl);

            // ✅ Create SockJS with HTTP URL
            const socket = new SockJS(httpUrl, null, {
                transports: CONFIG.SOCKJS_TRANSPORTS,
                timeout: CONFIG.CONNECTION_TIMEOUT,
                heartbeat: heartbeatInterval,
                debug: debug,
                server: {
                    heartbeatInterval: heartbeatInterval,
                    maxRetries: 3,
                },
            });

            const client = new Client({
                webSocketFactory: () => socket,
                connectHeaders: {
                    Authorization: `Bearer ${token}`,
                    'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
                    'X-Client-Type': 'admin-dashboard',
                    'X-Connection-Id': `admin-${generateUniqueId()}`,
                    'X-Client-Platform': 'web',
                    'Accept-Language': 'en-US,en;q=0.9',
                },
                reconnectDelay: 0,
                heartbeatIncoming: heartbeatInterval,
                heartbeatOutgoing: heartbeatInterval,
                debug: (str) => {
                    if (debug && process.env.NODE_ENV === 'development') {
                        if (!str.includes('PING') && !str.includes('PONG') && !str.includes('heartbeat')) {
                            console.log('📡 STOMP:', str);
                        }
                    }
                },
                connectionTimeout: CONFIG.CONNECTION_TIMEOUT,
            });

            // ✅ On Connect
            client.onConnect = () => {
                if (!mountedRef.current) return;

                console.log('✅ WebSocket connected successfully');
                
                authErrorRef.current = false;
                
                isConnectedRef.current = true;
                isConnectingRef.current = false;
                setIsConnected(true);
                setIsConnecting(false);
                setError(null);
                setLastUpdated(new Date());
                setConnectionState(CONNECTION_STATE.CONNECTED);
                reconnectAttemptsRef.current = 0;
                reconnectInProgressRef.current = false;
                cleanup();

                // ✅ Subscribe to topics
                subscribeToTopics(client);

                // ✅ Send connection confirmation
                try {
                    client.publish({
                        destination: '/app/admin/connect',
                        body: JSON.stringify({
                            type: 'CONNECT',
                            timestamp: new Date().toISOString(),
                            clientId: `admin-${generateUniqueId()}`,
                            version: process.env.REACT_APP_VERSION || '1.0.0',
                        }),
                    });
                } catch (err) {
                    if (debug) console.warn('Failed to send connection confirmation:', err);
                }

                // ✅ Start heartbeat
                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                }
                heartbeatIntervalRef.current = setInterval(() => {
                    if (client.connected && mountedRef.current) {
                        try {
                            client.publish({
                                destination: '/app/heartbeat',
                                body: JSON.stringify({
                                    timestamp: Date.now(),
                                    clientId: `admin-${generateUniqueId()}`,
                                    type: 'HEARTBEAT',
                                }),
                            });
                        } catch (err) {
                            // Ignore heartbeat errors
                        }
                    }
                }, heartbeatInterval);

                toast.success('Real-time connection established', {
                    icon: '🔌',
                    autoClose: 3000,
                    toastId: 'ws-connected',
                });
            };

            // ✅ On STOMP Error
            client.onStompError = (frame) => {
                if (!mountedRef.current) return;

                console.error('❌ STOMP error:', frame);

                const errorMsg = frame.headers?.message || 'STOMP protocol error';
                const isAuthError = errorMsg.toLowerCase().includes('authentication') ||
                                   errorMsg.toLowerCase().includes('jwt') ||
                                   errorMsg.toLowerCase().includes('authorization') ||
                                   errorMsg.toLowerCase().includes('unauthorized') ||
                                   errorMsg.toLowerCase().includes('invalid token');

                isConnectedRef.current = false;
                isConnectingRef.current = false;
                setIsConnected(false);
                setIsConnecting(false);
                setConnectionState(isAuthError ? CONNECTION_STATE.AUTH_ERROR : CONNECTION_STATE.ERROR);
                setError(isAuthError ? 'Authentication failed for real-time updates' : errorMsg);

                const onError = callbacksRef.current.onError;
                if (onError) onError(frame);

                if (isAuthError) {
                    handleAuthError();
                } else {
                    toast.error(`STOMP Error: ${errorMsg}`, {
                        autoClose: 5000,
                    });
                    scheduleReconnection();
                }
            };

            // ✅ On WebSocket Error
            client.onWebSocketError = (event) => {
                if (!mountedRef.current) return;

                console.error('❌ WebSocket error:', event);
                isConnectedRef.current = false;
                isConnectingRef.current = false;
                setIsConnected(false);
                setIsConnecting(false);
                setConnectionState(CONNECTION_STATE.ERROR);

                const onError = callbacksRef.current.onError;
                if (onError) onError(event);

                if (!error) {
                    toast.error('WebSocket connection error. Reconnecting...', {
                        autoClose: 3000,
                        toastId: 'ws-error',
                    });
                }

                scheduleReconnection();
            };

            // ✅ On Disconnect
            client.onDisconnect = (receipt) => {
                if (!mountedRef.current) return;

                if (debug) console.log('WebSocket disconnected', receipt);

                if (heartbeatIntervalRef.current) {
                    clearInterval(heartbeatIntervalRef.current);
                    heartbeatIntervalRef.current = null;
                }

                isConnectedRef.current = false;
                isConnectingRef.current = false;
                setIsConnected(false);
                setIsConnecting(false);
                setConnectionState(CONNECTION_STATE.DISCONNECTED);

                if (!error && !authErrorRef.current) {
                    toast.info('Real-time connection lost. Reconnecting...', {
                        autoClose: 3000,
                        toastId: 'ws-disconnected',
                    });
                }

                scheduleReconnection();
            };

            // ✅ Connection timeout
            connectionTimeoutRef.current = setTimeout(() => {
                if (isConnectingRef.current && !isConnectedRef.current) {
                    if (debug) console.log('⏰ Connection timeout');
                    
                    setConnectionState(CONNECTION_STATE.ERROR);
                    setError('Connection timeout');
                    setIsConnecting(false);
                    
                    try {
                        client.deactivate();
                    } catch (err) {
                        // Ignore
                    }
                    
                    toast.error('Connection timeout. Retrying...', {
                        autoClose: 3000,
                        toastId: 'ws-timeout',
                    });
                    
                    scheduleReconnection();
                }
            }, CONFIG.CONNECTION_TIMEOUT);

            // ✅ Activate connection
            client.activate();
            clientRef.current = client;

        } catch (error) {
            console.error('❌ Failed to create WebSocket connection:', error);
            isConnectedRef.current = false;
            isConnectingRef.current = false;
            setIsConnected(false);
            setIsConnecting(false);
            setConnectionState(CONNECTION_STATE.ERROR);
            setError(error.message || 'Connection failed');
            scheduleReconnection();
        }
    }, [
        enableRealTime, 
        debug, 
        heartbeatInterval, 
        maxReconnectAttempts, 
        cleanup, 
        subscribeToTopics, 
        handleAuthError, 
        scheduleReconnection,
        error,
    ]);

    // ==========================================================
    // 🗑️ ALERT MANAGEMENT FUNCTIONS
    // ==========================================================

    const markAlertAsRead = useCallback((alertId) => {
        setAlerts(prev => prev.map(alert =>
            alert.id === alertId ? { ...alert, read: true } : alert
        ));
    }, []);

    const markAllAlertsAsRead = useCallback(() => {
        setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    }, []);

    const clearAlerts = useCallback(() => {
        setAlerts([]);
    }, []);

    const removeAlert = useCallback((alertId) => {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }, []);

    // ==========================================================
    // 🔄 DISCONNECT
    // ==========================================================

    const disconnect = useCallback(() => {
        if (debug) console.log('🔌 Disconnecting WebSocket...');

        cleanup();

        subscriptionsRef.current.forEach((subscription) => {
            try {
                if (subscription && typeof subscription.unsubscribe === 'function') {
                    subscription.unsubscribe();
                }
            } catch (error) {
                console.error('Error unsubscribing:', error);
            }
        });
        subscriptionsRef.current.clear();

        if (clientRef.current) {
            try {
                if (clientRef.current.connected) {
                    clientRef.current.deactivate();
                }
            } catch (error) {
                console.error('Error deactivating client:', error);
            }
        }

        clientRef.current = null;
        isConnectedRef.current = false;
        isConnectingRef.current = false;
        reconnectInProgressRef.current = false;
        setIsConnected(false);
        setIsConnecting(false);
        setError(null);
        setConnectionState(CONNECTION_STATE.DISCONNECTED);
        reconnectAttemptsRef.current = 0;
        
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }

        const onConnectionChange = callbacksRef.current.onConnectionChange;
        if (onConnectionChange) {
            onConnectionChange({ connected: false, state: CONNECTION_STATE.DISCONNECTED });
        }
    }, [cleanup, debug]);

    // ==========================================================
    // 🔄 RECONNECT
    // ==========================================================

    const reconnect = useCallback(() => {
        if (debug) console.log('🔄 Manual reconnect requested');
        reconnectAttemptsRef.current = 0;
        reconnectInProgressRef.current = false;
        disconnect();
        setTimeout(() => {
            if (mountedRef.current && enableRealTime) {
                connect();
            }
        }, 500);
    }, [disconnect, connect, enableRealTime, debug]);

    // ==========================================================
    // 🔄 FORCE RECONNECT
    // ==========================================================

    const forceReconnect = useCallback(() => {
        if (debug) console.log('🔄 Force reconnect requested');
        authErrorRef.current = false;
        reconnectAttemptsRef.current = 0;
        reconnectInProgressRef.current = false;
        disconnect();
        setTimeout(() => {
            if (mountedRef.current && enableRealTime) {
                setError(null);
                connect();
            }
        }, 1000);
    }, [disconnect, connect, enableRealTime, debug]);

    // ==========================================================
    // 🔄 LIFECYCLE EFFECTS
    // ==========================================================

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            disconnect();
        };
    }, [disconnect]);

    useEffect(() => {
        if (!enableRealTime) {
            if (debug) console.log('ℹ️ Real-time updates disabled');
            disconnect();
            return;
        }

        if (autoConnect) {
            const token = getAuthToken();
            if (token) {
                const timer = setTimeout(() => {
                    if (mountedRef.current && !isConnectedRef.current && !isConnectingRef.current) {
                        connect();
                    }
                }, 200);
                return () => clearTimeout(timer);
            } else {
                if (debug) console.log('⏳ No token available, waiting for authentication');
                setError('Waiting for authentication...');
                setConnectionState(CONNECTION_STATE.AUTH_ERROR);
                
                const tokenCheckInterval = setInterval(() => {
                    const newToken = getAuthToken();
                    if (newToken && mountedRef.current && !isConnectedRef.current && !isConnectingRef.current) {
                        if (debug) console.log('✅ Token detected, connecting...');
                        connect();
                        clearInterval(tokenCheckInterval);
                    }
                }, 3000);
                
                return () => clearInterval(tokenCheckInterval);
            }
        }

        return () => {
            if (!autoConnect) return;
            if (!isConnectingRef.current) {
                disconnect();
            }
        };
    }, [enableRealTime, autoConnect, connect, disconnect, debug]);

    useEffect(() => {
        const handleTokenChange = () => {
            const token = getAuthToken();
            if (token && enableRealTime && autoConnect) {
                if (debug) console.log('🔑 Token changed, reconnecting...');
                if (!isConnectedRef.current && !isConnectingRef.current && !reconnectInProgressRef.current) {
                    authErrorRef.current = false;
                    reconnectAttemptsRef.current = 0;
                    reconnect();
                } else if (isConnectedRef.current && authErrorRef.current) {
                    authErrorRef.current = false;
                    reconnect();
                }
            }
        };

        window.addEventListener('storage', handleTokenChange);
        window.addEventListener('token-refreshed', handleTokenChange);
        window.addEventListener('auth:logout', () => {
            if (debug) console.log('🔑 Auth logout event received');
            disconnect();
            setConnectionState(CONNECTION_STATE.AUTH_ERROR);
            setError('Logged out. Please login again.');
        });
        window.addEventListener('auth:login', () => {
            if (debug) console.log('🔑 Auth login event received');
            const token = getAuthToken();
            if (token && enableRealTime && autoConnect) {
                reconnect();
            }
        });

        return () => {
            window.removeEventListener('storage', handleTokenChange);
            window.removeEventListener('token-refreshed', handleTokenChange);
            window.removeEventListener('auth:logout', handleTokenChange);
            window.removeEventListener('auth:login', handleTokenChange);
        };
    }, [enableRealTime, autoConnect, reconnect, disconnect, debug]);

    useEffect(() => {
        const handleOnline = () => {
            if (debug) console.log('🌐 Network online');
            if (!isConnectedRef.current && enableRealTime && autoConnect) {
                const token = getAuthToken();
                if (token) {
                    reconnect();
                }
            }
        };

        const handleOffline = () => {
            if (debug) console.log('🌐 Network offline');
            setConnectionState(CONNECTION_STATE.DISCONNECTED);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [enableRealTime, autoConnect, reconnect, debug]);

    // ==========================================================
    // 📤 RETURN VALUES
    // ==========================================================

    return {
        connected: isConnected,
        connecting: isConnecting,
        disconnected: !isConnected && !isConnecting,
        connectionState: connectionState,
        error: error,
        lastUpdated: lastUpdated,
        isConnected: isConnected,
        isConnecting: isConnecting,

        alerts: alerts,
        unreadCount: unreadCount,
        hasCriticalAlerts: hasCriticalAlerts,
        recentAlerts: recentAlerts,

        markAlertAsRead: markAlertAsRead,
        markAllAlertsAsRead: markAllAlertsAsRead,
        clearAlerts: clearAlerts,
        removeAlert: removeAlert,

        connect: connect,
        disconnect: disconnect,
        reconnect: reconnect,
        forceReconnect: forceReconnect,

        ALERT_SEVERITY: ALERT_SEVERITY,
        TOPICS: TOPICS,
        CONNECTION_STATE: CONNECTION_STATE,

        subscriptionCount: subscriptionsRef.current.size,
        reconnectAttempts: reconnectAttemptsRef.current,
        connectionAttempt: connectionAttemptRef.current,
        
        isHealthy: isConnected && !authErrorRef.current && !error,
        
        getConnectionDetails: () => ({
            state: connectionState,
            connected: isConnected,
            connecting: isConnecting,
            error: error,
            lastUpdated: lastUpdated,
            reconnectAttempts: reconnectAttemptsRef.current,
            subscriptionCount: subscriptionsRef.current.size,
            authError: authErrorRef.current,
        }),
    };
};

export default useAdminDashboardSocket;