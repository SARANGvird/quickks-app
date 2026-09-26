import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import ErrorBoundary from "../components/ErrorBoundary";
import { Helmet } from "react-helmet";
import api from "../api/api";
import { FaWhatsapp, FaPhone, FaComment } from "react-icons/fa";
import QuickksLogo from "../assets/quickks-logo.png";

import {
  Zap,
  Wrench,
  Bolt,
  Settings,
  LogIn,
  UserPlus,
  MapPin,
  ShieldCheck,
  ArrowRight,
  Menu,
  X,
  Star,
  Clock,
  CreditCard,
  Award,
  Mail,
  Phone,
} from "lucide-react";

import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
  Alert,
  AlertTitle,
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Stack,
  Avatar,
  Paper,
  Fade,
  Zoom,
  Grow,
  Badge,
  Tooltip,
  Skeleton,
  Fab,
  Rating,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";

const CONTACT = {
  PHONE_DISPLAY: process.env.REACT_APP_SUPPORT_PHONE_DISPLAY || "+91 98765 43210",
  PHONE_TEL: process.env.REACT_APP_SUPPORT_PHONE_TEL || "+919876543210",
  WHATSAPP_NUMBER: process.env.REACT_APP_WHATSAPP_NUMBER || "919876543210",
  EMAIL: process.env.REACT_APP_SUPPORT_EMAIL || "support@quickks.com",
};

const isDebug = process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';
const logError = (...args) => { if (isDebug) console.error(...args); };

