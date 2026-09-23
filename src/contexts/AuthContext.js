// src/contexts/AuthContext.js - v11.0 PRODUCTION - Meta Level
// ✅ FIXED: Removed socket.js, WebSocketProvider handles WS
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, useRef } from 'react';
import api, { TokenManager, testConnection, checkHealth } from '../api/api';

export const AUTH_EVENTS = {
  LOGIN: 'LOGIN', LOGOUT: 'LOGOUT', REGISTER: 'REGISTER',
  TOKEN_REFRESH: 'TOKEN_REFRESH', TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED', PROFILE_UPDATE: 'PROFILE_UPDATE'
};

const SESSION_TIMEOUT = 30 * 60 * 1000;
const INACTIVITY_WARNING = 5 * 60 * 1000;
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000;
const HEALTH_CHECK_INTERVAL = 60000;

const AuthContext = createContext(null);
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(atob(base64).split('').map(c=>'%'+('00'+c.charCodeAt(0).toString(16)).slice(-2)).join('')));
  } catch { return null; }
};
const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const d = decodeToken(token);
    return d?.exp? Date.now() < (d.exp * 1000 - 60000) : false;
  } catch { return false; }
};
const getTokenExpiryTime = (token) => { try { const d=decodeToken(token); return d?.exp? d.exp*1000 : null; } catch { return null; } };
const unwrapApiData = (response) => {
  const body = response?.data?? {};
  if (body.data && typeof body.data === 'object') return body.data;
  if (body.auth && typeof body.auth === 'object') return body.auth;
  return body;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState(null);
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [permissions, setPermissions] = useState([]);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const sessionTimerRef = useRef(null);
  const inactivityTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const healthCheckTimerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(()=>{ mountedRef.current=true; return()=>{ mountedRef.current=false; }; },[]);

  const updateTokens = useCallback((newToken, newRefreshToken)=>{
    if(!mountedRef.current) return;
    TokenManager.setTokens(newToken, newRefreshToken);
    if(newToken) setToken(newToken);
    if(newRefreshToken) setRefreshToken(newRefreshToken);
  },[]);

  const clearTokens = useCallback(()=>{
    if(!mountedRef.current) return;
    TokenManager.removeTokens();
    setToken(null); setRefreshToken(null);
  },[]);

  const resetSessionTimer = useCallback(()=>{
    if(!mountedRef.current ||!isAuthenticated) return;
    if(sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    if(inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
    inactivityTimerRef.current = setTimeout(()=>{
      if(mountedRef.current && isAuthenticated){
        setError({type:'inactivity_warning', message:'Session will expire soon'});
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.SESSION_EXPIRED, {detail:{warning:true}}));
      }
    }, SESSION_TIMEOUT - INACTIVITY_WARNING);
    sessionTimerRef.current = setTimeout(async()=>{
      if(mountedRef.current && isAuthenticated){ await logout(true); }
    }, SESSION_TIMEOUT);
  },[isAuthenticated]);

  const refreshAccessToken = useCallback(async()=>{
    const currRefresh = refreshToken || TokenManager.getRefreshToken();
    if(!currRefresh) return false;
    try{
      const res = await api.post('/auth/refresh', { refreshToken: currRefresh });
      const payload = unwrapApiData(res);
      const newAccess = payload.accessToken || payload.token;
      const newRefresh = payload.refreshToken;
      if(!newAccess) throw new Error('No token');
      const userData = { id: payload.userId??payload.id, name: payload.fullName??payload.name, email: payload.email||decodeToken(newAccess)?.sub, role: payload.role||'CUSTOMER', avatar: payload.avatar, permissions: payload.permissions||[] };
      updateTokens(newAccess, newRefresh);
      TokenManager.setUser(userData);
      if(mountedRef.current){ setUser(userData); setIsAuthenticated(true); setPermissions(userData.permissions); setSessionExpiry(getTokenExpiryTime(newAccess)); }
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.TOKEN_REFRESH, {detail:{token:newAccess}}));
      return true;
    }catch(e){
      if(e.response?.status===401) await logout(true);
      return false;
    }
  },[refreshToken, updateTokens]);

  useEffect(()=>{
    if(!token ||!isTokenValid(token)) return;
    const expiry = getTokenExpiryTime(token);
    if(!expiry) return;
    const refreshTime = expiry - Date.now() - TOKEN_REFRESH_BUFFER;
    if(refreshTime>0){
      refreshTimerRef.current = setTimeout(async()=>{ const ok=await refreshAccessToken(); }, refreshTime);
    }
    return()=>{ if(refreshTimerRef.current) clearTimeout(refreshTimerRef.current); };
  },[token, refreshAccessToken]);

  useEffect(()=>{
    const check = async()=>{
      try{ const r=await checkHealth(); if(mountedRef.current) setConnectionStatus(r.success?'connected':'disconnected'); }
      catch{ if(mountedRef.current) setConnectionStatus('disconnected'); }
    };
    check(); healthCheckTimerRef.current=setInterval(check, HEALTH_CHECK_INTERVAL);
    return()=>{ if(healthCheckTimerRef.current) clearInterval(healthCheckTimerRef.current); };
  },[]);

  const initializeAuth = useCallback(async()=>{
    if(!mountedRef.current) return;
    setLoading(true);
    try{
      const storedToken = TokenManager.getAccessToken();
      const storedRefresh = TokenManager.getRefreshToken();
      const storedUser = TokenManager.getUser();
      if(storedToken && storedUser){
        if(!isTokenValid(storedToken)){
          const ok = await refreshAccessToken();
          if(!ok){ clearTokens(); setUser(null); setIsAuthenticated(false); }
        }else{
          updateTokens(storedToken, storedRefresh);
          setUser(storedUser); setIsAuthenticated(true); setPermissions(storedUser.permissions||[]); setSessionExpiry(getTokenExpiryTime(storedToken));
        }
      }
    }catch{ clearTokens(); setUser(null); setIsAuthenticated(false); }
    finally{ if(mountedRef.current){ setLoading(false); setInitialized(true); } }
  },[refreshAccessToken, updateTokens, clearTokens]);

  useEffect(()=>{ initializeAuth(); },[initializeAuth]);

  useEffect(()=>{
    if(!isAuthenticated) return;
    const events=['mousedown','keydown','scroll','touchstart','click'];
    const onAct=()=>resetSessionTimer();
    events.forEach(e=>window.addEventListener(e,onAct));
    resetSessionTimer();
    return()=>events.forEach(e=>window.removeEventListener(e,onAct));
  },[isAuthenticated, resetSessionTimer]);

  const login = useCallback(async(email,password)=>{
    setError(null); setTwoFactorRequired(false);
    try{
      const res = await api.post('/auth/login', { email, password });
      const payload = unwrapApiData(res);
      const accessToken = payload.accessToken || payload.token;
      const newRefresh = payload.refreshToken;
      if(!accessToken) throw new Error('No token');
      if(payload.requiresTwoFactor){ setTwoFactorRequired(true); setTwoFactorToken(payload.twoFactorToken); return {success:true, requiresTwoFactor:true, twoFactorToken:payload.twoFactorToken}; }
      const userObj = { id: payload.userId??payload.id, name: payload.fullName??payload.name, email: payload.email||email, role: payload.role||'CUSTOMER', avatar: payload.avatar||null, permissions: payload.permissions||[] };
      updateTokens(accessToken, newRefresh); TokenManager.setUser(userObj);
      setUser(userObj); setIsAuthenticated(true); setPermissions(userObj.permissions); setSessionExpiry(getTokenExpiryTime(accessToken));
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN, {detail:{user:userObj}}));
      return {success:true, data:userObj};
    }catch(e){
      let msg='Login failed';
      if(e.response?.data?.error==='INVALID_CREDENTIALS') msg='Invalid email or password';
      else if(e.response?.data?.message) msg=e.response.data.message;
      else if(e.code==='ERR_NETWORK') msg='Cannot connect to server';
      setError({type:'login_failed', message:msg});
      return {success:false, error:msg};
    }
  },[updateTokens]);

  const logout = useCallback(async(silent=false)=>{
    try{ if(!silent && token) await api.post('/auth/logout').catch(()=>{}); }
    finally{
      clearTokens(); setUser(null); setIsAuthenticated(false); setPermissions([]); setSessionExpiry(null); setTwoFactorRequired(false); setError(null);
      if(sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
      if(inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current);
      if(refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
    }
  },[token, clearTokens]);

  const register = useCallback(async(userData)=>{
    setError(null);
    try{
      if(!userData.otp){
        await api.post('/auth/send-otp', null, { params:{ email:userData.email } });
        return {success:true, requiresOtp:true, message:'OTP sent'};
      }
      const req = { name:userData.name, email:userData.email, password:userData.password, phoneNumber:userData.phoneNumber, role:userData.role||'CUSTOMER' };
      const res = await api.post('/auth/register', req, { params:{ otp:userData.otp } });
      return {success:true, message:res.data?.message||'Registered', data:unwrapApiData(res)};
    }catch(e){
      const msg=e.response?.data?.message||'Registration failed';
      setError({type:'registration_failed', message:msg});
      return {success:false, error:msg};
    }
  },[]);

  const forgotPassword = useCallback(async(email)=>{ try{ await api.post('/auth/forgot-password',{email}); return {success:true, message:'If account exists, email sent'}; }catch{ return {success:true, message:'If account exists, email sent'}; } },[]);
  const resetPassword = useCallback(async(email,otp,newPassword)=>{ try{ const res=await api.post('/auth/reset-password',{email,password:newPassword},{params:{otp}}); return {success:true, message:res.data?.message||'Password updated'}; }catch(e){ return {success:false, error:e.response?.data?.message||'Reset failed'}; } },[]);
  const verifyTwoFactor = useCallback(async(otp, tokenParam)=>{
    const t = tokenParam||twoFactorToken; if(!t) return {success:false, error:'Invalid session'};
    try{
      const res=await api.post('/auth/verify-otp',{otp, twoFactorToken:t});
      const payload=unwrapApiData(res); const access=payload.accessToken||payload.token; const refresh=payload.refreshToken;
      const userObj={ id:payload.userId??payload.id, name:payload.fullName??payload.name, email:payload.email, role:payload.role||'CUSTOMER', avatar:payload.avatar, permissions:payload.permissions||[] };
      updateTokens(access,refresh); TokenManager.setUser(userObj);
      setUser(userObj); setIsAuthenticated(true); setPermissions(userObj.permissions); setSessionExpiry(getTokenExpiryTime(access)); setTwoFactorRequired(false);
      return {success:true, data:userObj};
    }catch(e){ return {success:false, error:e.response?.data?.message||'Invalid code'}; }
  },[twoFactorToken, updateTokens]);

  const hasRole = useCallback((role)=>{ if(!isAuthenticated||!user) return false; if(user.role==='SUPER_ADMIN') return true; return user.role?.toUpperCase()===role.toUpperCase(); },[isAuthenticated,user]);
  const hasPermission = useCallback((p)=>{ if(!isAuthenticated) return false; if(user?.role==='SUPER_ADMIN'||user?.role==='ADMIN') return true; return permissions.includes(p); },[isAuthenticated,user,permissions]);

  const value = useMemo(()=>({
    user, token, refreshToken, loading, isAuthenticated, error, connectionStatus, sessionExpiry, permissions, twoFactorRequired, initialized,
    login, logout, register, verifyTwoFactor, forgotPassword, resetPassword,
    isTokenValid:()=>isTokenValid(token),
    hasRole, hasPermission,
    isAdmin:()=>hasRole('ADMIN')||hasRole('SUPER_ADMIN'),
    isProvider:()=>hasRole('PROVIDER')||hasRole('SERVICE_PROVIDER'),
    isCustomer:()=>hasRole('CUSTOMER'),
  }),[user,token,refreshToken,loading,isAuthenticated,error,connectionStatus,sessionExpiry,permissions,twoFactorRequired,initialized,login,logout,register,verifyTwoFactor,forgotPassword,resetPassword,hasRole,hasPermission]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;