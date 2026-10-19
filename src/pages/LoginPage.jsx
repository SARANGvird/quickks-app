import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment,
  IconButton, Divider, Checkbox, FormControlLabel, Stack,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import GoogleIcon from "@mui/icons-material/Google";
import { styled } from "@mui/material/styles";
import api, { tokenManager } from "../api/api";
import QuickksLogo from "../assets/quickks-logo.png";

const env = import.meta.env || {};
const ENDPOINTS = { login: "/auth/login" };
const ROLE_ROUTES = {
  ADMIN: "/admin/dashboard",
  SUPER_ADMIN: "/admin/dashboard",
  PROVIDER: "/provider/dashboard",
  CUSTOMER: "/customer/dashboard",
};
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const REMEMBER_KEY = "rememberMe";
const LOCK_KEY = "quickks_login_lock";
const NO_RETURN = ["/login", "/register", "/forgot-password"];
const C = {
  header: "#131921", text: "#0F1111", muted: "#565959", link: "#007185", linkHover: "#C7511F",
  yellow: "#FFD814", yellowHover: "#F7CA00", yellowBorder: "#FCD200", orange: "#FFA41C",
  border: "#D5D9D9", focus: "#E77600", focusRing: "#C8F3FA",
};
const FONT = '"Amazon Ember", "Segoe UI", Arial, sans-serif';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const normalizeRole = (role) => String(role || "CUSTOMER").toUpperCase().replace(/^ROLE_/, "");
const routeForRole = (role) => ROLE_ROUTES[normalizeRole(role)] || ROLE_ROUTES.CUSTOMER;
const safeReturnPath = (from) => {
  const p = typeof from === "string" ? from : from?.pathname;
  if (!p || !p.startsWith("/") || p.startsWith("//") || NO_RETURN.includes(p)) return null;
  return `${p}${from?.search || ""}`;
};
const fmtClock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
function friendlyError({ status, serverMsg, fallback }) {
  if (!status) return "Cannot reach Quickks. Check connection.";
  if (status === 400) return serverMsg || "Enter valid email/phone + password.";
  if (status === 401) return "Incorrect email/phone or password.";
  if (status === 403) return serverMsg || "Account cannot sign in now.";
  if (status === 429) return "Too many attempts. Wait few minutes.";
  if (status >= 500) return "Something went wrong. Try again shortly.";
  return serverMsg || fallback;
}
const fromAxios = (err) => ({
  status: err?.response?.status || 0,
  serverMsg: err?.response?.data?.message || err?.response?.data?.error,
  retryAfter: Number(err?.response?.headers?.["retry-after"]) || 0,
});
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
});
const SecondaryButton = styled(Button)({
  background: "#fff", color: C.text, border: `1px solid ${C.border}`, borderRadius: 999,
  textTransform: "none", fontWeight: 500, fontFamily: FONT, boxShadow: "none", padding: "8px 20px",
  "&:hover": { background: "#F7FAFA", boxShadow: "none" },
});
const routerLinkSx = { color: C.link, textDecoration: "none", "&:hover": { textDecoration: "underline", color: C.linkHover } };

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
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try { return localStorage.getItem(REMEMBER_KEY) === "true"; } catch { return false; }
  });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(() => {
    try {
      const t = Number(sessionStorage.getItem(LOCK_KEY)) || 0;
      return t > Date.now() ? t : 0;
    } catch { return 0; }
  });
  const [now, setNow] = useState(() => Date.now());
  const lockSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLocked = lockSeconds > 0;

  useEffect(() => {
    try { localStorage.setItem(REMEMBER_KEY, String(rememberMe)); } catch {}
  }, [rememberMe]);
  useEffect(() => { firstFieldRef.current?.focus(); }, [mode]);
  useEffect(() => {
    if (isAuthenticated && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate(returnTo || routeForRole(user?.role), { replace: true });
    }
  }, [isAuthenticated, user, returnTo, navigate]);
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= lockedUntil) {
        setLockedUntil(0);
        setFailedAttempts(0);
        try { sessionStorage.removeItem(LOCK_KEY); } catch {}
      }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);
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
    try { sessionStorage.setItem(LOCK_KEY, String(until)); } catch {}
  }, []);
  const registerFailure = useCallback((retryAfterSec = 0) => {
    if (retryAfterSec > 0) { startLock(retryAfterSec * 1000); return; }
    setFailedAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_ATTEMPTS) startLock(LOCK_MS);
      return next;
    });
  }, [startLock]);
  const switchMode = (m) => { setMode(m); setError(null); };
  const finishLogin = useCallback((role, hard = false) => {
    redirectedRef.current = true;
    try { sessionStorage.removeItem(LOCK_KEY); } catch {}
    const target = returnTo || routeForRole(role);
    if (hard) window.location.replace(target);
    else navigate(target, { replace: true });
  }, [returnTo, navigate]);
  const buildPayload = useCallback(() => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.replace(/\D/g, "").slice(0, 10);
    const trimmedPassword = password.trim();
    if (mode === "EMAIL") {
      if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) return { error: "Enter valid email." };
      if (!trimmedPassword || trimmedPassword.length < 6) return { error: "Enter password min 6 chars." };
      return { payload: { email: trimmedEmail, phone: null, password: trimmedPassword, rememberMe } };
    } else {
      if (!PHONE_RE.test(trimmedPhone)) return { error: "Enter valid 10-digit mobile." };
      if (!trimmedPassword || trimmedPassword.length < 6) return { error: "Enter password min 6 chars." };
      return { payload: { email: null, phone: trimmedPhone, password: trimmedPassword, rememberMe } };
    }
  }, [mode, email, phone, password, rememberMe]);
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (isLoading || isLocked) return;
    setError(null);
    const built = buildPayload();
    if (built.error) { setError(built.error); return; }
    setIsLoading(true);
    try {
      let result;
      if (typeof login === "function") {
        try { result = await login(built.payload); } catch { result = null; }
      }
      if (!result || !result.success) {
        const res = await api.post(ENDPOINTS.login, built.payload);
        const data = res.data?.data || res.data || {};
        const token = data.token || data.accessToken || data.access_token;
        if (!token) throw { response: { status: 401, data } };
        tokenManager.setTokens(token, data.refreshToken || data.refresh_token);
        const userData = {
          ...data,
          id: data.userId || data.id,
          name: data.name || data.fullName || "User",
          email: data.email || built.payload.email || "",
          phone: data.phone || built.payload.phone || "",
          role: normalizeRole(data.role),
        };
        tokenManager.setUser(userData);
        result = { success: true, user: userData, data, direct: true };
      }
      const role = result.user?.role || result.data?.role;
      finishLogin(role, Boolean(result.direct));
    } catch (err) {
      const f = fromAxios(err);
      registerFailure(f.status === 429 ? f.retryAfter || 60 : 0);
      setError(friendlyError({ ...f, fallback: "Sign in failed. Try again." }));
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, isLocked, buildPayload, login, registerFailure, finishLogin]);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff", fontFamily: FONT, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", px: 2, pt: 3, pb: 4 }}>
      <Box component="button" type="button" onClick={() => navigate("/")} sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "none", mb: 2, cursor: "pointer" }}>
        <Box component="img" src={QuickksLogo} alt="" sx={{ width: 36, height: 36 }} />
        <Typography sx={{ fontWeight: 800, color: C.header, fontSize: 28, fontFamily: FONT }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
      </Box>
      <Box sx={{ width: "100%", maxWidth: 380, border: `1px solid ${C.border}`, borderRadius: "8px", p: { xs: 2.5, sm: 3 } }}>
        <Typography component="h1" sx={{ fontSize: 28, fontWeight: 400, mb: 2, fontFamily: FONT }}>Sign in</Typography>
        <Box aria-live="polite">
          {serverDown && <Alert severity="warning" sx={{ mb: 2 }}>Trouble reaching Quickks.</Alert>}
          {isLocked && <Alert severity="error" sx={{ mb: 2 }}>Too many attempts. Try again in {fmtClock(lockSeconds)}</Alert>}
          {error && !isLocked && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        </Box>
        <Box role="tablist" sx={{ display: "flex", borderBottom: `1px solid ${C.border}`, mb: 2.5 }}>
          {[{ id: "EMAIL", label: "Email" }, { id: "PHONE", label: "Mobile" }].map((t) => (
            <Box key={t.id} component="button" type="button" onClick={() => switchMode(t.id)} disabled={isLoading}
              sx={{ flex: 1, py: 1, background: "none", border: "none", borderBottom: `3px solid ${mode === t.id ? C.orange : "transparent"}`, fontFamily: FONT, fontSize: 14, fontWeight: mode === t.id ? 700 : 400 }}>
              {t.label}
            </Box>
          ))}
        </Box>
        <form onSubmit={handleSubmit} noValidate>
          <Stack spacing={2}>
            {mode === "EMAIL" ? (
              <Field fullWidth size="small" label="Email address" type="email" name="email" value={email} inputRef={firstFieldRef}
                onChange={(e) => { setEmail(e.target.value); setError(null); }} disabled={isLoading} />
            ) : (
              <Field fullWidth size="small" label="Mobile number" placeholder="9876543210" name="phone" value={phone} inputRef={firstFieldRef}
                inputProps={{ inputMode: "numeric", maxLength: 10 }} disabled={isLoading}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }}
                InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }} />
            )}
            <Field fullWidth size="small" label="Password" name="password" type={showPassword ? "text" : "password"} value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }} disabled={isLoading}
              InputProps={{ endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" edge="end" onClick={() => setShowPassword((s) => !s)}>
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ) }} />
          </Stack>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", my: 1.5 }}>
            <FormControlLabel control={<Checkbox size="small" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />} label={<Typography sx={{ fontSize: 13, fontFamily: FONT }}>Keep me signed in</Typography>} />
            <Link to="/forgot-password" style={{ ...routerLinkSx, fontSize: 13 }}>Forgot password?</Link>
          </Box>
          <PrimaryButton fullWidth type="submit" disabled={isLoading || isLocked}>
            {isLoading ? <CircularProgress size={22} sx={{ color: C.text }} /> : "Sign in"}
          </PrimaryButton>
        </form>
      </Box>
    </Box>
  );
}
export default React.memo(LoginPage);