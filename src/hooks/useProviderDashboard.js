// src/hooks/useProviderDashboard.js
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { TokenManager } from '../api/api';
import { toast } from 'react-toastify';

// ==========================================================
// CONFIGURATION
// ==========================================================
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 2000;
const MAX_RECONNECT_DELAY = 30000;
const HEARTBEAT_INTERVAL = 4000;
const CONNECTION_TIMEOUT = 10000;

// WebSocket Topics for Provider
const TOPICS = {
  PROVIDER_BOOKINGS: '/user/queue/provider/bookings',
  PROVIDER_NOTIFICATIONS: '/user/queue/provider/notifications',
  PROVIDER_STATS: '/user/queue/provider/stats',
  NEW_BOOKINGS: '/topic/provider/new-bookings',
  BOOKING_UPDATES: '/topic/provider/booking-updates',
  EARNINGS_UPDATES: '/user/queue/provider/earnings',
  SCHEDULE_UPDATES: '/user/queue/provider/schedule',
  REVIEWS: '/user/queue/provider/reviews'
};

// Alert Severity Levels
const ALERT_SEVERITY = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

// Booking Status Types
const BOOKING_STATUS = {
  REQUESTED: 'REQUESTED',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  STARTED: 'STARTED',
  PROVIDER_STARTED: 'PROVIDER_STARTED',
  COMPLETED_BY_PROVIDER: 'COMPLETED_BY_PROVIDER',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REJECTED: 'REJECTED'
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};

