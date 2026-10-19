import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../contexts/AuthContext";
import {
  Box, Typography, TextField, Button, Alert, CircularProgress, InputAdornment, IconButton,
  Checkbox, FormControlLabel, ToggleButton, ToggleButtonGroup, Stack, Divider,
} from "@mui/material";
import { Visibility, VisibilityOff, CheckCircle, RadioButtonUnchecked } from "@mui/icons-material";
import { styled } from "@mui/material/styles";
import api from "../api/api";
import QuickksLogo from "../assets/quickks-logo.png";

const ENDPOINTS = { sendOtp: "/auth/send-otp", register: "/auth/register" };
const ROLE_ROUTES = {
  ADMIN: "/admin/dashboard", SUPER_ADMIN: "/admin/dashboard",
  PROVIDER: "/provider/dashboard", CUSTOMER: "/customer/dashboard",
};
const ROLES = [
  { value: "CUSTOMER", label: "Customer", hint: "Book trusted professionals" },
  { value: "PROVIDER", label: "Service provider", hint: "Receive jobs and grow" },
];
const OTP_LENGTH = 6;
const RESEND_SECONDS = 60;
const MAX_RESENDS = 3;
const MAX_OTP_ATTEMPTS = 5;
const REDIRECT_MS = 2500;
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;

const C = {
  header: "#131921", text: "#0F1111", muted: "#565959", link: "#007185", linkHover: "#C7511F",
  yellow: "#FFD814", yellowHover: "#F7CA00", yellowBorder: "#FCD200", orange: "#FFA41C",
  border: "#D5D9D9", focus: "#E77600", focusRing: "#C8F3FA", green: "#067D62", red: "#B12704",
};
const FONT = '"Amazon Ember", "Segoe UI", Arial, sans-serif';

