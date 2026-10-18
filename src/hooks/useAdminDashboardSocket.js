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

const USE_NATIVE_WS = import.meta.env?.VITE_WS_NATIVE === "true";

const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const tokenApi = () => apiModule.TokenManager || apiModule.tokenManager || null;

const getToken = () => {
  try {
    return tokenApi()?.getAccessToken?.() ?? null;
  } catch {
    return null;
  }
};

const refreshAccessTokenFn = async () => {
  const tm = tokenApi();
  const fn = apiModule.refreshAccessToken || apiModule.refreshToken;
  if (typeof fn !== "function") return null;
  try {
    const newToken = await fn();
    if (typeof newToken === "string" && newToken.length > 20) return newToken;
    return getToken();
  } catch {
    return null;
  }
};

const tokenExpiresInMs = (token) => {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return Infinity;
    let part = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    part = part.padEnd(Math.ceil(part.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(part)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
    const { exp } = JSON.parse(json);
    return exp ? exp * 1000 - Date.now() : Infinity;
  } catch {
    return Infinity;
  }
};

const httpBase = () => {
  const raw = apiModule.SOCKJS_BASE || apiModule.API_ORIGIN || (() => {
    try {
      return new URL(apiModule.API_BASE_URL || "", window.location.origin).origin;
    } catch {
      return window.location.origin;
    }
  })();
  return String(raw).replace(/^ws/i, "http").replace(/\/+$/, "");
};

const sockJsUrl = () => `${httpBase()}/ws`;
const brokerUrl = () => apiModule.wsConfig?.getWsUrl?.() || apiModule.WS_URL || `${httpBase().replace(/^http/i, "ws")}/ws`;

const isValidAlert = (data) => {
  if (!data || typeof data !== "object") return false;
  if (typeof data.message !== "string" && typeof data.title !== "string" && typeof data.description !== "string") return false;
  return true;
};

const sanitizeAlert = (raw) => {
  if (!raw || typeof raw !== "object") return { message: String(raw ?? ""), severity: "info" };
  const allowed = ["id", "title", "message", "description", "severity", "type", "timestamp", "createdAt", "action", "link", "providerId", "bookingId", "data"];
  const out = {};
  for (const k of allowed) if (raw[k] !== undefined) out[k] = typeof raw[k] === "string" ? raw[k].slice(0, 500) : raw[k];
  if (out.severity) out.severity = String(out.severity).toLowerCase().slice(0, 20);
  if (out.type) out.type = String(out.type).toLowerCase().slice(0, 20);
  return out;
};

export default function useAdminDashboardSocket(options = {}) {
  const {
    enableRealTime = true,
    autoConnect = true,
    maxAlerts = CONFIG.MAX_ALERTS,
    onAlert,
    onStatsUpdate,
    onConnectionChange,
    appHeartbeat = false,
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
  const lastAlertIdsRef = useRef(new Set());

  const optsRef = useRef({});
  optsRef.current = { enableRealTime, autoConnect, maxAlerts, onAlert, onStatsUpdate, onConnectionChange, appHeartbeat, debug };

  const log = useCallback((...a) => {
    if (optsRef.current.debug) console.log("[AdminSocket v67]", ...a);
  }, []);

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
    [reconnectTimerRef, connectTimerRef, stableTimerRef].forEach((r) => {
      if (r.current) {
        clearTimeout(r.current);
        r.current = null;
      }
    });
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback((client) => {
    subsRef.current.forEach((s) => {
      try {
        s.unsubscribe();
      } catch {}
    });
    subsRef.current.clear();
    if (!client) return;
    try {
      client.onConnect = null;
      client.onStompError = null;
      client.onWebSocketClose = null;
      client.onWebSocketError = null;
    } catch {}
    Promise.resolve()
      .then(() => {
        try {
          client.deactivate();
        } catch {}
      })
      .catch(() => {});
  }, []);

  const handleAlert = useCallback((raw) => {
    if (!mountedRef.current) return;
    if (!isValidAlert(raw)) return;
    const data = sanitizeAlert(raw);
    if (data.id && lastAlertIdsRef.current.has(String(data.id))) return;
    if (data.id) {
      lastAlertIdsRef.current.add(String(data.id));
      if (lastAlertIdsRef.current.size > CONFIG.MAX_ALERTS_MEMORY) {
        const first = lastAlertIdsRef.current.values().next().value;
        lastAlertIdsRef.current.delete(first);
      }
    }
    const alert = { id: data.id || genId(), timestamp: new Date().toISOString(), read: false, ...data };
    setAlerts((prev) => {
      if (prev.some((a) => String(a.id) === String(alert.id))) return prev;
      return [alert, ...prev].slice(0, optsRef.current.maxAlerts);
    });
    setLastUpdated(new Date());
    optsRef.current.onAlert?.(alert);
    const sev = String(data.severity || data.type || "").toLowerCase();
    if (sev === "critical") {
      toast.error(`Critical: ${data.title || data.message || "Alert"}`, { autoClose: false, toastId: `crit-${alert.id}` });
    }
  }, []);

  const subscribe = useCallback((client) => {
    const onStats = (d) => {
      if (!d || typeof d !== "object") return;
      setLastUpdated(new Date());
      optsRef.current.onStatsUpdate?.(d);
    };

    [
      { topic: TOPICS.ADMIN_DASHBOARD, handler: onStats },
      { topic: TOPICS.ADMIN_STATS, handler: onStats },
      { topic: TOPICS.ADMIN_ALERTS, handler: handleAlert },
    ].forEach(({ topic, handler }) => {
      try {
        const sub = client.subscribe(topic, (msg) => {
          try {
            const body = msg.body ? JSON.parse(msg.body) : null;
            if (body) handler(body);
          } catch (e) {
            log(`Bad payload on ${topic}`, e?.message?.slice(0, 100));
          }
        });
        subsRef.current.set(topic, sub);
        log("Subscribed", topic);
      } catch (e) {
        log(`subscribe ${topic} failed`, e?.message);
      }
    });
  }, [handleAlert, log]);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current || !shouldRunRef.current || !optsRef.current.enableRealTime) return;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      transition(CONNECTION_STATE.RECONNECTING, "Offline - live resumes on reconnect");
      reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), 5000);
      return;
    }
    if (attemptRef.current >= CONFIG.MAX_RECONNECT_ATTEMPTS) {
      transition(CONNECTION_STATE.FAILED, "Live unavailable - using polling fallback");
      return;
    }
    attemptRef.current += 1;
    setReconnectAttempt(attemptRef.current);
    const base = Math.min(CONFIG.BASE_DELAY * Math.pow(1.6, attemptRef.current - 1), CONFIG.MAX_DELAY);
    const delay = Math.round(base * (0.75 + Math.random() * 0.5));
    log(`Reconnect ${attemptRef.current}/${CONFIG.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    transition(CONNECTION_STATE.RECONNECTING, null);
    reconnectTimerRef.current = setTimeout(() => connectRef.current?.(), delay);
  }, [transition, log]);

  const connectInternal = useCallback(async () => {
    if (!mountedRef.current || !shouldRunRef.current || !optsRef.current.enableRealTime) return;
    if (connectingRef.current || clientRef.current?.connected) return;
    connectingRef.current = true;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    let token = getToken();
    if (!token) {
      connectingRef.current = false;
      transition(CONNECTION_STATE.AUTH_ERROR, "Sign in required for live");
      return;
    }

    transition(CONNECTION_STATE.CONNECTING);

    if (tokenExpiresInMs(token) < CONFIG.TOKEN_REFRESH_SKEW) {
      const fresh = await refreshAccessTokenFn();
      if (!mountedRef.current || !shouldRunRef.current) {
        connectingRef.current = false;
        return;
      }
      if (fresh) token = fresh;
      if (tokenExpiresInMs(token) <= 0) {
        connectingRef.current = false;
        transition(CONNECTION_STATE.AUTH_ERROR, "Session expired");
        window.dispatchEvent(new Event("auth:expired"));
        return;
      }
    }

    const gen = ++generationRef.current;
    const isCurrent = () => mountedRef.current && gen === generationRef.current;
    let lost = false;
    let client = null;

    const lose = ({ auth = false, message = "Connection lost" } = {}) => {
      if (lost || !isCurrent()) return;
      lost = true;
      if (connectTimerRef.current) {
        clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      if (stableTimerRef.current) {
        clearTimeout(stableTimerRef.current);
        stableTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      connectingRef.current = false;
      wasLostRef.current = true;
      teardown(client);
      if (clientRef.current === client) clientRef.current = null;
      log("Lost:", message);
      if (auth) {
        if (authRetriedRef.current) {
          transition(CONNECTION_STATE.AUTH_ERROR, "Live not permitted for session");
          toast.error("Live needs fresh sign-in", { toastId: "ws-auth" });
          return;
        }
        authRetriedRef.current = true;
        transition(CONNECTION_STATE.RECONNECTING, "Refreshing session...");
        refreshAccessTokenFn().finally(() => {
          if (mountedRef.current && shouldRunRef.current) scheduleReconnect();
        });
        return;
      }
      transition(CONNECTION_STATE.ERROR, message);
      scheduleReconnect();
    };

    try {
      const clientConfig = {
        connectHeaders: {
          Authorization: `Bearer ${token}`,
          "X-Client-Type": "admin-dashboard-v67",
          "X-Request-ID": genId(),
        },
        reconnectDelay: 0,
        heartbeatIncoming: CONFIG.HEARTBEAT,
        heartbeatOutgoing: CONFIG.HEARTBEAT,
        debug: () => {},
        onWebSocketClose: (evt) => {
          const reason = evt?.reason || (evt?.code ? `Close code ${evt.code}` : "Connection closed");
          lose({ message: reason });
        },
        onWebSocketError: () => lose({ message: "Cannot reach realtime server" }),
      };

      if (USE_NATIVE_WS) {
        clientConfig.brokerURL = brokerUrl();
      } else {
        clientConfig.webSocketFactory = () => new SockJS(sockJsUrl());
      }

      client = new Client(clientConfig);

      client.onConnect = () => {
        if (!isCurrent() || lost) return;
        if (connectTimerRef.current) {
          clearTimeout(connectTimerRef.current);
          connectTimerRef.current = null;
        }
        connectingRef.current = false;
        const recovered = wasLostRef.current;
        wasLostRef.current = false;
        transition(CONNECTION_STATE.CONNECTED);
        setLastUpdated(new Date());
        log("Connected v67");
        subscribe(client);
        if (stableTimerRef.current) clearTimeout(stableTimerRef.current);
        stableTimerRef.current = setTimeout(() => {
          attemptRef.current = 0;
          authRetriedRef.current = false;
          if (mountedRef.current) setReconnectAttempt(0);
        }, CONFIG.STABLE_AFTER);

        if (optsRef.current.appHeartbeat) {
          if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = setInterval(() => {
            if (!client.connected) return;
            try {
              client.publish({ destination: "/app/heartbeat", body: JSON.stringify({ ts: Date.now(), gen }) });
            } catch {}
          }, CONFIG.HEARTBEAT);
        }

        if (recovered) toast.success("Live restored", { autoClose: 2000, toastId: "ws-ok" });
      };

      client.onStompError = (frame) => {
        const detail = `${frame?.headers?.message || ""} ${frame?.body || ""}`.slice(0, 800);
        const channelFailure = /clientInboundChannel|Failed to send message|ExecutorSubscribableChannel/i.test(detail);
        const authFailure = channelFailure || /auth|jwt|token|unauthori[sz]ed|forbidden|denied|expired|credentials|access denied/i.test(detail);
        log("STOMP error:", (frame?.headers?.message || "unknown").slice(0, 200));
        lose({ auth: authFailure, message: frame?.headers?.message || "Realtime error" });
      };

      clientRef.current = client;
      connectTimerRef.current = setTimeout(() => lose({ message: "Connection timed out" }), CONFIG.CONNECT_TIMEOUT);
      client.activate();
    } catch (e) {
      log("create failed", e?.message);
      lose({ message: e?.message || "Could not start realtime" });
    }
  }, [transition, subscribe, scheduleReconnect, teardown, log]);

  connectRef.current = connectInternal;

  const shutdown = useCallback(() => {
    shouldRunRef.current = false;
    clearTimers();
    generationRef.current += 1;
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
    lastAlertIdsRef.current.clear();
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

  useEffect(() => {
    mountedRef.current = true;
    let startTimer = null;
    if (enableRealTime && autoConnect) {
      shouldRunRef.current = true;
      startTimer = setTimeout(() => connectRef.current?.(), 300);
    }
    return () => {
      if (startTimer) clearTimeout(startTimer);
      mountedRef.current = false;
      shutdown();
    };
  }, [enableRealTime, autoConnect, shutdown]);

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
    const onVisible = () => {
      if (document.visibilityState === "visible") kick();
    };
    const onTokenEvent = () => kick({ force: true });
    const onLogout = () => disconnect();

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("token-refreshed", onTokenEvent);
    window.addEventListener("auth:login", onTokenEvent);
    window.addEventListener("auth:logout", onLogout);
    window.addEventListener("auth:expired", onLogout);

    return () => {
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("token-refreshed", onTokenEvent);
      window.removeEventListener("auth:login", onTokenEvent);
      window.removeEventListener("auth:logout", onLogout);
      window.removeEventListener("auth:expired", onLogout);
    };
  }, [disconnect]);

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  const markAlertAsRead = useCallback((id) => {
    setAlerts((p) => p.map((a) => (String(a.id) === String(id) ? { ...a, read: true } : a)));
  }, []);

  const markAllAlertsAsRead = useCallback(() => {
    setAlerts((p) => p.map((a) => ({ ...a, read: true })));
  }, []);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    lastAlertIdsRef.current.clear();
  }, []);

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