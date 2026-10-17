// src/pages/LoginPage.jsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment,
  IconButton, Divider, Checkbox, FormControlLabel, Stack,
} from "@mui/material";
import { Visibility, VisibilityOff, Google, Facebook, Apple } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import api, { tokenManager } from "../api/api";
import QuickksLogo from "../assets/quickks-logo.png";

const env = import.meta.env || {};

/* ---------- Config (change here to match your backend / router) ---------- */

const ENDPOINTS = {
  phoneLogin: "/auth/phone-login",
  sendOtp: "/auth/send-otp",
};

// Must match the routes in your App router (same ones HomePage uses).
const ROLE_ROUTES = {
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
  PROVIDER: "/provider/dashboard",
  CUSTOMER: "/customer/dashboard",
};

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const OTP_SECONDS = 60;
const REMEMBER_KEY = "rememberMe";
const LOCK_KEY = "quickks_login_lock";
const NO_RETURN = ["/login", "/register", "/forgot-password"];

// Optional social login, e.g. VITE_SOCIAL_PROVIDERS="google,facebook,apple".
// Uses Spring Security's standard /oauth2/authorization/{provider} entry point.
const SOCIAL_PROVIDERS = (env.VITE_SOCIAL_PROVIDERS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const SOCIAL_META = { google: { label: "Google", icon: <Google /> }, facebook: { label: "Facebook", icon: <Facebook /> }, apple: { label: "Apple", icon: <Apple /> } };

const C = {
  header: "#131921", text: "#0F1111", muted: "#565959", link: "#007185", linkHover: "#C7511F",
  yellow: "#FFD814", yellowHover: "#F7CA00", yellowBorder: "#FCD200", orange: "#FFA41C",
  border: "#D5D9D9", focus: "#E77600", focusRing: "#C8F3FA",
};
const FONT = '"Amazon Ember", "Segoe UI", Arial, sans-serif';

/* ---------- Helpers ---------- */

const logError = (...a) => { console.error("[LoginPage]", ...a); };

const storage = {
  get(kind, key) { try { return (kind === "session" ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
  set(kind, key, value) { try { (kind === "session" ? sessionStorage : localStorage).setItem(key, value); } catch { /* ignore */ } },
  remove(kind, key) { try { (kind === "session" ? sessionStorage : localStorage).removeItem(key); } catch { /* ignore */ } },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

// Spring often returns "ROLE_ADMIN"; normalise to ADMIN.
const normalizeRole = (role) => String(role || "CUSTOMER").toUpperCase().replace(/^ROLE_/, "");
const routeForRole = (role) => ROLE_ROUTES[normalizeRole(role)] || ROLE_ROUTES.CUSTOMER;

// Only same-app paths; blocks open redirects such as "//evil.com".
const safeReturnPath = (from) => {
  const p = typeof from === "string" ? from : from?.pathname;
  if (!p || !p.startsWith("/") || p.startsWith("//") || NO_RETURN.includes(p)) return null;
  return `${p}${from?.search || ""}`;
};

const toPhonePayload = (digits) => (env.VITE_PHONE_E164 === "true" ? `+91${digits}` : digits);
const maskPhone = (d) => `+91 ${d.slice(0, 2)}••••••${d.slice(-2)}`;
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

// Never reveal whether the email exists (no user-enumeration), never expose infra details.
function friendlyError({ status, serverMsg, mode, fallback }) {
  if (!status) return "Cannot reach Quickks. Check your internet connection and try again.";
  if (status === 401) return mode === "PHONE" ? "Incorrect or expired OTP." : "Incorrect email or password.";
  if (status === 403) return serverMsg || "This account cannot sign in right now. Please contact support.";
  if (status === 423) return serverMsg || "This account is locked. Reset your password or try again later.";
  if (status === 429) return "Too many attempts. Please wait a few minutes and try again.";
  if (status >= 500) return "Something went wrong on our side. Please try again shortly.";
  return serverMsg || fallback;
}

const fromAxios = (err) => ({
  status: err?.response?.status || 0,
  serverMsg: err?.response?.data?.message,
  retryAfter: Number(err?.response?.headers?.["retry-after"]) || 0,
});

/* ---------- Styled primitives ---------- */

const Field = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 3, background: "#fff", fontFamily: FONT,
    "&.Mui-focused fieldset": { borderColor: C.focus, borderWidth: 1, boxShadow: `0 0 0 3px ${C.focusRing}` },
  },
  "& label.Mui-focused": { color: C.text },
});

const PrimaryButton = styled(Button)({
  background: C.yellow, color: C.text, border: `1px solid ${C.yellowBorder}`, borderRadius: 999,
  textTransform: "none", fontWeight: 500, fontFamily: FONT, boxShadow: "none", padding: "8px 20px",
  "&:hover": { background: C.yellowHover, boxShadow: "none" },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
  "&.Mui-disabled": { background: "#F0F2F2", color: "#8D9096", borderColor: C.border },
});

const SecondaryButton = styled(Button)({
  background: "#fff", color: C.text, border: `1px solid ${C.border}`, borderRadius: 999,
  textTransform: "none", fontWeight: 500, fontFamily: FONT, boxShadow: "none", padding: "8px 20px",
  "&:hover": { background: "#F7FAFA", boxShadow: "none" },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
});

const TextButton = styled("button")({
  background: "none", border: "none", padding: 0, color: C.link, cursor: "pointer", fontSize: 13, fontFamily: FONT,
  "&:hover": { textDecoration: "underline", color: C.linkHover },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
  "&:disabled": { color: C.muted, cursor: "default", textDecoration: "none" },
});

const routerLinkSx = { color: C.link, textDecoration: "none", "&:hover": { textDecoration: "underline", color: C.linkHover } };

/* ---------- Page ---------- */

function LoginPage() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const auth = useAuth();
  const { login, isAuthenticated, user } = auth;

  const returnTo = useMemo(() => safeReturnPath(routeLocation.state?.from), [routeLocation.state]);
  const apiOrigin = useMemo(() => {
    try { return new URL(api.defaults.baseURL || "", window.location.origin).origin; } catch { return window.location.origin; }
  }, []);

  const redirectedRef = useRef(false);
  const firstFieldRef = useRef(null);

  const [mode, setMode] = useState("EMAIL");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => storage.get("local", REMEMBER_KEY) === "true");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(() => {
    const t = Number(storage.get("session", LOCK_KEY)) || 0;
    return t > Date.now() ? t : 0;
  });
  const [now, setNow] = useState(() => Date.now());

  const lockSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLocked = lockSeconds > 0;

  /* Persist "remember me" preference only (never credentials). */
  useEffect(() => { storage.set("local", REMEMBER_KEY, String(rememberMe)); }, [rememberMe]);

  /* Focus first field when the mode changes. */
  useEffect(() => { firstFieldRef.current?.focus(); }, [mode]);

  /* Already signed in (or just signed in): go to the right dashboard once. */
  useEffect(() => {
    if (isAuthenticated && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate(returnTo || routeForRole(user?.role), { replace: true });
    }
  }, [isAuthenticated, user, returnTo, navigate]);

  /* Lock countdown. */
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(0);
        setFailedAttempts(0);
        storage.remove("session", LOCK_KEY);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  /* OTP resend countdown. */
  useEffect(() => {
    if (otpTimer <= 0) return undefined;
    const t = setTimeout(() => setOtpTimer((p) => p - 1), 1000);
    return () => clearTimeout(t);
  }, [otpTimer]);

  /* Reachability check only (no-cors: succeeds if the server answers, fails only on network error). */
  useEffect(() => {
    let unmounted = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const url = `${apiOrigin}${env.VITE_HEALTH_PATH || "/actuator/health"}`;
    fetch(url, { mode: "no-cors", cache: "no-store", signal: controller.signal })
      .then(() => { if (!unmounted) setServerDown(false); })
      .catch(() => { if (!unmounted) setServerDown(true); })
      .finally(() => clearTimeout(timer));
    return () => { unmounted = true; clearTimeout(timer); controller.abort(); };
  }, [apiOrigin]);

  const startLock = useCallback((ms) => {
    const until = Date.now() + ms;
    setLockedUntil(until);
    setNow(Date.now());
    storage.set("session", LOCK_KEY, String(until));
  }, []);

  const registerFailure = useCallback((retryAfterSec = 0) => {
    if (retryAfterSec > 0) { startLock(retryAfterSec * 1000); return; }
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) startLock(LOCK_MS);
      return next;
    });
  }, [startLock]);

  const switchMode = (m) => {
    setMode(m); setError(null); setInfo(null); setOtpSent(false); setOtp(""); setOtpTimer(0);
  };

  const finishLogin = useCallback((role, { hard = false } = {}) => {
    redirectedRef.current = true;
    storage.remove("session", LOCK_KEY);
    const target = returnTo || routeForRole(role);
    // Hard navigation when tokens were written outside AuthContext, so it re-reads storage.
    if (hard) window.location.replace(target);
    else navigate(target, { replace: true });
  }, [returnTo, navigate]);

  /* ----- Phone / OTP ----- */

  const handleSendOtp = useCallback(async () => {
    if (!PHONE_RE.test(phone)) { setError("Enter a valid 10-digit mobile number."); return; }
    setIsLoading(true); setError(null); setInfo(null);
    try {
      const res = await api.post(ENDPOINTS.sendOtp, { phone: toPhonePayload(phone) });
      setOtpSent(true); setOtp(""); setOtpTimer(OTP_SECONDS);
      setInfo(res.data?.message || `OTP sent to ${maskPhone(phone)}`);
    } catch (err) {
      const f = fromAxios(err);
      if (f.status === 429 && f.retryAfter) setOtpTimer(f.retryAfter);
      logError("send-otp failed", f.status);
      setError(friendlyError({ ...f, mode: "PHONE", fallback: "Could not send the OTP. Please try again." }));
    } finally { setIsLoading(false); }
  }, [phone]);

  // Fallback when AuthContext has no loginWithPhone: store tokens ourselves.
  const phoneLoginDirect = useCallback(async () => {
    try {
      const res = await api.post(ENDPOINTS.phoneLogin, { phone: toPhonePayload(phone), otp });
      const data = res.data?.data || res.data || {};
      const token = data.token || data.accessToken;
      if (!token) return { success: false, status: 401, error: data.message };
      tokenManager.setTokens(token, data.refreshToken);
      const userData = { ...data, id: data.userId || data.id, name: data.name || "User", email: data.email || "", role: normalizeRole(data.role), phone };
      tokenManager.setUser(userData);
      return { success: true, user: userData, data, direct: true };
    } catch (err) {
      const f = fromAxios(err);
      return { success: false, ...f, error: f.serverMsg };
    }
  }, [phone, otp]);

  /* ----- Submit ----- */

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isLoading || isLocked) return;
    setError(null); setInfo(null);

    if (mode === "PHONE" && !otpSent) { handleSendOtp(); return; }

    if (mode === "EMAIL") {
      if (!email.trim()) { setError("Enter your email address."); return; }
      if (!EMAIL_RE.test(email.trim())) { setError("Enter a valid email address."); return; }
      if (!password) { setError("Enter your password."); return; }
    } else if (!/^\d{6}$/.test(otp)) { setError("Enter the 6-digit OTP."); return; }

    setIsLoading(true);
    try {
      let result;
      if (mode === "EMAIL") {
        result = await login(email.trim().toLowerCase(), password, rememberMe);
      } else if (typeof auth.loginWithPhone === "function") {
        result = await auth.loginWithPhone(toPhonePayload(phone), otp, rememberMe);
      } else {
        result = await phoneLoginDirect();
      }

      if (!result || !result.success) {
        // AuthContext may not expose the HTTP status; treat unknown failures as bad credentials.
        let status = result?.status || result?.statusCode || 0;
        const msg = String(result?.error || "");
        if (!status) status = /network|timeout|reach|offline|econn/i.test(msg) ? 0 : 401;
        logError("login failed", status);
        registerFailure(status === 429 ? Number(result?.retryAfter) || 60 : 0);
        setError(friendlyError({ status, serverMsg: msg, mode, fallback: "Sign in failed. Please try again." }));
        return;
      }

      const role = result.user?.role || result.data?.role || result.data?.user?.role;
      finishLogin(role, { hard: Boolean(result.direct) });
    } catch (err) {
      const f = fromAxios(err);
      logError("login error", f.status || err?.message);
      registerFailure(f.status === 429 ? f.retryAfter || 60 : 0);
      setError(friendlyError({ ...f, mode, fallback: "Sign in failed. Please try again." }));
    } finally { setIsLoading(false); }
  }, [isLoading, isLocked, mode, otpSent, email, password, otp, phone, rememberMe, login, auth, phoneLoginDirect, handleSendOtp, registerFailure, finishLogin]);

  const handleSocial = (provider) => {
    window.location.assign(`${apiOrigin}/oauth2/authorization/${provider}`);
  };

  const submitLabel = mode === "EMAIL" ? "Sign in" : otpSent ? "Verify and sign in" : "Send OTP";
  const attemptsLeft = MAX_ATTEMPTS - failedAttempts;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff", fontFamily: FONT, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", px: 2, pt: 3, pb: 4 }}>
      <Box component="button" type="button" onClick={() => navigate("/")} aria-label="Quickks home" sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "1px solid transparent", borderRadius: "2px", p: "4px 8px", mb: 2, cursor: "pointer", "&:focus-visible": { outline: `2px solid ${C.focus}` } }}>
        <Box component="img" src={QuickksLogo} alt="" sx={{ width: 36, height: 36, objectFit: "contain" }} />
        <Typography sx={{ fontWeight: 800, color: C.header, fontSize: 28, letterSpacing: "-0.5px", fontFamily: FONT }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
      </Box>

      <Box sx={{ width: "100%", maxWidth: 380, border: `1px solid ${C.border}`, borderRadius: "8px", p: { xs: 2.5, sm: 3 } }}>
        <Typography component="h1" sx={{ fontSize: 28, fontWeight: 400, mb: 2, fontFamily: FONT }}>Sign in</Typography>

        <Box aria-live="polite">
          {serverDown && <Alert severity="warning" sx={{ mb: 2, borderRadius: 1 }}>We are having trouble reaching Quickks. Check your connection, then try again.</Alert>}
          {isLocked && <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>Too many failed attempts. Try again in {fmtClock(lockSeconds)}, or <Link to="/forgot-password" style={{ color: C.link }}>reset your password</Link>.</Alert>}
          {error && !isLocked && <Alert severity="error" sx={{ mb: 2, borderRadius: 1 }}>{error}</Alert>}
          {info && <Alert severity="success" sx={{ mb: 2, borderRadius: 1 }}>{info}</Alert>}
        </Box>

        <Box role="tablist" aria-label="Sign in method" sx={{ display: "flex", borderBottom: `1px solid ${C.border}`, mb: 2.5 }}>
          {[{ id: "EMAIL", label: "Email" }, { id: "PHONE", label: "Mobile number" }].map((t) => (
            <Box key={t.id} component="button" type="button" role="tab" aria-selected={mode === t.id} onClick={() => switchMode(t.id)} disabled={isLoading}
              sx={{ flex: 1, py: 1, background: "none", border: "none", borderBottom: `3px solid ${mode === t.id ? C.orange : "transparent"}`, mb: "-1px", fontFamily: FONT, fontSize: 14, fontWeight: mode === t.id ? 700 : 400, color: mode === t.id ? C.text : C.muted, cursor: "pointer", "&:focus-visible": { outline: `2px solid ${C.focus}` } }}>
              {t.label}
            </Box>
          ))}
        </Box>

        <form onSubmit={handleSubmit} noValidate>
          {mode === "EMAIL" ? (
            <Stack spacing={2}>
              <Field fullWidth size="small" label="Email address" type="email" name="email" autoComplete="username" value={email} inputRef={firstFieldRef}
                onChange={(e) => { setEmail(e.target.value); setError(null); }} disabled={isLoading} />
              <Field fullWidth size="small" label="Password" name="password" autoComplete="current-password" type={showPassword ? "text" : "password"} value={password}
                onChange={(e) => { setPassword(e.target.value); setError(null); }} disabled={isLoading}
                InputProps={{ endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" edge="end" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ) }} />
            </Stack>
          ) : (
            <Stack spacing={2}>
              <Field fullWidth size="small" label="Mobile number" placeholder="9876543210" name="phone" autoComplete="tel-national" value={phone} inputRef={firstFieldRef}
                inputProps={{ inputMode: "numeric", maxLength: 10 }} disabled={isLoading || otpSent}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }}
                InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }} />
              {otpSent && (
                <>
                  <Field fullWidth size="small" label="6-digit OTP" name="otp" value={otp} autoFocus
                    autoComplete="one-time-code" inputProps={{ inputMode: "numeric", maxLength: 6 }} disabled={isLoading}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }} />
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <TextButton type="button" onClick={() => { setOtpSent(false); setOtp(""); setOtpTimer(0); setInfo(null); }}>Change number</TextButton>
                    <TextButton type="button" onClick={handleSendOtp} disabled={otpTimer > 0 || isLoading}>{otpTimer > 0 ? `Resend OTP in ${otpTimer}s` : "Resend OTP"}</TextButton>
                  </Box>
                </>
              )}
            </Stack>
          )}

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", my: 1.5 }}>
            <FormControlLabel
              control={<Checkbox size="small" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />}
              label={<Typography sx={{ fontSize: 13, fontFamily: FONT }}>Keep me signed in</Typography>}
            />
            {mode === "EMAIL" && <Link to="/forgot-password" style={{ ...routerLinkSx, fontSize: 13 }}>Forgot password?</Link>}
          </Box>

          <PrimaryButton fullWidth type="submit" disabled={isLoading || isLocked || (mode === "PHONE" && !otpSent && phone.length < 10)}>
            {isLoading ? <CircularProgress size={22} sx={{ color: C.text }} /> : submitLabel}
          </PrimaryButton>

          {failedAttempts >= 2 && !isLocked && (
            <Typography variant="caption" sx={{ color: "#B12704", mt: 1, display: "block", textAlign: "center" }}>
              {attemptsLeft} {attemptsLeft === 1 ? "attempt" : "attempts"} left before a temporary lock.
            </Typography>
          )}
        </form>

        <Typography sx={{ fontSize: 12, color: C.muted, mt: 2, lineHeight: 1.5, fontFamily: FONT }}>
          By continuing, you agree to Quickks’ <Link to="/terms" style={routerLinkSx}>Terms of Service</Link> and <Link to="/privacy" style={routerLinkSx}>Privacy Policy</Link>.
        </Typography>

        {SOCIAL_PROVIDERS.some((p) => SOCIAL_META[p]) && (
          <>
            <Divider sx={{ my: 2.5, fontSize: 12, color: C.muted }}>or continue with</Divider>
            <Stack spacing={1}>
              {SOCIAL_PROVIDERS.filter((p) => SOCIAL_META[p]).map((p) => (
                <SecondaryButton key={p} fullWidth startIcon={SOCIAL_META[p].icon} onClick={() => handleSocial(p)} disabled={isLoading}>{SOCIAL_META[p].label}</SecondaryButton>
              ))}
            </Stack>
          </>
        )}
      </Box>

      <Box sx={{ width: "100%", maxWidth: 380, mt: 2.5 }}>
        <Divider sx={{ fontSize: 12, color: C.muted, mb: 2 }}>New to Quickks?</Divider>
        <SecondaryButton fullWidth onClick={() => navigate("/register", { state: routeLocation.state })}>Create your Quickks account</SecondaryButton>
      </Box>

      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 0.75 }}>
          <Link to="/terms" style={{ ...routerLinkSx, fontSize: 12 }}>Terms of Service</Link>
          <Link to="/privacy" style={{ ...routerLinkSx, fontSize: 12 }}>Privacy Policy</Link>
          <Link to="/contact" style={{ ...routerLinkSx, fontSize: 12 }}>Help</Link>
        </Stack>
        <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: FONT }}>© {new Date().getFullYear()} Quickks. All rights reserved.</Typography>
      </Box>
    </Box>
  );
}

export default React.memo(LoginPage);