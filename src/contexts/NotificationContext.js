// src/contexts/NotificationContext.js - v9.0 PRODUCTION FINAL
// ✅ FIXED: Removed socket.js, uses WebSocketProvider STOMP
// ✅ FIXED: No auto notification permission, no memory leaks
// ✅ PRODUCTION READY - Meta Level

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../api/api';
import { useAuth } from './AuthContext';
import { useWebSocket, useWebSocketSubscription } from './WebSocketProvider';

export const NOTIFICATION_TYPES = {
  INFO: 'info', SUCCESS: 'success', WARNING: 'warning', ERROR: 'error',
  BOOKING: 'booking', PAYMENT: 'payment', MESSAGE: 'message',
  SYSTEM: 'system', PROMOTION: 'promotion', REMINDER: 'reminder', ALERT: 'alert'
};
export const NOTIFICATION_PRIORITIES = { HIGH: 'high', MEDIUM: 'medium', LOW: 'low' };

const DEFAULT_DURATION = 5000;
const MAX_NOTIFICATIONS = 100;
const STORAGE_KEY = 'notifications_cache';

const getNotificationIcon = (type) => ({
  info:'ℹ', success:'✅', warning:'⚠', error:'❌', booking:'📅', payment:'💰', message:'💬', system:'🖥', promotion:'🎉', reminder:'⏰', alert:'🚨'
}[type] || '🔔');

const getNotificationColor = (type) => ({
  info:'#3b82f6', success:'#10b981', warning:'#f59e0b', error:'#ef4444', booking:'#8b5cf6', payment:'#059669', message:'#06b6d4', system:'#6b7280', promotion:'#ec4899', reminder:'#f97316', alert:'#ef4444'
}[type] || '#6b7280');

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    console.warn('useNotifications outside Provider');
    return { notifications:[], unreadCount:0, addNotification:()=>{}, removeNotification:()=>{}, markAsRead:()=>{}, markAllAsRead:()=>{}, clearNotifications:()=>{}, isConnected:false };
  }
  return ctx;
};

