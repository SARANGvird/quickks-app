import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment,
  IconButton, Checkbox, FormControlLabel, Stack, Paper, Divider, Chip
} from "@mui/material";
import { Visibility, VisibilityOff, ArrowBack, Home, Shield, Bolt, VerifiedUser } from "@mui/icons-material";
import GoogleIcon from "@mui/icons-material/Google";
import { styled, keyframes } from "@mui/material/styles";
import { motion } from "framer-motion";
import api, { tokenManager } from "../api/api";
import QuickksLogo from "../assets/quickks-logo.png";

const env = import.meta.env || {};
const ENDPOINTS = { login: "/auth/login" };
const ROLE_ROUTES = { ADMIN: "/admin/dashboard", SUPER_ADMIN: "/admin/dashboard", PROVIDER: "/provider/dashboard", CUSTOMER: "/customer/dashboard" };
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;
const REMEMBER_KEY = "rememberMe";
const LOCK_KEY = "quickks_login_lock";
const NO_RETURN = ["/login", "/register", "/forgot-password"];
const C = { header: "#131921", text: "#0F1111", muted: "#565959", link: "#0066c0", linkHover: "#C7511F", yellow: "#FFD814", yellowHover: "#F7CA00", yellowBorder: "#FCD200", orange: "#FF9900", border: "#D5D9D9", focus: "#E77600", focusRing: "#C8F3FA", bg: "#f8fafc" };
const FONT = '"Amazon Ember", Inter, "Segoe UI", Arial, sans-serif';
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
const friendlyError = ({ status, serverMsg, fallback }) => {
  if (!status) return "Cannot reach Quickks. Check connection.";
  if (status === 400) return serverMsg || "Enter valid email/phone + password.";
  if (status === 401) return "Incorrect email/phone or password.";
  if (status === 403) return serverMsg || "Account cannot sign in now.";
  if (status === 429) return "Too many attempts. Wait few minutes.";
  if (status >= 500) return "Something went wrong. Try again shortly.";
  return serverMsg || fallback;
};
const fromAxios = (err) => ({ status: err?.response?.status || 0, serverMsg: err?.response?.data?.message || err?.response?.data?.error, retryAfter: Number(err?.response?.headers?.["retry-after"]) || 0 });

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const Root = styled(Box)({
  minHeight: "100vh",
  background: "radial-gradient(1200px 600px at 10% -10%, #fef3c7 0%, #f8fafc 42%, #ffffff 100%)",
  display: "flex",
  flexDirection: "column",
  fontFamily: FONT,
  position: "relative",
});

const Field = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 10,
    background: "#fff",
    fontFamily: FONT,
    height: 48,
    transition: "all 0.2s ease",
    "& fieldset": { borderColor: "#D5D9D9", borderWidth: 1 },
    "&:hover fieldset": { borderColor: "#a8acb0" },
    "&.Mui-focused fieldset": { borderColor: C.focus, borderWidth: 1, boxShadow: `0 0 0 3px ${C.focusRing}` },
  },
  "& label.Mui-focused": { color: C.text },
  "& .MuiInputLabel-root": { fontFamily: FONT, fontSize: 14 },
});

const PrimaryButton = styled(Button)({
  background: `linear-gradient(180deg, ${C.yellow} 0%, #F2C200 100%)`,
  color: C.text,
  border: `1px solid ${C.yellowBorder}`,
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 600,
  fontFamily: FONT,
  height: 44,
  fontSize: 15,
  boxShadow: "0 2px 5px rgba(213,217,217,0.5)",
  "&:hover": { background: C.yellowHover, boxShadow: "0 2px 8px rgba(213,217,217,0.8)" },
  "&:disabled": { background: "#F0F2F2", borderColor: "#D5D9D9" },
});

