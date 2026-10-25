import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment, IconButton,
  Checkbox, FormControlLabel, ToggleButton, ToggleButtonGroup, Stack, Divider, Paper, Chip
} from "@mui/material";
import { Visibility, VisibilityOff, CheckCircle, RadioButtonUnchecked, ArrowBack, Home, Shield, Bolt, VerifiedUser, WorkspacePremium } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import { motion } from "framer-motion";
import api from "../api/api";
import QuickksLogo from "../assets/quickks-logo.png";

const ENDPOINTS = { sendOtp: "/auth/send-otp", register: "/auth/register" };
const ROLE_ROUTES = { ADMIN: "/admin/dashboard", SUPER_ADMIN: "/admin/dashboard", PROVIDER: "/provider/dashboard", CUSTOMER: "/customer/dashboard" };
const ROLES = [
  { value: "CUSTOMER", label: "Customer", hint: "Book trusted professionals" },
  { value: "PROVIDER", label: "Provider", hint: "Receive jobs and grow" },
];
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const MAX_RESENDS = 3;
const MAX_OTP_ATTEMPTS = 5;
const REDIRECT_MS = 2500;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;

const C = {
  header: "#131921", text: "#0F1111", muted: "#565959", link: "#0066c0", linkHover: "#C7511F",
  yellow: "#FFD814", yellowHover: "#F7CA00", yellowBorder: "#FCD200", orange: "#FF9900",
  border: "#D5D9D9", focus: "#E77600", focusRing: "#C8F3FA", green: "#067D62", red: "#B12704", bg: "#f8fafc"
};
const FONT = '"Amazon Ember", Inter, "Segoe UI", Arial, sans-serif';
const NAME_RE = /^[A-Za-z][A-Za-z\s.'\-]{1,49}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;
const normalizeName = (s) => s.replace(/\s+/g, " ").trim();
const maskEmail = (e) => { const [user = "", domain = ""] = e.split("@"); return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 2))}@${domain}`; };
const cleanPhone = (raw) => { let d = raw.replace(/\D/g, ""); if (d.length > 10 && d.startsWith("91")) d = d.slice(2); if (d.length > 10 && d.startsWith("0")) d = d.slice(1); return d.slice(0, 10); };
const TYPO_DOMAINS = { "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com", "yahooo.com": "yahoo.com", "hotmial.com": "hotmail.com", "outlok.com": "outlook.com" };
const passwordRules = (pw) => [
  { id: "len", label: `At least ${PASSWORD_MIN} chars`, ok: pw.length >= PASSWORD_MIN },
  { id: "upper", label: "Uppercase", ok: /[A-Z]/.test(pw) },
  { id: "lower", label: "Lowercase", ok: /[a-z]/.test(pw) },
  { id: "num", label: "Number", ok: /\d/.test(pw) },
  { id: "sym", label: "Symbol", ok: /[^A-Za-z0-9]/.test(pw) },
];
const COMMON_FRAGMENTS = ["password", "qwerty", "123456", "admin", "welcome", "quickks"];
const weakPattern = (pw, { email, name }) => {
  const lower = pw.toLowerCase();
  if (COMMON_FRAGMENTS.some((f) => lower.includes(f))) return "common";
  if (/(.)\1{3,}/.test(pw)) return "repeated";
  const emailToken = email ? email.split("@")[0].toLowerCase() : "";
  const nameTokens = name ? name.split(/\s+/).map((t) => t.toLowerCase()).filter((t) => t.length >= 4) : [];
  if ([emailToken, ...nameTokens].some((t) => t && lower.includes(t))) return "personal";
  return "";
};
const passwordStrength = (pw, ctx) => {
  if (!pw) return { score: 0, label: "", color: "#cbd5e1" };
  const passed = passwordRules(pw).filter((r) => r.ok).length;
  let points = passed * 16;
  if (pw.length >= 12) points += 12;
  if (pw.length >= 16) points += 8;
  if (weakPattern(pw, ctx)) points = Math.min(points, 30);
  if (points < 35) return { score: 25, label: "Weak", color: "#CC0C39" };
  if (points < 60) return { score: 50, label: "Fair", color: "#F59E0B" };
  if (points < 85) return { score: 75, label: "Good", color: "#16A34A" };
  return { score: 100, label: "Strong", color: C.green };
};
const passwordProblem = (pw, ctx) => {
  if (!pw) return "Create a password.";
  if (new TextEncoder().encode(pw).length > PASSWORD_MAX_BYTES) return `Password max ${PASSWORD_MAX_BYTES} chars.`;
  if (!passwordRules(pw).every((r) => r.ok)) return "Password must meet all requirements below.";
  const weak = weakPattern(pw, ctx);
  if (weak === "personal") return "Do not use your name or email in password.";
  if (weak) return "Avoid common words and repeated characters.";
  return "";
};
const validateDetails = (f, accepted) => {
  const errors = {};
  const name = normalizeName(f.name);
  const email = f.email.trim().toLowerCase();
  if (!name) errors.name = "Enter your full name.";
  else if (name.length < 2 || name.length > 100 || !NAME_RE.test(name)) errors.name = "Use 2 to 50 letters.";
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = "Enter valid email.";
  if (!f.phone) errors.phone = "Enter mobile number.";
  else if (!PHONE_RE.test(f.phone)) errors.phone = "Enter valid 10-digit mobile.";
  const pwErr = passwordProblem(f.password, { email, name });
  if (pwErr) errors.password = pwErr;
  if (!f.confirm) errors.confirm = "Re-enter password.";
  else if (f.confirm !== f.password) errors.confirm = "Passwords do not match.";
  if (!accepted) errors.terms = "Accept Terms and Privacy.";
  if (!f.role || !["CUSTOMER", "PROVIDER"].includes(f.role)) errors.role = "Select role.";
  return errors;
};
const SERVER_FIELD_MAP = { fullName: "name", name: "name", email: "email", phoneNumber: "phone", phone: "phone", password: "password", role: "role", otp: "otp", acceptTerms: "terms" };
const mapServerFields = (errors) => {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};
  return Object.fromEntries(Object.entries(errors).filter(([k]) => SERVER_FIELD_MAP[k]).map(([k, v]) => [SERVER_FIELD_MAP[k], Array.isArray(v) ? v.join(", ") : String(v)]));
};
const explain = (err, fallback) => {
  const status = err?.response?.status || 0;
  const data = err?.response?.data;
  const serverMsg = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : "";
  let text;
  if (!status) text = "Cannot reach Quickks. Check connection.";
  else if (status === 400) text = serverMsg || fallback;
  else if (status === 409) text = "Account with this email or mobile already exists.";
  else if (status === 429) text = "Too many attempts. Wait few minutes.";
  else if (status >= 500) text = "Something went wrong. Try again shortly.";
  else text = serverMsg || fallback;
  return { status, text, serverMsg, fields: mapServerFields(data?.errors || data?.fieldErrors), retryAfter: Number(err?.response?.headers?.["retry-after"]) || 0 };
};

const Root = styled(Box)({
  minHeight: "100vh",
  background: "radial-gradient(1200px 600px at 10% -10%, #fef3c7 0%, #f8fafc 42%, #ffffff 100%)",
  display: "flex",
  flexDirection: "column",
  fontFamily: FONT,
});

const Field = styled(TextField)({
  "& .MuiOutlinedInput-root": {
    borderRadius: 10,
    background: "#fff",
    fontFamily: FONT,
    height: 48,
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
  fontSize: 14.5,
  boxShadow: "0 2px 5px rgba(213,217,217,0.5)",
  "&:hover": { background: C.yellowHover },
  "&.Mui-disabled": { background: "#F0F2F2", color: "#8D9096", borderColor: C.border },
});

const NavButton = styled(IconButton)({
  width: 40,
  height: 40,
  background: "#fff",
  border: "1px solid #e2e8f0",
  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
  "&:hover": { background: "#f8fafc", borderColor: "#cbd5e1" },
});

const TextButton = styled("button")({
  background: "none",
  border: "none",
  padding: 0,
  color: C.link,
  cursor: "pointer",
  fontSize: 13,
  fontFamily: FONT,
  fontWeight: 600,
  "&:hover": { textDecoration: "underline", color: C.linkHover },
});

const linkSx = { color: C.link, textDecoration: "none", fontWeight: 600 };
const INITIAL_FORM = { name: "", email: "", phone: "", password: "", confirm: "", role: "CUSTOMER", hp_field: "" };

function RegisterPage() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { isAuthenticated, user } = useAuth();
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const lastTriedRef = useRef("");
  const redirectTimerRef = useRef(null);
  const firstFieldRef = useRef(null);
  const otpFieldRef = useRef(null);
  const [step, setStep] = useState("details");
  const [form, setForm] = useState(INITIAL_FORM);
  const [accepted, setAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [resendsLeft, setResendsLeft] = useState(MAX_RESENDS);
  const [cooldown, setCooldown] = useState(0);
  const email = form.email.trim().toLowerCase();
  const name = normalizeName(form.name);
  const ctx = useMemo(() => ({ email, name }), [email, name]);
  const errors = useMemo(() => validateDetails(form, accepted), [form, accepted]);
  const strength = useMemo(() => passwordStrength(form.password, ctx), [form.password, ctx]);
  const rules = useMemo(() => passwordRules(form.password), [form.password]);
  const emailSuggestion = useMemo(() => {
    const [local, domain] = email.split("@");
    return local && domain && TYPO_DOMAINS[domain] ? `${local}@${TYPO_DOMAINS[domain]}` : "";
  }, [email]);
  const visibleError = (field) => {
    if (serverErrors[field]) return serverErrors[field];
    return submitted || touched[field] ? errors[field] || "" : "";
  };
  const fieldProps = (field) => {
    const err = visibleError(field);
    return { error: Boolean(err), helperText: err || undefined, onBlur: () => setTouched((p) => ({ ...p, [field]: true })) };
  };
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; clearTimeout(redirectTimerRef.current); }; }, []);
  useEffect(() => {
    if (isAuthenticated) {
      const role = String(user?.role || "CUSTOMER").toUpperCase().replace(/^ROLE_/, "");
      navigate(ROLE_ROUTES[role] || ROLE_ROUTES.CUSTOMER, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);
  useEffect(() => {
    const t = setTimeout(() => (step === "otp" ? otpFieldRef : firstFieldRef).current?.focus(), 50);
    return () => clearTimeout(t);
  }, [step]);
  const setField = useCallback((field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setServerErrors((p) => (p[field] ? { ...p, [field]: undefined } : p));
    setMessage(null);
  }, []);
  const onChange = (e) => {
    const { name: field, value } = e.target;
    setField(field, field === "phone" ? cleanPhone(value) : value);
  };
  const onPasswordKey = (e) => setCapsOn(Boolean(e.getModifierState?.("CapsLock")));
  const requestOtp = useCallback(async (isResend = false) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsLoading(true);
    setMessage(null);
    try {
      await api.post(ENDPOINTS.sendOtp, { email });
      if (!mountedRef.current) return;
      setStep("otp");
      setOtp("");
      lastTriedRef.current = "";
      setOtpAttempts(0);
      setCooldown(RESEND_SECONDS);
      if (isResend) setResendsLeft((n) => n - 1);
      setMessage({ type: "success", text: `We sent a ${OTP_LENGTH}-digit code to ${maskEmail(email)}. Check inbox and spam.` });
    } catch (err) {
      if (!mountedRef.current) return;
      const e = explain(err, "We could not send code.");
      if (e.retryAfter) setCooldown(e.retryAfter);
      if (Object.keys(e.fields).length) setServerErrors((p) => ({ ...p, ...e.fields }));
      setMessage({ type: "error", text: e.text, action: e.status === 409 ? "login" : undefined });
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [email]);
  const goToLogin = useCallback(() => {
    navigate("/login", { replace: true, state: { ...(routeLocation.state || {}), registeredEmail: email } });
  }, [navigate, routeLocation.state, email]);
  const verify = useCallback(async () => {
    if (busyRef.current) return;
    if (otp.length !== OTP_LENGTH) { setMessage({ type: "error", text: `Enter ${OTP_LENGTH}-digit code.` }); return; }
    busyRef.current = true;
    lastTriedRef.current = otp;
    setIsLoading(true);
    setMessage(null);
    try {
      const payload = { fullName: name, email, phoneNumber: form.phone, password: form.password, otp, role: ROLES.some((r) => r.value === form.role) ? form.role : "CUSTOMER", acceptTerms: accepted };
      await api.post(ENDPOINTS.register, payload);
      if (!mountedRef.current) return;
      setForm((p) => ({ ...p, password: "", confirm: "" }));
      setOtp("");
      setStep("done");
      setMessage(null);
      redirectTimerRef.current = setTimeout(goToLogin, REDIRECT_MS);
    } catch (err) {
      if (!mountedRef.current) return;
      const e = explain(err, "Registration failed.");
      const otpProblem = Boolean(e.fields.otp) || e.status === 401 || (e.status === 400 && /otp|code/i.test(e.serverMsg));
      if (otpProblem) {
        const attempts = otpAttempts + 1;
        setOtpAttempts(attempts);
        if (attempts >= MAX_OTP_ATTEMPTS) { setStep("details"); setOtp(""); setMessage({ type: "error", text: "Too many incorrect codes. Request new code." }); }
        else { setMessage({ type: "error", text: `Incorrect or expired code. ${MAX_OTP_ATTEMPTS - attempts} attempts left.` }); }
      } else if (e.status === 409) { setStep("details"); setOtp(""); setMessage({ type: "error", text: e.text, action: "login" }); }
      else if (Object.keys(e.fields).length) { setServerErrors(e.fields); setStep("details"); setOtp(""); setMessage({ type: "error", text: "Correct highlighted fields." }); }
      else { if (e.retryAfter) setCooldown(e.retryAfter); setMessage({ type: "error", text: e.text }); }
    } finally { busyRef.current = false; if (mountedRef.current) setIsLoading(false); }
  }, [otp, name, email, form.phone, form.password, form.role, accepted, otpAttempts, goToLogin]);
  useEffect(() => { if (step !== "otp" || otp.length !== OTP_LENGTH || isLoading || lastTriedRef.current === otp) return; verify(); }, [otp, step, isLoading, verify]);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (step === "otp") { verify(); return; }
    if (step !== "details") return;
    setSubmitted(true);
    if (form.hp_field) { setMessage({ type: "error", text: "Something went wrong." }); return; }
    const firstError = Object.keys(errors)[0];
    if (firstError) { setMessage({ type: "error", text: "Fix highlighted fields." }); document.querySelector(`[name="${firstError === "terms" ? "terms" : firstError}"]`)?.focus(); return; }
    requestOtp(false);
  };
  const stepIndex = step === "details" ? 0 : 1;
  const alertAction = message?.action === "login" ? <Button color="inherit" size="small" onClick={goToLogin} sx={{ textTransform: "none", fontWeight: 700 }}>Sign in</Button> : undefined;

  return (
    <Root>
      <Helmet><title>Create account – Quickks</title></Helmet>
      <Box sx={{ width: "100%", maxWidth: 1280, mx: "auto", px: { xs: 2, md: 3 }, py: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <NavButton onClick={() => navigate(-1)} aria-label="Back"><ArrowBack fontSize="small" /></NavButton>
          <NavButton onClick={() => navigate("/")} aria-label="Home"><Home fontSize="small" /></NavButton>
          <Box sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", ml: 1, gap: 0.8 }}>
            <Chip icon={<Shield style={{ fontSize: 14 }} />} label="SSL" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: "#ecfdf5", color: "#065f46", border: "1px solid #a7f3d0" }} />
            <Chip icon={<VerifiedUser style={{ fontSize: 14 }} />} label="Verified" size="small" sx={{ height: 24, fontSize: 11, fontWeight: 700, bgcolor: "#eff6ff", color: "#1e40af", border: "1px solid #bfdbfe", display: { xs: "none", md: "flex" } }} />
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography sx={{ fontSize: 12, color: C.muted, fontFamily: FONT, display: { xs: "none", sm: "block" } }}>Already have account?</Typography>
          <Button size="small" onClick={goToLogin} sx={{ textTransform: "none", fontFamily: FONT, fontWeight: 600, color: C.link, border: "1px solid #e2e8f0", bgcolor: "#fff", borderRadius: 999, px: 2, height: 32 }}>Sign in</Button>
        </Stack>
      </Box>

      <Box sx={{ flex: 1, width: "100%", maxWidth: 1120, mx: "auto", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 0.95fr" }, gap: { xs: 0, md: 4 }, px: { xs: 2, md: 3 }, pb: 4, alignItems: "start" }}>
        <Box sx={{ display: { xs: "none", md: "block" }, pt: 4, pr: 2 }}>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2.5 }}>
              <Box component="img" src={QuickksLogo} alt="Quickks" sx={{ width: 44, height: 44, borderRadius: 2 }} />
              <Typography sx={{ fontWeight: 900, fontSize: 32, fontFamily: FONT, color: C.header }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
            </Box>
            <Typography sx={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: -0.8, color: "#0f172a", fontFamily: FONT, mb: 1.5 }}>Create your Quickks<br />account in 60 seconds.</Typography>
            <Typography sx={{ fontSize: 14.5, color: "#475569", lineHeight: 1.6, mb: 3, fontFamily: FONT }}>Join 12,000+ customers and 800+ verified pros across Pune. Fixed pricing, real-time tracking, 7-day warranty.</Typography>
            <Stack spacing={1.4}>
              {[
                { icon: WorkspacePremium, title: "Earn as Provider", desc: "Verified pros earn ₹35k-₹80k/month" },
                { icon: Bolt, title: "Instant Jobs", desc: "Get bookings within hours of approval" },
                { icon: Shield, title: "Safe & Insured", desc: "ID verified + work insured up to ₹1L" },
              ].map((f) => (
                <Box key={f.title} sx={{ display: "flex", gap: 1.4, p: 1.4, borderRadius: 3, bgcolor: "rgba(255,255,255,0.75)", border: "1px solid rgba(255,255,255,0.9)", backdropFilter: "blur(8px)" }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "#0f172a", color: "#fff", display: "grid", placeItems: "center" }}><f.icon fontSize="small" /></Box>
                  <Box><Typography sx={{ fontWeight: 700, fontSize: 14, color: "#0f172a", fontFamily: FONT }}>{f.title}</Typography><Typography sx={{ fontSize: 12.5, color: "#64748b", fontFamily: FONT }}>{f.desc}</Typography></Box>
                </Box>
              ))}
            </Stack>
            <Box sx={{ mt: 3, p: 1.8, borderRadius: 3, bgcolor: "#0f172a", color: "#fff", display: "flex", justifyContent: "space-between" }}>
              {[{ v: "25+", l: "Cities" }, { v: "12k+", l: "Customers" }, { v: "800+", l: "Providers" }, { v: "4.8★", l: "Rating" }].map((s) => (
                <Box key={s.l} sx={{ textAlign: "center" }}><Typography sx={{ fontWeight: 900, fontSize: 18, fontFamily: FONT }}>{s.v}</Typography><Typography sx={{ fontSize: 11, color: "#94a3b8", fontFamily: FONT }}>{s.l}</Typography></Box>
              ))}
            </Box>
          </motion.div>
        </Box>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, delay: 0.08 }}>
          <Paper elevation={0} sx={{ width: "100%", maxWidth: 440, mx: "auto", border: "1px solid #e5e7eb", borderRadius: 3, overflow: "hidden", bgcolor: "#fff", boxShadow: "0 12px 32px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)" }}>
            {step === "done" ? (
              <Box sx={{ textAlign: "center", py: 6, px: 3 }}>
                <CheckCircle sx={{ fontSize: 56, color: C.green }} />
                <Typography sx={{ fontSize: 24, fontWeight: 700, mt: 1, mb: 1, fontFamily: FONT }}>Account ready</Typography>
                <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, fontFamily: FONT }}>{form.role === "PROVIDER" ? "Sign in to complete provider profile. Verification in 24h." : "Sign in to book your first service."}</Typography>
                <PrimaryButton fullWidth onClick={goToLogin}>Continue to sign in</PrimaryButton>
              </Box>
            ) : (
              <Box sx={{ p: { xs: 2.5, sm: 3 } }}>
                <Typography sx={{ fontSize: 22, fontWeight: 700, mb: 0.3, fontFamily: FONT }}>Create account</Typography>
                <Typography sx={{ fontSize: 12.5, color: "#6b7280", mb: 2, fontFamily: FONT }}>Fast, secure, verified. No spam.</Typography>

                <Box sx={{ listStyle: "none", m: 0, p: 0, display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
                  {["Details", "Verify"].map((label, i) => (
                    <React.Fragment key={label}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Box sx={{ width: 22, height: 22, borderRadius: "50%", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: i <= stepIndex ? C.header : "#E7E7E7", color: i <= stepIndex ? "#fff" : C.muted }}>{i + 1}</Box>
                        <Typography sx={{ fontSize: 12, fontWeight: i === stepIndex ? 700 : 400, color: i === stepIndex ? C.text : C.muted, fontFamily: FONT }}>{label}</Typography>
                      </Box>
                      {i === 0 && <Box sx={{ flex: 1, height: 2, bgcolor: stepIndex > 0 ? C.header : "#E7E7E7", borderRadius: 1 }} />}
                    </React.Fragment>
                  ))}
                </Box>

                {message && <Alert severity={message.type} action={alertAction} sx={{ mb: 2, borderRadius: 2, fontFamily: FONT, fontSize: 13 }}>{message.text}</Alert>}

                <form onSubmit={handleSubmit} noValidate>
                  {step === "details" ? (
                    <Stack spacing={1.8}>
                      <Field fullWidth required size="small" label="Full name" name="name" autoComplete="name" value={form.name} inputRef={firstFieldRef} onChange={onChange} disabled={isLoading} inputProps={{ maxLength: 100 }} {...fieldProps("name")} />
                      <Box>
                        <Field fullWidth required size="small" label="Email address" name="email" type="email" autoComplete="email" value={form.email} onChange={onChange} disabled={isLoading} inputProps={{ maxLength: 254 }} {...fieldProps("email")} />
                        {emailSuggestion && <Typography sx={{ fontSize: 12, mt: 0.5, fontFamily: FONT }}>Did you mean <TextButton type="button" onClick={() => setField("email", emailSuggestion)}>{emailSuggestion}</TextButton>?</Typography>}
                      </Box>
                      <Field fullWidth required size="small" label="Mobile number" name="phone" type="tel" autoComplete="tel-national" value={form.phone} onChange={onChange} disabled={isLoading} inputProps={{ inputMode: "numeric", maxLength: 10 }} InputProps={{ startAdornment: <InputAdornment position="start" sx={{ fontWeight: 700 }}>+91</InputAdornment> }} {...fieldProps("phone")} />
                      <Box>
                        <Typography sx={{ fontSize: 12.5, mb: 0.7, fontWeight: 600, fontFamily: FONT }}>I want to join as</Typography>
                        <ToggleButtonGroup exclusive fullWidth size="small" value={form.role} disabled={isLoading} onChange={(_, v) => v && setField("role", v)}>
                          {ROLES.map((r) => (
                            <ToggleButton key={r.value} value={r.value} sx={{ textTransform: "none", flexDirection: "column", alignItems: "flex-start", py: 1, px: 1.5, fontFamily: FONT, borderRadius: 2, "&.Mui-selected": { borderColor: C.focus, bgcolor: "#FFF8E7", color: C.text } }}>
                              <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: FONT }}>{r.label}</Typography>
                              <Typography sx={{ fontSize: 11, color: C.muted, fontFamily: FONT, textAlign: "left" }}>{r.hint}</Typography>
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>
                      </Box>
                      <Box>
                        <Field fullWidth required size="small" label="Password" name="password" autoComplete="new-password" type={showPassword ? "text" : "password"} value={form.password} onChange={onChange} disabled={isLoading} onKeyUp={onPasswordKey} onKeyDown={onPasswordKey} onFocus={() => setPwFocused(true)} {...fieldProps("password")} helperText={visibleError("password") || (capsOn ? "Caps Lock on" : undefined)}
                          InputProps={{ endAdornment: <InputAdornment position="end"><IconButton size="small" edge="end" onClick={() => setShowPassword((s) => !s)}>{showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}</IconButton></InputAdornment> }} />
                        {(form.password || pwFocused) && (
                          <Box sx={{ mt: 1 }}>
                            <Box sx={{ height: 4, bgcolor: "#EDEFEF", borderRadius: 2, overflow: "hidden" }}><Box sx={{ height: "100%", width: `${strength.score}%`, bgcolor: strength.color, transition: "width .3s" }} /></Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, color: strength.color, mt: 0.5, minHeight: 16, fontFamily: FONT }}>{strength.label && `Strength: ${strength.label}`}</Typography>
                            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.3, mt: 0.5 }}>
                              {rules.map((r) => (
                                <Box key={r.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 11.5, color: r.ok ? C.green : C.muted, fontFamily: FONT }}>{r.ok ? <CheckCircle sx={{ fontSize: 13 }} /> : <RadioButtonUnchecked sx={{ fontSize: 13 }} />}<span>{r.label}</span></Box>
                              ))}
                            </Box>
                          </Box>
                        )}
                      </Box>
                      <Field fullWidth required size="small" label="Re-enter password" name="confirm" autoComplete="new-password" type={showPassword ? "text" : "password"} value={form.confirm} onChange={onChange} disabled={isLoading} {...fieldProps("confirm")} />
                      <Box sx={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}><input name="hp_field" tabIndex={-1} autoComplete="off" value={form.hp_field} onChange={onChange} /></Box>
                      <Box>
                        <FormControlLabel control={<Checkbox size="small" name="terms" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setMessage(null); }} disabled={isLoading} sx={{ "&.Mui-checked": { color: "#0f172a" } }} />} label={<Typography sx={{ fontSize: 12.5, fontFamily: FONT }}>I agree to <Link to="/terms" target="_blank" rel="noopener" style={linkSx}>Terms</Link> and <Link to="/privacy" target="_blank" rel="noopener" style={linkSx}>Privacy</Link>.</Typography>} />
                        {submitted && errors.terms && <Typography sx={{ color: "#d32f2f", fontSize: 11.5, ml: 4, fontFamily: FONT }}>{errors.terms}</Typography>}
                      </Box>
                      <PrimaryButton fullWidth type="submit" disabled={isLoading}>{isLoading ? <CircularProgress size={20} sx={{ color: C.text }} /> : "Continue - Verify Email"}</PrimaryButton>
                    </Stack>
                  ) : (
                    <Stack spacing={2}>
                      <Typography sx={{ fontSize: 13.5, color: C.muted, fontFamily: FONT }}>Code sent to <strong style={{ color: C.text }}>{maskEmail(email)}</strong></Typography>
                      <Field fullWidth size="small" label={`${OTP_LENGTH}-digit code`} name="otp" value={otp} inputRef={otpFieldRef} autoComplete="one-time-code" disabled={isLoading} inputProps={{ inputMode: "numeric", maxLength: OTP_LENGTH, style: { letterSpacing: 8, textAlign: "center", fontWeight: 800, fontSize: "1.2rem" } }} onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH)); setMessage(null); }} />
                      <PrimaryButton fullWidth type="submit" disabled={isLoading || otp.length !== OTP_LENGTH}>{isLoading ? <CircularProgress size={20} /> : "Verify and create account"}</PrimaryButton>
                      <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                        <TextButton type="button" onClick={() => { setStep("details"); setOtp(""); setMessage(null); }} disabled={isLoading}>Change details</TextButton>
                        <TextButton type="button" onClick={() => requestOtp(true)} disabled={cooldown > 0 || resendsLeft <= 0 || isLoading}>{resendsLeft <= 0 ? "No resends left" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}</TextButton>
                      </Box>
                    </Stack>
                  )}
                </form>

                <Box sx={{ mt: 2.5, textAlign: "center" }}>
                  <Typography sx={{ fontSize: 12.5, color: "#6b7280", fontFamily: FONT }}>Already have account? <Link to="/login" style={{ color: C.link, fontWeight: 700, textDecoration: "none" }}>Sign in</Link></Typography>
                  <Box sx={{ mt: 1.2, display: "flex", justifyContent: "center", gap: 2 }}>
                    <Link to="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 11.5, textDecoration: "none", fontFamily: FONT }}><Home style={{ fontSize: 13 }} /> Home</Link>
                    <Link to="/services" style={{ color: "#64748b", fontSize: 11.5, textDecoration: "none", fontFamily: FONT }}>Services</Link>
                    <Link to="/privacy" style={{ color: "#64748b", fontSize: 11.5, textDecoration: "none", fontFamily: FONT }}>Privacy</Link>
                  </Box>
                </Box>
              </Box>
            )}
            <Box sx={{ px: 3, py: 1.4, bgcolor: "#f9fafb", borderTop: "1px solid #f3f4f6", textAlign: "center" }}>
              <Typography sx={{ fontSize: 10.5, color: "#9ca3af", fontFamily: FONT, lineHeight: 1.5 }}>By creating account, you agree to Quickks Conditions and Privacy Notice.<br />© 2024-2026 Quickks Technologies Pvt Ltd</Typography>
            </Box>
          </Paper>
        </motion.div>
      </Box>
    </Root>
  );
}

export default React.memo(RegisterPage);