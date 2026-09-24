
// src/index.js - PRODUCTION FIXED FOR VERCEL v4.1
// ================================================================
// FIXES:
// ✅ CSP updated for api.quickks.in + vercel.app + wss
// ✅ Service Worker disabled by default on Vercel (no more MIME error)
// ✅ API URL fixed - uses REACT_APP_API_BASE_URL
// ✅ Removed invalid X-Frame-Options meta (must be HTTP header)
// ✅ Web Vitals supports v3 and v4 both
// ================================================================

import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary } from "react-error-boundary";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { WebSocketProvider } from "./contexts/WebSocketProvider";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ThemeProvider as CustomThemeProvider } from "./contexts/ThemeContext";
import ErrorFallback from "./components/ErrorFallback";

import "./index.css";

// ================================================================
// CONFIGURATION - FIXED FOR PRODUCTION
// ================================================================

const APP_CONFIG = {
  name: process.env.REACT_APP_NAME || "Quickks",
  version: process.env.REACT_APP_VERSION || "1.0.0",
  environment: process.env.REACT_APP_ENV || process.env.NODE_ENV || "development",
  // FIX: Use correct env var names from Vercel
  apiUrl: process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || "https://api.quickks.in/quickks/api/v1",
  wsUrl: process.env.REACT_APP_WS_URL || "wss://api.quickks.in/quickks/ws",
  frontendUrl: process.env.REACT_APP_URL || window.location.origin,
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === "true",
  enableErrorReporting: process.env.REACT_APP_ENABLE_ERROR_REPORTING === "true",
  // FIX: Service Worker disabled by default - enable only if explicitly true
  enableServiceWorker: process.env.REACT_APP_ENABLE_SERVICE_WORKER === "true",
  enableDevTools: process.env.REACT_APP_ENABLE_DEV_TOOLS !== "false",
  sentryDsn: process.env.REACT_APP_SENTRY_DSN,
  logLevel: process.env.REACT_APP_LOG_LEVEL || "info",
};

// ================================================================
// THEME (same as before)
// ================================================================
const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#6366f1", light: "#818cf8", dark: "#4f46e5", contrastText: "#ffffff" },
    secondary: { main: "#8b5cf6", light: "#a78bfa", dark: "#7c3aed", contrastText: "#ffffff" },
    success: { main: "#10b981", light: "#34d399", dark: "#059669" },
    warning: { main: "#f59e0b", light: "#fbbf24", dark: "#d97706" },
    error: { main: "#ef4444", light: "#f87171", dark: "#dc2626" },
    info: { main: "#3b82f6", light: "#60a5fa", dark: "#2563eb" },
    background: { default: "#f8fafc", paper: "#ffffff" },
  },
  typography: {
    fontFamily: ["Inter", "-apple-system", "BlinkMacSystemFont", '"Segoe UI"', "Roboto", '"Helvetica Neue"', "Arial", "sans-serif"].join(","),
    h1: { fontWeight: 800 }, h2: { fontWeight: 700 }, h3: { fontWeight: 600 },
    h4: { fontWeight: 600 }, h5: { fontWeight: 600 }, h6: { fontWeight: 600 },
    button: { fontWeight: 600, textTransform: "none" },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { borderRadius: 12, padding: "8px 20px" }, contained: { boxShadow: "none", "&:hover": { boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)" } } } },
    MuiCard: { styleOverrides: { root: { borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" } } },
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
  },
});

// ================================================================
// QUERY CLIENT
// ================================================================
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        if (error?.response?.status === 401 || error?.response?.status === 403) return false;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      suspense: false,
      useErrorBoundary: false,
    },
    mutations: { retry: 1, retryDelay: 1000, useErrorBoundary: false },
  },
});

// ================================================================
// ERROR REPORTING
// ================================================================
const reportError = (error, context = {}) => {
  console.error("❌ Error reported:", error, context);
  if (APP_CONFIG.enableErrorReporting && window.Sentry) {
    try {
      window.Sentry.captureException(error, { extra: context, tags: { environment: APP_CONFIG.environment, version: APP_CONFIG.version } });
    } catch (e) {}
  }
};

const handleGlobalError = (event) => {
  const error = event.error || new Error(event.message);
  reportError(error, { type: "uncaught_error", message: event.message, filename: event.filename, lineno: event.lineno, colno: event.colno });
};
const handleUnhandledRejection = (event) => {
  const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
  reportError(error, { type: "unhandled_rejection" });
};

window.addEventListener("error", handleGlobalError);
window.addEventListener("unhandledrejection", handleUnhandledRejection);

// ================================================================
// SERVICE WORKER - FIXED (Disabled on Vercel by default)
// ================================================================
const registerServiceWorker = async () => {
  if (!APP_CONFIG.enableServiceWorker) {
    console.log("ℹ Service Worker disabled (set REACT_APP_ENABLE_SERVICE_WORKER=true to enable)");
    // Unregister any existing SW to fix MIME error
    if ("serviceWorker" in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (let reg of regs) await reg.unregister();
        console.log("✅ Old Service Workers unregistered");
      } catch (e) {}
    }
    return;
  }
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" });
    console.log("✅ Service Worker registered:", registration);
    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (installingWorker) {
        installingWorker.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("sw-update-available", { detail: { registration } }));
          }
        });
      }
    });
    setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
    return registration;
  } catch (error) {
    console.error("❌ Service Worker registration failed:", error);
    return null;
  }
};

