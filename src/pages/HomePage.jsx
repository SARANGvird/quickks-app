import React, { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { motion } from "framer-motion";
import ErrorBoundary from "../components/ErrorBoundary";
import { Helmet } from "react-helmet";
import api from "../api/api";
import { FaWhatsapp, FaInstagram, FaLinkedin, FaFacebook, FaTwitter } from "react-icons/fa";

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
  CircularProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Stack,
  Paper,
  Fab,
  Skeleton,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import QuickksLogo from "../assets/quickks-logo.png";

const CONTACT = {
  PHONE_DISPLAY: process.env.REACT_APP_SUPPORT_PHONE_DISPLAY || "+91 98765 43210",
  PHONE_TEL: process.env.REACT_APP_SUPPORT_PHONE_TEL || "+919371365677",
  WHATSAPP_NUMBER: process.env.REACT_APP_WHATSAPP_NUMBER || "919371365677",
  EMAIL: process.env.REACT_APP_SUPPORT_EMAIL || "support@quickks.com",
};

const SOCIALS = {
  instagram: "https://www.instagram.com/Quickks.in",
  linkedin: "https://www.linkedin.com/company/145279791/",
  facebook: "https://www.facebook.com/quickks",
  twitter: "https://twitter.com/quickks_in",
};

const isDebug = process.env.REACT_APP_ENABLE_DEBUG_LOGS === 'true';
const logError = (...args) => { if (isDebug) console.error(...args); };

const Footer = lazy(() =>
  import("../components/Footer").catch(() => ({
    default: () => (
      <Box sx={{ py: 6, textAlign: "center", bgcolor: "#020617", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <Container maxWidth="lg">
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mb: 3 }}>
            <IconButton component="a" href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", "&:hover": { bgcolor: "#E1306C" } }}><FaInstagram /></IconButton>
            <IconButton component="a" href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", "&:hover": { bgcolor: "#0077B5" } }}><FaLinkedin /></IconButton>
            <IconButton component="a" href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", "&:hover": { bgcolor: "#1877F2" } }}><FaFacebook /></IconButton>
            <IconButton component="a" href={SOCIALS.twitter} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", "&:hover": { bgcolor: "#fff", color: "#000" } }}><FaTwitter /></IconButton>
          </Box>
          <Typography sx={{ color: "#64748b", fontSize: 13 }}>© 2026 Quickks. All rights reserved. Trusted by 8,000+ customers.</Typography>
        </Container>
      </Box>
    )
  }))
);

const floatAnimation = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-12px); }
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
const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(251,191,36,0.4); }
  70% { box-shadow: 0 0 0 20px rgba(251,191,36,0); }
  100% { box-shadow: 0 0 0 0 rgba(251,191,36,0); }
