// src/hooks/useChatSocket.js
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { useAuth } from "../contexts/AuthContext";

// ==========================================================
// CONSTANTS
// ==========================================================
const CHAT_STATES = {
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  DISCONNECTING: 'disconnecting',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error'
};

const MESSAGE_STATUS = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  FAILED: 'FAILED'
};

const MESSAGE_TYPES = {
  TEXT: 'TEXT',
  IMAGE: 'IMAGE',
  FILE: 'FILE',
  LOCATION: 'LOCATION',
  TYPING: 'TYPING'
};

const DEFAULT_RECONNECT_DELAY = 5000;
const MAX_RECONNECT_ATTEMPTS = 10;
const HEARTBEAT_INTERVAL = 4000;
const TYPING_TIMEOUT = 2000;

// ==========================================================
// CUSTOM HOOK
// ==========================================================
export const useChatSocket = (bookingId, onMessageReceived, onTypingIndicator, onError) => {
  const { user, isAuthenticated, token } = useAuth();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [connectionState, setConnectionState] = useState(CHAT_STATES.DISCONNECTED);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState(new Map());
  
  // Refs for managing socket lifecycle
  const clientRef = useRef(null);
  const subscriptionRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const mountedRef = useRef(true);
  
  // Callback refs for stable references
  const onMessageReceivedRef = useRef(onMessageReceived);
  const onTypingIndicatorRef = useRef(onTypingIndicator);
  const onErrorRef = useRef(onError);

  // ==========================================================
  // UPDATE CALLBACK REFS
  // ==========================================================
  useEffect(() => {
    onMessageReceivedRef.current = onMessageReceived;
  }, [onMessageReceived]);

  useEffect(() => {
    onTypingIndicatorRef.current = onTypingIndicator;
  }, [onTypingIndicator]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // ==========================================================
  // HELPER FUNCTIONS
  // ==========================================================
  const updateConnectionState = useCallback((state, error = null) => {
    if (!mountedRef.current) return;
    
    setConnectionState(state);
    if (error) {
      setLastError(error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
    }
  }, []);

  const handleSocketError = useCallback((error, context = 'general') => {
    console.error(`❌ Chat Socket Error [${context}]:`, error);
    updateConnectionState(CHAT_STATES.ERROR, {
      message: error.message || 'Chat connection error',
      context,
      timestamp: new Date().toISOString()
    });
  }, [updateConnectionState]);

  // ==========================================================
  // MESSAGE HANDLING
  // ==========================================================
  const handleIncomingMessage = useCallback((message) => {
    console.log("💬 New Chat Message:", message);
    
    // Update unread count if message is not from current user
    if (message.senderId !== user?.id) {
      setUnreadCount(prev => prev + 1);
    }
    
    // Trigger delivery receipt
    if (message.status === MESSAGE_STATUS.SENT && message.id) {
      sendDeliveryReceipt(message.id);
    }
    
    // Call the callback if provided
    if (onMessageReceivedRef.current) {
      onMessageReceivedRef.current(message);
    }
  }, [user?.id]);

  const sendDeliveryReceipt = useCallback((messageId) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    
    const receipt = {
      messageId,
      bookingId,
      readerId: user?.id,
      timestamp: new Date().toISOString(),
      status: MESSAGE_STATUS.DELIVERED
    };
    
    clientRef.current.publish({
      destination: `/app/chat/delivery/${bookingId}`,
      body: JSON.stringify(receipt)
    });
  }, [bookingId, user?.id]);

  const markAsRead = useCallback((messageIds) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    if (!messageIds || messageIds.length === 0) return;
    
    const readReceipt = {
      messageIds: Array.isArray(messageIds) ? messageIds : [messageIds],
      bookingId,
      readerId: user?.id,
      timestamp: new Date().toISOString(),
      status: MESSAGE_STATUS.READ
    };
    
    clientRef.current.publish({
      destination: `/app/chat/read/${bookingId}`,
      body: JSON.stringify(readReceipt)
    });
    
    // Reset unread count when marking messages as read
    setUnreadCount(0);
  }, [bookingId, user?.id]);

  // ==========================================================
  // TYPING INDICATORS
  // ==========================================================
  const sendTypingIndicator = useCallback((isTyping) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    
    const typingData = {
      bookingId,
      userId: user?.id,
      userName: user?.name || user?.fullName,
      isTyping,
      timestamp: new Date().toISOString(),
      type: MESSAGE_TYPES.TYPING
    };
    
    clientRef.current.publish({
      destination: `/app/chat/typing/${bookingId}`,
      body: JSON.stringify(typingData)
    });
    
    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (isTyping) {
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, TYPING_TIMEOUT);
    }
  }, [bookingId, user?.id, user?.name]);

  const handleTypingIndicator = useCallback((typingData) => {
    if (typingData.userId === user?.id) return;
    
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      if (typingData.isTyping) {
        newMap.set(typingData.userId, {
          userName: typingData.userName,
          timestamp: typingData.timestamp
        });
      } else {
        newMap.delete(typingData.userId);
      }
      return newMap;
    });
    
    if (onTypingIndicatorRef.current) {
      onTypingIndicatorRef.current(typingData);
    }
  }, [user?.id]);

  // ==========================================================
  // SEND MESSAGE FUNCTIONALITY
  // ==========================================================
  const sendMessage = useCallback(async (content, type = MESSAGE_TYPES.TEXT, attachment = null) => {
    if (!clientRef.current || !clientRef.current.connected) {
      console.warn("⚠️ Chat not connected. Message not sent.");
      handleSocketError(new Error('Chat not connected'), 'send_message');
      return { success: false, error: 'Chat not connected' };
    }
    
    if (!content && !attachment) {
      return { success: false, error: 'Message content is required' };
    }
    
    try {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const payload = {
        id: messageId,
        bookingId: bookingId,
        senderId: String(user?.id),
        senderName: user?.name || user?.fullName || 'User',
        senderRole: user?.role || 'CUSTOMER',
        senderAvatar: user?.avatar,
        content: content,
        type: type,
        timestamp: new Date().toISOString(),
        status: MESSAGE_STATUS.SENT,
        ...(attachment && { attachment })
      };

      console.log(`📤 Sending message to /app/chat/${bookingId}:`, payload);

      clientRef.current.publish({
        destination: `/app/chat/${bookingId}`,
        body: JSON.stringify(payload),
      });
      
      // Clear typing indicator after sending
      sendTypingIndicator(false);
      
      return { success: true, messageId };
    } catch (error) {
      console.error("❌ Error sending message:", error);
      handleSocketError(error, 'send_message');
      return { success: false, error: error.message };
    }
  }, [bookingId, user, sendTypingIndicator, handleSocketError]);

  const sendFile = useCallback(async (file, caption = '') => {
    // This would typically involve uploading the file to a server first
    // then sending the file URL in the message
    const fileData = {
      name: file.name,
      size: file.size,
      type: file.type,
      url: '', // URL after upload
      caption
    };
    
    return sendMessage(caption, MESSAGE_TYPES.FILE, fileData);
  }, [sendMessage]);

  const sendImage = useCallback(async (imageFile, caption = '') => {
    // Similar to sendFile but for images
    const imageData = {
      name: imageFile.name,
      size: imageFile.size,
      type: imageFile.type,
      url: '', // URL after upload
      caption
    };
    
    return sendMessage(caption, MESSAGE_TYPES.IMAGE, imageData);
  }, [sendMessage]);

  const sendLocation = useCallback((latitude, longitude, address = '') => {
    const locationData = {
      latitude,
      longitude,
      address,
      timestamp: new Date().toISOString()
    };
    
    return sendMessage(address || '📍 Location shared', MESSAGE_TYPES.LOCATION, locationData);
  }, [sendMessage]);

  // ==========================================================
  // CONNECTION MANAGEMENT
  // ==========================================================
  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.id || !token) {
      console.log("⚠️ Not authenticated, skipping chat connection");
      return;
    }
    
    if (!bookingId) {
      console.log("⚠️ No booking ID, skipping chat connection");
      return;
    }
    
    const socketUrl = process.env.REACT_APP_WS_URL || "http://localhost:8081/quickks/ws";
    console.log(`🔌 Connecting to Chat WebSocket for booking ${bookingId}`);

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        userId: String(user.id),
        userRole: user.role,
        bookingId: bookingId
      },
      reconnectDelay: DEFAULT_RECONNECT_DELAY,
      heartbeatIncoming: HEARTBEAT_INTERVAL,
      heartbeatOutgoing: HEARTBEAT_INTERVAL,

      onConnect: () => {
        console.log(`✅ Chat Connected for booking ${bookingId}`);
        updateConnectionState(CHAT_STATES.CONNECTED);
        setReconnectAttempts(0);
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Subscribe to chat topic
        const chatTopic = `/topic/chat/${bookingId}`;
        console.log(`📡 Subscribing to chat topic: ${chatTopic}`);
        
        subscriptionRef.current = client.subscribe(chatTopic, (message) => {
          try {
            const data = JSON.parse(message.body);
            
            if (data.type === MESSAGE_TYPES.TYPING) {
              handleTypingIndicator(data);
            } else {
              handleIncomingMessage(data);
            }
          } catch (err) {
            console.error("❌ Chat message parse error:", err);
            handleSocketError(err, 'parse_message');
          }
        });
        
        // Subscribe to delivery receipts
        const deliveryTopic = `/topic/chat/delivery/${bookingId}`;
        client.subscribe(deliveryTopic, (message) => {
          try {
            const receipt = JSON.parse(message.body);
            console.log(`✅ Message delivered: ${receipt.messageId}`);
          } catch (err) {
            console.error("❌ Delivery receipt parse error:", err);
          }
        });
        
        // Subscribe to read receipts
        const readTopic = `/topic/chat/read/${bookingId}`;
        client.subscribe(readTopic, (message) => {
          try {
            const receipt = JSON.parse(message.body);
            console.log(`📖 Message read: ${receipt.messageIds.join(', ')}`);
          } catch (err) {
            console.error("❌ Read receipt parse error:", err);
          }
        });
      },

      onDisconnect: () => {
        console.log(`🔌 Chat WebSocket Disconnected for booking ${bookingId}`);
        updateConnectionState(CHAT_STATES.DISCONNECTED);
      },

      onStompError: (frame) => {
        console.error("❌ Chat STOMP error:", frame.headers["message"]);
        handleSocketError(new Error(frame.headers["message"]), 'stomp');
        scheduleReconnect();
      },
      
      onWebSocketError: (event) => {
        console.error("❌ Chat WebSocket Error:", event);
        handleSocketError(new Error('WebSocket error'), 'websocket');
        scheduleReconnect();
      },
      
      onWebSocketClose: (event) => {
        console.log(`🔌 Chat WebSocket Closed - Code: ${event.code}`);
        updateConnectionState(CHAT_STATES.DISCONNECTED);
        
        if (event.code !== 1000) {
          scheduleReconnect();
        }
      }
    });

    client.activate();
    clientRef.current = client;
  }, [bookingId, user, token, isAuthenticated, updateConnectionState, handleSocketError, handleIncomingMessage, handleTypingIndicator]);

  const disconnect = useCallback(() => {
    console.log(`🔌 Disconnecting Chat for booking ${bookingId}`);
    
    if (subscriptionRef.current) {
      try {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      } catch (err) {
        console.error("Error unsubscribing:", err);
      }
    }
    
    if (clientRef.current) {
      try {
        clientRef.current.deactivate();
      } catch (err) {
        console.error("Error deactivating client:", err);
      }
      clientRef.current = null;
    }
    
    updateConnectionState(CHAT_STATES.DISCONNECTED);
  }, [bookingId, updateConnectionState]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
      updateConnectionState(CHAT_STATES.ERROR, {
        message: 'Unable to establish chat connection. Please refresh the page.',
        maxAttemptsReached: true
      });
      return;
    }
    
    const delay = Math.min(DEFAULT_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts), 30000);
    console.log(`🔄 Scheduling chat reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);
    
    updateConnectionState(CHAT_STATES.RECONNECTING);
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      if (mountedRef.current) {
        setReconnectAttempts(prev => prev + 1);
        connect();
      }
    }, delay);
  }, [reconnectAttempts, connect, updateConnectionState]);

  const reconnect = useCallback(() => {
    setReconnectAttempts(0);
    disconnect();
    setTimeout(() => connect(), 1000);
  }, [connect, disconnect]);

  // ==========================================================
  // AUTO-CONNECT ON MOUNT
  // ==========================================================
  useEffect(() => {
    if (bookingId && isAuthenticated && user?.id) {
      connect();
    }
    
    return () => {
      disconnect();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [bookingId, isAuthenticated, user?.id, connect, disconnect]);

  // ==========================================================
  // RESET UNREAD COUNT WHEN COMPONENT FOCUSES
  // ==========================================================
  useEffect(() => {
    const handleFocus = () => {
      if (unreadCount > 0 && isConnected) {
        // Mark messages as read when window focuses
        markAsRead([]); // This will mark all as read
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [unreadCount, isConnected, markAsRead]);

  // ==========================================================
  // RETURN VALUE
  // ==========================================================
  const isConnected = connectionState === CHAT_STATES.CONNECTED;
  const isConnecting = connectionState === CHAT_STATES.CONNECTING || connectionState === CHAT_STATES.RECONNECTING;

  return useMemo(() => ({
    // Connection state
    isConnected,
    isConnecting,
    connectionState,
    reconnectAttempts,
    lastError,
    unreadCount,
    typingUsers: Array.from(typingUsers.values()),
    
    // Message functions
    sendMessage,
    sendFile,
    sendImage,
    sendLocation,
    markAsRead,
    
    // Typing indicator
    sendTypingIndicator,
    isTyping: typingUsers.size > 0,
    
    // Connection management
    connect,
    disconnect,
    reconnect,
    
    // Utility
    isSocketReady: isConnected,
    resetUnreadCount: () => setUnreadCount(0),
    
    // Constants
    STATES: CHAT_STATES,
    MESSAGE_STATUS,
    MESSAGE_TYPES
  }), [
    isConnected,
    isConnecting,
    connectionState,
    reconnectAttempts,
    lastError,
    unreadCount,
    typingUsers,
    sendMessage,
    sendFile,
    sendImage,
    sendLocation,
    markAsRead,
    sendTypingIndicator,
    connect,
    disconnect,
    reconnect
  ]);
};

export default useChatSocket;

// ==========================================================
// EXPORT CONSTANTS
// ==========================================================
export { CHAT_STATES, MESSAGE_STATUS, MESSAGE_TYPES };