import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, ShieldCheck, User, Mail, 
  Smartphone, Lock, CheckCircle2, AlertCircle, ArrowRight, Loader2 
} from "lucide-react";
import api from "../api/api";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "", 
    email: "", 
    phoneNumber: "", 
    password: "", 
    role: "CUSTOMER",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      const numericValue = value.replace(/[^0-9]/g, "").slice(0, 10);
      setForm((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const passwordStrength = useMemo(() => {
    const p = form.password;
    if (!p) return { score: 0, label: "", color: "#cbd5e1" };
    if (p.length < 6) return { score: 33, label: "Weak - Min 6 chars", color: "#ef4444" };
    if (!/[A-Z]/.test(p) || !/[0-9]/.test(p) || !/[!@#$%^&*]/.test(p)) return { score: 66, label: "Medium", color: "#f59e0b" };
    return { score: 100, label: "Strong", color: "#22c55e" };
  }, [form.password]);

  const handleSendOtp = useCallback(async () => {
    if (isLoading) return;
    setMessage({ text: "", type: "" });
    if (!form.name.trim() || !form.email.trim() || !form.phoneNumber.trim() || !form.password) {
      setMessage({ text: "Please fill all fields.", type: "error" });
      return;
    }
    if (form.phoneNumber.length !== 10) {
      setMessage({ text: "Enter valid 10-digit phone number.", type: "error" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setMessage({ text: "Enter valid email address.", type: "error" });
      return;
    }
    setIsLoading(true);
    try {
      await api.post("/auth/send-otp", null, { 
        params: { email: form.email.toLowerCase().trim() } 
      });
      setOtpSent(true);
      setMessage({ text: `OTP sent to ${form.email} - Check inbox & spam!`, type: "success" });
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.response?.data?.error || "Failed to send OTP. Email already exists?";
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [form, isLoading]);

  const handleRegister = useCallback(async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setMessage({ text: "Enter valid 6-digit OTP.", type: "error" });
      return;
    }
    setIsLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const payload = {
        fullName: form.name.trim(),
        email: form.email.toLowerCase().trim(),
        phoneNumber: `+91${form.phoneNumber}`,
        password: form.password,
        role: form.role
      };
      const response = await api.post(`/auth/register`, payload, {
        params: { otp: otp.trim() }
      });
      if (response.status === 201 || response.status === 200) {
        setMessage({ text: "🎉 Registered! Redirecting to Login...", type: "success" });
        setTimeout(() => navigate("/login"), 1500);
      }
    } catch (err) {
      console.error("Registration Error:", err.response?.data);
      const data = err.response?.data;
      let errorMsg = data?.message || "Registration failed. Invalid OTP?";
      if (data?.errors) {
        errorMsg = Object.values(data.errors).join(", ");
      }
      if (err.response?.status === 409) {
        errorMsg = "User already exists with this email/phone!";
      }
      if (err.response?.status === 400 && errorMsg.includes("OTP")) {
        errorMsg = "Invalid or Expired OTP. Please resend OTP.";
      }
      setMessage({ text: errorMsg, type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [otp, form, navigate]);

  return (
    <div style={styles.container}>
      <div style={styles.overlay} />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={styles.card}>
        <div style={styles.header}>
          <div style={styles.brandBadge}>
            <UserPlus size={24} color="#fbbf24" />
          </div>
          <h1 style={styles.brandTitle}>Quickks<span style={{color: "#fbbf24"}}>.</span></h1>
          <div style={styles.stepTrack}>
             <div style={{...styles.stepDot, background: "#fbbf24"}} />
             <div style={{...styles.stepLine, background: otpSent ? "#fbbf24" : "#e2e8f0"}} />
             <div style={{...styles.stepDot, background: otpSent ? "#fbbf24" : "#e2e8f0"}} />
          </div>
          <p style={styles.subTitle}>{otpSent ? "Verify your identity" : "Join our community of professionals"}</p>
        </div>
        <AnimatePresence>
          {message.text && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{...styles.alert, backgroundColor: message.type === "error" ? "#fef2f2" : "#f0fdf4", borderColor: message.type === "error" ? "#fecaca" : "#bbf7d0"}}>
              {message.type === "error" ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#22c55e" />}
              <span style={{color: message.type === "error" ? "#991b1b" : "#166534"}}>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>
        <form onSubmit={handleRegister} style={styles.form}>
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div key="step1" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }} style={styles.stepWrapper}>
                <div style={styles.inputGroup}>
                  <User size={18} style={styles.icon} />
                  <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required style={styles.input} maxLength={50} />
                </div>
                <div style={styles.inputGroup}>
                  <Mail size={18} style={styles.icon} />
                  <input name="email" type="email" placeholder="Email Address" value={form.email} onChange={handleChange} required style={styles.input} />
                </div>
                <div style={styles.inputGroup}>
                  <Smartphone size={18} style={styles.icon} />
                  <span style={styles.prefix}>+91</span>
                  <input name="phoneNumber" placeholder="Phone Number" value={form.phoneNumber} onChange={handleChange} required style={{...styles.input, paddingLeft: "58px"}} maxLength={10} inputMode="numeric" />
                </div>
                <div style={styles.inputGroup}>
                  <Lock size={18} style={styles.icon} />
                  <input name="password" type="password" placeholder="Create Password (Min 8 chars)" value={form.password} onChange={handleChange} required style={styles.input} minLength={8} />
                </div>
                {form.password && (
                  <div style={styles.strengthWrapper}>
                    <div style={styles.strengthTrack}>
                      <div style={{...styles.strengthFill, width: `${passwordStrength.score}%`, backgroundColor: passwordStrength.color}} />
                    </div>
                    <span style={{...styles.strengthLabel, color: passwordStrength.color}}>{passwordStrength.label}</span>
                  </div>
                )}
                <div style={styles.inputGroup}>
                  <ShieldCheck size={18} style={styles.icon} />
                  <select name="role" value={form.role} onChange={handleChange} style={styles.input}>
                    <option value="CUSTOMER">I am a Customer</option>
                    <option value="PROVIDER">I am a Service Provider</option>
                  </select>
                </div>
                <button type="button" onClick={handleSendOtp} disabled={isLoading} style={styles.primaryBtn}>
                  {isLoading ? <Loader2 size={18} className="spin" /> : <>Continue <ArrowRight size={18} /></>}
                </button>
              </motion.div>
            ) : (
              <motion.div key="step2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={styles.stepWrapper}>
                <div style={styles.otpInfo}>Enter 6-digit code sent to<br/><strong>{form.email}</strong></div>
                <div style={styles.inputGroup}>
                  <ShieldCheck size={18} style={styles.icon} />
                  <input placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, "").slice(0,6))} maxLength={6} required style={{...styles.input, letterSpacing: "8px", textAlign: "center", fontWeight: 700, fontSize: "1.2rem"}} inputMode="numeric" />
                </div>
                <button type="submit" disabled={isLoading || otp.length !== 6} style={{...styles.primaryBtn, background: otp.length===6 ? "#16a34a" : "#94a3b8"}}>
                  {isLoading ? <Loader2 size={18} className="spin" /> : "Verify & Complete"}
                </button>
                <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} style={styles.backBtn}>← Edit Details / Resend OTP</button>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        <p style={styles.footerText}>Already have an account? <span onClick={() => navigate("/login")} style={styles.link}>Login</span></p>
      </motion.div>
      <style>{`.spin { animation: rotation 1s linear infinite; } @keyframes rotation { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } input:focus{border-color:#fbbf24 !important; background:#fff !important; box-shadow:0 0 0 3px rgba(251,191,36,0.15) !important;}`}</style>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundImage: "url('https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=1600&q=80')", backgroundSize: "cover", backgroundPosition: "center", position: "relative", fontFamily: "'Inter', sans-serif", padding: "20px" },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.8)", backdropFilter: "blur(10px)" },
  card: { zIndex: 2, width: "100%", maxWidth: 460, padding: "40px", background: "#fff", borderRadius: "28px", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)" },
  header: { textAlign: "center", marginBottom: "30px" },
  brandBadge: { width: 50, height: 50, background: "#fff9eb", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" },
  brandTitle: { fontSize: "1.8rem", fontWeight: 800, color: "#1e293b", margin: 0 },
  subTitle: { fontSize: "0.9rem", color: "#64748b", marginTop: "12px" },
  stepTrack: { display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "10px" },
  stepDot: { width: 8, height: 8, borderRadius: "50%" },
  stepLine: { width: 40, height: 2, borderRadius: 1 },
  alert: { display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderRadius: "12px", marginBottom: "20px", fontSize: "0.85rem", border: "1px solid" },
  form: { display: "flex", flexDirection: "column", gap: "16px" },
  stepWrapper: { display: "flex", flexDirection: "column", gap: "16px" },
  inputGroup: { position: "relative", display: "flex", alignItems: "center" },
  icon: { position: "absolute", left: "16px", color: "#94a3b8", zIndex: 1 },
  prefix: { position: "absolute", left: "48px", color: "#334155", fontWeight: 600, fontSize: "0.9rem", zIndex: 1 },
  input: { width: "100%", padding: "14px 16px 14px 48px", borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "0.95rem", outline: "none", transition: "0.2s", background: "#f8fafc" },
  strengthWrapper: { marginTop: "-8px" },
  strengthTrack: { height: 4, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" },
  strengthFill: { height: "100%", transition: "0.4s ease" },
  strengthLabel: { fontSize: "0.75rem", fontWeight: 600, display: "block", marginTop: "4px" },
  primaryBtn: { padding: "16px", borderRadius: "12px", background: "#fbbf24", color: "#000", border: "none", fontWeight: 700, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", transition: "0.3s" },
  backBtn: { background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline", marginTop: "8px" },
  otpInfo: { textAlign: "center", fontSize: "0.9rem", color: "#64748b", marginBottom: "10px" },
  footerText: { textAlign: "center", marginTop: "24px", fontSize: "0.9rem", color: "#64748b" },
  link: { color: "#d97706", fontWeight: 700, cursor: "pointer", marginLeft: "5px" }
};

export default RegisterPage;