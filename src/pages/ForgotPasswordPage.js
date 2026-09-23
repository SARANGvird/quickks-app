import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../api/api"; 

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState(null);

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // ✅ Using your custom api instance
      const response = await api.post("/api/auth/forgot-password", { email });
      
      if (response.status === 200) {
        setIsSubmitted(true);
      }
    } catch (err) {
      // Pulls the error message from your api.js interceptor logic
      setError(err.message || "We couldn't find an account with that email.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={overlayStyle} />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={cardStyle}
      >
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 30 }}>
                <div style={iconContainerStyle}>
                  <ShieldCheck size={32} color="#6366f1" />
                </div>
                <h2 style={titleStyle}>Forgot Password?</h2>
                <p style={subtitleStyle}>
                  No worries! Enter your email below and we'll send you a secure link to reset your password.
                </p>
              </div>

              {/* Error Feedback */}
              {error && (
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={errorStyle}>
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleResetRequest} style={formStyle}>
                <div style={{ position: "relative" }}>
                  <Mail size={18} color="#94a3b8" style={inputIconStyle} />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...buttonStyle,
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "Sending link..." : "Send Reset Link"}
                </button>
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center" }}
            >
              <div style={successIconContainerStyle}>
                <CheckCircle2 size={48} color="#10b981" />
              </div>
              <h2 style={titleStyle}>Check your email</h2>
              <p style={subtitleStyle}>
                We've sent a password recovery link to <br />
                <strong style={{ color: "#334155" }}>{email}</strong>
              </p>
              <button onClick={() => navigate("/login")} style={buttonStyle}>
                Return to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div onClick={() => navigate("/login")} style={backButtonStyle}>
          <ArrowLeft size={16} />
          <span>Back to Sign In</span>
        </div>
      </motion.div>
    </div>
  );
};

/* ------------------ STYLES ------------------ */

const containerStyle = {
  backgroundImage: "url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  height: "100vh",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  position: "relative",
  fontFamily: "'Inter', sans-serif",
};

const overlayStyle = {
  position: "absolute",
  inset: 0,
  background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)",
  backdropFilter: "blur(8px)",
};

const cardStyle = {
  zIndex: 2,
  width: "90%",
  maxWidth: 420,
  padding: "40px",
  background: "rgba(255, 255, 255, 1)",
  borderRadius: "24px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
};

const iconContainerStyle = {
  width: "60px",
  height: "60px",
  background: "#f5f3ff",
  borderRadius: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 20px auto",
};

const titleStyle = {
  color: "#1e293b",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 8px 0",
};

const subtitleStyle = {
  color: "#64748b",
  fontSize: "14px",
  lineHeight: "1.6",
  marginBottom: "0",
};

const formStyle = { display: "flex", flexDirection: "column", gap: "20px", marginTop: "30px" };

const inputIconStyle = { position: "absolute", left: "16px", top: "16px" };

const inputStyle = {
  width: "100%",
  padding: "14px 16px 14px 48px",
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  fontSize: "15px",
  boxSizing: "border-box",
  outline: "none",
  transition: "border-color 0.2s",
  backgroundColor: "#f8fafc"
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
  color: "#ffffff",
  border: "none",
  fontWeight: "600",
  fontSize: "15px",
  transition: "all 0.3s",
  boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)",
};

const backButtonStyle = {
  marginTop: "30px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  fontSize: "14px",
  color: "#64748b",
  cursor: "pointer",
  fontWeight: "500",
  transition: "color 0.2s"
};

const errorStyle = { 
  background: "#fef2f2", 
  color: "#dc2626", 
  padding: "12px", 
  borderRadius: "10px", 
  fontSize: "13px", 
  textAlign: "center",
  border: "1px solid #fee2e2",
  marginBottom: "10px"
};

const successIconContainerStyle = {
  width: "80px",
  height: "80px",
  background: "#f0fdf4",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 24px auto",
};

export default ForgotPasswordPage;