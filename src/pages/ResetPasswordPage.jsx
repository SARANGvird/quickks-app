import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaLock, FaEye, FaEyeSlash, FaShieldAlt, FaArrowLeft, FaEnvelope, FaKey } from "react-icons/fa";
// ✅ Import your custom api instance
import api from "../api/api"; 

const ResetPasswordPage = () => {
  const { token } = useParams(); // Grabs OTP from URL if present
  const navigate = useNavigate();
  
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ 
    email: "", 
    otp: token || "", 
    password: "", 
    confirmPassword: "" 
  });
  const [status, setStatus] = useState({ loading: false, success: false, error: "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      return setStatus({ ...status, error: "Passwords do not match" });
    }

    if (formData.password.length < 6) {
      return setStatus({ ...status, error: "Password must be at least 6 characters" });
    }

    setStatus({ ...status, loading: true, error: "" });
    
    try {
      // ✅ Matches Backend: @PostMapping("/api/auth/reset-password")
      const response = await api.post("/api/auth/reset-password", {
        email: formData.email,
        otp: formData.otp,
        password: formData.password
      });

      if (response.status === 200) {
        setStatus({ loading: false, success: true, error: "" });
        // Redirect to login after a short delay
        setTimeout(() => navigate("/login"), 3000);
      }
    } catch (err) {
      // ✅ Standardized error from your api.js interceptor
      setStatus({ 
        loading: false, 
        success: false, 
        error: err.message || "Invalid request. Please try again." 
      });
    }
  };

  return (
    <div style={containerStyle}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        style={cardStyle}
      >
        <div style={iconHeaderStyle}><FaShieldAlt size={32} color="#6366f1" /></div>
        
        <h2 style={titleStyle}>Set New Password</h2>
        <p style={subtitleStyle}>Complete the form below to regain access to your account.</p>

        <AnimatePresence>
          {status.error && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} style={errorBoxStyle}>
              {status.error}
            </motion.div>
          )}
        </AnimatePresence>

        {!status.success ? (
          <form onSubmit={handleSubmit} style={formStyle}>
            {/* Email Input */}
            <div style={inputGroupStyle}>
              <FaEnvelope style={inputIconStyle} />
              <input
                type="email"
                placeholder="Registered Email"
                style={inputStyle}
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* OTP Input (Shown if not in URL) */}
            <div style={inputGroupStyle}>
              <FaKey style={inputIconStyle} />
              <input
                type="text"
                placeholder="Verification OTP"
                style={inputStyle}
                required
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
              />
            </div>

            {/* Password Input */}
            <div style={inputGroupStyle}>
              <FaLock style={inputIconStyle} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                style={inputStyle}
                required
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={eyeBtnStyle}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {/* Confirm Password Input */}
            <div style={inputGroupStyle}>
              <FaLock style={inputIconStyle} />
              <input
                type="password"
                placeholder="Confirm New Password"
                style={inputStyle}
                required
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <button type="submit" disabled={status.loading} style={buttonStyle}>
              {status.loading ? "Updating Security..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} style={{ textAlign: "center" }}>
            <div style={successBadgeStyle}>✓</div>
            <h3 style={{ color: "#fff", marginBottom: "10px" }}>Success!</h3>
            <p style={{ color: "#94a3b8" }}>Your password has been updated. Redirecting to login...</p>
          </motion.div>
        )}

        <div style={footerStyle}>
          <Link to="/login" style={backLinkStyle}>
            <FaArrowLeft size={12} /> Back to Sign In
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

// ------------------- STYLES -------------------
const containerStyle = { 
  minHeight: "100vh", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  background: "radial-gradient(circle at 2% 2%, #0f172a 0%, #020617 100%)", 
  padding: "20px" 
};

const cardStyle = { 
  background: "rgba(30, 41, 59, 0.4)", 
  backdropFilter: "blur(16px)", 
  border: "1px solid rgba(255, 255, 255, 0.1)", 
  borderRadius: "28px", 
  padding: "40px", 
  width: "100%", 
  maxWidth: "420px",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
};

const iconHeaderStyle = { 
  width: "60px", 
  height: "60px", 
  background: "rgba(99, 102, 241, 0.15)", 
  borderRadius: "18px", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  margin: "0 auto 24px auto" 
};

const titleStyle = { color: "#f8fafc", fontSize: "26px", fontWeight: "700", textAlign: "center", margin: "0 0 8px 0" };
const subtitleStyle = { color: "#64748b", fontSize: "14px", textAlign: "center", marginBottom: "32px", lineHeight: "1.5" };
const formStyle = { display: "flex", flexDirection: "column", gap: "18px" };
const inputGroupStyle = { position: "relative", display: "flex", alignItems: "center" };
const inputIconStyle = { position: "absolute", left: "16px", color: "#475569" };

const inputStyle = { 
  width: "100%", 
  padding: "14px 44px", 
  background: "rgba(15, 23, 42, 0.8)", 
  border: "1px solid rgba(255, 255, 255, 0.1)", 
  borderRadius: "14px", 
  color: "#fff", 
  fontSize: "15px",
  outline: "none",
  transition: "all 0.3s focus"
};

const eyeBtnStyle = { position: "absolute", right: "16px", background: "none", border: "none", color: "#64748b", cursor: "pointer" };

const buttonStyle = { 
  background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", 
  color: "#fff", 
  padding: "16px", 
  border: "none", 
  borderRadius: "14px", 
  fontWeight: "600", 
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "10px",
  boxShadow: "0 10px 15px -3px rgba(99, 102, 241, 0.3)"
};

const errorBoxStyle = { 
  background: "rgba(239, 68, 68, 0.1)", 
  color: "#f87171", 
  padding: "12px", 
  borderRadius: "12px", 
  fontSize: "13px", 
  marginBottom: "20px", 
  textAlign: "center", 
  border: "1px solid rgba(239, 68, 68, 0.2)" 
};

const successBadgeStyle = { 
  width: "60px", 
  height: "60px", 
  background: "#10b981", 
  color: "white", 
  borderRadius: "50%", 
  display: "flex", 
  alignItems: "center", 
  justifyContent: "center", 
  fontSize: "28px", 
  margin: "0 auto 20px auto",
  boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)"
};

const footerStyle = { marginTop: "32px", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "20px" };
const backLinkStyle = { color: "#64748b", textDecoration: "none", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "color 0.2s" };

export default ResetPasswordPage;