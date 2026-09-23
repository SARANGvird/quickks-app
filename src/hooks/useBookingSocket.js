// src/hooks/useBookingSocket.js
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../contexts/AuthContext";

// ==========================================================
// CONSTANTS
// ==========================================================
export const SOCKET_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

export const MESSAGE_TYPES = {
  BOOKING_UPDATE: 'BOOKING_UPDATE',
  CHAT_MESSAGE: 'CHAT_MESSAGE',
  STATUS_UPDATE: 'STATUS_UPDATE',
  LOCATION_UPDATE: 'LOCATION_UPDATE',
  PAYMENT_UPDATE: 'PAYMENT_UPDATE',
  NOTIFICATION: 'NOTIFICATION',
  HEARTBEAT: 'HEARTBEAT',
  TYPING_INDICATOR: 'TYPING_INDICATOR'
};

const DEFAULT_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL = 4000;
const CONNECTION_TIMEOUT = 10000;
const HEALTH_CHECK_INTERVAL = 30000;

// Feature flag - can be controlled via environment variable
const WEBSOCKET_ENABLED = process.env.REACT_APP_WEBSOCKET_ENABLED !== 'false';
const WS_URL = process.env.REACT_APP_WS_URL || "http://localhost:8081/quickks/ws";

// ==========================================================
// UTILITY FUNCTIONS
// ==========================================================
const generateMessageId = () => {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ==========================================================
// CUSTOM HOOK
// ==========================================================
export const useBookingSocket = (onBookingUpdate, onChatMessage, onError, onReconnect) => {
  const { user, isAuthenticated, token } = useAuth();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [connectionState, setConnectionState] = useState(SOCKET_STATES.DISCONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isBackendAvailable, setIsBackendAvailable] = useState(true);
  
  // Refs
  const clientRef = useRef(null);
  const subscriptionsRef = useRef(new Map());
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const healthCheckIntervalRef = useRef(null);
  const mountedRef = useRef(true);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  
  // Callback refs
  const onBookingUpdateRef = useRef(onBookingUpdate);
  const onChatMessageRef = useRef(onChatMessage);
  const onErrorRef = useRef(onError);
  const onReconnectRef = useRef(onReconnect);

  // ==========================================================
  // UPDATE CALLBACK REFS
  // ==========================================================
  useEffect(() => {
    onBookingUpdateRef.current = onBookingUpdate;
  }, [onBookingUpdate]);

  useEffect(() => {
    onChatMessageRef.current = onChatMessage;
  }, [onChatMessage]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onReconnectRef.current = onReconnect;
  }, [onReconnect]);

  // ==========================================================
  // HELPER FUNCTIONS
  // ==========================================================
  const updateConnectionState = useCallback((state, error = null) => {
    if (!mountedRef.current) return;
    
    setConnectionState(state);
    setIsConnected(state === SOCKET_STATES.CONNECTED);
    
    if (error) {
      setLastError(error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
    }
  }, []);

  const handleSocketError = useCallback((error, context = 'general') => {
    console.error(`❌ Socket Error [${context}]:`, error);
    updateConnectionState(SOCKET_STATES.ERROR, {
      message: error.message || 'WebSocket connection error',
      context,
      timestamp: new Date().toISOString()
    });
  }, [updateConnectionState]);

  // ==========================================================
  // BACKEND HEALTH CHECK
  // ==========================================================
  const checkBackendHealth = useCallback(async () => {
    try {
      // Try multiple health endpoints
      const endpoints = [
        `${WS_URL.replace('/ws', '')}/health`,
        `${WS_URL.replace('/ws', '')}/actuator/health`,
        `${WS_URL.replace('/ws', '')}/api/health`
      ];
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(5000)
          });
          
          if (response.ok) {
            setIsBackendAvailable(true);
            return true;
          }
        } catch (e) {
          // Continue to next endpoint
        }
      }
      
      // If WebSocket is enabled but backend appears down, don't attempt connection
      if (WEBSOCKET_ENABLED) {
        console.warn('⚠️ Backend health check failed - WebSocket will be disabled');
      }
      setIsBackendAvailable(false);
      return false;
    } catch (error) {
      console.warn('Backend health check failed:', error.message);
      setIsBackendAvailable(false);
      return false;
    }
  }, []);

  // ==========================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================
  const subscribeToTopic = useCallback((topic, callback, subscriptionId) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.warn(`⚠️ Cannot subscribe to ${topic} - WebSocket not connected`);
      return null;
    }

    const id = subscriptionId || topic;
    
    if (subscriptionsRef.current.has(id)) {
      const existing = subscriptionsRef.current.get(id);
      if (existing && typeof existing.unsubscribe === 'function') {
        existing.unsubscribe();
      }
      subscriptionsRef.current.delete(id);
    }

    console.log(`📡 Subscribing to: ${topic} (ID: ${id})`);
    
    try {
      const subscription = clientRef.current.subscribe(topic, (message) => {
        try {
          const parsedMessage = JSON.parse(message.body);
          callback(parsedMessage, message);
        } catch (error) {
          console.error(`❌ Failed to parse message from ${topic}:`, error);
          handleSocketError(error, `parse_${topic}`);
        }
      });

      subscriptionsRef.current.set(id, subscription);
      
      if (mountedRef.current) {
        setActiveSubscriptions(prev => [...prev, id]);
      }
      
      return subscription;
    } catch (error) {
      console.error(`❌ Failed to subscribe to ${topic}:`, error);
      handleSocketError(error, `subscribe_${topic}`);
      return null;
    }
  }, [handleSocketError]);

  const unsubscribeFromTopic = useCallback((subscriptionId) => {
    if (subscriptionsRef.current.has(subscriptionId)) {
      const subscription = subscriptionsRef.current.get(subscriptionId);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
        console.log(`📡 Unsubscribed from: ${subscriptionId}`);
      }
      subscriptionsRef.current.delete(subscriptionId);
      
      if (mountedRef.current) {
        setActiveSubscriptions(prev => prev.filter(id => id !== subscriptionId));
      }
    }
  }, []);

  const unsubscribeAll = useCallback(() => {
    console.log(`📡 Unsubscribing from ${subscriptionsRef.current.size} topics`);
    subscriptionsRef.current.forEach((subscription, id) => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error(`Error unsubscribing from ${id}:`, error);
        }
      }
    });
    subscriptionsRef.current.clear();
    
    if (mountedRef.current) {
      setActiveSubscriptions([]);
    }
  }, []);

  // ==========================================================
  // CHAT FUNCTIONALITY
  // ==========================================================
  const subscribeToChat = useCallback((bookingId, customCallback) => {
    if (!bookingId) {
      console.error('❌ Cannot subscribe to chat: bookingId is required');
      return null;
    }

    const chatTopic = `/topic/chat/${bookingId}`;
    const subscriptionId = `chat_${bookingId}`;
    
    const callback = (message) => {
      const handler = customCallback || onChatMessageRef.current;
      if (handler) {
        handler({
          ...message,
          bookingId,
          type: MESSAGE_TYPES.CHAT_MESSAGE
        });
      }
    };
    
    return subscribeToTopic(chatTopic, callback, subscriptionId);
  }, [subscribeToTopic]);

  const unsubscribeFromChat = useCallback((bookingId) => {
    const subscriptionId = `chat_${bookingId}`;
    unsubscribeFromTopic(subscriptionId);
  }, [unsubscribeFromTopic]);

  const sendChatMessage = useCallback(async (bookingId, message, recipientId, metadata = {}) => {
    if (!clientRef.current || !clientRef.current.connected) {
      handleSocketError(new Error('WebSocket not connected'), 'send_chat');
      return { success: false, error: 'WebSocket not connected' };
    }
    
    if (!bookingId || !message || !message.trim()) {
      return { success: false, error: 'Missing required parameters' };
    }
    
    try {
      const chatMessage = {
        id: generateMessageId(),
        bookingId,
        senderId: user?.id,
        senderName: user?.name || user?.fullName || 'User',
        senderRole: user?.role || 'CUSTOMER',
        senderAvatar: user?.avatar,
        recipientId,
        content: message.trim(),
        timestamp: new Date().toISOString(),
        type: MESSAGE_TYPES.CHAT_MESSAGE,
        status: 'sent',
        ...metadata
      };
      
      console.log(`📤 Sending message to /app/chat/${bookingId}:`, chatMessage);
      
      clientRef.current.publish({
        destination: `/app/chat/${bookingId}`,
        body: JSON.stringify(chatMessage)
      });
      
      return { success: true, messageId: chatMessage.id };
    } catch (error) {
      console.error("❌ Error sending chat message:", error);
      handleSocketError(error, 'send_chat');
      return { success: false, error: error.message };
    }
  }, [user, handleSocketError]);

  // ==========================================================
  // BOOKING UPDATE FUNCTIONALITY
  // ==========================================================
  const subscribeToBookingUpdates = useCallback((bookingId, customCallback) => {
    if (!bookingId) {
      console.error('❌ Cannot subscribe to booking: bookingId is required');
      return null;
    }

    const bookingTopic = `/topic/booking/${bookingId}`;
    const subscriptionId = `booking_${bookingId}`;
    
    const callback = (update) => {
      const handler = customCallback || onBookingUpdateRef.current;
      if (handler) {
        handler({
          ...update,
          bookingId,
          type: MESSAGE_TYPES.BOOKING_UPDATE
        });
      }
    };
    
    return subscribeToTopic(bookingTopic, callback, subscriptionId);
  }, [subscribeToTopic]);

  const unsubscribeFromBooking = useCallback((bookingId) => {
    const subscriptionId = `booking_${bookingId}`;
    unsubscribeFromTopic(subscriptionId);
  }, [unsubscribeFromTopic]);

  // ==========================================================
  // LOCATION TRACKING
  // ==========================================================
  const subscribeToProviderLocation = useCallback((providerId, customCallback) => {
    if (!providerId) {
      console.error('❌ Cannot subscribe to location: providerId is required');
      return null;
    }

    const locationTopic = `/topic/location/${providerId}`;
    const subscriptionId = `location_${providerId}`;
    
    const callback = (locationData) => {
      if (customCallback) {
        customCallback({
          ...locationData,
          providerId,
          type: MESSAGE_TYPES.LOCATION_UPDATE
        });
      }
    };
    
    return subscribeToTopic(locationTopic, callback, subscriptionId);
  }, [subscribeToTopic]);

  const sendLocationUpdate = useCallback((bookingId, latitude, longitude, status = 'en_route') => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.warn('⚠️ Cannot send location - WebSocket not connected');
      return false;
    }
    
    if (!bookingId || !latitude || !longitude) {
      console.warn('⚠️ Cannot send location - missing required data');
      return false;
    }
    
    try {
      const locationUpdate = {
        bookingId,
        providerId: user?.id,
        providerName: user?.name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        status,
        timestamp: new Date().toISOString(),
        type: MESSAGE_TYPES.LOCATION_UPDATE
      };
      
      clientRef.current.publish({
        destination: `/app/location/update`,
        body: JSON.stringify(locationUpdate)
      });
      
      return true;
    } catch (error) {
      console.error("❌ Error sending location update:", error);
      return false;
    }
  }, [user]);

  // ==========================================================
  // STATUS UPDATE
  // ==========================================================
  const sendStatusUpdate = useCallback((bookingId, status, metadata = {}) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.warn('⚠️ Cannot send status update - WebSocket not connected');
      return false;
    }
    
    if (!bookingId || !status) {
      console.warn('⚠️ Cannot send status update - missing required data');
      return false;
    }
    
    try {
      const statusUpdate = {
        id: generateMessageId(),
        bookingId,
        status,
        updatedBy: user?.id,
        updatedByName: user?.name,
        updatedByRole: user?.role,
        timestamp: new Date().toISOString(),
        type: MESSAGE_TYPES.STATUS_UPDATE,
        ...metadata
      };
      
      clientRef.current.publish({
        destination: `/app/status/update`,
        body: JSON.stringify(statusUpdate)
      });
      
      return true;
    } catch (error) {
      console.error("❌ Error sending status update:", error);
      return false;
    }
  }, [user]);

  // ==========================================================
  // HEARTBEAT MANAGEMENT
  // ==========================================================
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (clientRef.current && clientRef.current.connected && mountedRef.current) {
        try {
          clientRef.current.publish({
            destination: `/app/heartbeat`,
            body: JSON.stringify({
              id: generateMessageId(),
              userId: user?.id,
              userName: user?.name,
              timestamp: new Date().toISOString(),
              type: MESSAGE_TYPES.HEARTBEAT
            })
          });
        } catch (error) {
          console.warn('Heartbeat send failed:', error);
        }
      }
    }, HEARTBEAT_INTERVAL);
  }, [user]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // ==========================================================
  // RECONNECTION LOGIC
  // ==========================================================
  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || isConnectingRef.current) return;
    
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      updateConnectionState(SOCKET_STATES.ERROR, {
        message: 'Unable to establish WebSocket connection. Please refresh the page.',
        maxAttemptsReached: true
      });
      return;
    }
    
    const delay = Math.min(DEFAULT_RECONNECT_DELAY * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
    console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    updateConnectionState(SOCKET_STATES.RECONNECTING);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current && !isConnectingRef.current) {
        reconnectAttemptsRef.current++;
        setReconnectAttempts(reconnectAttemptsRef.current);
        
        if (onReconnectRef.current) {
          onReconnectRef.current({ attempt: reconnectAttemptsRef.current, maxAttempts: MAX_RECONNECT_ATTEMPTS });
        }
        
        if (clientRef.current) {
          try {
            clientRef.current.activate();
          } catch (error) {
            console.error('Failed to activate client:', error);
            handleSocketError(error, 'reconnect');
          }
        }
      }
    }, delay);
  }, [updateConnectionState, handleSocketError]);

  // ==========================================================
  // REGULAR HEALTH CHECK
  // ==========================================================
  const startHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }
    
    healthCheckIntervalRef.current = setInterval(() => {
      checkBackendHealth();
    }, HEALTH_CHECK_INTERVAL);
  }, [checkBackendHealth]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }
  }, []);

  // ==========================================================
  // SOCKET CONNECTION SETUP
  // ==========================================================
  useEffect(() => {
    // Skip WebSocket if disabled via environment variable
    if (!WEBSOCKET_ENABLED) {
      console.log("⚠️ WebSocket disabled by environment configuration");
      updateConnectionState(SOCKET_STATES.DISCONNECTED);
      return;
    }
    
    // Don't connect if no user or token
    if (!isAuthenticated || !user?.id || !token) {
      console.log("⚠️ Not authenticated, skipping WebSocket connection");
      updateConnectionState(SOCKET_STATES.DISCONNECTED);
      return;
    }

    // Start regular health checks
    startHealthCheck();

    // Check if backend is available before attempting connection
    const initConnection = async () => {
      const isHealthy = await checkBackendHealth();
      if (!isHealthy) {
        console.log("⚠️ Backend not available, WebSocket connection skipped");
        updateConnectionState(SOCKET_STATES.DISCONNECTED);
        return;
      }

      if (isConnectingRef.current) {
        console.log("⚠️ Connection already in progress");
        return;
      }

      isConnectingRef.current = true;

      console.log("🔌 Connecting to WebSocket:", WS_URL);

      const client = new Client({
        webSocketFactory: () => {
          console.log("🔄 Creating new SockJS connection to:", WS_URL);
          return new SockJS(WS_URL);
        },
        
        connectHeaders: {
          Authorization: `Bearer ${token}`,
          userId: String(user.id),
          userRole: user.role || 'CUSTOMER',
          clientId: `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        },
        
        heartbeatIncoming: HEARTBEAT_INTERVAL,
        heartbeatOutgoing: HEARTBEAT_INTERVAL,
        reconnectDelay: DEFAULT_RECONNECT_DELAY,
        
        debug: (str) => {
          if (process.env.NODE_ENV === 'development') {
            // Filter out noisy heartbeat messages
            if (!str.includes('PONG') && !str.includes('>>> P') && !str.includes('heartbeat')) {
              console.log("STOMP:", str);
            }
          }
        },

        onConnect: () => {
          console.log(`✅ WebSocket Connected! User: ${user.id} (${user.role})`);
          
          if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
          }
          
          updateConnectionState(SOCKET_STATES.CONNECTED);
          reconnectAttemptsRef.current = 0;
          setReconnectAttempts(0);
          isConnectingRef.current = false;
          
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }
          
          if (onReconnectRef.current && reconnectAttempts > 0) {
            onReconnectRef.current({ 
              attempts: reconnectAttempts, 
              success: true,
              timestamp: new Date().toISOString()
            });
          }
          
          // Subscribe to user-specific topic
          const userTopic = user.role === 'PROVIDER' 
            ? `/topic/provider/${user.id}`
            : `/topic/customer/${user.id}`;
          
          console.log(`📡 Subscribing to user topic: ${userTopic}`);
          
          subscribeToTopic(userTopic, (data) => {
            console.log("📥 Booking Update Received:", data);
            
            if (data.type === MESSAGE_TYPES.BOOKING_UPDATE && onBookingUpdateRef.current) {
              onBookingUpdateRef.current(data);
            } else if (data.type === MESSAGE_TYPES.NOTIFICATION) {
              console.log("🔔 Notification:", data);
            }
          }, `user_${user.id}`);

          // Subscribe to public announcements if available
          subscribeToTopic("/topic/public", (data) => {
            console.log("📢 Public Announcement:", data);
          }, "public_announcements").catch(() => {
            // Public topic may not exist, that's fine
          });
          
          // Start heartbeat
          startHeartbeat();
        },

        onStompError: (frame) => {
          console.error("❌ STOMP Error:", {
            message: frame.headers?.message,
            body: frame.body,
            command: frame.command
          });
          isConnectingRef.current = false;
          handleSocketError(new Error(frame.headers?.message || 'STOMP protocol error'), 'stomp');
          
          // Don't auto-reconnect on authentication errors
          if (frame.headers?.message?.includes('Authentication')) {
            updateConnectionState(SOCKET_STATES.ERROR, {
              message: 'Authentication failed. Please login again.',
              isAuthError: true
            });
          } else {
            scheduleReconnect();
          }
        },
        
        onWebSocketError: (event) => {
          console.error("❌ WebSocket Error:", event);
          isConnectingRef.current = false;
          handleSocketError(new Error('WebSocket connection error'), 'websocket');
          scheduleReconnect();
        },
        
        onWebSocketClose: (event) => {
          console.log(`🔌 WebSocket Closed - Code: ${event.code}, Reason: ${event.reason || 'No reason'}`);
          updateConnectionState(SOCKET_STATES.DISCONNECTED);
          isConnectingRef.current = false;
          
          // Don't reconnect on normal closure (1000)
          if (event.code !== 1000 && event.code !== 1001) {
            scheduleReconnect();
          }
        },

        onDisconnect: () => {
          console.log("🔌 WebSocket Disconnected");
          updateConnectionState(SOCKET_STATES.DISCONNECTED);
          isConnectingRef.current = false;
          stopHeartbeat();
        }
      });

      // Set connection timeout
      connectionTimeoutRef.current = setTimeout(() => {
        if (connectionState !== SOCKET_STATES.CONNECTED && mountedRef.current && isConnectingRef.current) {
          console.error("Connection timeout");
          isConnectingRef.current = false;
          handleSocketError(new Error('Connection timeout'), 'timeout');
          scheduleReconnect();
        }
      }, CONNECTION_TIMEOUT);

      client.activate();
      clientRef.current = client;
    };

    initConnection();

    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      mountedRef.current = false;
      isConnectingRef.current = false;
      
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
      
      stopHeartbeat();
      stopHealthCheck();
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      unsubscribeAll();
      
      if (clientRef.current) {
        try {
          if (clientRef.current.connected) {
            clientRef.current.deactivate();
          }
        } catch (err) {
          console.error("Error deactivating client:", err);
        }
        clientRef.current = null;
      }
    };
  }, [isAuthenticated, user?.id, user?.role, token, subscribeToTopic, unsubscribeAll, scheduleReconnect, handleSocketError, updateConnectionState, startHeartbeat, stopHeartbeat, startHealthCheck, stopHealthCheck, checkBackendHealth, connectionState, reconnectAttempts]);

  // ==========================================================
  // RETURN VALUE
  // ==========================================================
  const isConnecting = connectionState === SOCKET_STATES.CONNECTING || connectionState === SOCKET_STATES.RECONNECTING;
  const isSocketReady = isConnected && isBackendAvailable;

  return useMemo(() => ({
    // Connection state
    isConnected: isSocketReady,
    isConnecting,
    connectionState,
    reconnectAttempts,
    lastError,
    activeSubscriptions,
    isBackendAvailable,
    
    // Subscription management
    subscribeToTopic,
    unsubscribeFromTopic,
    unsubscribeAll,
    
    // Chat functionality
    subscribeToChat,
    unsubscribeFromChat,
    sendChatMessage,
    
    // Booking functionality
    subscribeToBookingUpdates,
    unsubscribeFromBooking,
    
    // Location tracking
    subscribeToProviderLocation,
    sendLocationUpdate,
    
    // Status updates
    sendStatusUpdate,
    
    // Utility
    isSocketReady,
    reconnect: () => scheduleReconnect(),
    checkHealth: checkBackendHealth,
    
    // Constants
    STATES: SOCKET_STATES,
    MESSAGE_TYPES
  }), [
    isSocketReady,
    isConnecting,
    connectionState,
    reconnectAttempts,
    lastError,
    activeSubscriptions,
    isBackendAvailable,
    subscribeToTopic,
    unsubscribeFromTopic,
    unsubscribeAll,
    subscribeToChat,
    unsubscribeFromChat,
    sendChatMessage,
    subscribeToBookingUpdates,
    unsubscribeFromBooking,
    subscribeToProviderLocation,
    sendLocationUpdate,
    sendStatusUpdate,
    scheduleReconnect,
    checkBackendHealth
  ]);
};

export default useBookingSocket;