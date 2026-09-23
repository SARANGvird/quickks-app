// src/pages/LoginPage.js
// 🚀 QUICKKS LOGIN PAGE - CONNECTION FIXED v4.0

import React, { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
  useTheme,
  Grid,
  Tooltip,
  Fade,
  Chip,
  Stack,
} from "@mui/material";
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  ArrowForward,
  Google,
  Facebook,
  Apple,
  Shield,
  Home,
  Phone,
  Smartphone,
  Login as LoginIcon,
  Verified,
  Security,
  Speed,
  SupportAgent,
  CheckCircle,
  Warning,
  Apple as AppleIcon,
  Android,
  QrCode,
} from "@mui/icons-material";
import { styled, keyframes } from "@mui/material/styles";
import api, { tokenManager } from "../api/api";

// ==========================================================
// 🔥 ANIMATIONS
// ==========================================================

const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-25px) rotate(3deg); }
`;

const floatAnimationReverse = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(25px) rotate(-3deg); }
`;

const pulseRing = keyframes`
  0% { transform: scale(0.8); opacity: 0.8; }
  100% { transform: scale(1.8); opacity: 0; }
`;

const gradientMove = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
`;

// ==========================================================
// 🔥 STYLED COMPONENTS
// ==========================================================

const LoginContainer = styled(Box)(({ theme }) => ({
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(-45deg, #0f172a, #1e293b, #0f172a, #1e293b)",
  backgroundSize: "400% 400%",
  animation: `${gradientMove} 20s ease infinite`,
  padding: theme.spacing(2),
  position: "relative",
  overflow: "hidden",
}));

const AnimatedBackground = styled(Box)(({ theme }) => ({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  "& .orb": {
    position: "absolute",
    borderRadius: "50%",
    filter: "blur(100px)",
    opacity: 0.25,
  },
  "& .orb-1": {
    top: "-15%",
    right: "-5%",
    width: "500px",
    height: "500px",
    background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
    animation: `${floatAnimation} 10s ease-in-out infinite`,
  },
  "& .orb-2": {
    bottom: "-15%",
    left: "-5%",
    width: "450px",
    height: "450px",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    animation: `${floatAnimationReverse} 12s ease-in-out infinite`,
  },
  "& .orb-3": {
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "600px",
    height: "600px",
    background: "radial-gradient(circle, rgba(251, 191, 36, 0.05) 0%, transparent 70%)",
    animation: `${pulseRing} 4s ease-out infinite`,
  },
}));

const LoginCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(5),
  borderRadius: theme.spacing(5),
  maxWidth: 520,
  width: "100%",
  background: "rgba(255,255,255,0.98)",
  backdropFilter: "blur(30px)",
  position: "relative",
  zIndex: 2,
  boxShadow: "0 40px 100px rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.1)",
  animation: `${scaleIn} 0.6s ease-out`,
  [theme.breakpoints.down("sm")]: {
    padding: theme.spacing(3),
    borderRadius: theme.spacing(3),
  },
}));

const GradientButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(2),
  borderRadius: "20px",
  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
  color: "#0f172a",
  fontWeight: 700,
  fontSize: "1.05rem",
  textTransform: "none",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    transform: "translateY(-3px) scale(1.02)",
    boxShadow: "0 15px 40px rgba(251, 191, 36, 0.4)",
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
  },
  "&:disabled": {
    background: "#e2e8f0",
    color: "#94a3b8",
  },
}));

const StyledTextField = styled(TextField)(({ theme }) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "18px",
    background: "#f8fafc",
    transition: "all 0.3s ease",
    "&:hover": {
      background: "#ffffff",
      "& fieldset": {
        borderColor: "#fbbf24",
        borderWidth: "2px",
      },
    },
    "&.Mui-focused": {
      background: "#ffffff",
      "& fieldset": {
        borderColor: "#fbbf24",
        borderWidth: "2px",
        boxShadow: "0 0 0 6px rgba(251, 191, 36, 0.1)",
      },
    },
    "& fieldset": {
      borderColor: "#e2e8f0",
      transition: "all 0.3s ease",
    },
  },
  "& .MuiInputLabel-root": {
    color: "#64748b",
    fontWeight: 500,
    "&.Mui-focused": {
      color: "#fbbf24",
    },
  },
}));

const SocialButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(1.5),
  borderRadius: "16px",
  border: "2px solid #e2e8f0",
  color: "#64748b",
  fontWeight: 600,
  textTransform: "none",
  transition: "all 0.3s ease",
  "&:hover": {
    borderColor: "#fbbf24",
    background: "rgba(251, 191, 36, 0.05)",
    transform: "translateY(-2px)",
  },
}));

const PulseDot = styled(Box)(({ theme }) => ({
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: "#22c55e",
  display: "inline-block",
  marginRight: 10,
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    inset: -5,
    borderRadius: "50%",
    background: "rgba(34, 197, 94, 0.3)",
    animation: `${pulseRing} 2s ease-out infinite`,
  },
}));

const FeatureBadge = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  padding: theme.spacing(0.75, 1.5),
  borderRadius: "100px",
  background: "rgba(251, 191, 36, 0.1)",
  border: "1px solid rgba(251, 191, 36, 0.2)",
  "&:hover": {
    background: "rgba(251, 191, 36, 0.2)",
    transform: "translateY(-2px)",
    transition: "all 0.3s ease",
  },
}));

// ==========================================================
// ✅ MAIN COMPONENT
// ==========================================================

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading: authLoading, isAuthenticated } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ==========================================================
  // ✅ STATE
  // ==========================================================
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem("rememberMe") === "true"
  );
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

  // ==========================================================
  // ✅ REFS
  // ==========================================================
  const timerRef = useRef(null);
  const inputRef = useRef(null);

  // ==========================================================
  // ✅ EFFECTS
  // ==========================================================
  useEffect(() => {
    localStorage.setItem("rememberMe", rememberMe);
  }, [rememberMe]);

  useEffect(() => {
    if (otpTimer > 0) {
      timerRef.current = setTimeout(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [otpTimer]);

  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 600);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  // ==========================================================
  // ✅ FIXED: Server Health Check - Direct API call
  // ==========================================================
  useEffect(() => {
    const checkServer = async () => {
      setCheckingServer(true);
      
      try {
        console.log('🔍 Checking server connection...');
        console.log('🔗 API Base URL:', api.defaults.baseURL);
        
        // ✅ Try multiple health endpoints
        const endpoints = [
          '/auth/health',
          '/actuator/health', 
          '/health',
          '/auth/ping'
        ];
        
        let connected = false;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`📡 Trying ${endpoint}...`);
            const response = await api.get(endpoint, { 
              timeout: 3000,
              validateStatus: (status) => status < 500 
            });
            
            if (response.status >= 200 && response.status < 400) {
              console.log(`✅ Server connected via ${endpoint}`);
              connected = true;
              break;
            }
          } catch (e) {
            console.log(`❌ ${endpoint} failed:`, e.message);
            continue;
          }
        }
        
        setServerStatus(connected);
        setCheckingServer(false);
        
        if (!connected) {
          console.warn('⚠️ All health checks failed - Server offline');
        }
        
      } catch (error) {
        console.error('❌ Server health check error:', error);
        setServerStatus(false);
        setCheckingServer(false);
      }
    };
    
    // ✅ Delay to allow server to start
    const timer = setTimeout(checkServer, 1500);
    return () => clearTimeout(timer);
  }, []);

  // ==========================================================
  // ✅ VALIDATION FUNCTIONS
  // ==========================================================
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return "Email is required";
    if (!re.test(email)) return "Please enter a valid email address";
    return "";
  };

  const validatePassword = (password) => {
    if (!password) return "Password is required";
    if (password.length < 6) return "Password must be at least 6 characters";
    return "";
  };

  const validatePhone = (phone) => {
    const re = /^[6-9]\d{9}$/;
    if (!phone) return "Phone number is required";
    if (!re.test(phone)) return "Enter a valid 10-digit Indian mobile number";
    return "";
  };

  // ==========================================================
  // ✅ LOGIN FUNCTIONS
  // ==========================================================
  const loginWithPhone = async (phoneNumber, otpCode) => {
    try {
      const response = await api.post("/auth/phone-login", {
        phone: phoneNumber,
        otp: otpCode,
      });

      const data = response.data?.data || response.data;
      const token = data?.token || data?.accessToken;

      if (token) {
        tokenManager.setTokens(token, data?.refreshToken);
        
        const userData = {
          id: data.userId || data.id,
          name: data.name || data.fullName || "User",
          email: data.email || "",
          role: data.role || "CUSTOMER",
          phone: phoneNumber,
          ...data,
        };
        tokenManager.setUser(userData);

        return {
          success: true,
          token,
          user: userData,
          data,
        };
      }

      return {
        success: false,
        error: data.message || "Phone login failed",
      };
    } catch (error) {
      console.error("Phone login error:", error);
      return {
        success: false,
        error: error.response?.data?.message || "Phone login failed. Please try again.",
      };
    }
  };

  // ==========================================================
  // ✅ HANDLERS
  // ==========================================================
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setError(null);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError(null);
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 10);
    setPhone(value);
    setError(null);
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
    setError(null);
  };

  const handleSendOtp = async () => {
    const phoneError = validatePhone(phone);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post("/auth/send-otp", { phone });
      const data = response.data?.data || response.data;

      if (response.status === 200 || response.status === 201) {
        setOtpSent(true);
        setOtpTimer(60);
        setSuccess(data.message || "OTP sent to your phone number");
      } else {
        setError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      setError(err.response?.data?.message || "Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (loginMode === "EMAIL") {
      const emailError = validateEmail(email);
      const passwordError = validatePassword(password);

      if (emailError) {
        setError(emailError);
        return;
      }
      if (passwordError) {
        setError(passwordError);
        return;
      }
    } else {
      if (!otp || otp.length < 6) {
        setError("Please enter the 6-digit OTP");
        return;
      }
    }

    setIsLoading(true);

    try {
      let result;

      if (loginMode === "EMAIL") {
        result = await login(email, password, rememberMe);
      } else {
        result = await loginWithPhone(phone, otp);
      }

      if (!result || !result.success) {
        setError(result?.error || "Login failed");
        return;
      }

      setSuccess("Welcome back! Redirecting...");

      const userRole = result.data?.role || 
                       result.user?.role || 
                       result.auth?.role || 
                       "CUSTOMER";

      const routes = {
        ADMIN: "/dashboard/admin",
        SUPER_ADMIN: "/dashboard/admin",
        PROVIDER: "/dashboard/provider",
        CUSTOMER: "/dashboard",
      };

      const redirectPath = routes[userRole] || "/dashboard";

      setTimeout(() => {
        navigate(redirectPath);
      }, 1200);
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // ✅ RENDER SERVER STATUS
  // ==========================================================
  const renderServerStatus = () => {
    if (checkingServer) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={14} sx={{ color: '#fbbf24' }} />
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
            Connecting...
          </Typography>
        </Box>
      );
    }
    
    if (serverStatus === true) {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <PulseDot />
          <Typography variant="caption" sx={{ color: 'white', fontWeight: 500 }}>
            Server Connected
          </Typography>
          <Chip
            size="small"
            label="Live"
            sx={{
              background: 'rgba(34, 197, 94, 0.2)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              height: 22,
              '& .MuiChip-label': { fontSize: 10, fontWeight: 600 },
            }}
          />
        </Box>
      );
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#ef4444',
            animation: `${pulseRing} 2s ease-out infinite`,
          }}
        />
        <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 500 }}>
          ⚠️ Server Offline
        </Typography>
        <Button
          size="small"
          onClick={() => window.location.reload()}
          sx={{
            color: '#fbbf24',
            fontSize: '0.65rem',
            textTransform: 'none',
            fontWeight: 600,
            minWidth: 'auto',
            padding: '2px 8px',
            '&:hover': {
              background: 'rgba(251, 191, 36, 0.1)',
            },
          }}
        >
          Retry
        </Button>
      </Box>
    );
  };

  // ==========================================================
  // ✅ RENDER
  // ==========================================================

  return (
    <LoginContainer>
      {/* ========================================================== */}
      {/* 🔥 ANIMATED BACKGROUND */}
      {/* ========================================================== */}
      <AnimatedBackground>
        <Box className="orb orb-1" />
        <Box className="orb orb-2" />
        <Box className="orb orb-3" />
      </AnimatedBackground>

      {/* ========================================================== */}
      {/* 🔥 BACK TO HOME */}
      {/* ========================================================== */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          position: "fixed",
          top: 24,
          left: 24,
          zIndex: 10,
        }}
      >
        <Tooltip title="Back to Home">
          <IconButton
            onClick={() => navigate("/")}
            sx={{
              color: "white",
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.1)",
              "&:hover": {
                background: "rgba(255,255,255,0.2)",
                transform: "scale(1.05)",
              },
              transition: "all 0.3s ease",
            }}
          >
            <Home />
          </IconButton>
        </Tooltip>
      </motion.div>

      {/* ========================================================== */}
      {/* 🔥 TRUST BADGE - FIXED */}
      {/* ========================================================== */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        style={{
          position: "fixed",
          top: 24,
          right: 24,
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            background: "rgba(255,255,255,0.1)",
            backdropFilter: "blur(10px)",
            px: 2.5,
            py: 1.5,
            borderRadius: 100,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {renderServerStatus()}
        </Box>
      </motion.div>

      {/* ========================================================== */}
      {/* 🔥 SERVER OFFLINE ALERT - FIXED */}
      {/* ========================================================== */}
      {serverStatus === false && !checkingServer && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "fixed",
            top: 90,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10,
            width: '90%',
            maxWidth: 500,
          }}
        >
          <Alert
            severity="warning"
            icon={<Warning />}
            sx={{
              borderRadius: 3,
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => window.location.reload()}
                sx={{ fontWeight: 600 }}
              >
                Retry
              </Button>
            }
          >
            Cannot connect to server. Please ensure backend is running on port 8081.
          </Alert>
        </motion.div>
      )}

      {/* ========================================================== */}
      {/* 🔥 LOGIN CARD */}
      {/* ========================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
          type: "spring",
          stiffness: 100,
        }}
        style={{
          width: "100%",
          maxWidth: 520,
          zIndex: 2,
        }}
      >
        <LoginCard>
          {/* ========================================================== */}
          {/* 🔥 HEADER */}
          {/* ========================================================== */}
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                delay: 0.2,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
            >
              <Box
                sx={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #fef3c7, #fbbf24)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                  position: "relative",
                  boxShadow: "0 10px 40px rgba(251, 191, 36, 0.3)",
                }}
              >
                <LoginIcon sx={{ fontSize: 42, color: "#0f172a" }} />
                <Box
                  sx={{
                    position: "absolute",
                    inset: -6,
                    borderRadius: "50%",
                    border: "2px solid rgba(251, 191, 36, 0.3)",
                    animation: `${pulseRing} 2s ease-out infinite`,
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: -12,
                    borderRadius: "50%",
                    border: "2px solid rgba(251, 191, 36, 0.15)",
                    animation: `${pulseRing} 2.5s ease-out infinite 0.5s`,
                  }}
                />
              </Box>
            </motion.div>

            <Typography
              variant="h3"
              sx={{
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                "& span": { color: "#fbbf24" },
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
              }}
            >
              Quickks<span>.</span>
            </Typography>

            <Typography
              variant="body1"
              sx={{
                color: "#64748b",
                mt: 1.5,
                fontWeight: 400,
                maxWidth: 320,
                mx: "auto",
              }}
            >
              {loginMode === "EMAIL"
                ? "Welcome back! Sign in to continue your journey"
                : "Sign in securely with your phone number"}
            </Typography>

            {/* 🔥 Status Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 1.5,
                  mt: 2.5,
                  px: 3,
                  py: 1,
                  borderRadius: 100,
                  background: "rgba(34, 197, 94, 0.08)",
                  border: "1px solid rgba(34, 197, 94, 0.15)",
                }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#22c55e",
                    animation: `${pulseRing} 2s ease-out infinite`,
                  }}
                />
                <Typography variant="caption" sx={{ color: "#22c55e", fontWeight: 600 }}>
                  Secure • 256-bit encryption
                </Typography>
              </Box>
            </motion.div>
          </Box>

          {/* ========================================================== */}
          {/* 🔥 LOGIN MODE TOGGLE */}
          {/* ========================================================== */}
          <Box
            sx={{
              display: "flex",
              bgcolor: "#f1f5f9",
              p: 0.5,
              borderRadius: 3,
              mb: 3,
            }}
          >
            {["EMAIL", "PHONE"].map((mode) => (
              <Button
                key={mode}
                onClick={() => {
                  setLoginMode(mode);
                  setError(null);
                  setSuccess(null);
                  setOtpSent(false);
                  setOtp("");
                }}
                sx={{
                  flex: 1,
                  py: 1.5,
                  borderRadius: 2.5,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textTransform: "none",
                  color: loginMode === mode ? "#0f172a" : "#64748b",
                  background: loginMode === mode ? "white" : "transparent",
                  boxShadow: loginMode === mode ? "0 4px 15px rgba(0,0,0,0.08)" : "none",
                  "&:hover": {
                    background: loginMode === mode ? "white" : "rgba(255,255,255,0.5)",
                  },
                  transition: "all 0.3s ease",
                }}
              >
                {mode === "EMAIL" ? (
                  <Email sx={{ fontSize: 18, mr: 1 }} />
                ) : (
                  <Smartphone sx={{ fontSize: 18, mr: 1 }} />
                )}
                {mode === "EMAIL" ? "Email" : "Phone OTP"}
              </Button>
            ))}
          </Box>

          {/* ========================================================== */}
          {/* 🔥 FORM */}
          {/* ========================================================== */}
          <form onSubmit={handleLogin}>
            {/* 🔥 Error / Success Messages */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    severity="error"
                    icon={<Warning />}
                    sx={{
                      mb: 3,
                      borderRadius: 3,
                      "& .MuiAlert-icon": { color: "#ef4444" },
                    }}
                  >
                    {error}
                  </Alert>
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -10 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <Alert
                    severity="success"
                    icon={<CheckCircle />}
                    sx={{
                      mb: 3,
                      borderRadius: 3,
                      "& .MuiAlert-icon": { color: "#22c55e" },
                    }}
                  >
                    {success}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 🔥 EMAIL MODE */}
            {loginMode === "EMAIL" && (
              <Fade in={loginMode === "EMAIL"} timeout={300}>
                <Box>
                  <StyledTextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    required
                    disabled={isLoading || authLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: "#94a3b8" }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2.5 }}
                    inputRef={inputRef}
                  />

                  <StyledTextField
                    fullWidth
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading || authLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: "#94a3b8" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: "#94a3b8" }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />
                </Box>
              </Fade>
            )}

            {/* 🔥 PHONE MODE */}
            {loginMode === "PHONE" && (
              <Fade in={loginMode === "PHONE"} timeout={300}>
                <Box>
                  <StyledTextField
                    fullWidth
                    label="Phone Number"
                    type="tel"
                    placeholder="9876543210"
                    value={phone}
                    onChange={handlePhoneChange}
                    required
                    disabled={isLoading || authLoading || otpSent}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: "#94a3b8" }} />
                          <Typography sx={{ ml: 1, color: "#64748b", fontWeight: 500 }}>
                            +91
                          </Typography>
                        </InputAdornment>
                      ),
                    }}
                    sx={{ mb: 2 }}
                  />

                  {!otpSent ? (
                    <GradientButton
                      fullWidth
                      variant="contained"
                      onClick={handleSendOtp}
                      disabled={isLoading || authLoading || !phone}
                      sx={{ mb: 2 }}
                    >
                      {isLoading ? (
                        <CircularProgress size={24} sx={{ color: "#0f172a" }} />
                      ) : (
                        <>
                          Send OTP
                          <ArrowForward sx={{ ml: 1 }} />
                        </>
                      )}
                    </GradientButton>
                  ) : (
                    <>
                      <StyledTextField
                        fullWidth
                        label="Enter OTP"
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={handleOtpChange}
                        required
                        disabled={isLoading || authLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Smartphone sx={{ color: "#94a3b8" }} />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                                {otpTimer > 0 ? `${otpTimer}s` : "Expired"}
                              </Typography>
                            </InputAdornment>
                          ),
                        }}
                        sx={{ mb: 2 }}
                      />

                      {otpTimer === 0 && (
                        <Button
                          fullWidth
                          onClick={handleSendOtp}
                          sx={{
                            color: "#fbbf24",
                            fontWeight: 600,
                            textTransform: "none",
                            mb: 2,
                            "&:hover": {
                              background: "rgba(251, 191, 36, 0.1)",
                            },
                          }}
                        >
                          Resend OTP
                        </Button>
                      )}
                    </>
                  )}
                </Box>
              </Fade>
            )}

            {/* 🔥 FORM OPTIONS */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: "#94a3b8",
                      "&.Mui-checked": {
                        color: "#fbbf24",
                      },
                    }}
                  />
                }
                label="Remember me"
                sx={{
                  "& .MuiTypography-root": {
                    color: "#64748b",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                  },
                }}
              />

              <Link
                to="/forgot-password"
                style={{
                  color: "#fbbf24",
                  textDecoration: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.target.style.color = "#fbbf24")}
              >
                Forgot Password?
              </Link>
            </Box>

            {/* 🔥 SUBMIT BUTTON */}
            <GradientButton
              fullWidth
              type="submit"
              variant="contained"
              disabled={
                isLoading ||
                authLoading ||
                (loginMode === "PHONE" && !otpSent) ||
                (loginMode === "PHONE" && otpSent && otp.length < 6)
              }
            >
              {isLoading || authLoading ? (
                <CircularProgress size={24} sx={{ color: "#0f172a" }} />
              ) : (
                <>
                  Sign In
                  <ArrowForward sx={{ ml: 1 }} />
                </>
              )}
            </GradientButton>
          </form>

          {/* ========================================================== */}
          {/* 🔥 DIVIDER */}
          {/* ========================================================== */}
          <Box sx={{ my: 3.5, display: "flex", alignItems: "center", gap: 2 }}>
            <Divider sx={{ flex: 1 }} />
            <Typography variant="caption" sx={{ color: "#94a3b8", whiteSpace: "nowrap", fontWeight: 500 }}>
              Or continue with
            </Typography>
            <Divider sx={{ flex: 1 }} />
          </Box>

          {/* ========================================================== */}
          {/* 🔥 SOCIAL LOGIN */}
          {/* ========================================================== */}
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <SocialButton fullWidth startIcon={<Google />}>
                Google
              </SocialButton>
            </Grid>
            <Grid item xs={4}>
              <SocialButton fullWidth startIcon={<Facebook />}>
                Facebook
              </SocialButton>
            </Grid>
            <Grid item xs={4}>
              <SocialButton fullWidth startIcon={<Apple />}>
                Apple
              </SocialButton>
            </Grid>
          </Grid>

          {/* ========================================================== */}
          {/* 🔥 SIGN UP LINK */}
          {/* ========================================================== */}
          <Box sx={{ textAlign: "center", mt: 3.5 }}>
            <Typography variant="body2" sx={{ color: "#64748b" }}>
              Don't have an account?{" "}
              <Link
                to="/register"
                style={{
                  color: "#fbbf24",
                  fontWeight: 700,
                  textDecoration: "none",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.target.style.color = "#f59e0b")}
                onMouseLeave={(e) => (e.target.style.color = "#fbbf24")}
              >
                Create one for free
              </Link>
            </Typography>
          </Box>

          {/* ========================================================== */}
          {/* 🔥 FEATURES BADGE */}
          {/* ========================================================== */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: { xs: 2, sm: 3 },
                mt: 3.5,
                pt: 3.5,
                borderTop: "1px solid #f1f5f9",
                flexWrap: "wrap",
              }}
            >
              <FeatureBadge>
                <Shield sx={{ fontSize: 16, color: "#fbbf24" }} />
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                  Secure
                </Typography>
              </FeatureBadge>
              <FeatureBadge>
                <Speed sx={{ fontSize: 16, color: "#fbbf24" }} />
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                  Fast
                </Typography>
              </FeatureBadge>
              <FeatureBadge>
                <Verified sx={{ fontSize: 16, color: "#fbbf24" }} />
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                  Trusted
                </Typography>
              </FeatureBadge>
              <FeatureBadge>
                <SupportAgent sx={{ fontSize: 16, color: "#fbbf24" }} />
                <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 500 }}>
                  24/7 Support
                </Typography>
              </FeatureBadge>
            </Box>
          </motion.div>

          {/* ========================================================== */}
          {/* 🔥 APP DOWNLOAD BADGE */}
          {/* ========================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Box
              sx={{
                mt: 3,
                pt: 2.5,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 500 }}>
                Get the app:
              </Typography>
              <Stack direction="row" spacing={1}>
                <IconButton
                  size="small"
                  sx={{
                    background: "#0f172a",
                    color: "white",
                    "&:hover": { background: "#1e293b", transform: "scale(1.05)" },
                    transition: "all 0.3s ease",
                  }}
                >
                  <AppleIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{
                    background: "#0f172a",
                    color: "white",
                    "&:hover": { background: "#1e293b", transform: "scale(1.05)" },
                    transition: "all 0.3s ease",
                  }}
                >
                  <Android fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{
                    background: "#0f172a",
                    color: "white",
                    "&:hover": { background: "#1e293b", transform: "scale(1.05)" },
                    transition: "all 0.3s ease",
                  }}
                >
                  <QrCode fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </motion.div>

          {/* ========================================================== */}
          {/* 🔥 FOOTER */}
          {/* ========================================================== */}
          <Box
            sx={{
              mt: 2.5,
              pt: 2,
              borderTop: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              © 2026 Quickks. All rights reserved.
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Typography
                variant="caption"
                component="a"
                href="#"
                sx={{ color: "#94a3b8", textDecoration: "none", "&:hover": { color: "#fbbf24" } }}
              >
                Privacy
              </Typography>
              <Typography
                variant="caption"
                component="a"
                href="#"
                sx={{ color: "#94a3b8", textDecoration: "none", "&:hover": { color: "#fbbf24" } }}
              >
                Terms
              </Typography>
              <Typography
                variant="caption"
                component="a"
                href="#"
                sx={{ color: "#94a3b8", textDecoration: "none", "&:hover": { color: "#fbbf24" } }}
              >
                Support
              </Typography>
            </Box>
          </Box>
        </LoginCard>
      </motion.div>
    </LoginContainer>
  );
};

export default LoginPage;