`;

const HeroSection = styled(Box)({
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "radial-gradient(1200px 600px at 50% -10%, rgba(120,119,198,0.25), transparent), radial-gradient(800px 500px at 20% 10%, rgba(251,191,36,0.15), transparent), linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
  overflow: "hidden",
});

const GradientText = styled(Typography)({
  background: "linear-gradient(100deg, #fff 0%, #fbbf24 20%, #f59e0b 50%, #f97316 80%, #fff 100%)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  backgroundSize: "200% auto",
  animation: `${shimmerAnimation} 4s ease-in-out infinite`,
});

const GlassNav = styled(Box)({
  position: "fixed",
  left: 0,
  right: 0,
  zIndex: 1000,
  backdropFilter: "blur(24px)",
  backgroundColor: "rgba(2, 6, 23, 0.8)",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  padding: "14px 0",
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
  backdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.06)",
  "&:hover": {
    transform: "translateY(-12px) scale(1.02)",
    boxShadow: "0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(251, 191, 36, 0.2)",
    borderColor: "rgba(251, 191, 36, 0.3)",
    background: "rgba(255,255,255,0.06)",
  },
}));

const ServiceCard = styled(Card)(({ color = "#fbbf24" }) => ({
  padding: "32px",
  borderRadius: "28px",
  transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  cursor: "pointer",
  position: "relative",
  overflow: "hidden",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "white",
  border: "1px solid rgba(0,0,0,0.04)",
  "&::before": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    background: `linear-gradient(90deg, ${color}, ${color}dd)`,
  },
  "&:hover": { transform: "translateY(-10px)", boxShadow: "0 24px 48px rgba(0,0,0,0.12)", borderColor: `${color}40` },
}));

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2.5, 3),
  borderRadius: theme.spacing(2.5),
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.07)",
  backdropFilter: "blur(16px)",
  textAlign: "center",
  transition: "all 0.4s ease",
  "&:hover": { background: "rgba(255,255,255,0.08)", transform: "translateY(-4px) scale(1.03)", borderColor: "rgba(251,191,36,0.2)" },
}));

const CTASection = styled(Box)(({ theme }) => ({
  position: "relative",
  padding: theme.spacing(12, 0),
  background: "radial-gradient(800px 400px at 50% 0%, rgba(251,191,36,0.15), transparent), linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%)",
  overflow: "hidden",
  borderTop: "1px solid rgba(255,255,255,0.05)",
}));

const LogoImg = styled("img")({
  width: 48,
  height: 48,
  objectFit: "contain",
  background: "#ffffff",
  borderRadius: 14,
  padding: 7,
  boxShadow: "0 8px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1)",
});

const HeroLogo = styled("img")({
  width: 140,
  height: 140,
  objectFit: "contain",
  background: "#ffffff",
  borderRadius: 32,
  padding: 18,
  boxShadow: "0 20px 60px rgba(251,191,36,0.3), 0 0 0 1px rgba(255,255,255,0.2)",
  animation: `${floatAnimation} 4s ease-in-out infinite, ${pulseGlow} 3s ease-in-out infinite`,
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
    <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 10000, bgcolor: '#0f172a', color: '#94a3b8', p: { xs: 2, sm: 3 }, borderTop: '1px solid rgba(255,255,255,0.08)', animation: `${slideUp} 0.5s ease-out` }}>
      <Container maxWidth="lg">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: { xs: 'center', sm: 'left' } }}>
            We use cookies to enhance your experience. By continuing, you agree to our <Link to="/privacy" style={{ color: '#fbbf24', textDecoration: 'none' }}>Privacy Policy</Link>.
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="text" onClick={handleDecline} sx={{ color: '#94a3b8', textTransform: 'none' }}>Decline</Button>
            <Button variant="contained" onClick={handleAccept} sx={{ bgcolor: '#fbbf24', color: '#0f172a', textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Accept All</Button>
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const TrustBadges = () => (
  <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: { xs: 2, md: 4 }, flexWrap: "wrap", py: 2.5, px: 3, bgcolor: "rgba(255,255,255,0.04)", borderRadius: 3, border: "1px solid rgba(255,255,255,0.06)", mt: 5, backdropFilter: "blur(12px)" }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><ShieldCheck size={16} color="#fbbf24" /><Typography variant="caption" color="#e2e8f0" fontWeight={600}>Verified Pros</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Clock size={16} color="#fbbf24" /><Typography variant="caption" color="#e2e8f0" fontWeight={600}>24/7 Support</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><CreditCard size={16} color="#fbbf24" /><Typography variant="caption" color="#e2e8f0" fontWeight={600}>Secure Payments</Typography></Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Star size={16} color="#fbbf24" /><Typography variant="caption" color="#e2e8f0" fontWeight={600}>4.9 Rating • 8K+ Reviews</Typography></Box>
  </Box>
);

const FloatingContactButton = styled(Fab)({
  position: "fixed", bottom: 24, right: 24, zIndex: 999, backgroundColor: "#25D366", color: "white",
  boxShadow: "0 8px 24px rgba(37,211,102,0.4)",
  "&:hover": { backgroundColor: "#1DA851", transform: "scale(1.05)" },
});

const SectionSkeleton = () => (
  <Box sx={{ py: 8 }}>
    <Container maxWidth="lg">
      <Grid container spacing={4}>
        {[1, 2, 3, 4].map((i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 4 }} />
          </Grid>
        ))}
      </Grid>
    </Container>
  </Box>
);

const DEFAULT_SERVICES = [
  { id: 1, icon: <Zap size={44} color="#fbbf24" />, title: "Electrician", description: "Fans, wiring, emergency fixes. 30 min response. Available 24/7.", color: "#fbbf24", popular: true },
  { id: 2, icon: <Wrench size={44} color="#f59e0b" />, title: "Appliance Repair", description: "Fridge, Washing Machine, all home appliances fast fixed.", color: "#f59e0b" },
  { id: 3, icon: <Bolt size={44} color="#f97316" />, title: "Power Backup", description: "Inverter, Generator support with long-term maintenance.", color: "#f97316" },
  { id: 4, icon: <Settings size={44} color="#8b5cf6" />, title: "Smart Home", description: "IoT devices, automation, premium setups by experts.", color: "#8b5cf6" },
];

const DEFAULT_FEATURED_PROVIDERS = [
  { id: '1', serviceType: 'Plumbing', displayName: 'Plumbing Services', description: 'Expert plumbers for all your home needs', rating: 4.8, reviews: 120, isFeatured: true },
  { id: '2', serviceType: 'Electrical', displayName: 'Electrical Services', description: 'Licensed electricians', rating: 4.7, reviews: 95, isFeatured: true },
  { id: '3', serviceType: 'Cleaning', displayName: 'Cleaning Services', description: 'Professional cleaning', rating: 4.9, reviews: 200, isFeatured: true },
  { id: '4', serviceType: 'AC Service', displayName: 'AC Repair & Service', description: 'Expert AC technicians', rating: 4.6, reviews: 78, isFeatured: true },
];

const HomePage = () => {
  const { isAuthenticated, user } = useAuth();
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
        setIsLoadingStats(false);
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
      setSnackbar({ open: true, message: "You are subscribed! ₹100 OFF applied.", severity: "success" });
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
    { icon: <ShieldCheck size={36} color="#fbbf24" />, title: "Verified Professionals", description: "Aadhaar verified, background checked, 4.8★+ rated pros only." },
    { icon: <Clock size={36} color="#fbbf24" />, title: "30 Min Lightning Speed", description: "Book in 30 sec, expert at door in 30 min. Fastest response." },
    { icon: <Star size={36} color="#fbbf24" />, title: "Quality Guaranteed", description: "100% satisfaction guarantee with premium service standards." },
    { icon: <CreditCard size={36} color="#fbbf24" />, title: "Secure & Insured", description: "UPI, Cards, COD. ₹10K damage protection included." },
  ];
  const statsData = [
    { value: isLoadingStats ? "..." : `${(liveStats.totalCustomers / 1000).toFixed(1)}K+`, label: "Happy Customers" },
    { value: isLoadingStats ? "..." : `${(liveStats.totalProviders / 1000).toFixed(1)}K+`, label: "Verified Pros" },
    { value: isLoadingStats ? "..." : `${liveStats.averageRating}★`, label: "Avg Rating" },
    { value: isLoadingStats ? "..." : `${liveStats.satisfactionRate}%`, label: "Satisfaction" },
  ];
  const navItems = [
    { label: "Services", path: "#services", ref: servicesRef },
    { label: "Features", path: "#features", ref: featuresRef },
    { label: "About", path: "/about" },
    { label: "Contact", path: "/contact" },
  ];

  if (isAuthenticated) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#020617" }}>
        <CircularProgress sx={{ color: "#fbbf24" }} />
        <Typography sx={{ color: "white", ml: 2 }}>Redirecting...</Typography>
      </Box>
    );
  }

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Quickks - Trusted Home Services | 30 Min Speed</title>
        <meta name="description" content="Electrician, Plumber, AC Repair in 30 min. 8K+ happy customers, 1.5K+ verified pros. Book in 30 sec." />
      </Helmet>
      <Box sx={{ minHeight: "100vh", bgcolor: "#020617", overflowX: "hidden" }}>
        <CookieConsent />
        <FloatingContactButton onClick={handleWhatsApp}><FaWhatsapp size={28} /></FloatingContactButton>

        {showExitIntent && !isAuthenticated && (
          <Dialog open={showExitIntent} onClose={() => setShowExitIntent(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: "#0f172a", border: "1px solid rgba(255,255,255,0.1)" } }}>
            <DialogTitle sx={{ color: "white", fontWeight: 800 }}>Wait! Get ₹100 OFF ⚡️</DialogTitle>
            <DialogContent>
              <Typography sx={{ color: "#94a3b8" }}>Enter email & get instant discount on first booking.</Typography>
              <TextField fullWidth placeholder="your@email.com" type="email" sx={{ mt: 2, "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.05)", borderRadius: 3 } }} inputProps={{ style: { color: "white" } }} inputRef={emailInputRef} disabled={exitIntentSubmitting} />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setShowExitIntent(false)} sx={{ color: "#94a3b8" }}>No thanks</Button>
              <Button variant="contained" onClick={() => submitExitIntentEmail(emailInputRef.current?.value)} disabled={exitIntentSubmitting} sx={{ bgcolor: "#fbbf24", color: "#0f172a", fontWeight: 800, borderRadius: 2 }}>
                {exitIntentSubmitting ? <CircularProgress size={20} /> : "Claim ₹100 OFF"}
              </Button>
            </DialogActions>
          </Dialog>
        )}

        <GlassNav component={motion.div} initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.6 }} sx={{ top: announcements.length > 0 ? 28 : 0, ...(isNavScrolled && { bgcolor: "rgba(2,6,23,0.95)", boxShadow: "0 10px 40px rgba(0,0,0,0.5)" }) }}>
          <Container maxWidth="xl">
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, cursor: "pointer" }} onClick={() => navigate("/")}>
                <LogoImg src={QuickksLogo} alt="Quickks Logo" />
                <Typography variant="h5" sx={{ fontWeight: 900, color: "white", letterSpacing: "-1px", "& span": { color: "#fbbf24" } }}>Quickks<span>.</span></Typography>
              </Box>
              {!isMobile && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                  {navItems.map((item) => {
                    const isAnchor = item.path.startsWith("#");
                    return (
                      <Typography key={item.label} component={isAnchor ? "button" : Link} {...(!isAnchor && { to: item.path })} onClick={() => { if (item.ref) scrollToSection(item.ref); }} sx={{ color: "#94a3b8", textDecoration: "none", fontWeight: 600, fontSize: "0.9rem", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", "&:hover": { color: "white" } }}>
                        {item.label}
                      </Typography>
                    );
                  })}
                  <Stack direction="row" spacing={1.2} sx={{ ml: 1 }}>
                    <IconButton component="a" href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.06)", color: "#fff", "&:hover": { bgcolor: "#E1306C" } }}><FaInstagram size={16} /></IconButton>
                    <IconButton component="a" href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" sx={{ width: 36, height: 36, bgcolor: "rgba(255,255,255,0.06)", color: "#fff", "&:hover": { bgcolor: "#0077B5" } }}><FaLinkedin size={16} /></IconButton>
                  </Stack>
                  <Button variant="outlined" onClick={() => navigate("/login")} startIcon={<LogIn size={18} />} sx={{ color: "white", borderColor: "rgba(255,255,255,0.15)", borderRadius: 3, textTransform: "none", fontWeight: 600, ml: 1 }}>Login</Button>
                  <Button variant="contained" onClick={() => navigate("/register")} startIcon={<UserPlus size={18} />} sx={{ bgcolor: "#fff", color: "#020617", borderRadius: 3, textTransform: "none", fontWeight: 800, px: 3, "&:hover": { bgcolor: "#fbbf24" } }}>Get Started</Button>
                </Box>
              )}
              {isMobile && <IconButton onClick={() => setMobileMenuOpen(true)} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.06)" }}><Menu size={22} /></IconButton>}
            </Box>
          </Container>
        </GlassNav>

        <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 320, bgcolor: "#020617", color: "white", p: 3, borderLeft: "1px solid rgba(255,255,255,0.06)" } }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}><LogoImg src={QuickksLogo} alt="logo" style={{ width: 40, height: 40 }} /><Typography variant="h6" fontWeight={800}>Quickks</Typography></Box>
            <IconButton onClick={() => setMobileMenuOpen(false)} sx={{ color: "white", bgcolor: "rgba(255,255,255,0.06)" }}><X size={20} /></IconButton>
          </Box>
          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", mb: 3 }} />
          <List>
            {navItems.map((item) => {
              const isAnchor = item.path.startsWith("#");
              return <ListItem key={item.label} component={isAnchor ? "button" : Link} {...(!isAnchor && { to: item.path })} onClick={() => { setMobileMenuOpen(false); if (item.ref) scrollToSection(item.ref); }} sx={{ borderRadius: 2, mb: 0.5 }}><ListItemText primary={item.label} /></ListItem>;
            })}
          </List>
          <Box sx={{ mt: 3, display: "flex", gap: 1 }}>
            <IconButton component="a" href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff" }}><FaInstagram /></IconButton>
            <IconButton component="a" href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff" }}><FaLinkedin /></IconButton>
            <IconButton component="a" href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff" }}><FaFacebook /></IconButton>
            <IconButton component="a" href={SOCIALS.twitter} target="_blank" rel="noopener noreferrer" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff" }}><FaTwitter /></IconButton>
          </Box>
        </Drawer>

        <HeroSection ref={heroRef}>
          <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1, pt: { xs: 12, md: 10 } }}>
            <Box component={motion.div} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: "easeOut" }} sx={{ textAlign: "center" }}>
              
              <Box component={motion.div} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, px: 2.5, py: 1, borderRadius: 999, bgcolor: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", mb: 4 }}>
                <Box sx={{ width: 8, height: 8, bgcolor: "#22c55e", borderRadius: "50%", boxShadow: "0 0 0 4px rgba(34,197,94,0.2)" }} />
                <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 700, letterSpacing: 1, fontSize: "0.75rem" }}>TRUSTED BY 8,452+ CUSTOMERS • 4.9★ RATED</Typography>
              </Box>

              <Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
                <HeroLogo src={QuickksLogo} alt="Quickks - Home Services" />
              </Box>

              <Typography variant="h1" sx={{ fontSize: { xs: "2.8rem", sm: "4rem", md: "5.5rem" }, fontWeight: 900, color: "white", lineHeight: 0.9, letterSpacing: "-3px", mb: 3 }}>
                Powering Homes <br />With <GradientText component="span">Trust</GradientText>
              </Typography>

              <Typography variant="h6" sx={{ color: "#94a3b8", maxWidth: 720, mx: "auto", mb: 2, fontSize: { xs: "1rem", md: "1.25rem" }, lineHeight: 1.6, fontWeight: 400 }}>
                Highest-rated electricians & repair experts. <Box component="span" sx={{ color: "white", fontWeight: 600 }}>30 min response</Box> • 4.9★ • 100% verified
              </Typography>

              <Typography variant="body2" sx={{ color: "#64748b", maxWidth: 600, mx: "auto", mb: 5, fontSize: "0.9rem" }}>
                Book in 30 seconds. Expert at your doorstep in 30 minutes. Premium quality guaranteed.
              </Typography>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" alignItems="center" sx={{ mb: 6 }}>
                <Button variant="contained" size="large" onClick={() => navigate("/register")} endIcon={<ArrowRight size={20} />} sx={{ bgcolor: "#fff", color: "#020617", px: 6, py: 2, borderRadius: 999, fontWeight: 900, fontSize: "1.1rem", textTransform: "none", boxShadow: "0 10px 40px rgba(255,255,255,0.2)", "&:hover": { bgcolor: "#fbbf24", transform: "translateY(-2px)", boxShadow: "0 16px 40px rgba(251,191,36,0.4)" }, transition: "all 0.3s" }}>Get Started - It's Free</Button>
                <Box onClick={() => setShowLocationDialog(true)} sx={{ display: "flex", alignItems: "center", gap: 2, px: 3.5, py: 2, borderRadius: 999, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", backdropFilter: "blur(12px)", "&:hover": { bgcolor: "rgba(255,255,255,0.1)", borderColor: "rgba(251,191,36,0.3)" }, transition: "all 0.3s" }}>
                  <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><MapPin size={20} color="#fbbf24" /></Box>
                  <Box sx={{ textAlign: "left" }}>
                    <Typography variant="caption" sx={{ color: "#64748b", display: "block", fontSize: "0.7rem", fontWeight: 600, letterSpacing: 0.5 }}>YOUR LOCATION</Typography>
                    <Typography variant="body2" sx={{ color: "white", fontWeight: 700 }}>{loadingLocation ? <CircularProgress size={16} sx={{ color: "#fbbf24" }} /> : location || "Detect Location"}</Typography>
                  </Box>
                </Box>
              </Stack>

              <TrustBadges />

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, maxWidth: 800, mx: "auto", mt: 6 }}>
                {statsData.map((stat, index) => (
                  <StatsCard key={index} component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + index * 0.1 }}>
                    <Typography variant="h4" sx={{ color: "white", fontWeight: 900, letterSpacing: "-1px" }}>{stat.value}</Typography>
                    <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600, letterSpacing: 0.5 }}>{stat.label}</Typography>
                  </StatsCard>
                ))}
              </Box>

              <Box sx={{ mt: 8, display: "flex", justifyContent: "center", alignItems: "center", gap: 3 }}>
                <Typography variant="caption" sx={{ color: "#64748b", letterSpacing: 1, fontWeight: 600 }}>FOLLOW US</Typography>
                <Stack direction="row" spacing={1.5}>
                  <IconButton component="a" href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" size="small" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", width: 40, height: 40, "&:hover": { bgcolor: "#E1306C", transform: "translateY(-2px)" } }}><FaInstagram size={16} /></IconButton>
                  <IconButton component="a" href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" size="small" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", width: 40, height: 40, "&:hover": { bgcolor: "#0077B5", transform: "translateY(-2px)" } }}><FaLinkedin size={16} /></IconButton>
                  <IconButton component="a" href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" size="small" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", width: 40, height: 40, "&:hover": { bgcolor: "#1877F2", transform: "translateY(-2px)" } }}><FaFacebook size={16} /></IconButton>
                  <IconButton component="a" href={SOCIALS.twitter} target="_blank" rel="noopener noreferrer" size="small" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#fff", width: 40, height: 40, "&:hover": { bgcolor: "#fff", color: "#000", transform: "translateY(-2px)" } }}><FaTwitter size={16} /></IconButton>
                </Stack>
              </Box>
            </Box>
          </Container>
          <Box sx={{ position: "absolute", top: "20%", left: "10%", width: 400, height: 400, bgcolor: "rgba(251,191,36,0.08)", filter: "blur(100px)", borderRadius: "50%", pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", bottom: "10%", right: "10%", width: 500, height: 500, bgcolor: "rgba(120,119,198,0.1)", filter: "blur(120px)", borderRadius: "50%", pointerEvents: "none" }} />
        </HeroSection>

        <Box ref={featuresRef} sx={{ py: { xs: 8, md: 14 }, bgcolor: "#f8fafc", position: "relative" }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: "center", mb: 8 }}>
              <Chip label="WHY CHOOSE US" sx={{ bgcolor: "#020617", color: "#fbbf24", fontWeight: 800, fontSize: "0.7rem", letterSpacing: 1, mb: 2, px: 2 }} />
              <Typography variant="h2" sx={{ fontWeight: 900, color: "#020617", mb: 2, letterSpacing: "-2px", fontSize: { xs: "2rem", md: "3rem" } }}>Built for Trust & Lightning Speed</Typography>
              <Typography variant="body1" sx={{ color: "#64748b", maxWidth: 600, mx: "auto" }}>Premium SOPs, fastest response. Every pro verified, every service insured.</Typography>
            </Box>
            <Grid container spacing={4}>
              {features.map((feature, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <FeatureCard>
                    <Box sx={{ width: 80, height: 80, borderRadius: 4, bgcolor: "rgba(251, 191, 36, 0.12)", border: "1px solid rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center", mb: 2.5 }}>{feature.icon}</Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: "#020617", mb: 1, letterSpacing: "-0.5px" }}>{feature.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", lineHeight: 1.6 }}>{feature.description}</Typography>
                  </FeatureCard>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>

        <Box ref={servicesRef} sx={{ bgcolor: "white", py: { xs: 8, md: 14 } }}>
          <Container maxWidth="lg">
            <Box sx={{ textAlign: "center", mb: 8 }}>
              <Chip label="OUR SERVICES" sx={{ bgcolor: "rgba(251,191,36,0.12)", color: "#92400e", fontWeight: 800, fontSize: "0.7rem", letterSpacing: 1, mb: 2, border: "1px solid rgba(251,191,36,0.2)" }} />
              <Typography variant="h2" sx={{ fontWeight: 900, color: "#020617", mb: 2, letterSpacing: "-2px", fontSize: { xs: "2rem", md: "3rem" } }}>Professional Services at Your Doorstep</Typography>
              <Typography variant="body1" sx={{ color: "#64748b" }}>30 seconds to book, 30 minutes to arrive. Guaranteed.</Typography>
            </Box>
            {isLoadingServices ? <SectionSkeleton /> : (
              <Grid container spacing={4}>
                {services.map((service, index) => (
                  <Grid item xs={12} sm={6} md={3} key={service.id || index}>
                    <ServiceCard color={service.color} component={motion.div} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }}>
                      {service.popular && <Chip label="MOST POPULAR" size="small" sx={{ position: "absolute", top: 14, right: 14, bgcolor: "#020617", color: "#fbbf24", fontWeight: 800, fontSize: "0.6rem", height: 22 }} />}
                      <CardContent sx={{ p: 0, flex: 1, display: "flex", flexDirection: "column" }}>
                        <Box sx={{ width: 80, height: 80, borderRadius: 4, bgcolor: `${service.color}14`, border: `1px solid ${service.color}22`, display: "flex", alignItems: "center", justifyContent: "center", mb: 2.5 }}>{service.icon}</Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: "#020617", mb: 1, letterSpacing: "-0.5px" }}>{service.title}</Typography>
                        <Typography variant="body2" sx={{ color: "#64748b", mb: 3, flex: 1, lineHeight: 1.6 }}>{service.description}</Typography>
                        <Button variant="contained" onClick={() => navigate("/register")} endIcon={<ArrowRight size={16} />} sx={{ bgcolor: "#020617", color: "white", borderRadius: 3, textTransform: "none", fontWeight: 700, alignSelf: "flex-start", "&:hover": { bgcolor: "#0f172a" } }}>Book Now</Button>
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
              <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.5, px: 3, py: 1.2, borderRadius: 999, bgcolor: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.2)", mb: 3 }}>
                <Box component="img" src={QuickksLogo} alt="logo" sx={{ width: 22, height: 22, bgcolor: "white", borderRadius: 1.5, p: 0.4 }} />
                <Typography variant="caption" sx={{ color: "#fbbf24", fontWeight: 800, letterSpacing: 1 }}>QUICKKS • TRUSTED BY 8K+</Typography>
              </Box>
              <Typography variant="h2" sx={{ color: "white", fontWeight: 900, mb: 2, letterSpacing: "-2px", fontSize: { xs: "2.2rem", md: "3.5rem" } }}>Ready to Experience <br /><Box component="span" sx={{ color: "#fbbf24" }}>Lightning Speed?</Box></Typography>
              <Typography variant="body1" sx={{ color: "#94a3b8", mb: 5, maxWidth: 600, mx: "auto" }}>Join 8,452+ happy customers. Book in 30 sec, expert in 30 min. Follow us for offers.</Typography>
              
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center" sx={{ mb: 6 }}>
                <Button variant="contained" size="large" onClick={() => navigate("/register")} sx={{ bgcolor: "#fff", color: "#020617", px: 6, py: 2, borderRadius: 999, fontWeight: 900, fontSize: "1.05rem", textTransform: "none", "&:hover": { bgcolor: "#fbbf24" } }}>Get Started Free →</Button>
                <Button variant="outlined" size="large" onClick={() => navigate("/login")} sx={{ borderColor: "rgba(255,255,255,0.15)", color: "white", px: 6, py: 2, borderRadius: 999, fontWeight: 700, textTransform: "none", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.05)" } }}>Login</Button>
              </Stack>

              <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                <IconButton component="a" href={SOCIALS.instagram} target="_blank" rel="noopener noreferrer" sx={{ width: 48, height: 48, bgcolor: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", "&:hover": { bgcolor: "#E1306C", transform: "translateY(-2px)" } }}><FaInstagram /></IconButton>
                <IconButton component="a" href={SOCIALS.linkedin} target="_blank" rel="noopener noreferrer" sx={{ width: 48, height: 48, bgcolor: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", "&:hover": { bgcolor: "#0077B5", transform: "translateY(-2px)" } }}><FaLinkedin /></IconButton>
                <IconButton component="a" href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer" sx={{ width: 48, height: 48, bgcolor: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", "&:hover": { bgcolor: "#1877F2", transform: "translateY(-2px)" } }}><FaFacebook /></IconButton>
                <IconButton component="a" href={SOCIALS.twitter} target="_blank" rel="noopener noreferrer" sx={{ width: 48, height: 48, bgcolor: "rgba(255,255,255,0.06)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)", "&:hover": { bgcolor: "#fff", color: "#000", transform: "translateY(-2px)" } }}><FaTwitter /></IconButton>
              </Box>
            </Box>
          </Container>
        </CTASection>

        <Suspense fallback={<Box sx={{ py: 8, bgcolor: "#020617", textAlign: "center" }}><Typography sx={{ color: "#64748b" }}>Loading...</Typography></Box>}><Footer /></Suspense>

        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, bgcolor: "#0f172a", border: "1px solid rgba(255,255,255,0.08)" } }}>
          <DialogTitle sx={{ color: "white", fontWeight: 800, display: "flex", alignItems: "center", gap: 1.5 }}><Box component="img" src={QuickksLogo} alt="" sx={{ width: 28, height: 28, bgcolor: "white", borderRadius: 1.5, p: 0.5 }} />Set Your Location</DialogTitle>
          <DialogContent>
            <TextField fullWidth label="City or Area" placeholder="e.g., Dharampeth, Civil Lines" value={manualLocation} onChange={(e) => setManualLocation(e.target.value)} autoFocus sx={{ mt: 1, "& .MuiOutlinedInput-root": { bgcolor: "rgba(255,255,255,0.04)", borderRadius: 3, color: "white" }, "& .MuiInputLabel-root": { color: "#94a3b8" } }} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setShowLocationDialog(false)} sx={{ color: "#94a3b8" }}>Cancel</Button>
            <Button variant="contained" onClick={handleLocationConfirm} disabled={!manualLocation.trim()} sx={{ bgcolor: "#fbbf24", color: "#020617", fontWeight: 800, borderRadius: 2, px: 3 }}>Confirm Location</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
          <Alert severity={snackbar.severity} onClose={handleCloseSnackbar} sx={{ borderRadius: 3, fontWeight: 600 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
};

export default HomePage; 