// ==========================================================
// CUSTOM HOOK
// ==========================================================
const useProviderDashboard = (options = {}) => {
  const {
    enableRealTime = true,
    maxNotifications = 50,
    onNewBooking,
    onBookingUpdate,
    onStatsUpdate,
    onEarningsUpdate,
    onNotification,
    onScheduleUpdate,
    onReview,
    onError,
    autoConnect = true
  } = options;

  // State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [providerStats, setProviderStats] = useState(null);
  const [pendingBookings, setPendingBookings] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [weeklyEarnings, setWeeklyEarnings] = useState(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState(0);
  
  // Refs
  const clientRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  // Derived values
  const unreadCount = useMemo(() => 
    notifications.filter(notif => !notif.read).length, 
    [notifications]
  );
  
  const hasCriticalNotifications = useMemo(() => 
    notifications.some(notif => notif.severity === ALERT_SEVERITY.CRITICAL && !notif.read), 
    [notifications]
  );
  
  const recentNotifications = useMemo(() => 
    notifications.slice(0, 10), 
    [notifications]
  );

  // Set mounted ref
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
  }, []);

  // ==========================================================
  // CONNECTION MANAGEMENT
  // ==========================================================
  
  const scheduleReconnection = useCallback(() => {
    if (!mountedRef.current) return;
    
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnection attempts reached');
      setConnectionError('Unable to establish real-time connection. Please refresh the page.');
      setIsConnecting(false);
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(
      BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current - 1),
      MAX_RECONNECT_DELAY
    );
    
    console.log(`🔄 Reconnection attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    
    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current && !isConnected && !isConnecting && enableRealTime) {
        connect();
      }
    }, delay);
  }, [isConnected, isConnecting, enableRealTime]);

  const connect = useCallback(() => {
    if (!enableRealTime) {
      console.log('Real-time updates are disabled');
      return;
    }

    const token = TokenManager.getAccessToken();
    if (!token) {
      console.log('No token available for WebSocket connection');
      setConnectionError('Authentication required for real-time updates');
      return;
    }

    // Don't connect if already connected or connecting
    if (clientRef.current?.connected || isConnecting) {
      console.log('WebSocket already connected or connecting');
      return;
    }

    setIsConnecting(true);
    setConnectionError(null);
    console.log('🔌 Connecting to Provider WebSocket...');

    try {
      const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8081';
      const wsUrl = `${baseUrl}/quickks/ws`;
      const socket = new SockJS(wsUrl);
      
      const client = new Client({
        webSocketFactory: () => socket,
        connectHeaders: {
          Authorization: `Bearer ${token}`,
          'X-Client-Version': process.env.REACT_APP_VERSION || '1.0.0',
          'X-Client-Type': 'provider-dashboard'
        },
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            console.log('STOMP:', str);
          }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: HEARTBEAT_INTERVAL,
        heartbeatOutgoing: HEARTBEAT_INTERVAL,
        onConnect: () => {
          console.log('✅ Provider WebSocket connected successfully');
          setIsConnected(true);
          setIsConnecting(false);
          setConnectionError(null);
          reconnectAttemptsRef.current = 0;
          setLastUpdated(new Date());
          subscribeToTopics(client);
          
          toast.success('Real-time connection established', {
            icon: '🔌',
            autoClose: 3000
          });
        },
        onStompError: (frame) => {
          console.error('❌ STOMP error:', frame);
          setIsConnecting(false);
          
          const errorMsg = frame.headers?.message || 'STOMP protocol error';
          if (errorMsg.includes('Authentication') || errorMsg.includes('JWT')) {
            setConnectionError('Authentication failed for real-time updates');
            toast.error('Authentication failed. Please refresh the page.');
          } else {
            setConnectionError(errorMsg);
            scheduleReconnection();
          }
          onError?.(frame);
        },
        onWebSocketError: (event) => {
          console.error('❌ WebSocket error:', event);
          setIsConnected(false);
          setIsConnecting(false);
          setConnectionError('WebSocket connection error');
          scheduleReconnection();
          onError?.(event);
        },
        onDisconnect: () => {
          console.log('Provider WebSocket disconnected');
          setIsConnected(false);
          setIsConnecting(false);
          scheduleReconnection();
        },
      });

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (isConnecting && !isConnected) {
          console.log('Connection timeout');
          client.deactivate();
          setIsConnecting(false);
          setConnectionError('Connection timeout');
          scheduleReconnection();
        }
      }, CONNECTION_TIMEOUT);

      client.activate();
      clientRef.current = client;
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(error.message);
      scheduleReconnection();
    }
  }, [enableRealTime, isConnecting, isConnected, onError, scheduleReconnection]);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting Provider WebSocket...');
    
    cleanup();
    
    if (clientRef.current) {
      try {
        // Unsubscribe from all topics
        subscriptionsRef.current.forEach((subscription, topic) => {
          try {
            if (subscription && typeof subscription.unsubscribe === 'function') {
              subscription.unsubscribe();
              console.log(`Unsubscribed from ${topic}`);
            }
          } catch (error) {
            console.error(`Error unsubscribing from ${topic}:`, error);
          }
        });
        
        // Deactivate client
        if (clientRef.current.connected) {
          clientRef.current.deactivate();
        }
      } catch (error) {
        console.error('Error during disconnect:', error);
      }
    }
    
    subscriptionsRef.current.clear();
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionError(null);
    clientRef.current = null;
    reconnectAttemptsRef.current = 0;
  }, [cleanup]);

  // ==========================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================
  
  const subscribeToTopics = useCallback((client) => {
    if (!client || !client.connected) return;

    console.log('📡 Subscribing to provider topics...');

    // Subscribe to new bookings (public topic)
    const newBookingSub = client.subscribe(TOPICS.NEW_BOOKINGS, (message) => {
      try {
        const bookingData = JSON.parse(message.body);
        handleNewBooking(bookingData);
      } catch (error) {
        console.error('Error parsing new booking message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.NEW_BOOKINGS, newBookingSub);

    // Subscribe to booking updates (user-specific)
    const bookingUpdateSub = client.subscribe(TOPICS.BOOKING_UPDATES, (message) => {
      try {
        const bookingData = JSON.parse(message.body);
        handleBookingUpdate(bookingData);
      } catch (error) {
        console.error('Error parsing booking update message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.BOOKING_UPDATES, bookingUpdateSub);

    // Subscribe to provider bookings (user-specific queue)
    const providerBookingsSub = client.subscribe(TOPICS.PROVIDER_BOOKINGS, (message) => {
      try {
        const data = JSON.parse(message.body);
        handleProviderBookings(data);
      } catch (error) {
        console.error('Error parsing provider bookings message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.PROVIDER_BOOKINGS, providerBookingsSub);

    // Subscribe to provider notifications
    const notificationsSub = client.subscribe(TOPICS.PROVIDER_NOTIFICATIONS, (message) => {
      try {
        const notificationData = JSON.parse(message.body);
        handleNewNotification(notificationData);
      } catch (error) {
        console.error('Error parsing notification message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.PROVIDER_NOTIFICATIONS, notificationsSub);

    // Subscribe to provider stats
    const statsSub = client.subscribe(TOPICS.PROVIDER_STATS, (message) => {
      try {
        const statsData = JSON.parse(message.body);
        handleStatsUpdate(statsData);
      } catch (error) {
        console.error('Error parsing stats message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.PROVIDER_STATS, statsSub);

    // Subscribe to earnings updates
    const earningsSub = client.subscribe(TOPICS.EARNINGS_UPDATES, (message) => {
      try {
        const earningsData = JSON.parse(message.body);
        handleEarningsUpdate(earningsData);
      } catch (error) {
        console.error('Error parsing earnings message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.EARNINGS_UPDATES, earningsSub);

    // Subscribe to schedule updates
    const scheduleSub = client.subscribe(TOPICS.SCHEDULE_UPDATES, (message) => {
      try {
        const scheduleData = JSON.parse(message.body);
        handleScheduleUpdate(scheduleData);
      } catch (error) {
        console.error('Error parsing schedule message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.SCHEDULE_UPDATES, scheduleSub);

    // Subscribe to reviews
    const reviewsSub = client.subscribe(TOPICS.REVIEWS, (message) => {
      try {
        const reviewData = JSON.parse(message.body);
        handleNewReview(reviewData);
      } catch (error) {
        console.error('Error parsing review message:', error);
      }
    });
    subscriptionsRef.current.set(TOPICS.REVIEWS, reviewsSub);
    
    console.log(`✅ Subscribed to ${subscriptionsRef.current.size} provider topics`);
  }, []);

  // ==========================================================
  // EVENT HANDLERS
  // ==========================================================
  
  const handleNewBooking = useCallback((bookingData) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    
    // Add to pending bookings
    setPendingBookings(prev => [bookingData, ...prev]);
    
    // Show toast notification
    toast.info(`New booking request: ${bookingData.serviceType}`, {
      position: 'top-right',
      autoClose: 10000,
      icon: '📅'
    });
    
    onNewBooking?.(bookingData);
  }, [onNewBooking]);

  const handleBookingUpdate = useCallback((bookingData) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    
    // Update booking in appropriate lists
    if (bookingData.status === BOOKING_STATUS.ASSIGNED || 
        bookingData.status === BOOKING_STATUS.ACCEPTED) {
      setActiveBookings(prev => {
        const filtered = prev.filter(b => b.id !== bookingData.id);
        return [bookingData, ...filtered];
      });
      setPendingBookings(prev => prev.filter(b => b.id !== bookingData.id));
    } else if (bookingData.status === BOOKING_STATUS.COMPLETED ||
               bookingData.status === BOOKING_STATUS.CANCELLED) {
      setActiveBookings(prev => prev.filter(b => b.id !== bookingData.id));
      setPendingBookings(prev => prev.filter(b => b.id !== bookingData.id));
    }
    
    // Show status-specific toast
    const statusMessages = {
      [BOOKING_STATUS.ASSIGNED]: `Booking #${bookingData.id?.slice(-8)} has been assigned to you`,
      [BOOKING_STATUS.ACCEPTED]: `You accepted booking #${bookingData.id?.slice(-8)}`,
      [BOOKING_STATUS.CANCELLED]: `Booking #${bookingData.id?.slice(-8)} was cancelled`,
      [BOOKING_STATUS.COMPLETED]: `Booking #${bookingData.id?.slice(-8)} completed!`
    };
    
    const message = statusMessages[bookingData.status];
    if (message) {
      toast.info(message, {
        position: 'top-right',
        autoClose: 5000
      });
    }
    
    onBookingUpdate?.(bookingData);
  }, [onBookingUpdate]);

  const handleProviderBookings = useCallback((data) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    
    if (data.type === 'INITIAL_LOAD') {
      setPendingBookings(data.pending || []);
      setActiveBookings(data.active || []);
    }
    
    onBookingUpdate?.(data);
  }, [onBookingUpdate]);

  const handleNewNotification = useCallback((notificationData) => {
    if (!mountedRef.current) return;
    
    const newNotification = {
      id: notificationData.id || generateUniqueId(),
      timestamp: notificationData.timestamp || new Date().toISOString(),
      read: false,
      ...notificationData
    };

    setNotifications(prev => [newNotification, ...prev].slice(0, maxNotifications));
    setLastUpdated(new Date());

    // Show toast notifications based on severity
    const toastOptions = {
      position: 'top-right',
      autoClose: notificationData.severity === ALERT_SEVERITY.CRITICAL ? false : 5000
    };

    switch (notificationData.severity) {
      case ALERT_SEVERITY.CRITICAL:
        toast.error(`🔴 ${notificationData.title}`, toastOptions);
        break;
      case ALERT_SEVERITY.ERROR:
        toast.error(notificationData.title, toastOptions);
        break;
      case ALERT_SEVERITY.WARNING:
        toast.warning(notificationData.title, toastOptions);
        break;
      case ALERT_SEVERITY.SUCCESS:
        toast.success(notificationData.title, toastOptions);
        break;
      default:
        toast.info(notificationData.title, toastOptions);
    }

    onNotification?.(newNotification);
  }, [maxNotifications, onNotification]);

  const handleStatsUpdate = useCallback((statsData) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    setProviderStats(statsData);
    onStatsUpdate?.(statsData);
  }, [onStatsUpdate]);

  const handleEarningsUpdate = useCallback((earningsData) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    setTodayEarnings(earningsData.today || 0);
    setWeeklyEarnings(earningsData.weekly || 0);
    setMonthlyEarnings(earningsData.monthly || 0);
    onEarningsUpdate?.(earningsData);
  }, [onEarningsUpdate]);

  const handleScheduleUpdate = useCallback((scheduleData) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    onScheduleUpdate?.(scheduleData);
    
    if (scheduleData.type === 'REMINDER') {
      toast.info(scheduleData.message, {
        position: 'top-right',
        autoClose: 10000
      });
    }
  }, [onScheduleUpdate]);

  const handleNewReview = useCallback((reviewData) => {
    if (!mountedRef.current) return;
    
    setLastUpdated(new Date());
    
    toast.success(`New ${reviewData.rating}⭐ review received!`, {
      position: 'top-right',
      autoClose: 8000,
      icon: '⭐'
    });
    
    onReview?.(reviewData);
  }, [onReview]);

  // ==========================================================
  // NOTIFICATION MANAGEMENT FUNCTIONS
  // ==========================================================
  
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => prev.map(notification =>
      notification.id === notificationId ? { ...notification, read: true } : notification
    ));
  }, []);

  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => prev.map(notification => ({ ...notification, read: true })));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const removeNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(notification => notification.id !== notificationId));
  }, []);

  // ==========================================================
  // BOOKING ACTION FUNCTIONS
  // ==========================================================
  
  const acceptBooking = useCallback(async (bookingId) => {
    try {
      const response = await api.post(`/provider/bookings/${bookingId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Error accepting booking:', error);
      toast.error('Failed to accept booking');
      throw error;
    }
  }, []);

  const rejectBooking = useCallback(async (bookingId, reason = '') => {
    try {
      const response = await api.post(`/provider/bookings/${bookingId}/reject`, { reason });
      toast.success('Booking rejected');
      return response.data;
    } catch (error) {
      console.error('Error rejecting booking:', error);
      toast.error('Failed to reject booking');
      throw error;
    }
  }, []);

  const startBooking = useCallback(async (bookingId) => {
    try {
      const response = await api.post(`/provider/bookings/${bookingId}/start`);
      toast.success('Service started');
      return response.data;
    } catch (error) {
      console.error('Error starting booking:', error);
      toast.error('Failed to start service');
      throw error;
    }
  }, []);

  const completeBooking = useCallback(async (bookingId, finalAmount = null) => {
    try {
      const response = await api.post(`/provider/bookings/${bookingId}/complete`, { finalAmount });
      toast.success('Service completed');
      return response.data;
    } catch (error) {
      console.error('Error completing booking:', error);
      toast.error('Failed to complete service');
      throw error;
    }
  }, []);

  // ==========================================================
  // CONNECTION LIFECYCLE
  // ==========================================================
  
  useEffect(() => {
    if (!enableRealTime) {
      console.log('Real-time updates are disabled');
      setIsConnected(false);
      return;
    }

    if (autoConnect) {
      const token = TokenManager.getAccessToken();
      if (token) {
        connect();
      } else {
        console.log('No token available, waiting for authentication');
      }
    }

    return () => {
      if (!autoConnect) return;
      disconnect();
    };
  }, [enableRealTime, autoConnect, connect, disconnect]);

  // Handle token changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'accessToken' && e.newValue) {
        console.log('Token changed, reconnecting WebSocket...');
        if (enableRealTime) {
          disconnect();
          setTimeout(() => connect(), 500);
        }
      }
    };

    const handleTokenRefresh = () => {
      console.log('Token refreshed, reconnecting WebSocket...');
      if (enableRealTime) {
        disconnect();
        setTimeout(() => connect(), 500);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('token-refreshed', handleTokenRefresh);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('token-refreshed', handleTokenRefresh);
    };
  }, [enableRealTime, connect, disconnect]);

  // ==========================================================
  // RETURN VALUES
  // ==========================================================
  
  return {
    // Connection status
    connected: isConnected,
    connecting: isConnecting,
    disconnected: !isConnected && !isConnecting,
    error: connectionError,
    
    // Data
    notifications,
    pendingBookings,
    activeBookings,
    providerStats,
    todayEarnings,
    weeklyEarnings,
    monthlyEarnings,
    lastUpdated,
    
    // Derived values
    unreadCount,
    hasCriticalNotifications,
    recentNotifications,
    
    // Notification management
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    removeNotification,
    
    // Booking actions
    acceptBooking,
    rejectBooking,
    startBooking,
    completeBooking,
    
    // Connection management
    connect,
    disconnect,
    reconnect: () => {
      disconnect();
      setTimeout(() => connect(), 500);
    },
    
    // Utility
    isConnected,
    ALERT_SEVERITY,
    BOOKING_STATUS,
    TOPICS
  };
};

// ==========================================================
// EXPORTS
// ==========================================================
export default useProviderDashboard;
export { TOPICS, ALERT_SEVERITY, BOOKING_STATUS };