const SecondaryButton = styled(Button)({
  background: "#fff",
  color: C.text,
  border: "1px solid #D5D9D9",
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 500,
  fontFamily: FONT,
  height: 44,
  boxShadow: "0 2px 5px rgba(213,217,217,0.15)",
  "&:hover": { background: "#F7FAFA", borderColor: "#C7C9C9" },
});

const NavButton = styled(IconButton)({
  width: 40,
  height: 40,
  background: "#fff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  "&:hover": { background: "#f8fafc", borderColor: "#cbd5e1" },
});

function LoginPage() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { login, isAuthenticated, user } = useAuth();
  const returnTo = useMemo(() => safeReturnPath(routeLocation.state?.from), [routeLocation.state]);
  const apiOrigin = useMemo(() => { try { return new URL(api.defaults.baseURL || "", window.location.origin).origin; } catch { return window.location.origin; } }, []);
  const redirectedRef = useRef(false);
  const firstFieldRef = useRef(null);
  const [mode, setMode] = useState("EMAIL");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => { try { return localStorage.getItem(REMEMBER_KEY) === "true"; } catch { return false; } });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverDown, setServerDown] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(() => { try { const t = Number(sessionStorage.getItem(LOCK_KEY)) || 0; return t > Date.now() ? t : 0; } catch { return 0; } });
  const [now, setNow] = useState(() => Date.now());
  const lockSeconds = lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
  const isLocked = lockSeconds > 0;

  useEffect(() => { try { localStorage.setItem(REMEMBER_KEY, String(rememberMe)); } catch {} }, [rememberMe]);
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
      if (!trimmedEmail || !EMAIL_RE.test(trimmedEmail)) return { error: "Enter valid email address." };
      if (!trimmedPassword || trimmedPassword.length < 6) return { error: "Enter password minimum 6 characters." };
      return { payload: { email: trimmedEmail, phone: null, password: trimmedPassword, rememberMe } };
    } else {
      if (!PHONE_RE.test(trimmedPhone)) return { error: "Enter valid 10-digit mobile number." };
      if (!trimmedPassword || trimmedPassword.length < 6) return { error: "Enter password minimum 6 characters." };
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
        const userData = { ...data, id: data.userId || data.id, name: data.name || data.fullName || "User", email: data.email || built.payload.email || "", phone: data.phone || built.payload.phone || "", role: normalizeRole(data.role) };
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
    <Root>
      <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto", px: { xs: 2, md: 3 }, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <NavButton onClick={() => navigate(-1)} aria-label="Go back"><ArrowBack fontSize="small" /></NavButton>
          <NavButton onClick={() => navigate("/")} aria-label="Go home"><Home fontSize="small" /></NavButton>
          <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", ml: 1, gap: 0.8 }}>
            <Chip icon={<Shield style={{ fontSize: 14 }} />} label="SSL Secured" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }} />
            <Chip icon={<VerifiedUser style={{ fontSize: 14 }} />} label="Verified by Quickks" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", display: { xs: "none", md: "flex" } }} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: FONT, display: { xs: "none", sm: "block" } }}>New to Quickks?</Typography>
          <Button size="small" onClick={() => navigate("/register")} sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, color: C.link, border: "1px solid #e2e8f0", bgcolor: "#fff", borderRadius: 999, px: 2, height: 32, "&:hover": { bgcolor: "#f8fafc" } }}>Create account</Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, width: "100%", maxWidth: 1080, mx: "auto", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" }, gap: { xs: 0, md: 4 }, px: { xs: 2, md: 3 }, pb: 4, alignItems: "start" }}>
        <Box sx={{ display: { xs: "none", md: "block" }, pt: 6, pr: 2 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 3 }}>
              <Box component="img" src={QuickksLogo} alt="Quickks" sx={{ width: 44, height: 44, borderRadius: 2 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 32, fontFamily: FONT, color: C.header }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
            </Box>
            <Typography sx={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.8, color: "#0f172a", fontFamily: FONT, mb: 1.5 }}>Welcome back.<br />Sign in to continue.</Typography>
            <Typography sx={{ fontSize: 15, color: "#475569", lineHeight: 1.6, mb: 3, fontFamily: FONT }}>Trusted by 12,000+ customers across Pune & 25+ cities. Verified professionals, fixed pricing, 7-day warranty.</Typography>
            <Stack spacing={1.6}>
              {[
                { icon: VerifiedUser, title: "Verified Professionals", desc: "Background checked & skill tested" },
                { icon: Bolt, title: "60-min Service Reach", desc: "Fast booking to doorstep" },
                { icon: Shield, title: "Secure & Insured", desc: "SSL encrypted payments & warranty" },
              ].map((f) => (
                <Box key={f.title} sx={{ display: "flex", gap: 1.5, p: 1.5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.8)", backdropFilter: "blur(8px)" }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "#0f172a", color: "#fff", display: "grid", placeItems: "center", flexShrink: 0 }}><f.icon fontSize="small" /></Box>
                  <Box><Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a", fontFamily: FONT }}>{f.title}</Typography><Typography sx={{ fontSize: 12.5, color: "#64748b", fontFamily: FONT }}>{f.desc}</Typography></Box>
                </Box>
              ))}
            </Stack>
          </motion.div>
        </Box>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
          <Paper elevation={0} sx={{ width: "100%", maxWidth: 420, mx: "auto", border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden", bgcolor: "#fff", boxShadow: "0 12px 32px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)" }}>
            <Box sx={{ p: { xs: 2.5, sm: 3 }, pb: 1, display: { xs: "flex", md: "none" }, alignItems: "center", gap: 1 }}>
              <Box component="img" src={QuickksLogo} alt="" sx={{ width: 32, height: 32 }} />
              <Typography sx={{ fontWeight: 800, fontSize: 22, fontFamily: FONT, color: C.header }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
            </Box>

            <Box sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 0.5, md: 3 } }}>
              <Typography component="h1" sx={{ fontSize: 24, fontWeight: 700, mb: 0.5, fontFamily: FONT, color: "#111827" }}>Sign in</Typography>
              <Typography sx={{ fontSize: 13, color: "#6b7280", fontFamily: FONT, mb: 2 }}>Use your email or mobile to access your dashboard</Typography>

              <Box aria-live="polite" sx={{ mb: 1.5 }}>
                {serverDown && <Alert severity="warning" sx={{ mb: 1.5, borderRadius: 2, fontFamily: FONT, fontSize: 13 }}>Trouble reaching Quickks servers. Retrying...</Alert>}
                {isLocked && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontFamily: FONT, fontSize: 13 }}>Too many attempts. Try again in {fmtClock(lockSeconds)}</Alert>}
                {error && !isLocked && <Alert severity="error" sx={{ mb: 1.5, borderRadius: 2, fontFamily: FONT, fontSize: 13 }}>{error}</Alert>}
              </Box>

              <Box role="tablist" sx={{ display: "flex", bgcolor: "#f1f5f9", borderRadius: 999, p: 0.5, mb: 2.5 }}>
                {[{ id: "EMAIL", label: "Email" }, { id: "PHONE", label: "Mobile" }].map((t) => (
                  <Box key={t.id} component="button" type="button" onClick={() => switchMode(t.id)} disabled={isLoading}
                    sx={{ flex: 1, py: 0.9, borderRadius: 999, background: mode === t.id ? "#0f172a" : "transparent", color: mode === t.id ? "#fff" : "#64748b", border: "none", fontFamily: FONT, fontSize: 13, fontWeight: 700, cursor: "pointer", transition: "all 0.2s ease", boxShadow: mode === t.id ? "0 2px 8px rgba(15,23,42,0.18)" : "none" }}>
                    {t.label}
                  </Box>
                ))}
              </Box>

              <form onSubmit={handleSubmit} noValidate>
                <Stack spacing={1.8}>
                  {mode === "EMAIL" ? (
                    <Field fullWidth label="Email address" type="email" name="email" value={email} inputRef={firstFieldRef} onChange={(e) => { setEmail(e.target.value); setError(null); }} disabled={isLoading || isLocked} placeholder="you@example.com" />
                  ) : (
                    <Field fullWidth label="Mobile number" name="phone" value={phone} inputRef={firstFieldRef} placeholder="9876543210" inputProps={{ inputMode: "numeric", maxLength: 10 }} disabled={isLoading || isLocked}
                      onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(null); }}
                      InputProps={{ startAdornment: <InputAdornment position="start" sx={{ fontFamily: FONT, fontWeight: 600, color: "#0f172a" }}>+91</InputAdornment> }} />
                  )}
                  <Field fullWidth label="Password" name="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} disabled={isLoading || isLocked} placeholder="Minimum 6 characters"
                    InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" edge="end" onClick={() => setShowPassword((s) => !s)} tabIndex={-1}>{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
                </Stack>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", my: 1.8 }}>
                  <FormControlLabel control={<Checkbox size="small" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} sx={{ "&.Mui-checked": { color: "#0f172a" } }} />} label={<Typography sx={{ fontSize: 13, fontFamily: FONT, fontWeight: 500 }}>Keep me signed in</Typography>} />
                  <Link to="/forgot-password" style={{ color: C.link, textDecoration: "none", fontSize: 13, fontFamily: FONT, fontWeight: 600 }}>Forgot password?</Link>
                </Box>

                <PrimaryButton fullWidth type="submit" disabled={isLoading || isLocked}>
                  {isLoading ? <CircularProgress size={20} sx={{ color: C.text }} /> : `Sign in with ${mode === "EMAIL" ? "Email" : "Mobile"}`}
                </PrimaryButton>

                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, my: 2.2 }}>
                  <Divider sx={{ flex: 1 }} />
                  <Typography sx={{ fontSize: 12, color: "#9ca3af", fontFamily: FONT }}>or continue with</Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>

                <SecondaryButton fullWidth startIcon={<GoogleIcon />} onClick={() => navigate("/register")} type="button">Continue with Google</SecondaryButton>

                <Box sx={{ mt: 2.5, p: 1.6, borderRadius: 2, bgcolor: "#f8fafc", border: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: 12.5, color: "#64748b", fontFamily: FONT }}>Secure login with</Typography>
                  <Box sx={{ display: "flex", gap: 0.8, alignItems: "center" }}><Shield sx={{ fontSize: 14, color: "#10b981" }} /><Typography sx={{ fontSize: 11, fontWeight: 700, color: "#065f46", fontFamily: FONT }}>256-bit SSL</Typography></Box>
                </Box>
              </form>

              <Box sx={{ mt: 2.5, textAlign: "center" }}>
                <Typography sx={{ fontSize: 13, color: "#6b7280", fontFamily: FONT }}>New to Quickks? <Link to="/register" style={{ color: C.link, fontWeight: 700, textDecoration: "none" }}>Create account</Link></Typography>
                <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center", gap: 2 }}>
                  <Link to="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 12, textDecoration: "none", fontFamily: FONT }}><Home style={{ fontSize: 14 }} /> Home</Link>
                  <Link to="/services" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontFamily: FONT }}>Services</Link>
                  <Link to="/privacy" style={{ color: "#64748b", fontSize: 12, textDecoration: "none", fontFamily: FONT }}>Privacy</Link>
                </Box>
              </Box>
            </Box>

            <Box sx={{ mt: 2, px: 3, py: 1.6, bgcolor: "#f9fafb", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <Typography sx={{ fontSize: 11, color: "#9ca3af", fontFamily: FONT, lineHeight: 1.5 }}>By signing in, you agree to Quickks Conditions of Use and Privacy Notice.<br />© 2024-2026 Quickks Technologies Pvt Ltd</Typography>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Root>
  );
}

export default React.memo(LoginPage);