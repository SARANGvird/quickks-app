import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { toast } from "react-toastify";
import * as apiModule from "../api/api";

const CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 12,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  HEARTBEAT: 10000,
  CONNECT_TIMEOUT: 15000,
  STABLE_AFTER: 12000,
  TOKEN_REFRESH_SKEW: 90000,
  MAX_ALERTS: 50,
  MAX_ALERTS_MEMORY: 200,
};

export const TOPICS = {
  ADMIN_ALERTS: "/topic/admin/alerts",
  ADMIN_STATS: "/topic/admin/stats",
  ADMIN_DASHBOARD: "/topic/admin/dashboard",
  BOOKINGS: "/topic/bookings",
  PROVIDERS: "/topic/providers",
  USERS: "/topic/users",
};

export const CONNECTION_STATE = {
  DISCONNECTED: "disconnected",
  CONNECTING: "connecting",
  CONNECTED: "connected",
  RECONNECTING: "reconnecting",
  ERROR: "error",
  FAILED: "failed",
  AUTH_ERROR: "auth_error",
};

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const tokenApi = () => apiModule.TokenManager || apiModule.tokenManager || null;

const getToken = () => {
  try { return tokenApi()?.getAccessToken?.() ?? null; } catch { return null; }
};

const refreshAccessTokenFn = async () => {
  const fn = apiModule.refreshAccessToken || apiModule.refreshToken;
  if (typeof fn !== "function") return getToken();
  try {
    const t = await fn();
    return typeof t === "string" && t.length > 20 ? t : getToken();
  } catch { return null; }
};

const tokenExpiresInMs = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return Infinity;
    let part = parts[1].replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parts[1].length / 4) * 4, "=");
    const json = JSON.parse(atob(part));
    return json.exp ? json.exp * 1000 - Date.now() : Infinity;
  } catch { return Infinity; }
};

const httpBase = () => {
  const raw = apiModule.SOCKJS_BASE || apiModule.API_ORIGIN || apiModule.API_BASE_URL || window.location.origin;
  return String(raw).replace(/^ws/i, "http").replace(/\/+$/, "");
};

const sockJsUrl = () => `${httpBase()}/ws`;

