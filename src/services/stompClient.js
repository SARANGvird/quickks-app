// v54 PROD - Native WebSocket STOMP - Vite + Railway + Cloudflare - 【entity-Amazon¦canonical_name=AMAZON】 Style
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Client } from "@stomp/stompjs";

const WebSocketContext = createContext(null);
export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error("useWebSocket must be inside WebSocketProvider");
  return ctx;
};

const getToken = () => localStorage.getItem("accessToken") || localStorage.getItem("token") || localStorage.getItem("quickks_token") || null;

const getWsUrl = () => {
  // Vite env - NO /quickks
  const envUrl = import.meta.env.VITE_WS_URL || import.meta.env.VITE_API_WS_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "").replace(/\/quickks\/ws/, "/ws");
  // Fallback from API URL
  const apiUrl = import.meta.env.VITE_API_BASE_URL || "https://api.quickks.in";
  const base = apiUrl.replace(/^http/, "ws").replace(/\/+$/, "").replace(/\/api\/v1/, "").replace(/\/api/, "");
  return `${base}/ws`;
};

export const WebSocketProvider = ({ children }) => {
  const [status, setStatus] = useState("disconnected");
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef(null);
  const subsRef = useRef([]);
  const reconnectRef = useRef(0);
  const timerRef = useRef(null);
  const manualCloseRef = useRef(false);

  const clearSubs = useCallback(() => {
    subsRef.current.forEach((s) => {
      try { s.unsubscribe(); } catch {}
    });
    subsRef.current = [];
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (manualCloseRef.current) return;
    if (reconnectRef.current >= 10) {
      setStatus("failed");
      return;
    }
    const delay = Math.min(1000 * Math.pow(1.5, reconnectRef.current), 30000);
    reconnectRef.current += 1;
    setStatus(`reconnecting_${reconnectRef.current}`);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      connectInternal();
    }, delay);
  }, []);

  const connectInternal = useCallback(() => {
    if (clientRef.current?.active) return;

    const token = getToken();
    if (!token) {
      setStatus("auth_error");
      return;
    }

    const brokerURL = getWsUrl();
    console.log(`[WS] Connecting ${brokerURL}`);

    const client = new Client({
      brokerURL,
      connectHeaders: {
        Authorization: `Bearer ${token}`,
        "X-Client-Id": `web_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      },
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      reconnectDelay: 0,
      debug: (str) => {
        if (import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") console.log("[STOMP]", str);
      },
      onConnect: () => {
        setIsConnected(true);
        setStatus("connected");
        reconnectRef.current = 0;
        clearSubs();

        const topics = ["/topic/admin/dashboard", "/topic/admin/stats", "/topic/admin/alerts", `/topic/user/${token.slice(-8)}`];
        topics.forEach((t) => {
          try {
            const sub = client.subscribe(t, (msg) => {
              try {
                const data = JSON.parse(msg.body);
                console.log(`[WS ${t}]`, data);
              } catch {
                console.log(`[WS ${t}]`, msg.body);
              }
            });
            subsRef.current.push(sub);
          } catch {}
        });
      },
      onStompError: (frame) => {
        const msg = (frame.headers?.message || frame.body || "").toLowerCase();
        console.error("[WS STOMP Error]", frame.headers, frame.body);
        if (msg.includes("auth") || msg.includes("jwt") || msg.includes("unauthorized") || msg.includes("expired")) {
          setStatus("auth_error");
          manualCloseRef.current = true;
        } else {
          setStatus("error");
          scheduleReconnect();
        }
      },
      onWebSocketClose: (evt) => {
        console.warn("[WS Close]", evt?.code, evt?.reason);
        if (manualCloseRef.current) return;
        clearSubs();
        setIsConnected(false);
        setStatus("disconnected");
        scheduleReconnect();
      },
      onWebSocketError: () => {
        setStatus("error");
      },
    });

    client.activate();
    clientRef.current = client;
  }, [clearSubs, scheduleReconnect]);

  const connect = useCallback(() => {
    manualCloseRef.current = false;
    reconnectRef.current = 0;
    connectInternal();
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    manualCloseRef.current = true;
    clearTimeout(timerRef.current);
    clearSubs();
    try {
      clientRef.current?.deactivate();
    } catch {}
    clientRef.current = null;
    setIsConnected(false);
    setStatus("disconnected");
  }, [clearSubs]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(() => {
      manualCloseRef.current = false;
      reconnectRef.current = 0;
      connectInternal();
    }, 500);
  }, [disconnect, connectInternal]);

  const sendMessage = useCallback((dest, body) => {
    if (!clientRef.current?.connected) return false;
    try {
      clientRef.current.publish({
        destination: dest.startsWith("/app") ? dest : `/app${dest.startsWith("/") ? dest : `/${dest}`}`,
        body: JSON.stringify(body),
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  const subscribe = useCallback((topic, callback) => {
    if (!clientRef.current?.connected) return null;
    try {
      const sub = clientRef.current.subscribe(topic, (msg) => {
        try { callback(JSON.parse(msg.body), msg); } catch { callback(msg.body, msg); }
      });
      subsRef.current.push(sub);
      return sub;
    } catch { return null; }
  }, []);

  useEffect(() => {
    const enabled = import.meta.env.VITE_ENABLE_WEBSOCKET !== "false";
    if (!enabled) return;
    if (getToken()) connect();
    return () => {
      manualCloseRef.current = true;
      clearTimeout(timerRef.current);
      clearSubs();
      try { clientRef.current?.deactivate(); } catch {}
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "token" || e.key === "accessToken" || e.key === "quickks_token") {
        if (getToken()) reconnect();
        else disconnect();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reconnect, disconnect]);

  const value = useMemo(() => ({
    isConnected,
    connectionStatus: status,
    isReady: isConnected && status === "connected",
    connect,
    disconnect,
    reconnect,
    sendMessage,
    subscribe,
    stompClient: clientRef.current,
  }), [isConnected, status, connect, disconnect, reconnect, sendMessage, subscribe]);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};