// ================================================================
// WEB VITALS - FIXED FOR v3 + v4
// ================================================================
const reportWebVitals = async () => {
  if (process.env.NODE_ENV === "production") {
    try {
      const webVitals = await import("web-vitals");
      const sendToAnalytics = (metric) => {
        console.log(`📊 ${metric.name}:`, metric.value);
        if (window.gtag) {
          try {
            window.gtag("event", "web_vitals", {
              event_category: "Web Vitals", event_label: metric.name,
              value: Math.round(metric.name === "CLS" ? metric.value * 1000 : metric.value),
              non_interaction: true,
            });
          } catch (e) {}
        }
      };
      // v3 API
      if (webVitals.onCLS) webVitals.onCLS(sendToAnalytics);
      if (webVitals.onFCP) webVitals.onFCP(sendToAnalytics);
      if (webVitals.onLCP) webVitals.onLCP(sendToAnalytics);
      if (webVitals.onTTFB) webVitals.onTTFB(sendToAnalytics);
      // v3 FID, v4 INP
      if (webVitals.onFID) webVitals.onFID(sendToAnalytics);
      if (webVitals.onINP) webVitals.onINP(sendToAnalytics);
      console.log("📊 Web Vitals reporting enabled");
    } catch (error) {
      console.warn("⚠ Web Vitals reporting failed:", error);
    }
  }
};

// ================================================================
// SECURITY HEADERS - FIXED FOR VERCEL PRODUCTION
// ================================================================
const setSecurityHeaders = () => {
  if (typeof document === "undefined") return;

  // Remove old CSP if exists
  const oldCsp = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (oldCsp) oldCsp.remove();

  // FIXED CSP - allows all production domains
  const cspMeta = document.createElement("meta");
  cspMeta.httpEquiv = "Content-Security-Policy";
  cspMeta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.razorpay.com https://checkout.razorpay.com https://*.googleapis.com https://*.vercel.app https://vercel.live",
    "style-src 'self' 'unsafe-inline' https://*.googleapis.com https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://*.tile.openstreetmap.org https://*.googleapis.com https://*.vercel.app",
    // FIX: Added all needed connect-src
    "connect-src 'self' http://localhost:8081 ws://localhost:8081 http://localhost:3000 ws://localhost:3000 https://api.quickks.in https://quickks.in https://*.quickks.in https://quickks-app-lake.vercel.app https://*.vercel.app wss://api.quickks.in wss://*.quickks.in ws://*.quickks.in https://*.razorpay.com https://checkout.razorpay.com https://*.googleapis.com",
    "font-src 'self' data: https://*.googleapis.com https://*.gstatic.com https://fonts.gstatic.com",
    "frame-src 'self' https://*.razorpay.com https://checkout.razorpay.com https://vercel.live",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  document.head.appendChild(cspMeta);

  // Only valid meta headers (X-Frame-Options must be HTTP header, not meta)
  const referrerMeta = document.createElement("meta");
  referrerMeta.name = "referrer";
  referrerMeta.content = "strict-origin-when-cross-origin";
  document.head.appendChild(referrerMeta);
};

// ================================================================
// ROOT VALIDATION
// ================================================================
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("❌ Failed to find the root element (#root) in the DOM");

// ================================================================
// RENDER
// ================================================================
const renderApp = () => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <HelmetProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback} onError={(error, errorInfo) => reportError(error, { componentStack: errorInfo.componentStack, context: "root_error_boundary" })}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <CustomThemeProvider>
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <AuthProvider>
                  <WebSocketProvider>
                    <NotificationProvider>
                      <App />
                    </NotificationProvider>
                  </WebSocketProvider>
                </AuthProvider>
              </BrowserRouter>
            </CustomThemeProvider>
          </ThemeProvider>
          {process.env.NODE_ENV === "development" && APP_CONFIG.enableDevTools && <ReactQueryDevtools initialIsOpen={false} position="bottom-right" />}
        </QueryClientProvider>
      </ErrorBoundary>
    </HelmetProvider>
  );
  return root;
};

const root = renderApp();

// ================================================================
// POST-MOUNT
// ================================================================
registerServiceWorker();
reportWebVitals();
setSecurityHeaders();

if (process.env.NODE_ENV === "development") {
  console.log("🚀 Dev mode");
  console.log(`🔧 API: ${APP_CONFIG.apiUrl}`);
  console.log(`📡 WS: ${APP_CONFIG.wsUrl}`);
  window.__APP__ = { config: APP_CONFIG, queryClient, root };
}

window.addEventListener("beforeunload", () => {
  window.removeEventListener("error", handleGlobalError);
  window.removeEventListener("unhandledrejection", handleUnhandledRejection);
});

export { queryClient, root, APP_CONFIG };
export default root;