export default function useAdminDashboardSocket(options = {}) {
  const {
    enableRealTime = true,
    autoConnect = true,
    maxAlerts = CONFIG.MAX_ALERTS,
    onAlert,
    onStatsUpdate,
    onConnectionChange,
    debug = Boolean(import.meta.env?.DEV),
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [connectionState, setConnectionState] = useState(CONNECTION_STATE.DISCONNECTED);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  const mountedRef = useRef(true);
  const shouldRunRef = useRef(false);
  const clientRef = useRef(null);
  const subsRef = useRef(new Map());
  const generationRef = useRef(0);
  const connectingRef = useRef(false);
  const attemptRef = useRef(0);
  const authRetriedRef = useRef(false);
  const wasLostRef = useRef(false);
  const stateRef = useRef(CONNECTION_STATE.DISCONNECTED);
  const reconnectTimerRef = useRef(null);
  const connectTimerRef = useRef(null);
  const stableTimerRef = useRef(null);
  const connectRef = useRef(null);
  const lastAlertIdsRef = useRef(new Set());

  const optsRef = useRef({});
  optsRef.current = { enableRealTime, autoConnect, maxAlerts, onAlert, onStatsUpdate, onConnectionChange, debug };

  const log = useCallback((...a) => { if (optsRef.current.debug) console.log("[AdminSocket v75]", ...a); }, []);

  const transition = useCallback((state, err = null) => {
    stateRef.current = state;
    if (!mountedRef.current) return;
    setConnectionState(state);
    setIsConnected(state === CONNECTION_STATE.CONNECTED);
    setIsConnecting(state === CONNECTION_STATE.CONNECTING || state === CONNECTION_STATE.RECONNECTING);
    setError(err);
    optsRef.current.onConnectionChange?.({ connected: state === CONNECTION_STATE.CONNECTED, state, error: err });
  }, []);

  const clearTimers = useCallback(() => {
    [reconnectTimerRef, connectTimerRef, stableTimerRef].forEach(r => { if (r.current) { clearTimeout(r.current); r.current = null; } });
  }, []);

  const teardown = useCallback((client) => {
    subsRef.current.forEach(s => { try { s.unsubscribe(); } catch {} });
    subsRef.current.clear();
    if (!client) return;
    try { client.deactivate({ force: true }); } catch { try { client.deactivate(); } catch {} }
  }, []);

  const handleAlert = useCallback((raw) => {
    if (!mountedRef.current || !raw || typeof raw !== "object") return;
    const data = raw;
    if (data.id && lastAlertIdsRef.current.has(String(data.id))) return;
    if (data.id) {
      lastAlertIdsRef.current.add(String(data.id));
      if (lastAlertIdsRef.current.size > CONFIG.MAX_ALERTS_MEMORY) {
        lastAlertIdsRef.current.delete(lastAlertIdsRef.current.values().next().value);
      }
    }
    const alert = { id: data.id || genId(), timestamp: new Date().toISOString(), read: false, ...data };
    setAlerts(prev => [alert, ...prev].slice(0, optsRef.current.maxAlerts));
    setLastUpdated(new Date());
    optsRef.current.onAlert?.(alert);
    if (String(data.severity).toLowerCase() === "critical") toast.error(data.title || data.message, { autoClose: false });
  }, []);

  const subscribe = useCallback((client) => {
    const onStats = (d) => { if (d && typeof d === "object") { setLastUpdated(new Date()); optsRef.current.onStatsUpdate?.(d); } };
    [
      { topic: TOPICS.ADMIN_DASHBOARD, handler: onStats },
      { topic: TOPICS.ADMIN_STATS, handler: onStats },
      { topic: TOPICS.ADMIN_ALERTS, handler: handleAlert },
    ].forEach(({ topic, handler }) => {
      try {
        const sub = client.subscribe(topic, (msg) => {
          try { const body = msg.body ? JSON.parse(msg.body) : null; if (body) handler(body); } catch {}
        });
        subsRef.current.set(topic, sub);
      } catch {}
    });
  }, [handleAlert]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !shouldRunRef.current || !optsRef.current.enableRealTime) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (attemptRef.current >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      transition(CONNECTION_STATE.FAILED, "Live unavailable - polling");
      return;
    }
    attemptRef.current += 1;
    setReconnectAttempt(attemptRef.current);
    const base = Math.min(CONFIG.BASE_DELAY * Math.pow(1.6, attemptRef.current - 1), CONFIG.MAX_DELAY);
    const delay = Math.round(base * (0.75 + Math.random() * 0.5));
    transition(CONNECTION_STATE.RECONNECTING, null);
    reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
  }, [transition]);

  const connectInternal = useCallback(async () => {
    if (!mountedRef.current || !shouldRunRef.current || !optsRef.current.enableRealTime) return;
    if (connectingRef.current || clientRef.current?.active) return;
    connectingRef.current = true;

    let token = getToken();
    if (!token) { connectingRef.current = false; transition(CONNECTION_STATE.AUTH_ERROR, "Sign in required"); return; }

    if (tokenExpiresInMs(token) < CONFIG.TOKEN_REFRESH_SKEW) {
      const fresh = await refreshAccessTokenFn();
      if (fresh) token = fresh;
      if (tokenExpiresInMs(token) <= 0) { connectingRef.current = false; transition(CONNECTION_STATE.AUTH_ERROR, "Session expired"); return; }
    }

    const gen = ++generationRef.current;
    const isCurrent = () => mountedRef.current && gen === generationRef.current;
    let lost = false;
    let client = null;

    const lose = ({ auth = false, message = "Connection lost" } = {}) => {
      if (lost || !isCurrent()) return;
      lost = true;
      clearTimers();
      connectingRef.current = false;
      wasLostRef.current = true;
      teardown(client);
      if (clientRef.current === client) clientRef.current = null;
      if (auth) {
        if (authRetriedRef.current) { transition(CONNECTION_STATE.AUTH_ERROR, "Live not permitted"); return; }
        authRetriedRef.current = true;
        refreshAccessTokenFn().finally(() => { if (mountedRef.current) scheduleReconnect(); });
        return;
      }
      transition(CONNECTION_STATE.ERROR, message);
      scheduleReconnect();
    };

    try {
      client = new Client({
        webSocketFactory: () => new SockJS(sockJsUrl()),
        connectHeaders: { Authorization: `Bearer ${token}`, "X-Client-Type": "admin-v75" },
        reconnectDelay: 0,
        heartbeatIncoming: CONFIG.HEARTBEAT,
        heartbeatOutgoing: CONFIG.HEARTBEAT,
        debug: () => {},
        onConnect: () => {
          if (!isCurrent() || lost) return;
          if (connectTimerRef.current) { clearTimeout(connectTimerRef.current); connectTimerRef.current = null; }
          connectingRef.current = false;
          transition(CONNECTION_STATE.CONNECTED);
          setLastUpdated(new Date());
          subscribe(client);
          if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
          stableTimerRef.current = setTimeout(() => { attemptRef.current = 0; authRetriedRef.current = false; setReconnectAttempt(0); }, CONFIG.STABLE_AFTER);
          if (wasLostRef.current) toast.success("Live restored", { autoClose: 2000 });
          wasLostRef.current = false;
        },
        onStompError: (frame) => {
          const detail = `${frame?.headers?.message || ""} ${frame?.body || ""}`.slice(0, 800);
          const authFailure = /auth|jwt|token|unauthori|forbidden|denied|expired|credentials|clientInboundChannel|Failed to send/i.test(detail);
          lose({ auth: authFailure, message: frame?.headers?.message || "Realtime error" });
        },
        onWebSocketClose: () => { lose({ message: "Connection closed" }); },
        onWebSocketError: () => { lose({ message: "Cannot reach server" }); },
      });

      clientRef.current = client;
      connectTimerRef.current = setTimeout(() => lose({ message: "Timeout" }), CONFIG.CONNECT_TIMEOUT);
      client.activate();
    } catch (e) { lose({ message: e?.message || "Start failed" }); }
  }, [transition, subscribe, scheduleReconnect, teardown, clearTimers]);

  connectRef.current = connectInternal;

  const shutdown = useCallback(() => {
    shouldRunRef.current = false;
    clearTimers();
    generationRef.current += 1;
    teardown(clientRef.current);
    clientRef.current = null;
    connectingRef.current = false;
    attemptRef.current = 0;
  }, [clearTimers, teardown]);

  const connect = useCallback(() => { shouldRunRef.current = true; lastAlertIdsRef.current.clear(); connectRef.current?.(); }, []);
  const disconnect = useCallback(() => { shutdown(); setReconnectAttempt(0); transition(CONNECTION_STATE.DISCONNECTED); }, [shutdown, transition]);
  const reconnect = useCallback(() => {
    clearTimers(); generationRef.current += 1; teardown(clientRef.current); clientRef.current = null;
    connectingRef.current = false; attemptRef.current = 0; setReconnectAttempt(0); shouldRunRef.current = true; connectRef.current?.();
  }, [clearTimers, teardown]);

  useEffect(() => {
    mountedRef.current = true;
    let t = null;
    if (enableRealTime && autoConnect) { shouldRunRef.current = true; t = setTimeout(() => connectRef.current?.(), 400); }
    return () => { if (t) clearTimeout(t); mountedRef.current = false; shutdown(); };
  }, [enableRealTime, autoConnect, shutdown]);

  useEffect(() => {
    const kick = () => { if (clientRef.current?.active || connectingRef.current) return; attemptRef.current = 0; connectRef.current?.(); };
    window.addEventListener("online", kick);
    window.addEventListener("token-refreshed", kick);
    window.addEventListener("auth:login", kick);
    return () => {
      window.removeEventListener("online", kick);
      window.removeEventListener("token-refreshed", kick);
      window.removeEventListener("auth:login", kick);
    };
  }, []);

  const unreadCount = useMemo(() => alerts.filter(a => !a.read).length, [alerts]);
  const markAlertAsRead = useCallback((id) => setAlerts(p => p.map(a => String(a.id) === String(id) ? { ...a, read: true } : a)), []);
  const markAllAlertsAsRead = useCallback(() => setAlerts(p => p.map(a => ({ ...a, read: true }))), []);
  const clearAlerts = useCallback(() => { setAlerts([]); lastAlertIdsRef.current.clear(); }, []);

  return { connected: isConnected, connecting: isConnecting, connectionState, reconnectAttempt, error, lastUpdated, alerts, unreadCount, markAlertAsRead, markAllAlertsAsRead, clearAlerts, connect, disconnect, reconnect, isHealthy: isConnected && !error };
}