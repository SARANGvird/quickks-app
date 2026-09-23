// src/hooks/useDashboardSocket.js - COMPLETE CORRECTED VERSION
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import api from "../api/api";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";

// ==========================================================
// CONSTANTS
// ==========================================================
export const CONNECTION_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

export const DASHBOARD_TOPICS = {
  STATS: '/topic/admin/stats',
  REVENUE: '/topic/admin/revenue',
  PROVIDERS: '/topic/admin/providers',
  BOOKINGS: '/topic/admin/bookings',
  ALERTS: '/topic/admin/alerts',
  HEARTBEAT: '/topic/admin/heartbeat'
};

const DEFAULT_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 4000;
const DATA_REFRESH_INTERVAL = 30000;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

// ==========================================================
// CUSTOM HOOK
// ==========================================================
export const useDashboardSocket = (options = {}) => {
  const {
    autoConnect = false,  // ✅ Default to false
    enableRealtime = false,
    enablePolling = true,
    pollingInterval = DATA_REFRESH_INTERVAL,
    onStatsUpdate,
    onError: onErrorCallback,
    onReconnect
  } = options;

  const { token, user, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();

  // ==========================================================
  // REFS - Prevent infinite loops
  // ==========================================================
  const clientRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const mountedRef = useRef(true);
  const connectingRef = useRef(false);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const isFetchingRef = useRef(false);
  const initialFetchDoneRef = useRef(false);

  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [connectionState, setConnectionState] = useState(CONNECTION_STATES.DISCONNECTED);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Dashboard Data State
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsersToday: 0,
    userGrowthRate: 0,
    totalProviders: 0,
    activeProviders: 0,
    pendingProviders: 0,
    suspendedProviders: 0,
    rejectedProviders: 0,
    providerGrowthRate: 0,
    totalBookings: 0,
    pendingBookings: 0,
    completedBookings: 0,
    cancelledBookings: 0,
    bookingGrowthRate: 0,
    totalRevenue: 0,
    todayRevenue: 0,
    pendingPayments: 0,
    revenueGrowthRate: 0,
    activeComplaints: 0,
    resolvedComplaints: 0,
    averageRating: 0,
    systemHealth: 'healthy',
    serverUptime: 0
  });

  const [revenueTrend, setRevenueTrend] = useState([]);
  const [bookingTrend, setBookingTrend] = useState([]);
  const [providerStatusData, setProviderStatusData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [topProviders, setTopProviders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [serviceDemand, setServiceDemand] = useState([]);

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================
  const isConnected = connectionState === CONNECTION_STATES.CONNECTED;
  const isConnecting = connectionState === CONNECTION_STATES.CONNECTING || 
                       connectionState === CONNECTION_STATES.RECONNECTING;

  const completionRate = useMemo(() => {
    if (stats.totalBookings === 0) return 0;
    return (stats.completedBookings / stats.totalBookings) * 100;
  }, [stats.completedBookings, stats.totalBookings]);

  const providerApprovalRate = useMemo(() => {
    if (stats.totalProviders === 0) return 0;
    return ((stats.activeProviders || stats.verifiedProviders || 0) / stats.totalProviders) * 100;
  }, [stats.activeProviders, stats.verifiedProviders, stats.totalProviders]);

  // ==========================================================
  // DATA MAPPERS
  // ==========================================================
  const mapDashboardData = useCallback((data) => {
    if (!mountedRef.current || !data) return;
    if (isFetchingRef.current) return;
    
    isFetchingRef.current = true;
    
    try {
      setStats(prev => ({
        ...prev,
        totalUsers: data.totalUsers ?? prev.totalUsers,
        activeUsers: data.activeUsers ?? prev.activeUsers,
        newUsersToday: data.newUsersToday ?? prev.newUsersToday,
        userGrowthRate: data.userGrowthRate ?? prev.userGrowthRate,
        totalProviders: data.totalProviders ?? prev.totalProviders,
        activeProviders: data.activeProviders ?? data.verifiedProviders ?? prev.activeProviders,
        pendingProviders: data.pendingProviders ?? prev.pendingProviders,
        suspendedProviders: data.suspendedProviders ?? prev.suspendedProviders,
        rejectedProviders: data.rejectedProviders ?? prev.rejectedProviders,
        providerGrowthRate: data.providerGrowthRate ?? prev.providerGrowthRate,
        totalBookings: data.totalBookings ?? prev.totalBookings,
        pendingBookings: data.pendingBookings ?? prev.pendingBookings,
        completedBookings: data.completedBookings ?? prev.completedBookings,
        cancelledBookings: data.cancelledBookings ?? prev.cancelledBookings,
        bookingGrowthRate: data.bookingGrowthRate ?? prev.bookingGrowthRate,
        totalRevenue: data.totalRevenue ?? prev.totalRevenue,
        todayRevenue: data.todayRevenue ?? data.revenueToday ?? prev.todayRevenue,
        pendingPayments: data.pendingPayments ?? prev.pendingPayments,
        revenueGrowthRate: data.revenueGrowthRate ?? prev.revenueGrowthRate,
        activeComplaints: data.activeComplaints ?? prev.activeComplaints,
        resolvedComplaints: data.resolvedComplaints ?? prev.resolvedComplaints,
        averageRating: data.averageRating ?? prev.averageRating,
        systemHealth: data.systemHealth ?? prev.systemHealth,
        serverUptime: data.serverUptime ?? prev.serverUptime
      }));

      if (Array.isArray(data.revenueTrend)) {
        setRevenueTrend(data.revenueTrend);
      }

      if (Array.isArray(data.bookingTrend)) {
        setBookingTrend(data.bookingTrend);
      }

      if (Array.isArray(data.providerStatusData)) {
        setProviderStatusData(data.providerStatusData);
      } else if (data.activeProviders !== undefined || data.verifiedProviders !== undefined) {
        const active = data.activeProviders || data.verifiedProviders || 0;
        const pending = data.pendingProviders || 0;
        const suspended = data.suspendedProviders || 0;
        const rejected = data.rejectedProviders || 0;
        
        const newData = [];
        if (active > 0) newData.push({ name: "Active", value: active, color: "#10b981" });
        if (pending > 0) newData.push({ name: "Pending", value: pending, color: "#f59e0b" });
        if (suspended > 0) newData.push({ name: "Suspended", value: suspended, color: "#ef4444" });
        if (rejected > 0) newData.push({ name: "Rejected", value: rejected, color: "#8b5cf6" });
        
        if (newData.length > 0) {
          setProviderStatusData(newData);
        }
      }

      if (Array.isArray(data.recentActivities)) {
        setRecentActivities(data.recentActivities);
      }

      if (Array.isArray(data.topProviders)) {
        setTopProviders(data.topProviders);
      }

      if (Array.isArray(data.serviceDemand)) {
        setServiceDemand(data.serviceDemand);
      }

      setLastUpdated(new Date(data.lastUpdated || data.timestamp || Date.now()));
      setRefreshKey(prev => prev + 1);
      
      if (onStatsUpdate) {
        onStatsUpdate(data);
      }
    } catch (err) {
      console.error('Error mapping dashboard data:', err);
    } finally {
      isFetchingRef.current = false;
    }
  }, [onStatsUpdate]);

  // ==========================================================
  // ERROR HANDLING
  // ==========================================================
  const handleError = useCallback((error, context = 'general') => {
    if (!mountedRef.current) return;
    
    console.error(`❌ Dashboard Socket Error [${context}]:`, error);
    
    const errorMessage = error?.message || error?.headers?.message || 'Dashboard connection error';
    
    setError(prev => {
      if (prev?.message === errorMessage && prev?.context === context) {
        return prev;
      }
      return {
        message: errorMessage,
        context,
        timestamp: new Date().toISOString()
      };
    });
    
    setConnectionState(CONNECTION_STATES.ERROR);
    
    addNotification?.({
      type: 'error',
      title: 'Dashboard Error',
      message: `Failed to ${context}: ${errorMessage}`,
      duration: 5000
    });
    
    if (onErrorCallback) {
      onErrorCallback(error, context);
    }
  }, [addNotification, onErrorCallback]);

  // ==========================================================
  // REST API SNAPSHOT
  // ==========================================================
  const fetchDashboardSnapshot = useCallback(async () => {
    if (!isAuthenticated || !token) {
      console.log('⚠️ Not authenticated, skipping dashboard fetch');
      return;
    }
    if (isFetchingRef.current) {
      console.log('⏳ Fetch already in progress, skipping');
      return;
    }
    
    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      console.log('📊 Fetching dashboard snapshot...');
      const response = await api.get('/api/v1/dashboard/stats');
      
      let data = response?.data?.data ?? response?.data ?? response;
      
      if (data) {
        mapDashboardData(data);
        setError(null);
        console.log('✅ Dashboard snapshot fetched successfully');
      } else {
        console.warn('⚠️ No data received from dashboard API');
      }
    } catch (err) {
      console.error('❌ Failed to fetch dashboard snapshot:', err);
      handleError(err, 'fetch-snapshot');
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, isAuthenticated, mapDashboardData, handleError]);

  // ==========================================================
  // POLLING FALLBACK
  // ==========================================================
  const startPolling = useCallback(() => {
    if (!enablePolling) return;
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    console.log(`🔄 Starting dashboard polling every ${pollingInterval}ms`);
    
    pollingIntervalRef.current = setInterval(() => {
      if (mountedRef.current && !isFetchingRef.current && !isConnected) {
        fetchDashboardSnapshot();
      }
    }, pollingInterval);
  }, [enablePolling, pollingInterval, fetchDashboardSnapshot, isConnected]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      console.log('⏹️ Dashboard polling stopped');
    }
  }, []);

  // ==========================================================
  // HEARTBEAT MANAGEMENT
  // ==========================================================
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (clientRef.current?.connected && mountedRef.current) {
        try {
          clientRef.current.publish({
            destination: '/app/admin/heartbeat',
            body: JSON.stringify({
              userId: user?.id,
              timestamp: new Date().toISOString(),
              type: 'ping'
            })
          });
        } catch (err) {
          console.error('Heartbeat publish error:', err);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [user?.id]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ==========================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================
  const subscribeToTopics = useCallback((client) => {
    if (!client || !client.connected) {
      console.warn('Cannot subscribe: client not connected');
      return;
    }

    console.log('📡 Subscribing to dashboard topics...');

    // Subscribe to stats topic
    try {
      const statsSub = client.subscribe(DASHBOARD_TOPICS.STATS, (message) => {
        if (!mountedRef.current) return;
        try {
          const payload = JSON.parse(message.body);
          mapDashboardData(payload?.data ?? payload);
        } catch (err) {
          console.error('Failed to parse stats message:', err);
        }
      });
      subscriptionsRef.current.set(DASHBOARD_TOPICS.STATS, statsSub);
    } catch (err) {
      console.error('Failed to subscribe to stats:', err);
    }

    // Subscribe to revenue topic
    try {
      const revenueSub = client.subscribe(DASHBOARD_TOPICS.REVENUE, (message) => {
        if (!mountedRef.current) return;
        try {
          const payload = JSON.parse(message.body);
          if (Array.isArray(payload?.data)) {
            setRevenueTrend(payload.data);
          } else if (Array.isArray(payload)) {
            setRevenueTrend(payload);
          }
        } catch (err) {
          console.error('Failed to parse revenue message:', err);
        }
      });
      subscriptionsRef.current.set(DASHBOARD_TOPICS.REVENUE, revenueSub);
    } catch (err) {
      console.error('Failed to subscribe to revenue:', err);
    }

    // Subscribe to providers topic
    try {
      const providersSub = client.subscribe(DASHBOARD_TOPICS.PROVIDERS, (message) => {
        if (!mountedRef.current) return;
        try {
          const payload = JSON.parse(message.body);
          if (Array.isArray(payload?.data)) {
            setProviderStatusData(payload.data);
          }
        } catch (err) {
          console.error('Failed to parse providers message:', err);
        }
      });
      subscriptionsRef.current.set(DASHBOARD_TOPICS.PROVIDERS, providersSub);
    } catch (err) {
      console.error('Failed to subscribe to providers:', err);
    }

    // Subscribe to alerts topic
    try {
      const alertsSub = client.subscribe(DASHBOARD_TOPICS.ALERTS, (message) => {
        if (!mountedRef.current) return;
        try {
          const payload = JSON.parse(message.body);
          setAlerts(prev => [payload, ...prev].slice(0, 50));
          
          if (payload.severity === 'critical') {
            addNotification?.({
              type: 'error',
              title: 'Critical Alert',
              message: payload.message,
              duration: 0,
              persistent: true
            });
          } else if (payload.severity === 'high') {
            addNotification?.({
              type: 'warning',
              title: 'System Alert',
              message: payload.message,
              duration: 10000
            });
          } else if (payload.severity === 'medium') {
            addNotification?.({
              type: 'info',
              title: 'System Alert',
              message: payload.message,
              duration: 5000
            });
          }
        } catch (err) {
          console.error('Failed to parse alert message:', err);
        }
      });
      subscriptionsRef.current.set(DASHBOARD_TOPICS.ALERTS, alertsSub);
    } catch (err) {
      console.error('Failed to subscribe to alerts:', err);
    }

    console.log(`📡 Subscribed to ${subscriptionsRef.current.size} dashboard topics`);
  }, [mapDashboardData, addNotification]);

  const unsubscribeFromTopics = useCallback(() => {
    subscriptionsRef.current.forEach((subscription, topic) => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try {
          subscription.unsubscribe();
          console.log(`📡 Unsubscribed from: ${topic}`);
        } catch (err) {
          console.error(`Error unsubscribing from ${topic}:`, err);
        }
      }
    });
    subscriptionsRef.current.clear();
  }, []);

  // ==========================================================
  // RECONNECT LOGIC
  // ==========================================================
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    if (!enableRealtime) {
      console.log('⚠️ Realtime disabled, not reconnecting');
      startPolling();
      return;
    }
    
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      setConnectionState(CONNECTION_STATES.ERROR);
      startPolling();
      return;
    }
    
    const delay = Math.min(DEFAULT_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
    console.log(`🔄 Scheduling dashboard reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    setConnectionState(CONNECTION_STATES.RECONNECTING);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        reconnectAttemptsRef.current++;
        connectWebSocket();
      }
    }, delay);
  }, [enableRealtime, startPolling]);

  // ==========================================================
  // WEBSOCKET CONNECTION - ✅ Declared BEFORE being used
  // ==========================================================
  const connectWebSocket = useCallback(() => {
    if (!enableRealtime) {
      console.log('⚠️ Realtime disabled, skipping WebSocket connection');
      startPolling();
      return;
    }
    
    if (!isAuthenticated || !token) {
      console.log('⚠️ Not authenticated, skipping dashboard WebSocket connection');
      startPolling();
      return;
    }
    
    if (connectingRef.current) {
      console.log('⏳ Connection already in progress');
      return;
    }
    
    if (clientRef.current?.connected) {
      console.log('✅ Already connected');
      return;
    }
    
    connectingRef.current = true;
    setConnectionState(CONNECTION_STATES.CONNECTING);
    
    const wsUrl = process.env.REACT_APP_WS_URL || "http://localhost:8081/quickks/ws";
    console.log(`🔌 Connecting to Dashboard WebSocket: ${wsUrl}`);
    
    const client = new Client({
      webSocketFactory: () => new SockJS(wsUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        token: token,
        userId: String(user?.id || ''),
        userRole: user?.role || 'ADMIN'
      },
      reconnectDelay: DEFAULT_RECONNECT_DELAY,
      heartbeatIncoming: HEARTBEAT_INTERVAL,
      heartbeatOutgoing: HEARTBEAT_INTERVAL,
      debug: (msg) => {
        if (process.env.NODE_ENV === 'development') {
          if (!msg.includes('PING') && !msg.includes('PONG') && !msg.includes('heartbeat')) {
            console.debug('STOMP:', msg);
          }
        }
      }
    });
    
    client.onConnect = () => {
      if (!mountedRef.current) {
        client.deactivate();
        return;
      }
      
      connectingRef.current = false;
      reconnectAttemptsRef.current = 0;
      setConnectionState(CONNECTION_STATES.CONNECTED);
      setError(null);
      
      console.log('✅ Dashboard WebSocket connected');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      if (onReconnect && reconnectAttemptsRef.current > 0) {
        onReconnect({ attempts: reconnectAttemptsRef.current });
      }
      
      subscribeToTopics(client);
      startHeartbeat();
      stopPolling();
      
      // Fetch initial data on connect
      fetchDashboardSnapshot();
    };
    
    client.onStompError = (frame) => {
      connectingRef.current = false;
      console.error('❌ STOMP Error:', frame.headers?.message);
      handleError(new Error(frame.headers?.message), 'stomp');
      setConnectionState(CONNECTION_STATES.ERROR);
      scheduleReconnect();
    };
    
    client.onWebSocketError = (event) => {
      console.error('❌ WebSocket Error:', event);
      handleError(new Error('WebSocket error'), 'websocket');
      setConnectionState(CONNECTION_STATES.ERROR);
      scheduleReconnect();
    };
    
    client.onWebSocketClose = (event) => {
      connectingRef.current = false;
      console.log(`🔌 WebSocket Closed - Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
      stopHeartbeat();
      
      if (event.code !== 1000 && event.code !== 1001) {
        scheduleReconnect();
      } else {
        startPolling();
      }
    };
    
    client.onDisconnect = () => {
      console.log('🔌 Dashboard WebSocket disconnected');
      setConnectionState(CONNECTION_STATES.DISCONNECTED);
      stopHeartbeat();
    };
    
    client.activate();
    clientRef.current = client;
  }, [token, isAuthenticated, user, subscribeToTopics, startHeartbeat, stopPolling, 
      scheduleReconnect, handleError, enableRealtime, fetchDashboardSnapshot, onReconnect, startPolling]);

  const disconnectWebSocket = useCallback(() => {
    console.log('🔌 Disconnecting Dashboard WebSocket');
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    unsubscribeFromTopics();
    stopHeartbeat();
    
    if (clientRef.current) {
      try {
        clientRef.current.deactivate();
      } catch (err) {
        console.error('Error deactivating client:', err);
      }
      clientRef.current = null;
    }
    
    connectingRef.current = false;
    setConnectionState(CONNECTION_STATES.DISCONNECTED);
  }, [unsubscribeFromTopics, stopHeartbeat]);

  const manualReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnectWebSocket();
    setTimeout(() => connectWebSocket(), 1000);
  }, [disconnectWebSocket, connectWebSocket]);

  // ==========================================================
  // REFRESH DATA
  // ==========================================================
  const refreshData = useCallback(() => {
    if (!isFetchingRef.current) {
      fetchDashboardSnapshot();
    }
  }, [fetchDashboardSnapshot]);

  // ==========================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    
    // Only fetch once on mount
    if (!initialFetchDoneRef.current) {
      fetchDashboardSnapshot();
      initialFetchDoneRef.current = true;
    }
    
    // Auto-connect if enabled
    if (autoConnect && enableRealtime) {
      connectWebSocket();
    }
    
    // Start polling as fallback
    if (enablePolling && !enableRealtime) {
      startPolling();
    }
    
    return () => {
      mountedRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      disconnectWebSocket();
      stopPolling();
      stopHeartbeat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // ==========================================================
  // RETURN VALUES
  // ==========================================================
  return {
    // Connection state
    isConnected,
    isConnecting,
    connectionState,
    reconnectAttempts: reconnectAttemptsRef.current,
    
    // Data state
    stats,
    revenueTrend,
    bookingTrend,
    providerStatusData,
    recentActivities,
    topProviders,
    alerts,
    serviceDemand,
    
    // UI state
    loading,
    error,
    lastUpdated,
    refreshKey,
    
    // Derived values
    completionRate,
    providerApprovalRate,
    formatCurrency,
    
    // Actions
    refreshData,
    connect: connectWebSocket,
    disconnect: disconnectWebSocket,
    manualReconnect,
    fetchSnapshot: fetchDashboardSnapshot,
    
    // Utility
    isRealtimeConnected: isConnected && enableRealtime,
    isPolling: !isConnected && enablePolling,
    isRealtimeEnabled: enableRealtime
  };
};

export default useDashboardSocket;