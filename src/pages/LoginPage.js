// src/pages/LoginPage.js
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, TextField, Button, Paper, Alert, CircularProgress,
  InputAdornment, IconButton, Divider, Checkbox, FormControlLabel,
  useMediaQuery, useTheme, Grid, Tooltip, Fade, Chip, Stack,
} from "@mui/material";
import {
  Email, Lock, Visibility, VisibilityOff, ArrowForward, Google, Facebook, Apple,
  Shield, Home, Phone, Smartphone, Login as LoginIcon, Verified, Speed,
  SupportAgent, CheckCircle, Warning, Android, QrCode,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";
import api, { tokenManager } from "../api/api";

const logger = {
  log: (...a) => process.env.NODE_ENV === 'development' && console.log(...a),
  error: (...a) => console.error(...a),
};

const floatAnimation = keyframes`0%,100%{transform:translateY(0px) rotate(0deg)}50%{transform:translateY(-25px) rotate(3deg)}`;
const floatAnimationReverse = keyframes`0%,100%{transform:translateY(0px) rotate(0deg)}50%{transform:translateY(25px) rotate(-3deg)}`;
const pulseRing = keyframes`0%{transform:scale(0.8);opacity:0.8}100%{transform:scale(1.8);opacity:0}`;
const gradientMove = keyframes`0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}`;
const scaleIn = keyframes`from{opacity:0;transform:scale(0.9)}to{opacity:1;transform:scale(1)}`;

const LoginContainer = styled(Box)(() => ({
  minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
  background: "linear-gradient(-45deg,#0f172a,#1e293b,#0f172a,#1e293b)",
  backgroundSize: "400% 400%", animation: `${gradientMove} 20s ease infinite`,
  padding: 16, position: "relative", overflow: "hidden",
}));
const AnimatedBackground = styled(Box)(() => ({
  position: "absolute", inset: 0, overflow: "hidden",
  "&.orb": { position: "absolute", borderRadius: "50%", filter: "blur(100px)", opacity: 0.25 },
  "&.orb-1": { top: "-15%", right: "-5%", width: 500, height: 500, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", animation: `${floatAnimation} 10s ease-in-out infinite` },
  "&.orb-2": { bottom: "-15%", left: "-5%", width: 450, height: 450, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", animation: `${floatAnimationReverse} 12s ease-in-out infinite` },
  "&.orb-3": { top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "radial-gradient(circle,rgba(251,191,36,0.05) 0%,transparent 70%)", animation: `${pulseRing} 4s ease-out infinite` },
}));
const LoginCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(5), borderRadius: 24, maxWidth: 520, width: "100%",
  background: "rgba(255,255,255,0.98)", backdropFilter: "blur(30px)", zIndex: 2,
  boxShadow: "0 40px 100px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.1)",
  animation: `${scaleIn} 0.6s ease-out`,
  [theme.breakpoints.down("sm")]: { padding: 24, borderRadius: 16 },
}));
const GradientButton = styled(Button)(() => ({
  padding: 16, borderRadius: 20, background: "linear-gradient(135deg,#fbbf24 0%,#f59e0b 100%)",
  color: "#0f172a", fontWeight: 700, fontSize: "1.05rem", textTransform: "none",
  "&:hover": { transform: "translateY(-3px) scale(1.02)", boxShadow: "0 15px 40px rgba(251,191,36,0.4)" },
  "&:disabled": { background: "#e2e8f0", color: "#94a3b8" },
}));
const StyledTextField = styled(TextField)(() => ({
  "&.MuiOutlinedInput-root": { borderRadius: 18, background: "#f8fafc", "&.Mui-focused fieldset": { borderColor: "#fbbf24", boxShadow: "0 0 0 6px rgba(251,191,36,0.1)" } },
}));
const SocialButton = styled(Button)(() => ({
  padding: 12, borderRadius: 16, border: "2px solid #e2e8f0", color: "#64748b", fontWeight: 600, textTransform: "none",
  "&:hover": { borderColor: "#fbbf24", background: "rgba(251,191,36,0.05)" },
}));
const PulseDot = styled(Box)(() => ({
  width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block", marginRight: 10, position: "relative",
  "&::after": { content: '""', position: "absolute", inset: -5, borderRadius: "50%", background: "rgba(34,197,94,0.3)", animation: `${pulseRing} 2s ease-out infinite` },
}));
const FeatureBadge = styled(Box)(() => ({
  display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 100, background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)",
}));

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => { try { return localStorage.getItem("rememberMe") === "true"; } catch { return false; } });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState("EMAIL");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [serverStatus, setServerStatus] = useState(null);
  const [checkingServer, setCheckingServer] = useState(true);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const timerRef = useRef(null);
  const inputRef = useRef(null);
  const API_BASE = useMemo(() => api.defaults.baseURL, []);

  useEffect(() => { try { localStorage.setItem("rememberMe", rememberMe); } catch {} }, [rememberMe]);
  useEffect(() => { if (otpTimer > 0) timerRef.current = setTimeout(() => setOtpTimer(p => p - 1), 1000); return () => clearTimeout(timerRef.current); }, [otpTimer]);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 600); }, []);
  useEffect(() => { if (isAuthenticated) navigate("/dashboard", { replace: true }); }, [isAuthenticated, navigate]);

  useEffect(() => {
    let mounted = true;
    const checkServer = async () => {
      setCheckingServer(true);
      try {
        const res = await api.get("/actuator/health", { timeout: 4000, validateStatus: () => true });
        if (mounted) { setServerStatus(res.status === 200); setCheckingServer(false); }
      } catch { if (mounted) { setServerStatus(false); setCheckingServer(false); } }
    };
    const t = setTimeout(checkServer, 800);
    return () => { mounted = false; clearTimeout(t); };
  }, [API_BASE]);

  const validateEmail = useCallback((v) => { if (!v) return "Email required"; const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; if (!re.test(v)) return "Valid email tak"; return ""; }, []);
  const validatePassword = useCallback((v) => { if (!v) return "Password required"; if (v.length < 6) return "Min 6 chars"; return ""; }, []);
  const validatePhone = useCallback((v) => { const re = /^[6-9]\d{9}$/; if (!v) return "Phone required"; if (!re.test(v)) return "Valid 10-digit tak"; return ""; }, []);

  const loginWithPhone = useCallback(async (phoneNumber, otpCode) => {
    try {
      const res = await api.post("/auth/phone-login", { phone: phoneNumber, otp: otpCode });
      const data = res.data?.data || res.data;
      const token = data?.token || data?.accessToken;
      if (token) {
        tokenManager.setTokens(token, data?.refreshToken);
        const userData = { id: data.userId || data.id, name: data.name || "User", email: data.email || "", role: data.role || "CUSTOMER", phone: phoneNumber,...data };
        tokenManager.setUser(userData);
        return { success: true, token, user: userData, data };
      }
      return { success: false, error: data.message || "Phone login failed" };
    } catch (e) { return { success: false, error: e.response?.data?.message || "Phone login failed" }; }
  }, []);

  const handleSendOtp = useCallback(async () => {
    const pe = validatePhone(phone); if (pe) { setError(pe); return; }
    setIsLoading(true); setError(null);
    try {
      const res = await api.post("/auth/send-otp", { phone });
      if (res.status === 200 || res.status === 201) { setOtpSent(true); setOtpTimer(60); setSuccess(res.data?.message || "OTP sent"); }
      else setError(res.data?.message || "Failed");
    } catch (err) { setError(err.response?.data?.message || "Network error"); }
    finally { setIsLoading(false); }
  }, [phone, validatePhone]);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (failedAttempts >= 5) { setError("Too many attempts. 5 min nanter try kara."); return; }
    setError(null); setSuccess(null);
    if (loginMode === "EMAIL") {
      const ee = validateEmail(email); const pe = validatePassword(password);
      if (ee) { setError(ee); return; } if (pe) { setError(pe); return; }
    } else { if (!otp || otp.length < 6) { setError("6-digit OTP tak"); return; } }
    setIsLoading(true);
    try {
      let result;
      if (loginMode === "EMAIL") result = await login(email.trim().toLowerCase(), password, rememberMe);
      else result = await loginWithPhone(phone, otp);
      if (!result ||!result.success) {
        setFailedAttempts(p => p + 1);
        const msg = result?.error || "";
        if (msg.toLowerCase().includes("invalid email") || msg.toLowerCase().includes("not found")) {
          setError("User sapdat nahi! Railway MySQL -> Data -> users 0 aahe - Admin add kara");
        } else setError(result?.error || "Login failed");
        return;
      }
      setSuccess("Welcome! Redirecting...");
      const userRole = result.data?.role || result.user?.role || "CUSTOMER";
      const routes = { ADMIN: "/dashboard/admin", SUPER_ADMIN: "/dashboard/admin", PROVIDER: "/dashboard/provider", CUSTOMER: "/dashboard" };
      setTimeout(() => navigate(routes[userRole] || "/dashboard"), 800);
    } catch (err) {
      logger.error(err);
      setFailedAttempts(p => p + 1);
      setError(err.response?.data?.message || err.message || "Unexpected error");
    } finally { setIsLoading(false); }
  }, [email, password, otp, phone, loginMode, login, loginWithPhone, navigate, failedAttempts, rememberMe, validateEmail, validatePassword]);

  const renderServerStatus = () => {
    if (checkingServer) return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CircularProgress size={14} sx={{ color: '#fbbf24' }} /><Typography variant="caption" sx={{ color: 'white' }}>Connecting...</Typography></Box>;
    if (serverStatus === true) return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}><PulseDot /><Typography variant="caption" sx={{ color: 'white' }}>Server Connected</Typography><Chip size="small" label="Live" sx={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', height: 22 }} /></Box>;
    return <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /><Typography variant="caption" sx={{ color: '#fca5a5' }}>Offline</Typography></Box>;
  };

  return (
    <LoginContainer>
      <AnimatedBackground><Box className="orb orb-1" /><Box className="orb orb-2" /><Box className="orb orb-3" /></AnimatedBackground>
      <IconButton onClick={() => navigate("/")} sx={{ position: "fixed", top: 20, left: 20, zIndex: 10, color: "white", background: "rgba(255,255,255,0.1)" }}><Home /></IconButton>
      <Box sx={{ position: "fixed", top: 20, right: 20, zIndex: 10, display: "flex", alignItems: "center", gap: 1.5, background: "rgba(255,255,255,0.1)", px: 2.5, py: 1.5, borderRadius: 100 }}><Box>{renderServerStatus()}</Box></Box>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: "100%", maxWidth: 520, zIndex: 2 }}>
        <LoginCard>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box sx={{ width: 90, height: 90, borderRadius: "50%", background: "linear-gradient(135deg,#fef3c7,#fbbf24)", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}><LoginIcon sx={{ fontSize: 42 }} /></Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Quickks<span style={{ color: "#fbbf24" }}>.</span></Typography>
            <Typography variant="body2" sx={{ color: "#64748b", mt: 1 }}>{loginMode === "EMAIL"? "Welcome back! Sign in to continue" : "Sign in with phone"}</Typography>
          </Box>

          <Box sx={{ display: "flex", bgcolor: "#f1f5f9", p: 0.5, borderRadius: 3, mb: 2.5 }}>
            {["EMAIL", "PHONE"].map((m) => (
              <Button key={m} onClick={() => { setLoginMode(m); setError(null); setOtpSent(false); setOtp(""); }} sx={{ flex: 1, py: 1.2, borderRadius: 2, textTransform: "none", fontWeight: 600, color: loginMode === m? "#0f172a" : "#64748b", background: loginMode === m? "white" : "transparent", boxShadow: loginMode === m? 1 : 0 }}>{m === "EMAIL"? <Email sx={{ mr: 1, fontSize: 18 }} /> : <Smartphone sx={{ mr: 1, fontSize: 18 }} />}{m}</Button>
            ))}
          </Box>

          <AnimatePresence mode="wait">
            {error && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}><Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert></motion.div>}
            {success && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}><Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{success}</Alert></motion.div>}
          </AnimatePresence>

          <form onSubmit={handleLogin}>
            {loginMode === "EMAIL"? (
              <>
                <StyledTextField fullWidth label="Email Address" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} inputRef={inputRef} required disabled={isLoading} InputProps={{ startAdornment: <InputAdornment position="start"><Email sx={{ color: "#94a3b8" }} /></InputAdornment> }} sx={{ mb: 2.5 }} />
                <StyledTextField fullWidth label="Password" type={showPassword? "text" : "password"} value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} required disabled={isLoading} InputProps={{ startAdornment: <InputAdornment position="start"><Lock sx={{ color: "#94a3b8" }} /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton onClick={() => setShowPassword(!showPassword)} edge="end">{showPassword? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment> }} sx={{ mb: 2 }} />
              </>
            ) : (
              <Box>
                <StyledTextField fullWidth label="Phone Number" placeholder="9876543210" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} InputProps={{ startAdornment: <InputAdornment position="start"><Phone sx={{ color: "#94a3b8" }} /><Typography sx={{ ml: 1, color: "#64748b" }}>+91</Typography></InputAdornment> }} sx={{ mb: 2 }} />
                {!otpSent? <GradientButton fullWidth onClick={handleSendOtp} disabled={isLoading ||!phone} sx={{ mb: 2 }}>{isLoading? <CircularProgress size={24} /> : <>Send OTP<ArrowForward sx={{ ml: 1 }} /></>}</GradientButton> : <>
                  <StyledTextField fullWidth label="Enter OTP" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} InputProps={{ startAdornment: <InputAdornment position="start"><Smartphone sx={{ color: "#94a3b8" }} /></InputAdornment>, endAdornment: <InputAdornment position="end"><Typography variant="caption">{otpTimer > 0? `${otpTimer}s` : "Expired"}</Typography></InputAdornment> }} sx={{ mb: 2 }} />
                  {otpTimer === 0 && <Button fullWidth onClick={handleSendOtp} sx={{ color: "#fbbf24", mb: 2 }}>Resend OTP</Button>}
                </>}
              </Box>
            )}

            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}><FormControlLabel control={<Checkbox checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />} label="Remember me" /><Link to="/forgot-password" style={{ color: "#fbbf24", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem" }}>Forgot Password?</Link></Box>
            <GradientButton fullWidth type="submit" disabled={isLoading || failedAttempts >= 5}>{isLoading? <CircularProgress size={24} /> : <>Sign In<ArrowForward sx={{ ml: 1 }} /></>}</GradientButton>
            {failedAttempts >= 2 && <Typography variant="caption" sx={{ color: "#ef4444", mt: 1, display: "block", textAlign: "center" }}>Attempt {failedAttempts}/5</Typography>}
          </form>

          <Box sx={{ my: 3, display: "flex", alignItems: "center", gap: 2 }}><Divider sx={{ flex: 1 }} /><Typography variant="caption" sx={{ color: "#94a3b8" }}>Or continue with</Typography><Divider sx={{ flex: 1 }} /></Box>
          <Grid container spacing={2}><Grid item xs={4}><SocialButton fullWidth startIcon={<Google />}>Google</SocialButton></Grid><Grid item xs={4}><SocialButton fullWidth startIcon={<Facebook />}>Facebook</SocialButton></Grid><Grid item xs={4}><SocialButton fullWidth startIcon={<Apple />}>Apple</SocialButton></Grid></Grid>
          <Box sx={{ textAlign: "center", mt: 3 }}><Typography variant="body2" sx={{ color: "#64748b" }}>Don't have account? <Link to="/register" style={{ color: "#fbbf24", fontWeight: 700, textDecoration: "none" }}>Create one</Link></Typography></Box>
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 3, pt: 3, borderTop: "1px solid #f1f5f9", flexWrap: "wrap" }}><FeatureBadge><Shield sx={{ fontSize: 16, color: "#fbbf24" }} /><Typography variant="caption">Secure</Typography></FeatureBadge><FeatureBadge><Speed sx={{ fontSize: 16, color: "#fbbf24" }} /><Typography variant="caption">Fast</Typography></FeatureBadge><FeatureBadge><Verified sx={{ fontSize: 16, color: "#fbbf24" }} /><Typography variant="caption">Trusted</Typography></FeatureBadge><FeatureBadge><SupportAgent sx={{ fontSize: 16, color: "#fbbf24" }} /><Typography variant="caption">24/7 Support</Typography></FeatureBadge></Box>
          <Box sx={{ mt: 3, display: "flex", justifyContent: "center", gap: 2 }}><Typography variant="caption" sx={{ color: "#94a3b8" }}>Get the app:</Typography><Stack direction="row" spacing={1}><IconButton size="small" sx={{ background: "#0f172a", color: "white" }}><Apple fontSize="small" /></IconButton><IconButton size="small" sx={{ background: "#0f172a", color: "white" }}><Android fontSize="small" /></IconButton><IconButton size="small" sx={{ background: "#0f172a", color: "white" }}><QrCode fontSize="small" /></IconButton></Stack></Box>
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #f1f5f9", textAlign: "center" }}><Typography variant="caption" sx={{ color: "#94a3b8" }}>© 2026 Quickks. All rights reserved.</Typography></Box>
        </LoginCard>
      </motion.div>
    </LoginContainer>
  );
};

export default React.memo(LoginPage);