const Footer = lazy(() =>
  import("../components/Footer").catch(() => ({
    default: () => (
      <Box sx={{ py: 4, textAlign: "center", bgcolor: "#0f172a" }}>
        <Typography sx={{ color: "#64748b" }}>© 2026 Quickks. All rights reserved.</Typography>
      </Box>
    )
  }))
);

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
`;

const shimmerAnimation = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

const slideUp = keyframes`
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
`;

const HeroSection = styled(Box)({
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  overflow: "hidden",
});

const GradientText = styled(Typography)({
  background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #f97316 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  backgroundSize: "200% auto",
  animation: `${shimmerAnimation} 3s ease-in-out infinite`,
});

const FloatingElement = styled(Box)(({ delay = 0 }) => ({
  animation: `${floatAnimation} ${3 + Math.random() * 2}s ease-in-out infinite`,
  animationDelay: `${delay}s`,
}));

const GlassNav = styled(Box)({
  position: "fixed",
  left: 0,
  right: 0,
  zIndex: 1000,
  backdropFilter: "blur(20px)",
  backgroundColor: "rgba(15, 23, 42, 0.85)",
  borderBottom: "1px solid rgba(255,255,255,0.05)",
  padding: "12px 0",
  transition: "all 0.3s ease",
});

const FeatureCard = styled(Card)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(3),
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.05)",
  "&:hover": {
    transform: "translateY(-12px)",
    boxShadow: "0 30px 60px rgba(0,0,0,0.3)",
    borderColor: "rgba(251, 191, 36, 0.3)",
  },
}));

const ServiceCard = styled(Card)(({ color = "#fbbf24" }) => ({
  padding: "32px",
  borderRadius: "24px",
  transition: "all 0.5s ease",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "white",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
  },
  "&:hover": { transform: "translateY(-8px)", boxShadow: "0 20px 40px rgba(0,0,0,0.1)" },
}));

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2, 4),
  borderRadius: theme.spacing(2),
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  backdropFilter: "blur(10px)",
  textAlign: "center",
  transition: "all 0.3s ease",
  "&:hover": { background: "rgba(255,255,255,0.06)", transform: "scale(1.05)" },
}));

const CTASection = styled(Box)(({ theme }) => ({
  position: "relative",
  padding: theme.spacing(10, 0),
  background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
  overflow: "hidden",
}));

const LogoImg = styled("img")({
  width: 42,
  height: 42,
  objectFit: "contain",
  filter: "drop-shadow(0 4px 12px rgba(251, 191, 36, 0.3))",
});

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) setVisible(true);
  }, []);
  const handleAccept = () => { localStorage.setItem('cookieConsent', 'accepted'); setVisible(false); };
  const handleDecline = () => { localStorage.setItem('cookieConsent', 'declined'); setVisible(false); };
  if (!visible) return null;
  return (
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000, bgcolor: '#1e293b', color: '#94a3b8', p: { xs: 2, sm: 3 }, borderTop: '1px solid rgba(255,255,255,0.05)', animation: `${slideUp} 0.5s ease-out` }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: { xs: 'center', sm: 'left' } }}>
            We use cookies to enhance your experience. By continuing, you agree to our <Link to="/privacy" style={{ color: '#fbbf24', textDecoration: 'none' }}>Privacy Policy</Link>.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" onClick={handleDecline} sx={{ color: '#94a3b8', textTransform: 'none' }}>Decline</Button>
            <Button variant="contained" onClick={handleAccept} sx={{ bgcolor: '#fbbf24', color: '#0f172a', textTransform: 'none', fontWeight: 700 }}>Accept All</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const TrustBadges = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: { xs: 2, md: 4 }, flexWrap: "wrap", py: 2, px: 3, bgcolor: "rgba(255,255,255,0.03)", borderRadius: 2, border: "1px solid rgba(255,255,255,0.05)", mt: 4 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><ShieldCheck size={16} color="#fbbf24" /><Typography variant="caption" color="#94a3b8">Verified Pros</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Clock size={16} color="#fbbf24" /><Typography variant="caption" color="#94a3b8">24/7 Support</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CreditCard size={16} color="#fbbf24" /><Typography variant="caption" color="#94a3b8">Secure Payments</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Star size={16} color="#fbbf24" /><Typography variant="caption" color="#94a3b8">4.8 Rating</Typography></Box>
  </Box>
);

const FloatingContactButton = styled(Fab)(({ theme }) => ({
  position: "fixed", bottom: 24, right: 24, zIndex: 999, backgroundColor: "#25D366", color: "white",
  "&:hover": { backgroundColor: "#1DA851" },
}));

const SectionSkeleton = () => (
  <Box sx={{ py: 8 }}>
    <Container maxWidth="lg">
      <Grid container spacing={4}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 3 }} />
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

const DEFAULT_SERVICES = [
  { id: 1, icon: <Zap size={40} color="#fbbf24" />, title: "Electrician", description: "Expert solutions for fans, wiring, and emergency fixes. Available 24/7.", color: "#fbbf24", popular: true },
  { id: 2, icon: <Wrench size={40} color="#f59e0b" />, title: "Appliance Repair", description: "Fast fixes for refrigerators, washing machines, and all home appliances.", color: "#f59e0b" },
  { id: 3, icon: <Bolt size={40} color="#f97316" />, title: "Power Backup", description: "Inverters and generator support with long-term maintenance plans.", color: "#f97316" },
  { id: 4, icon: <Settings size={40} color="#8b5cf6" />, title: "Smart Home", description: "IoT devices and complete home automation setups.", color: "#8b5cf6" },
];

const DEFAULT_FEATURED_PROVIDERS = [
  { id: '1', serviceType: 'Plumbing', displayName: 'Plumbing Services', description: 'Expert plumbers for all your home needs', rating: 4.8, reviews: 120, isFeatured: true },
  { id: '2', serviceType: 'Electrical', displayName: 'Electrical Services', description: 'Licensed electricians', rating: 4.7, reviews: 95, isFeatured: true },
  { id: '3', serviceType: 'Cleaning', displayName: 'Cleaning Services', description: 'Professional cleaning', rating: 4.9, reviews: 200, isFeatured: true },
  { id: '4', serviceType: 'AC Service', displayName: 'AC Repair & Service', description: 'Expert AC technicians', rating: 4.6, reviews: 78, isFeatured: true },
];

const HomePage = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const mountedRef = useRef(true);
  const locationTimeoutRef = useRef(null);
  const heroRef = useRef(null);
  const servicesRef = useRef(null);
  const featuresRef = useRef(null);
  const ctaRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const emailInputRef = useRef(null);

  const [location, setLocation] = useState("");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [locationError, setLocationError] = useState(false);
  const [isNavScrolled, setIsNavScrolled] = useState(false);
  const [isProxyError, setIsProxyError] = useState(false);

  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitIntentTriggered, setExitIntentTriggered] = useState(false);
  const [exitIntentSubmitting, setExitIntentSubmitting] = useState(false);

  const [liveStats, setLiveStats] = useState({ totalCustomers: 8452, totalProviders: 1532, averageRating: 4.8, satisfactionRate: 99.9 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [featuredProviders, setFeaturedProviders] = useState(DEFAULT_FEATURED_PROVIDERS);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(true);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    if (isAuthenticated && user) {
      const userRole = user.role?.toUpperCase();
      let redirectPath = "/";
      if (userRole === "CUSTOMER") redirectPath = "/customer/dashboard";
      else if (userRole === "PROVIDER" || userRole === "SERVICE_PROVIDER") redirectPath = "/provider/dashboard";
      else if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") redirectPath = "/admin/dashboard";
      if (redirectPath !== "/") navigate(redirectPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const handleScroll = () => setIsNavScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleMouseLeave = (e) => {
      if (e.clientY <= 0 && !exitIntentTriggered && !isAuthenticated) {
        setExitIntentTriggered(true); setShowExitIntent(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [exitIntentTriggered, isAuthenticated]);

  const fetchHomeStats = useCallback(async () => {
    try {
      const response = await api.get('/home/stats');
      const data = response.data?.data || response.data || {};
      if (mountedRef.current) {
        setLiveStats({
          totalCustomers: data.totalCustomers || 8452,
          totalProviders: data.totalProviders || 1532,
          averageRating: data.averageRating || 4.8,
          satisfactionRate: data.satisfactionRate || 99.9,
        });
        setIsLoadingStats(false); setIsProxyError(false);
      }
    } catch (error) {
      logError('Failed to fetch home stats:', error);
      if (mountedRef.current) setIsLoadingStats(false);
    }
  }, []);

  const fetchFeaturedProviders = useCallback(async () => {
    try {
      const response = await api.get('/home/featured-providers');
      const data = response.data?.data || response.data || [];
      if (mountedRef.current && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(p => ({
          id: p.id || Math.random().toString(36).substring(7),
          serviceType: p.serviceType || 'General Service',
          displayName: p.displayName || p.serviceType || 'Service Professional',
          description: p.description || 'Verified professional',
          rating: p.rating || 4.5,
          reviews: p.reviews || 0,
          isFeatured: p.isFeatured || false,
        }));
        setFeaturedProviders(mapped);
      }
      setIsLoadingFeatured(false);
    } catch (error) {
      logError('Failed to fetch featured providers:', error);
      if (mountedRef.current) setIsLoadingFeatured(false);
    }
  }, []);

  const fetchServices = useCallback(async () => {
    try {
      const response = await api.get('/services/popular');
      const data = response.data?.data || response.data || [];
      if (mountedRef.current && Array.isArray(data) && data.length > 0) setServices(data);
      setIsLoadingServices(false);
    } catch (error) {
      logError('Failed to fetch services:', error);
      if (mountedRef.current) setIsLoadingServices(false);
    }
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const response = await api.get('/announcements');
      const data = response.data?.data || response.data || [];
      if (mountedRef.current && Array.isArray(data) && data.length > 0) setAnnouncements(data);
    } catch (error) { logError('Failed to fetch announcements:', error); }
  }, []);

  const handleEmailSubmit = useCallback(async (email) => {
    try {
      await api.post('/newsletter/subscribe', { email });
      setSnackbar({ open: true, message: "You are subscribed!", severity: "success" });
      return Promise.resolve();
    } catch (error) {
      logError("Newsletter error:", error);
      setSnackbar({ open: true, message: "Failed to subscribe.", severity: "error" });
      throw error;
    }
  }, []);

  const handleWhatsApp = useCallback(() => {
    window.open(`https://wa.me/${CONTACT.WHATSAPP_NUMBER}?text=Hi%20Quickks%2C%20I%20need%20help%20with...`, "_blank", "noopener,noreferrer");
  }, []);

  const handlePhoneCall = useCallback(() => { window.location.href = `tel:${CONTACT.PHONE_TEL}`; }, []);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError(true); return; }
    setLoadingLocation(true);
    locationTimeoutRef.current = setTimeout(() => { if (mountedRef.current) { setLoadingLocation(false); setLocationError(true); } }, 10000);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(locationTimeoutRef.current);
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&zoom=10`);
          const data = await res.json();
          if (data?.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county || "Unknown";
            if (mountedRef.current) {
              setLocation(city); setLocationError(false);
              setSnackbar({ open: true, message: `Location detected: ${city}`, severity: "success" });
            }
          }
        } catch (error) { logError("Location fetch failed:", error); if (mountedRef.current) setLocationError(true); }
        finally { if (mountedRef.current) setLoadingLocation(false); }
      },
      (error) => {
        clearTimeout(locationTimeoutRef.current);
        logError("Geolocation error:", error);
        if (mountedRef.current) { setLoadingLocation(false); setLocationError(true); }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    return () => { if (locationTimeoutRef.current) clearTimeout(locationTimeoutRef.current); };
  }, []);

  useEffect(() => {
    fetchHomeStats(); fetchFeaturedProviders(); fetchServices(); fetchAnnouncements();
    statsIntervalRef.current = setInterval(() => { if (mountedRef.current) fetchHomeStats(); }, 30000);
    return () => { if (statsIntervalRef.current) clearInterval(statsIntervalRef.current); };
  }, [fetchHomeStats, fetchFeaturedProviders, fetchServices, fetchAnnouncements]);

  const handleLocationConfirm = useCallback(() => {
    if (manualLocation.trim()) {
      setLocation(manualLocation.trim()); setShowLocationDialog(false);
      setSnackbar({ open: true, message: `Location set to: ${manualLocation.trim()}`, severity: "success" });
    }
  }, [manualLocation]);

  const handleCloseSnackbar = useCallback(() => { setSnackbar((prev) => ({ ...prev, open: false })); }, []);
  const scrollToSection = useCallback((ref) => { if (ref?.current) ref.current.scrollIntoView({ behavior: "smooth", block: "start" }); }, []);

  const submitExitIntentEmail = useCallback(async (rawEmail) => {
    const email = (rawEmail || "").trim();
    if (!email || !isValidEmail(email) || exitIntentSubmitting) return;
    setExitIntentSubmitting(true);
    try { await handleEmailSubmit(email); setShowExitIntent(false); } catch {} finally { setExitIntentSubmitting(false); }
  }, [handleEmailSubmit, exitIntentSubmitting]);

  const features = [
    { icon: <ShieldCheck size={32} color="#fbbf24" />, title: "Verified Professionals", description: "All providers are vetted and verified." },
    { icon: <Clock size={32} color="#fbbf24" />, title: "24/7 Availability", description: "Book services anytime with instant confirmation." },
    { icon: <Star size={32} color="#fbbf24" />, title: "Quality Guaranteed", description: "100% satisfaction guarantee." },
    { icon: <CreditCard size={32} color="#fbbf24" />, title: "Secure Payments", description: "Multiple payment options with security." },
  ];

  const statsData = [
    { value: isLoadingStats ? "..." : `${(liveStats.totalCustomers / 1000).toFixed(1)}K+`, label: "Happy Customers" },
    { value: isLoadingStats ? "..." : `${(liveStats.totalProviders / 1000).toFixed(1)}K+`, label: "Verified Professionals" },
    { value: isLoadingStats ? "..." : `${liveStats.averageRating}★`, label: "Average Rating" },
    { value: isLoadingStats ? "..." : `${liveStats.satisfactionRate}%`, label: "Satisfaction Rate" },
  ];

  const navItems = [
    { label: "Services", path: "#services", ref: servicesRef },
    { label: "Features", path: "#features", ref: featuresRef },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  if (isAuthenticated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#0f172a" }}>
        <CircularProgress sx={{ color: "#fbbf24" }} />
        <Typography sx={{ color: "white", ml: 2 }}>Redirecting...</Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Quickks - Trusted Home Services Platform</title>
        <meta name="description" content="Find trusted electricians, repair experts, and home service professionals near you." />
      </Helmet>
      <Box sx={{ minHeight: "100vh", bgcolor: "#0f172a", overflowX: "hidden" }}>
        <CookieConsent />
        <FloatingContactButton onClick={handleWhatsApp}><FaWhatsapp size={24} /></FloatingContactButton>

        {showExitIntent && !isAuthenticated && (
          <Dialog open={showExitIntent} onClose={() => setShowExitIntent(false)} maxWidth="sm" fullWidth>
            <DialogTitle>Wait!</DialogTitle>
            <DialogContent>
              <Typography>Get ₹100 off your first booking!</Typography>
              <TextField fullWidth placeholder="Enter your email" type="email" sx={{ mt: 2 }} inputRef={emailInputRef} disabled={exitIntentSubmitting} />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowExitIntent(false)}>No thanks</Button>
              <Button variant="contained" onClick={() => submitExitIntentEmail(emailInputRef.current?.value)} disabled={exitIntentSubmitting} sx={{ bgcolor: "#fbbf24", color: "#0f172a" }}>
                {exitIntentSubmitting ? <CircularProgress size={20} /> : "Claim ₹100 Off"}
              </Button>
            </DialogActions>
          </Dialog>
        )}

        <GlassNav component={motion.div} initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.5 }} sx={{ top: announcements.length > 0 ? 28 : 0 }}>
          <Container maxWidth="xl">
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }} onClick={() => navigate("/")}>
                <LogoImg src={QuickksLogo} alt="Quickks Logo" />
                <Typography variant="h5" sx={{ fontWeight: 900, color: "white", "& span": { color: "#fbbf24" } }}>Quickks<span>.</span></Typography>
                <Chip label="BETA" size="small" sx={{ bgcolor: "#fbbf24", color: "#0f172a", fontWeight: 700, fontSize: "0.55rem", height: 18 }} />
              </Box>
              {!isMobile && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {navItems.map((item) => {
                    const isAnchor = item.path.startsWith("#");
                    return (
                      <Typography key={item.label} component={isAnchor ? "button" : Link} {...(!isAnchor && { to: item.path })} onClick={() => { if (item.ref) scrollToSection(item.ref); }} sx={{ color: "#94a3b8", textDecoration: "none", fontWeight: 500, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", "&:hover": { color: "white" } }}>
                        {item.label}
                      </Typography>
                    );
                  })}
                  <Button variant="outlined" onClick={() => navigate("/login")} startIcon={<LogIn size={18} />} sx={{ color: "white", borderColor: "rgba(255,255,255,0.2)", borderRadius: 3, textTransform: "none" }}>Login</Button>
                  <Button variant="contained" onClick={() => navigate("/register")} startIcon={<UserPlus size={18} />} sx={{ bgcolor: "#fbbf24", color: "#0f172a", borderRadius: 3, textTransform: "none", fontWeight: 700 }}>Get Started</Button>
                </Box>
              )}
              {isMobile && <IconButton onClick={() => setMobileMenuOpen(true)} sx={{ color: "white" }}><Menu size={24} /></IconButton>}
            </Box>
          </Container>
        </GlassNav>

        <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 300, bgcolor: "#1e293b", color: "white", p: 3 } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><LogoImg src={QuickksLogo} alt="logo" style={{ width: 32, height: 32 }} /><Typography variant="h6" fontWeight={700}>Quickks</Typography></Box>
            <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "white" }}><X size={24} /></IconButton>
          </Box>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.1)", mb: 3 }} />
          <List>
            {navItems.map((item) => {
              const isAnchor = item.path.startsWith("#");
              return <ListItem key={item.label} component={isAnchor ? "button" : Link} {...(!isAnchor && { to: item.path })} onClick={() => { setMobileMenuOpen(false); if (item.ref) scrollToSection(item.ref); }}><ListItemText primary={item.label} /></ListItem>;
            })}
          </List>
        </Drawer>

        <HeroSection ref={heroRef}>
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, pt: 8 }}>
            <Box component={motion.div} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} sx={{ textAlign: "center" }}>
              <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
                <LogoImg src={QuickksLogo} alt="Quickks" style={{ width: 120, height: 120 }} />
              </Box>
              <Typography variant="h1" sx={{ fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem" }, fontWeight: 900, color: "white", lineHeight: 1.1, mb: 3 }}>
                Powering Homes <br />With <GradientText component="span">Trust</GradientText>
              </Typography>
              <Typography variant="h6" sx={{ color: "#94a3b8", maxWidth: 700, mx: "auto", mb: 5 }}>
                The highest-rated electricians and repair experts in your neighborhood.
              </Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 6 }}>
                <Button variant="contained" size="large" onClick={() => navigate("/register")} endIcon={<ArrowRight size={20} />} sx={{ bgcolor: "#fbbf24", color: "#0f172a", px: 6, py: 2, borderRadius: 3, fontWeight: 800, fontSize: "1.1rem" }}>Get Started</Button>
                <Box onClick={() => setShowLocationDialog(true)} sx={{ display: "flex", alignItems: "center", gap: 2, px: 3, py: 1.5, borderRadius: 3, bgcolor: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}>
                  <MapPin size={22} color="#fbbf24" />
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="caption" sx={{ color: "#94a3b8", display: "block", fontSize: "0.65rem" }}>Your Location</Typography>
                    <Typography variant="body2" sx={{ color: "#fbbf24", fontWeight: 600 }}>{loadingLocation ? <CircularProgress size={16} /> : location || "Set Location"}</Typography>
                  </Box>
                </Box>
              </Stack>
              <TrustBadges />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(4, 1fr)" }, gap: 2, maxWidth: 700, mx: "auto", mt: 4 }}>
                {statsData.map((stat, index) => (
                  <StatsCard key={index}><Typography variant="h5" sx={{ color: "white", fontWeight: 800 }}>{stat.value}</Typography><Typography variant="caption" sx={{ color: "#94a3b8" }}>{stat.label}</Typography></StatsCard>
                ))}
              </Box>
            </Box>
          </Container>
        </HeroSection>

        <Box ref={featuresRef} sx={{ py: { xs: 6, md: 10 }, bgcolor: "#f8fafc" }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: "center", mb: 6 }}>
              <Typography variant="overline" sx={{ color: "#fbbf24", fontWeight: 700 }}>Why Quickks</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>Built for Trust & Convenience</Typography>
            </Box>
            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <FeatureCard>
                    <Box className="icon-wrapper" sx={{ width: 72, height: 72, borderRadius: "50%", bgcolor: "rgba(251, 191, 36, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>{feature.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#64748b" }}>{feature.description}</Typography>
                  </FeatureCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box ref={servicesRef} sx={{ bgcolor: "white", py: { xs: 6, md: 10 } }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: "center", mb: 6 }}>
              <Typography variant="overline" sx={{ color: "#fbbf24", fontWeight: 700 }}>Our Services</Typography>
              <Typography variant="h3" sx={{ fontWeight: 800, color: "#0f172a", mb: 2 }}>Professional Services at Your Doorstep</Typography>
            </Box>
            {isLoadingServices ? <SectionSkeleton /> : (
              <Grid container spacing={4}>
                {services.map((service, index) => (
                  <Grid item xs={12} sm={6} md={3} key={service.id || index}>
                    <ServiceCard color={service.color}>
                      <CardContent sx={{ p: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <Box sx={{ width: 70, height: 70, borderRadius: 3, bgcolor: `${service.color}15`, display: "flex", alignItems: "center", justifyContent: "center", mb: 2 }}>{service.icon}</Box>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: "#0f172a", mb: 1 }}>{service.title}</Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", mb: 3, flex: 1 }}>{service.description}</Typography>
                        <Button variant="outlined" onClick={() => navigate("/register")} sx={{ borderRadius: 2, textTransform: "none", alignSelf: "flex-start" }}>Book Now</Button>
                      </CardContent>
                    </ServiceCard>
                  </Grid>
                ))}
              </Grid>
            )}
          </Container>
        </Box>

        <CTASection ref={ctaRef}>
          <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="h3" sx={{ color: "white", fontWeight: 800, mb: 3 }}>Ready to Get Started?</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
                <Button variant="contained" size="large" onClick={() => navigate("/register")} sx={{ bgcolor: "#fbbf24", color: "#0f172a", px: 5, py: 1.5, borderRadius: 3, fontWeight: 700 }}>Get Started Free</Button>
                <Button variant="outlined" size="large" onClick={() => navigate("/login")} sx={{ borderColor: "rgba(255,255,255,0.2)", color: "white", px: 5, py: 1.5, borderRadius: 3 }}>Login</Button>
              </Stack>
            </Box>
          </Container>
        </CTASection>

        <Suspense fallback={<Box sx={{ py: 6, bgcolor: "#0f172a", textAlign: "center" }}><Typography sx={{ color: "#64748b" }}>Loading footer...</Typography></Box>}><Footer /></Suspense>

        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Set Your Location</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="City or Area" placeholder="e.g., Pune, Mumbai" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} autoFocus />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowLocationDialog(false)}>Cancel</Button>
            <Button variant="contained" onClick={handleLocationConfirm} disabled={!manualLocation.trim()} sx={{ bgcolor: "#fbbf24", color: "#0f172a" }}>Confirm</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
          <Alert severity={snackbar.severity} onClose={handleCloseSnackbar} sx={{ borderRadius: 3 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
};

export default HomePage;
