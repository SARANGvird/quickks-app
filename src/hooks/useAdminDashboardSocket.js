// src/hooks/useAdminDashboardSocket.js
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { toast } from "react-toastify";
import * as apiModule from "../api/api";

/* ============================== Config ============================== */

const CONFIG = {
  MAX_RECONNECT_ATTEMPTS: 10,
  BASE_DELAY: 1000,
  MAX_DELAY: 30000,
  HEARTBEAT: 10000,
  CONNECT_TIMEOUT: 15000,
  STABLE_AFTER: 10000, // a connection must survive this long before retry counters reset
  TOKEN_REFRESH_SKEW: 60000,
  MAX_ALERTS: 50,
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

// Set VITE_WS_NATIVE=true to use a plain WebSocket (brokerURL) instead of SockJS.
// This also removes SockJS's "unload" permissions-policy console warning.
// Requires a raw (non-SockJS) STOMP endpoint on the server.
const USE_NATIVE_WS = import.meta.env?.VITE_WS_NATIVE === "true";

/* ============================== Helpers ============================== */

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// api.js exports the token helper as TokenManager in some files and tokenManager in others.
const tokenApi = () => apiModule.TokenManager || apiModule.tokenManager || null;

const getToken = () => {
  try { return tokenApi()?.getAccessToken?.() ?? null; } catch { return null; }
};

// Optional: uses whichever refresh helper api.js exposes. Returns the new token or null.
const refreshAccessToken = async () => {
  const tm = tokenApi();
  const fn = apiModule.refreshAccessToken || apiModule.refreshToken || tm?.refreshAccessToken || tm?.refreshToken || tm?.refresh;
  if (typeof fn !== "function") return null;
  try {
    await fn.call(tm);
    return getToken();
  } catch {
    return null;
  }
};

// Milliseconds until the JWT expires. Infinity if it cannot be decoded (opaque tokens).
const tokenExpiresInMs = (token) => {
  try {
    let part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    part = part.padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = decodeURIComponent(atob(part).split("").map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
    const { exp } = JSON.parse(json);
    return exp ? exp * 1000 - Date.now() : Infinity;
  } catch {
    return Infinity;
  }
};

const httpBase = () => {
  const raw = apiModule.SOCKJS_BASE
    || (() => { try { return new URL(apiModule.API_BASE_URL || "", window.location.origin).origin; } catch { return window.location.origin; } })();
  return String(raw).replace(/^ws/i, "http").replace(/\/+$/, "");
};
const sockJsUrl = () => `${httpBase()}/ws`;
const brokerUrl = () => apiModule.WS_URL || `${httpBase().replace(/^http/i, "ws")}/ws`;

/* ============================== Hook ============================== */

export default function useAdminDashboardSocket(options = {}) {
  const {
    enableRealTime = true,
    autoConnect = true,
    maxAlerts = CONFIG.MAX_ALERTS,
    onAlert,
    onStatsUpdate,
    onConnectionChange,
    appHeartbeat = false, // extra app-level heartbeat to /app/heartbeat; STOMP heartbeats already keep the link alive
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
  const heartbeatTimerRef = useRef(null);
  const connectRef = useRef(null);

  // Always-current options, without re-creating callbacks (and therefore without reconnecting).
  const optsRef = useRef({});
  optsRef.current = { enableRealTime, autoConnect, maxAlerts, onAlert, onStatsUpdate, onConnectionChange, appHeartbeat, debug };

  const log = useCallback((...a) => { if (optsRef.current.debug) console.log("[AdminSocket]", ...a); }, []);

  const transition = useCallback((state, err = null) => {
    stateRef.current = state;
    if (!mountedRef.current) return;
    setConnectionState(state);
    setIsConnected(state === CONNECTION_STATE.CONNECTED);
    setIsConnecting(state === CONNECTION_STATE.CONNECTING);
    setError(err);
    optsRef.current.onConnectionChange?.({ connected: state === CONNECTION_STATE.CONNECTED, state, error: err });
  }, []);

  const clearTimers = useCallback(() => {
    [reconnectTimerRef, connectTimerRef, stableTimerRef].forEach((r) => { clearTimeout(r.current); r.current = null; });
    clearInterval(heartbeatTimerRef.current);
    heartbeatTimerRef.current = null;
  }, []);

  // Detach a client without letting its late callbacks (close, error) trigger anything.
  const teardown = useCallback((client) => {
    subsRef.current.forEach((s) => { try { s.unsubscribe(); } catch { /* already gone */ } });
    subsRef.current.clear();
    if (!client) return;
    client.onConnect = null;
    client.onStompError = null;
    client.onWebSocketClose = null;
    client.onWebSocketError = null;
    Promise.resolve().then(() => client.deactivate()).catch(() => { /* ignore */ });
  }, []);

  const handleAlert = useCallback((raw) => {
    if (!mountedRef.current) return;
    const data = raw && typeof raw === "object" ? raw : { message: String(raw ?? "") };
    const alert = { id: data.id || genId(), timestamp: new Date().toISOString(), read: false, ...data };
    setAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev].slice(0, optsRef.current.maxAlerts)));
    setLastUpdated(new Date());
    optsRef.current.onAlert?.(alert);
    if (String(data.severity).toLowerCase() === "critical") {
      toast.error(`Critical: ${data.title || data.message || "Alert"}`, { autoClose: false, toastId: `crit-${alert.id}` });
    }
  }, []);

  const subscribe = useCallback((client) => {
    const onStats = (d) => { setLastUpdated(new Date()); optsRef.current.onStatsUpdate?.(d); };
    [
      { topic: TOPICS.ADMIN_DASHBOARD, handler: onStats },
      { topic: TOPICS.ADMIN_STATS, handler: onStats },
      { topic: TOPICS.ADMIN_ALERTS, handler: handleAlert },
    ].forEach(({ topic, handler }) => {
      try {
        const sub = client.subscribe(topic, (msg) => {
          try { handler(JSON.parse(msg.body)); } catch (e) { log(`Bad payload on ${topic}`, e?.message); }
        });
        subsRef.current.set(topic, sub);
        log("Subscribed", topic);
      } catch (e) { console.error(`[AdminSocket] subscribe failed for ${topic}`, e?.message); }
    });
  }, [handleAlert, log]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !shouldRunRef.current || !optsRef.current.enableRealTime) return;
    clearTimeout(reconnectTimerRef.current);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      transition(CONNECTION_STATE.RECONNECTING, "You are offline. Live updates resume when you reconnect.");
      return; // the "online" listener restarts the connection
    }
    if (attemptRef.current >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      transition(CONNECTION_STATE.FAILED, "Live updates are unavailable. The dashboard will keep refreshing on a timer.");
      return;
    }
    attemptRef.current += 1;
    setReconnectAttempt(attemptRef.current);
    const base = Math.min(CONFIG.BASE_DELAY * 1.6 ** (attemptRef.current - 1), CONFIG.MAX_DELAY);
    const delay = Math.round(base * (0.75 + Math.random() * 0.5)); // jitter avoids reconnect storms
    log(`Reconnect ${attemptRef.current}/${CONFIG.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    transition(CONNECTION_STATE.RECONNECTING, null);
    reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
  }, [transition, log]);

  const connectInternal = useCallback(async () => {
    if (!mountedRef.current || !shouldRunRef.current || !optsRef.current.enableRealTime) return;
    if (connectingRef.current || clientRef.current?.connected) return;
    connectingRef.current = true;
    clearTimeout(reconnectTimerRef.current);

    let token = getToken();
    if (!token) {
      connectingRef.current = false;
      transition(CONNECTION_STATE.AUTH_ERROR, "Sign in is required for live updates.");
      return;
    }
    transition(CONNECTION_STATE.CONNECTING);

    // Never connect with an expired token: refresh first, or stop.
    if (tokenExpiresInMs(token) < CONFIG.TOKEN_REFRESH_SKEW) {
      const fresh = await refreshAccessToken();
      if (!mountedRef.current || !shouldRunRef.current) { connectingRef.current = false; return; }
      if (fresh) token = fresh;
      if (tokenExpiresInMs(token) <= 0) {
        connectingRef.current = false;
        transition(CONNECTION_STATE.AUTH_ERROR, "Your session has expired.");
        window.dispatchEvent(new Event("auth:expired"));
        return;
      }
    }

    const gen = ++generationRef.current;
    const isCurrent = () => mountedRef.current && gen === generationRef.current;
    let lost = false;
    let client;

    // Single exit path for every failure, so one drop is counted exactly once.
    const lose = ({ auth = false, message = "Connection lost" } = {}) => {
      if (lost || !isCurrent()) return;
      lost = true;
      clearTimeout(connectTimerRef.current);
      clearTimeout(stableTimerRef.current);
      clearInterval(heartbeatTimerRef.current);
      connectingRef.current = false;
      wasLostRef.current = true;
      teardown(client);
      if (clientRef.current === client) clientRef.current = null;
      log("Lost:", message);

      if (auth) {
        if (authRetriedRef.current) {
          transition(CONNECTION_STATE.AUTH_ERROR, "Live updates are not permitted for this session.");
          toast.error("Live updates need a fresh sign-in.", { toastId: "ws-auth" });
          return; // no more retries: they would only hammer the server with a rejected token
        }
        authRetriedRef.current = true;
        transition(CONNECTION_STATE.RECONNECTING, "Refreshing session for live updates...");
        refreshAccessToken().finally(() => { if (mountedRef.current && shouldRunRef.current) scheduleReconnect(); });
        return;
      }
      transition(CONNECTION_STATE.ERROR, message);
      scheduleReconnect();
    };

    try {
      client = new Client({
        ...(USE_NATIVE_WS ? { brokerURL: brokerUrl() } : { webSocketFactory: () => new SockJS(sockJsUrl()) }),
        connectHeaders: { Authorization: `Bearer ${token}`, "X-Client-Type": "admin-dashboard" },
        reconnectDelay: 0, // reconnection is handled here, with backoff
        heartbeatIncoming: CONFIG.HEARTBEAT,
        heartbeatOutgoing: CONFIG.HEARTBEAT,
        debug: () => {},
      });

      client.onConnect = () => {
        if (!isCurrent() || lost) return;
        clearTimeout(connectTimerRef.current);
        connectingRef.current = false;
        const recovered = wasLostRef.current;
        wasLostRef.current = false;
        transition(CONNECTION_STATE.CONNECTED);
        setLastUpdated(new Date());
        log("Connected");
        subscribe(client);

        // Retry counters only reset once the link has proven stable, so a server that accepts
        // CONNECT but rejects SUBSCRIBE cannot cause a tight reconnect loop.
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = setTimeout(() => {
          attemptRef.current = 0;
          authRetriedRef.current = false;
          if (mountedRef.current) setReconnectAttempt(0);
        }, CONFIG.STABLE_AFTER);

        if (optsRef.current.appHeartbeat) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = setInterval(() => {
            if (!client.connected) return;
            try { client.publish({ destination: "/app/heartbeat", body: JSON.stringify({ ts: Date.now() }) }); } catch { /* ignore */ }
          }, CONFIG.HEARTBEAT);
        }
        if (recovered) toast.success("Live updates restored", { autoClose: 2000, toastId: "ws-ok" });
      };

      client.onStompError = (frame) => {
        const detail = `${frame?.headers?.message || ""} ${frame?.body || ""}`;
        // "Failed to send message to ExecutorSubscribableChannel[clientInboundChannel]" means a
        // server-side interceptor threw on CONNECT or SUBSCRIBE: treat it as an auth/permission failure.
        const channelFailure = /clientInboundChannel|Failed to send message/i.test(detail);
        const authFailure = channelFailure || /auth|jwt|token|unauthori[sz]ed|forbidden|denied|expired/i.test(detail);
        console.error("[AdminSocket] STOMP error:", (frame?.headers?.message || "unknown").slice(0, 200));
        lose({ auth: authFailure, message: frame?.headers?.message || "Realtime error" });
      };

      // The close event is what actually fires when a link drops (server restart, idle timeout, network).
      client.onWebSocketClose = () => lose({ message: "Connection closed" });
      client.onWebSocketError = () => lose({ message: "Cannot reach the realtime server" });

      clientRef.current = client;
      connectTimerRef.current = setTimeout(() => lose({ message: "Realtime connection timed out" }), CONFIG.CONNECT_TIMEOUT);
      client.activate();
    } catch (e) {
      console.error("[AdminSocket] could not create connection", e?.message);
      lose({ message: e?.message || "Could not start realtime" });
    }
  }, [transition, subscribe, scheduleReconnect, teardown, log]);

  connectRef.current = connectInternal;

  /* ---------- Public controls ---------- */

  const shutdown = useCallback(() => {
    shouldRunRef.current = false;
    clearTimers();
    generationRef.current += 1; // invalidates every late callback from the old client
    teardown(clientRef.current);
    clientRef.current = null;
    connectingRef.current = false;
    attemptRef.current = 0;
    authRetriedRef.current = false;
    wasLostRef.current = false;
  }, [clearTimers, teardown]);

  const connect = useCallback(() => {
    if (!optsRef.current.enableRealTime) return;
    shouldRunRef.current = true;
    connectRef.current?.();
  }, []);

  const disconnect = useCallback(() => {
    shutdown();
    setReconnectAttempt(0);
    transition(CONNECTION_STATE.DISCONNECTED);
  }, [shutdown, transition]);

  const reconnect = useCallback(() => {
    if (!mountedRef.current || !optsRef.current.enableRealTime) return;
    clearTimers();
    generationRef.current += 1;
    teardown(clientRef.current);
    clientRef.current = null;
    connectingRef.current = false;
    attemptRef.current = 0;
    authRetriedRef.current = false;
    setReconnectAttempt(0);
    shouldRunRef.current = true;
    connectRef.current?.();
  }, [clearTimers, teardown]);

  /* ---------- Lifecycle ---------- */

  useEffect(() => {
    mountedRef.current = true;
    let startTimer = null;
    if (enableRealTime && autoConnect) {
      shouldRunRef.current = true;
      startTimer = setTimeout(() => connectRef.current?.(), 250);
    }
    return () => {
      clearTimeout(startTimer);
      mountedRef.current = false;
      shutdown();
    };
  }, [enableRealTime, autoConnect, shutdown]);

  /* Network, tab visibility and auth events. */
  useEffect(() => {
    const kick = ({ force = false } = {}) => {
      const o = optsRef.current;
      if (!o.enableRealTime || !o.autoConnect || !shouldRunRef.current) return;
      if (clientRef.current?.connected || connectingRef.current) return;
      if (!force && stateRef.current === CONNECTION_STATE.AUTH_ERROR) return;
      attemptRef.current = 0;
      authRetriedRef.current = false;
      connectRef.current?.();
    };
    const onOnline = () => kick();
    const onVisible = () => { if (document.visibilityState === "visible") kick(); };
    const onTokenEvent = () => kick({ force: true }); // new credentials may fix an auth error
    const onLogout = () => disconnect();

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("token-refreshed", onTokenEvent);
    window.addEventListener("auth:login", onTokenEvent);
    window.addEventListener("auth:logout", onLogout);
    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("token-refreshed", onTokenEvent);
      window.removeEventListener("auth:login", onTokenEvent);
      window.removeEventListener("auth:logout", onLogout);
    };
  }, [disconnect]);

  /* ---------- Alerts API ---------- */

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);
  const markAlertAsRead = useCallback((id) => setAlerts((p) => p.map((a) => (a.id === id ? { ...a, read: true } : a))), []);
  const markAllAlertsAsRead = useCallback(() => setAlerts((p) => p.map((a) => ({ ...a, read: true }))), []);
  const clearAlerts = useCallback(() => setAlerts([]), []);

  return {
    connected: isConnected,
    connecting: isConnecting,
    connectionState,
    reconnectAttempt,
    error,
    lastUpdated,
    alerts,
    unreadCount,
    markAlertAsRead,
    markAllAlertsAsRead,
    clearAlerts,
    connect,
    disconnect,
    reconnect,
    isHealthy: isConnected && !error,
  };
}