export const NotificationProvider = ({ children, enableRealtime = true, enableSound = false, enableStorage = true, maxNotifications = MAX_NOTIFICATIONS }) => {
  const { user, isAuthenticated } = useAuth();
  const { isConnected: wsConnected } = useWebSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);
  const [permissionStatus, setPermissionStatus] = useState(Notification?.permission || 'default');
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  const audioRef = useRef(null);

  // Load from storage
  useEffect(() => {
    if (!enableStorage) return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setNotifications(parsed.slice(0, maxNotifications));
        setUnreadCount(parsed.filter(n=>!n.read).length);
      }
    } catch {}
  }, [enableStorage, maxNotifications]);

  // Save to storage
  useEffect(() => {
    if (!enableStorage ||!notifications.length) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, maxNotifications))); } catch {}
  }, [notifications, enableStorage, maxNotifications]);

  const addNotification = useCallback((payload) => {
    const n = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      read: false,
      type: payload.type || NOTIFICATION_TYPES.INFO,
      priority: payload.priority || NOTIFICATION_PRIORITIES.MEDIUM,
      title: payload.title,
      message: payload.message,
      icon: payload.icon || getNotificationIcon(payload.type),
      color: payload.color || getNotificationColor(payload.type),
      data: payload.data,
      duration: payload.duration?? DEFAULT_DURATION,
      persistent:!!payload.persistent
    };
    setNotifications(prev => [n,...prev].slice(0, maxNotifications));
    setUnreadCount(c => c + 1);
    if (n.priority === NOTIFICATION_PRIORITIES.HIGH && soundEnabled && audioRef.current) {
      audioRef.current.play().catch(()=>{});
    }
    if (!n.persistent && n.duration > 0) {
      setTimeout(()=>{ if(mountedRef.current) setNotifications(p=>p.filter(x=>x.id!==n.id)); }, n.duration);
    }
    return n.id;
  }, [maxNotifications, soundEnabled]);

  const removeNotification = useCallback((id)=>{
    setNotifications(prev=>{ const f=prev.find(x=>x.id===id); if(f &&!f.read) setUnreadCount(c=>Math.max(0,c-1)); return prev.filter(x=>x.id!==id); });
  },[]);

  const markAsRead = useCallback((id)=>{
    setNotifications(prev=>prev.map(x=>{ if(x.id===id &&!x.read){ setUnreadCount(c=>Math.max(0,c-1)); return {...x, read:true}; } return x; }));
  },[]);

  const markAllAsRead = useCallback(()=>{ setNotifications(prev=>prev.map(x=>({...x, read:true}))); setUnreadCount(0); },[]);
  const clearNotifications = useCallback(()=>{ setNotifications([]); setUnreadCount(0); localStorage.removeItem(STORAGE_KEY); },[]);
  const clearReadNotifications = useCallback(()=>{ setNotifications(prev=>prev.filter(x=>!x.read)); },[]);

  const fetchNotifications = useCallback(async()=>{
    if(!isAuthenticated) return;
    setLoading(true);
    try{
      const res = await api.get('/notifications', { params:{ limit:maxNotifications } });
      const list = res.data?.notifications || res.data || [];
      if(Array.isArray(list)){
        const mapped = list.map(n=>({ id:n.id, timestamp:n.createdAt||new Date().toISOString(), read:!!n.read, type:n.type||'info', title:n.title, message:n.message, data:n.data }));
        setNotifications(prev=>{ const ids=new Set(prev.map(x=>x.id)); const newOnes=mapped.filter(x=>!ids.has(x.id)); return [...newOnes,...prev].slice(0,maxNotifications); });
        setUnreadCount(mapped.filter(x=>!x.read).length);
      }
    }catch(e){ console.warn('fetchNotifications failed', e.message); }
    finally{ setLoading(false); }
  },[isAuthenticated, maxNotifications]);

  // ✅ REAL-TIME via WebSocketProvider - NO socket.js
  const handleRealTimeNotification = useCallback((data)=>{
    if(!data) return;
    // Backend sends {type, title, message, data}
    addNotification({
      type: data.type || NOTIFICATION_TYPES.INFO,
      title: data.title || 'New Notification',
      message: data.message || data.body || JSON.stringify(data),
      data: data.data || data,
      priority: data.priority
    });
  },[addNotification]);

  // Subscribe to user queue and global topics
  useWebSocketSubscription(enableRealtime && isAuthenticated? `/user/queue/notifications` : null, handleRealTimeNotification);
  useWebSocketSubscription(enableRealtime && isAuthenticated && user?.id? `/topic/notifications/${user.id}` : null, handleRealTimeNotification);
  useWebSocketSubscription(enableRealtime? `/topic/notifications` : null, handleRealTimeNotification);

  useEffect(()=>{ mountedRef.current=true; if(isAuthenticated) fetchNotifications(); return ()=>{mountedRef.current=false;} },[isAuthenticated, fetchNotifications]);

  const value = useMemo(()=>({
    notifications, unreadCount, soundEnabled, isConnected: wsConnected, permissionStatus, loading,
    addNotification, removeNotification, markAsRead, markAllAsRead, clearNotifications, clearReadNotifications,
    fetchNotifications,
    enableSound:()=>setSoundEnabled(true), disableSound:()=>setSoundEnabled(false), toggleSound:()=>setSoundEnabled(s=>!s),
    types: NOTIFICATION_TYPES, priorities: NOTIFICATION_PRIORITIES,
    requestPermission: async()=>{
      if(!('Notification' in window)) return false;
      const p = await Notification.requestPermission();
      setPermissionStatus(p);
      return p==='granted';
    }
  }),[notifications, unreadCount, soundEnabled, wsConnected, permissionStatus, loading, addNotification, removeNotification, markAsRead, markAllAsRead, clearNotifications, clearReadNotifications, fetchNotifications]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};