const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,49}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const normalizeName = (s) => s.replace(/\s+/g, " ").trim();
const maskEmail = (e) => {
  const [user = "", domain = ""] = e.split("@");
  return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 2))}@${domain}`;
};
const cleanPhone = (raw) => {
  let d = raw.replace(/\D/g, "");
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  if (d.length > 10 && d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
};

const TYPO_DOMAINS = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gamil.com": "gmail.com",
  "yahooo.com": "yahoo.com", "hotmial.com": "hotmail.com", "outlok.com": "outlook.com",
};

const passwordRules = (pw) => [
  { id: "len", label: `At least ${PASSWORD_MIN} characters`, ok: pw.length >= PASSWORD_MIN },
  { id: "upper", label: "An uppercase letter", ok: /[A-Z]/.test(pw) },
  { id: "lower", label: "A lowercase letter", ok: /[a-z]/.test(pw) },
  { id: "num", label: "A number", ok: /\d/.test(pw) },
  { id: "sym", label: "A special character", ok: /[^A-Za-z0-9]/.test(pw) },
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
  else if (name.length < 2 || name.length > 100 || !NAME_RE.test(name)) errors.name = "Use 2 to 50 letters. Spaces, . ' - allowed.";
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 254 || !EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
  if (!f.phone) errors.phone = "Enter your mobile number.";
  else if (!PHONE_RE.test(f.phone)) errors.phone = "Enter a valid 10-digit Indian mobile number.";
  const pwErr = passwordProblem(f.password, { email, name });
  if (pwErr) errors.password = pwErr;
  if (!f.confirm) errors.confirm = "Re-enter your password.";
  else if (f.confirm !== f.password) errors.confirm = "Passwords do not match.";
  if (!accepted) errors.terms = "You must accept Terms and Privacy Policy.";
  if (!f.role || !["CUSTOMER", "PROVIDER"].includes(f.role)) errors.role = "Select a role.";
  return errors;
};

const SERVER_FIELD_MAP = { fullName: "name", name: "name", email: "email", phoneNumber: "phone", phone: "phone", password: "password", role: "role", otp: "otp", acceptTerms: "terms" };
const mapServerFields = (errors) => {
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return {};
  return Object.fromEntries(
    Object.entries(errors).filter(([k]) => SERVER_FIELD_MAP[k]).map(([k, v]) => [SERVER_FIELD_MAP[k], Array.isArray(v) ? v.join(", ") : String(v)])
  );
};

const explain = (err, fallback) => {
  const status = err?.response?.status || 0;
  const data = err?.response?.data;
  const serverMsg = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : "";
  let text;
  if (!status) text = "Cannot reach Quickks. Check your connection.";
  else if (status === 400) text = serverMsg || fallback;
  else if (status === 409) text = "Account with this email or mobile already exists.";
  else if (status === 429) text = "Too many attempts. Wait a few minutes.";
  else if (status >= 500) text = "Something went wrong on our side. Try again shortly.";
  else text = serverMsg || fallback;
  return { status, text, serverMsg, fields: mapServerFields(data?.errors || data?.fieldErrors), retryAfter: Number(err?.response?.headers?.["retry-after"]) || 0 };
};

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
});

const TextButton = styled("button")({
  background: "none", border: "none", padding: 0, color: C.link, cursor: "pointer", fontSize: 13, fontFamily: FONT,
  "&:hover": { textDecoration: "underline", color: C.linkHover },
});

const linkSx = { color: C.link, textDecoration: "none" };
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

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimeout(redirectTimerRef.current); };
  }, []);

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
      const e = explain(err, "We could not send the code. Check details and try again.");
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
      const payload = {
        fullName: name,
        email,
        phoneNumber: form.phone,
        password: form.password,
        otp,
        role: ROLES.some((r) => r.value === form.role) ? form.role : "CUSTOMER",
        acceptTerms: accepted,
      };

      await api.post(ENDPOINTS.register, payload);

      if (!mountedRef.current) return;
      setForm((p) => ({ ...p, password: "", confirm: "" }));
      setOtp("");
      setStep("done");
      setMessage(null);
      redirectTimerRef.current = setTimeout(goToLogin, REDIRECT_MS);
    } catch (err) {
      if (!mountedRef.current) return;
      const e = explain(err, "Registration failed. Try again.");
      const otpProblem = Boolean(e.fields.otp) || e.status === 401 || (e.status === 400 && /otp|code/i.test(e.serverMsg));
      if (otpProblem) {
        const attempts = otpAttempts + 1;
        setOtpAttempts(attempts);
        if (attempts >= MAX_OTP_ATTEMPTS) {
          setStep("details"); setOtp("");
          setMessage({ type: "error", text: "Too many incorrect codes. Request new code." });
        } else {
          setMessage({ type: "error", text: `Incorrect or expired code. ${MAX_OTP_ATTEMPTS - attempts} attempts left.` });
        }
      } else if (e.status === 409) {
        setStep("details"); setOtp("");
        setMessage({ type: "error", text: e.text, action: "login" });
      } else if (Object.keys(e.fields).length) {
        setServerErrors(e.fields); setStep("details"); setOtp("");
        setMessage({ type: "error", text: "Correct highlighted fields, then request new code." });
      } else {
        if (e.retryAfter) setCooldown(e.retryAfter);
        setMessage({ type: "error", text: e.text });
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsLoading(false);
    }
  }, [otp, name, email, form.phone, form.password, form.role, accepted, otpAttempts, goToLogin]);

  useEffect(() => {
    if (step !== "otp" || otp.length !== OTP_LENGTH || isLoading || lastTriedRef.current === otp) return;
    verify();
  }, [otp, step, isLoading, verify]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (step === "otp") { verify(); return; }
    if (step !== "details") return;
    setSubmitted(true);
    if (form.hp_field) { setMessage({ type: "error", text: "Something went wrong. Try again." }); return; }
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      setMessage({ type: "error", text: "Fix highlighted fields to continue." });
      document.querySelector(`[name="${firstError === "terms" ? "terms" : firstError}"]`)?.focus();
      return;
    }
    requestOtp(false);
  };

  const stepIndex = step === "details" ? 0 : 1;
  const alertAction = message?.action === "login" ? <Button color="inherit" size="small" onClick={goToLogin} sx={{ textTransform: "none" }}>Sign in</Button> : undefined;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff", fontFamily: FONT, color: C.text, display: "flex", flexDirection: "column", alignItems: "center", px: 2, pt: 3, pb: 4 }}>
      <Helmet><title>Create your account – Quickks</title></Helmet>
      <Box component="button" type="button" onClick={() => navigate("/")} aria-label="Quickks home" sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "1px solid transparent", borderRadius: "2px", p: "4px 8px", mb: 2, cursor: "pointer", "&:focus-visible": { outline: `2px solid ${C.focus}` } }}>
        <Box component="img" src={QuickksLogo} alt="" sx={{ width: 36, height: 36, objectFit: "contain" }} />
        <Typography sx={{ fontWeight: 800, color: C.header, fontSize: 28, letterSpacing: "-0.5px", fontFamily: FONT }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
      </Box>
      <Box sx={{ width: "100%", maxWidth: 420, border: `1px solid ${C.border}`, borderRadius: "8px", p: { xs: 2.5, sm: 3 } }}>
        {step === "done" ? (
          <Box sx={{ textAlign: "center", py: 2 }} role="status">
            <CheckCircle sx={{ fontSize: 56, color: C.green }} />
            <Typography component="h1" sx={{ fontSize: 24, fontWeight: 500, mt: 1, mb: 1, fontFamily: FONT }}>Your account is ready</Typography>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, fontFamily: FONT }}>
              {form.role === "PROVIDER" ? "Sign in to complete provider profile. Provider accounts go through verification." : "Sign in to book your first service."}
            </Typography>
            <PrimaryButton fullWidth onClick={goToLogin}>Continue to sign in</PrimaryButton>
          </Box>
        ) : (
          <>
            <Typography component="h1" sx={{ fontSize: 28, fontWeight: 400, mb: 2, fontFamily: FONT }}>Create account</Typography>
            <Box component="ol" aria-label="Progress" sx={{ listStyle: "none", m: 0, p: 0, display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
              {["Your details", "Verify email"].map((label, i) => (
                <React.Fragment key={label}>
                  <Box component="li" aria-current={i === stepIndex ? "step" : undefined} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Box sx={{ width: 22, height: 22, borderRadius: "50%", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: i <= stepIndex ? C.header : "#E7E7E7", color: i <= stepIndex ? "#fff" : C.muted }}>{i + 1}</Box>
                    <Typography sx={{ fontSize: 13, fontWeight: i === stepIndex ? 700 : 400, color: i === stepIndex ? C.text : C.muted, fontFamily: FONT }}>{label}</Typography>
                  </Box>
                  {i === 0 && <Box sx={{ flex: 1, height: 2, bgcolor: stepIndex > 0 ? C.header : "#E7E7E7" }} />}
                </React.Fragment>
              ))}
            </Box>
            <Box aria-live="polite">
              {message && <Alert severity={message.type} action={alertAction} sx={{ mb: 2, borderRadius: 1 }}>{message.text}</Alert>}
            </Box>
            <form onSubmit={handleSubmit} noValidate>
              {step === "details" ? (
                <Stack spacing={2}>
                  <Field fullWidth required size="small" label="Full name" name="name" autoComplete="name" value={form.name} inputRef={firstFieldRef}
                    onChange={onChange} disabled={isLoading} inputProps={{ maxLength: 100 }} {...fieldProps("name")} />
                  <Box>
                    <Field fullWidth required size="small" label="Email address" name="email" type="email" autoComplete="email" value={form.email}
                      onChange={onChange} disabled={isLoading} inputProps={{ maxLength: 254 }} {...fieldProps("email")} />
                    {emailSuggestion && (
                      <Typography sx={{ fontSize: 12, mt: 0.5, fontFamily: FONT }}>
                        Did you mean <TextButton type="button" onClick={() => setField("email", emailSuggestion)}>{emailSuggestion}</TextButton>?
                      </Typography>
                    )}
                  </Box>
                  <Field fullWidth required size="small" label="Mobile number" name="phone" type="tel" autoComplete="tel-national" value={form.phone}
                    onChange={onChange} disabled={isLoading} inputProps={{ inputMode: "numeric", maxLength: 10 }}
                    InputProps={{ startAdornment: <InputAdornment position="start">+91</InputAdornment> }} {...fieldProps("phone")} />
                  <Box>
                    <Typography id="role-label" sx={{ fontSize: 13, mb: 0.75, fontFamily: FONT }}>I want to join as</Typography>
                    <ToggleButtonGroup exclusive fullWidth size="small" value={form.role} aria-labelledby="role-label" disabled={isLoading}
                      onChange={(_, v) => v && setField("role", v)}>
                      {ROLES.map((r) => (
                        <ToggleButton key={r.value} value={r.value} sx={{ textTransform: "none", flexDirection: "column", alignItems: "flex-start", py: 1, px: 1.5, fontFamily: FONT, "&.Mui-selected": { borderColor: C.focus, bgcolor: "#FFF8E7" } }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700, fontFamily: FONT }}>{r.label}</Typography>
                          <Typography sx={{ fontSize: 11, color: C.muted, fontFamily: FONT, textAlign: "left" }}>{r.hint}</Typography>
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </Box>
                  <Box>
                    <Field fullWidth required size="small" label="Password" name="password" autoComplete="new-password" type={showPassword ? "text" : "password"} value={form.password}
                      onChange={onChange} disabled={isLoading} onKeyUp={onPasswordKey} onKeyDown={onPasswordKey}
                      onFocus={() => setPwFocused(true)} inputProps={{ "aria-describedby": "pw-help" }}
                      {...fieldProps("password")}
                      helperText={visibleError("password") || (capsOn ? "Caps Lock is on" : undefined)}
                      InputProps={{ endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" edge="end" onClick={() => setShowPassword((s) => !s)}>
                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </InputAdornment>
                      ) }} />
                    {(form.password || pwFocused) && (
                      <Box id="pw-help" sx={{ mt: 1 }}>
                        <Box sx={{ height: 4, bgcolor: "#EDEFEF", borderRadius: 2, overflow: "hidden" }}>
                          <Box sx={{ height: "100%", width: `${strength.score}%`, bgcolor: strength.color, transition: "width .3s" }} />
                        </Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: strength.color, mt: 0.5, minHeight: 18, fontFamily: FONT }}>{strength.label && `Password strength: ${strength.label}`}</Typography>
                        <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.25 }}>
                          {rules.map((r) => (
                            <Box component="li" key={r.id} sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12, color: r.ok ? C.green : C.muted, fontFamily: FONT }}>
                              {r.ok ? <CheckCircle sx={{ fontSize: 14 }} /> : <RadioButtonUnchecked sx={{ fontSize: 14 }} />}
                              <span>{r.label}</span>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </Box>
                  <Field fullWidth required size="small" label="Re-enter password" name="confirm" autoComplete="new-password" type={showPassword ? "text" : "password"} value={form.confirm}
                    onChange={onChange} disabled={isLoading} {...fieldProps("confirm")} />
                  <Box aria-hidden="true" sx={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                    <label>Leave empty<input name="hp_field" tabIndex={-1} autoComplete="off" value={form.hp_field} onChange={onChange} /></label>
                  </Box>
                  <Box>
                    <FormControlLabel control={<Checkbox size="small" name="terms" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setMessage(null); }} disabled={isLoading} />}
                      label={<Typography sx={{ fontSize: 13, fontFamily: FONT }}>I agree to <Link to="/terms" target="_blank" rel="noopener" style={linkSx}>Terms</Link> and <Link to="/privacy" target="_blank" rel="noopener" style={linkSx}>Privacy Policy</Link>.</Typography>} />
                    {submitted && errors.terms && <Typography role="alert" sx={{ color: "#d32f2f", fontSize: 12, ml: 1.75, fontFamily: FONT }}>{errors.terms}</Typography>}
                  </Box>
                  <PrimaryButton fullWidth type="submit" disabled={isLoading}>{isLoading ? <CircularProgress size={22} sx={{ color: C.text }} /> : "Continue"}</PrimaryButton>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Typography sx={{ fontSize: 14, color: C.muted, fontFamily: FONT }}>Enter code sent to <strong style={{ color: C.text }}>{maskEmail(email)}</strong>.</Typography>
                  <Field fullWidth size="small" label={`${OTP_LENGTH}-digit code`} name="otp" value={otp} inputRef={otpFieldRef}
                    autoComplete="one-time-code" disabled={isLoading}
                    inputProps={{ inputMode: "numeric", maxLength: OTP_LENGTH, style: { letterSpacing: 8, textAlign: "center", fontWeight: 700, fontSize: "1.2rem" } }}
                    onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, OTP_LENGTH)); setMessage(null); }} />
                  <PrimaryButton fullWidth type="submit" disabled={isLoading || otp.length !== OTP_LENGTH}>
                    {isLoading ? <CircularProgress size={22} sx={{ color: C.text }} /> : "Verify and create account"}
                  </PrimaryButton>
                  <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                    <TextButton type="button" onClick={() => { setStep("details"); setOtp(""); setMessage(null); }} disabled={isLoading}>Change email or details</TextButton>
                    <TextButton type="button" onClick={() => requestOtp(true)} disabled={cooldown > 0 || resendsLeft <= 0 || isLoading}>
                      {resendsLeft <= 0 ? "No resends left" : cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
                    </TextButton>
                  </Box>
                </Stack>
              )}
            </form>
          </>
        )}
      </Box>
    </Box>
  );
}

export default React.memo(RegisterPage);