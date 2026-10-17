import React, { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { Helmet } from "react-helmet-async";
import { homeService, API_BASE_URL } from "../api/api";
import { FaWhatsapp } from "react-icons/fa";
import {
  Zap, Wrench, Bolt, Settings, MapPin, ShieldCheck, ChevronRight, ChevronLeft, Menu, X, Star,
  Clock, CreditCard, Search, Phone, LocateFixed, ChevronDown, User, ClipboardList
} from "lucide-react";
import {
  Box, Container, Typography, Button, Card, IconButton, Drawer, List, ListItemButton, ListItemText,
  Divider, useMediaQuery, useTheme, Alert, CircularProgress, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Stack, Fab, Skeleton
} from "@mui/material";
import { styled } from "@mui/material/styles";
import QuickksLogo from "../assets/quickks-logo.png";

const env = import.meta.env || {};

const CONTACT = {
  PHONE_DISPLAY: env.VITE_SUPPORT_PHONE_DISPLAY || "+91 93713 65677",
  PHONE_TEL: env.VITE_SUPPORT_PHONE_TEL || "+919371365677",
  WHATSAPP_NUMBER: env.VITE_WHATSAPP_NUMBER || "919371365677",
  EMAIL: env.VITE_SUPPORT_EMAIL || "support@quickks.com",
};

const C = {
  header: "#131921",
  sub: "#232F3E",
  slate: "#37475A",
  bg: "#EAEDED",
  text: "#0F1111",
  muted: "#565959",
  link: "#007185",
  linkHover: "#C7511F",
  yellow: "#FFD814",
  yellowHover: "#F7CA00",
  yellowBorder: "#FCD200",
  orange: "#FFA41C",
  price: "#B12704",
  border: "#D5D9D9",
  green: "#067D62",
  red: "#CC0C39",
};

const FONT = '"Amazon Ember", "Segoe UI", Arial, sans-serif';
const EXIT_KEY = "quickks_exit_shown";
const LOCATION_KEY = "quickks_location";
const DEFAULT_STATS = { totalCustomers: 8452, totalProviders: 1532, averageRating: 4.8, satisfactionRate: 99.9 };
const HERO_INTERVAL = 6000;

const isDebug = env.VITE_ENABLE_DEBUG_LOGS === "true";
const log = (...a) => { if (isDebug) console.log("[HomePage]", ...a); };
const logError = (...a) => { console.error("[HomePage]", ...a); };

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const storage = {
  get(kind, key) {
    try { return (kind === "session" ? sessionStorage : localStorage).getItem(key); } catch { return null; }
  },
  set(kind, key, value) {
    try { (kind === "session" ? sessionStorage : localStorage).setItem(key, value); } catch { return; }
  },
};

/* ---------- Styled primitives ---------- */

const navStyle = {
  background: "none",
  border: "1px solid transparent",
  color: "#fff",
  font: "inherit",
  fontSize: 14,
  padding: "6px 10px",
  borderRadius: 2,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  "&:hover": { borderColor: "#fff" },
  "&:focus-visible": { outline: `2px solid ${C.orange}`, outlineOffset: 1 },
};
const NavButton = styled("button")(navStyle);
const NavRouterLink = styled(Link)(navStyle);

const PrimaryButton = styled(Button)({
  background: C.yellow,
  color: C.text,
  border: `1px solid ${C.yellowBorder}`,
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 500,
  fontFamily: FONT,
  boxShadow: "none",
  padding: "6px 20px",
  "&:hover": { background: C.yellowHover, boxShadow: "none" },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
  "&.Mui-disabled": { background: "#F0F2F2", color: "#8D9096", borderColor: C.border },
});

const SecondaryButton = styled(Button)({
  background: "#fff",
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 500,
  fontFamily: FONT,
  boxShadow: "none",
  padding: "6px 20px",
  "&:hover": { background: "#F7FAFA", boxShadow: "none" },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
});

const Panel = styled(Card)({
  background: "#fff",
  border: "none",
  borderRadius: 0,
  boxShadow: "none",
  fontFamily: FONT,
});

const FloatingContactButton = styled(Fab)({
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 1100,
  backgroundColor: "#25D366",
  color: "#fff",
  "&:hover": { backgroundColor: "#1DA851" },
});

const TextLink = styled("button")({
  background: "none",
  border: "none",
  padding: 0,
  color: C.link,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: FONT,
  textAlign: "left",
  "&:hover": { textDecoration: "underline", color: C.linkHover },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
});

/* ---------- Data ---------- */

const DEFAULT_SERVICES = [
  { id: 1, icon: <Zap size={44} color="#B45309" />, title: "Electrician", description: "Fans, wiring, switchboards and emergency fixes.", color: "#FEF3C7", popular: true },
  { id: 2, icon: <Wrench size={44} color="#0E7490" />, title: "Appliance Repair", description: "Fridge, washing machine and other home appliances.", color: "#CFFAFE" },
  { id: 3, icon: <Bolt size={44} color="#C2410C" />, title: "Power Backup", description: "Inverter and generator installation and maintenance.", color: "#FFEDD5" },
  { id: 4, icon: <Settings size={44} color="#6D28D9" />, title: "Smart Home", description: "Smart devices, automation and premium setups.", color: "#EDE9FE" },
];

const Footer = lazy(() => import("../components/Footer").catch(() => ({
  default: () => (
    <Box sx={{ py: 4, textAlign: "center", bgcolor: C.header }}>
      <Container maxWidth="lg">
        <Typography sx={{ color: "#DDD", fontSize: 13, fontFamily: FONT }}>© {new Date().getFullYear()} Quickks. All rights reserved.</Typography>
      </Container>
    </Box>
  ),
})));

function Stars({ value = 4.8, size = 16 }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <Box component="span" role="img" aria-label={`${value} out of 5 stars`} sx={{ display: "inline-flex", gap: "1px", verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={C.orange} fill={n <= rounded ? C.orange : "none"} />
      ))}
    </Box>
  );
}

/* ---------- Page ---------- */

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const mountedRef = useRef(true);
  const servicesRef = useRef(null);
  const featuresRef = useRef(null);
  const carouselRef = useRef(null);

  const [location, setLocation] = useState(() => storage.get("local", LOCATION_KEY) || "");
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [manualLocation, setManualLocation] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showExitIntent, setShowExitIntent] = useState(false);
  const [exitEmail, setExitEmail] = useState("");
  const [exitIntentSubmitting, setExitIntentSubmitting] = useState(false);
  const [liveStats, setLiveStats] = useState(DEFAULT_STATS);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    log("Mounted, API:", API_BASE_URL);
    return () => { mountedRef.current = false; };
  }, []);

  /* Exit intent */
  useEffect(() => {
    if (isAuthenticated || storage.get("session", EXIT_KEY)) return undefined;
    const onMouseLeave = (e) => {
      if (e.clientY <= 0) {
        storage.set("session", EXIT_KEY, "1");
        setShowExitIntent(true);
        document.removeEventListener("mouseleave", onMouseLeave);
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [isAuthenticated]);

  /* Stats + popular services */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchHomeStats = async () => {
      try {
        const data = (await homeService.getStats(signal)) || {};
        if (signal.aborted) return;
        setLiveStats({
          totalCustomers: data.totalCustomers || data.customers || DEFAULT_STATS.totalCustomers,
          totalProviders: data.totalProviders || data.providers || DEFAULT_STATS.totalProviders,
          averageRating: data.averageRating || data.rating || DEFAULT_STATS.averageRating,
          satisfactionRate: data.satisfactionRate || DEFAULT_STATS.satisfactionRate,
        });
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || signal.aborted) return;
        logError("Stats fetch failed, using default", err?.response?.status || err?.message);
      } finally {
        if (!signal.aborted) setIsLoadingStats(false);
      }
    };

    const fetchServices = async () => {
      try {
        const data = await homeService.getPopularServices(signal);
        if (signal.aborted) return;
        if (Array.isArray(data) && data.length > 0) {
          setServices(data.map((s, idx) => {
            const fallback = DEFAULT_SERVICES[idx % DEFAULT_SERVICES.length];
            return {
              id: s.id || idx + 1,
              icon: fallback.icon,
              title: s.title || s.name || s.serviceName || "Service",
              description: s.description || s.desc || "Trusted home service",
              color: fallback.color,
              popular: Boolean(s.popular),
              rating: s.rating || s.averageRating || null,
              price: s.startingPrice || s.price || null,
            };
          }));
        }
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || signal.aborted) return;
        logError("Services fetch failed, using default", err?.response?.status || err?.message);
      } finally {
        if (!signal.aborted) setIsLoadingServices(false);
      }
    };

    fetchHomeStats();
    fetchServices();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchHomeStats();
    }, 60000);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  const showMessage = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const saveLocation = useCallback((city) => {
    setLocation(city);
    storage.set("local", LOCATION_KEY, city);
    showMessage(`Location set to ${city}`);
  }, [showMessage]);

  const detectLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      showMessage("Your browser does not support location. Enter your city instead.", "warning");
      return;
    }
    setLoadingLocation(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 });
      });
      const { latitude, longitude } = pos.coords;
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, { headers: { "Accept-Language": "en" } });
      if (!res.ok) throw new Error("reverse geocode failed");
      const data = await res.json();
      const city = data?.address?.city || data?.address?.town || data?.address?.county || data?.address?.state_district;
      if (!city) throw new Error("no city found");
      if (mountedRef.current) {
        saveLocation(city);
        setShowLocationDialog(false);
      }
    } catch (err) {
      logError("Location detection failed", err?.message);
      if (mountedRef.current) showMessage("Could not detect your location. Enter your city instead.", "warning");
    } finally {
      if (mountedRef.current) setLoadingLocation(false);
    }
  }, [saveLocation, showMessage]);

  const handleLocationConfirm = useCallback(() => {
    const city = manualLocation.trim();
    if (!city) return;
    saveLocation(city);
    setShowLocationDialog(false);
    setManualLocation("");
  }, [manualLocation, saveLocation]);

  const scrollToSection = useCallback((ref) => {
    ref?.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }, [prefersReducedMotion]);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`Hi Quickks, I need help${location ? ` in ${location}` : ""}`);
    window.open(`https://wa.me/${CONTACT.WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener,noreferrer");
  }, [location]);

  const handleNewsletter = useCallback(async () => {
    const email = exitEmail.trim().toLowerCase();
    if (!isValidEmail(email)) {
      showMessage("Enter a valid email address.", "error");
      return;
    }
    setExitIntentSubmitting(true);
    try {
      const { default: api } = await import("../api/api");
      await api.post("/newsletter/subscribe", { email });
      if (!mountedRef.current) return;
      showMessage("You are subscribed. Your ₹100 offer is on its way to your inbox.");
      setShowExitIntent(false);
      setExitEmail("");
    } catch (err) {
      logError("Newsletter subscribe failed", err?.response?.status || err?.message);
      if (mountedRef.current) showMessage("We could not subscribe you right now. Please try again.", "error");
    } finally {
      if (mountedRef.current) setExitIntentSubmitting(false);
    }
  }, [exitEmail, showMessage]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    scrollToSection(servicesRef);
  }, [scrollToSection]);

  const scrollCarousel = useCallback((dir) => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }, [prefersReducedMotion]);

  /* ---------- Derived ---------- */

  const cta = useMemo(() => {
    if (!isAuthenticated) return { label: "Get started free", action: () => navigate("/register") };
    const role = user?.role?.toUpperCase();
    if (role === "ADMIN" || role === "SUPER_ADMIN") return { label: "Go to admin", action: () => navigate("/admin/dashboard") };
    if (role === "PROVIDER") return { label: "Provider dashboard", action: () => navigate("/provider/dashboard") };
    return { label: "My dashboard", action: () => navigate("/customer/dashboard") };
  }, [isAuthenticated, user, navigate]);

  const bookAction = useMemo(() => {
    if (!isAuthenticated) return () => navigate("/register");
    return cta.action;
  }, [isAuthenticated, cta, navigate]);

  const features = useMemo(() => [
    { icon: <ShieldCheck size={32} color={C.green} />, title: "Verified professionals", description: "Aadhaar verified and background checked, with ratings you can read before you book." },
    { icon: <Clock size={32} color={C.green} />, title: "Fast response", description: "Book in under a minute. A nearby expert aims to reach you within 30 minutes." },
    { icon: <Star size={32} color={C.green} />, title: "Satisfaction guarantee", description: "If the work is not right, tell us and we will make it right." },
    { icon: <CreditCard size={32} color={C.green} />, title: "Pay your way", description: "UPI, cards or cash on delivery, with up to ₹10K of job protection." },
  ], []);

  const steps = useMemo(() => [
    { title: "Choose a service", description: "Pick what you need fixed or installed and tell us where you are." },
    { title: "Get matched", description: "We send the closest verified professional who is free right now." },
    { title: "Job done, then pay", description: "Review the work, pay securely, and rate your experience." },
  ], []);

  const statsData = useMemo(() => {
    const placeholder = "–";
    return [
      { value: isLoadingStats ? placeholder : `${(liveStats.totalCustomers / 1000).toFixed(1)}K+`, label: "Happy customers" },
      { value: isLoadingStats ? placeholder : `${(liveStats.totalProviders / 1000).toFixed(1)}K+`, label: "Verified professionals" },
      { value: isLoadingStats ? placeholder : `${liveStats.averageRating}`, label: "Average rating", stars: true },
      { value: isLoadingStats ? placeholder : `${liveStats.satisfactionRate}%`, label: "Customer satisfaction" },
    ];
  }, [liveStats, isLoadingStats]);

  const navItems = useMemo(() => [
    { label: "Popular services", ref: servicesRef },
    { label: "Why Quickks", ref: featuresRef },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ], []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.title)))], [services]);

  const visibleServices = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (category !== "All" && s.title !== category) return false;
      if (!q) return true;
      return `${s.title} ${s.description}`.toLowerCase().includes(q);
    });
  }, [services, query, category]);

  const heroSlides = useMemo(() => [
    { title: "Trusted home services, at your door in 30 minutes", text: "Book verified electricians, appliance repair and more. See ratings, pay securely and get a satisfaction guarantee on every job.", from: "#232F3E", to: "#37475A" },
    { title: "Get ₹100 off your first booking", text: "Create a free account today and save on your first service. Verified professionals, secure payment, no surprises.", from: "#0E4B5A", to: "#1F7A8C" },
    { title: "Power cut? Appliance down? We are on it", text: "Emergency electrical fixes and appliance repair from nearby professionals who can reach you fast.", from: "#4A2C0A", to: "#9A5B13" },
  ], []);

  /* Hero auto-rotate (pauses on hover, respects reduced motion) */
  useEffect(() => {
    if (heroPaused || prefersReducedMotion) return undefined;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), HERO_INTERVAL);
    return () => clearInterval(t);
  }, [heroPaused, prefersReducedMotion, heroSlides.length]);

  const greetingName = user?.name || user?.firstName || user?.fullName || "there";
  const closeSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));
  const slide = heroSlides[heroIndex];

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Quickks",
    url: "https://www.quickks.in/",
    telephone: CONTACT.PHONE_TEL,
    email: CONTACT.EMAIL,
    areaServed: location || "India",
  });

  /* ---------- Header pieces ---------- */

  const locationBlock = (
    <Box
      component="button"
      type="button"
      onClick={() => setShowLocationDialog(true)}
      aria-label="Change location"
      sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, color: "#fff", background: "none", border: "1px solid transparent", borderRadius: "2px", p: "6px 8px", cursor: "pointer", fontFamily: FONT, textAlign: "left", "&:hover": { borderColor: "#fff" }, "&:focus-visible": { outline: `2px solid ${C.orange}` } }}
    >
      <MapPin size={20} />
      <Box>
        <Typography component="span" sx={{ display: "block", fontSize: 12, color: "#CCC", lineHeight: 1.1, fontFamily: FONT }}>Serving</Typography>
        <Typography component="span" sx={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.2, fontFamily: FONT }}>
          {loadingLocation ? "Detecting…" : location || "Set location"}
        </Typography>
      </Box>
    </Box>
  );

  const searchBar = (
    <Box component="form" onSubmit={handleSearch} role="search" sx={{ display: "flex", flex: 1, minWidth: 0, borderRadius: "6px", overflow: "hidden", bgcolor: "#fff", "&:focus-within": { boxShadow: `0 0 0 3px ${C.orange}` } }}>
      {!isMobile && (
        <Box sx={{ position: "relative", bgcolor: "#E6E6E6", borderRight: "1px solid #CDCDCD", display: "flex", alignItems: "center" }}>
          <Box
            component="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Search category"
            sx={{ appearance: "none", border: "none", outline: "none", bgcolor: "transparent", color: "#555", fontSize: 12, fontFamily: FONT, pl: 1.5, pr: 3, height: "100%", cursor: "pointer", maxWidth: 140 }}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Box>
          <Box sx={{ position: "absolute", right: 8, pointerEvents: "none", display: "flex", color: "#555" }}><ChevronDown size={12} /></Box>
        </Box>
      )}
      <Box
        component="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Quickks, e.g. fan repair"
        aria-label="Search services"
        sx={{ flex: 1, minWidth: 0, border: "none", outline: "none", px: 1.5, py: 1.1, fontSize: 15, fontFamily: FONT, color: C.text }}
      />
      <Box component="button" type="submit" aria-label="Search" sx={{ bgcolor: C.orange, border: "none", px: 2, cursor: "pointer", display: "flex", alignItems: "center", color: C.header, "&:hover": { bgcolor: "#FA8900" } }}>
        <Search size={20} />
      </Box>
    </Box>
  );

  /* ---------- Reusable service card (carousel + grid) ---------- */

  const ServiceCard = ({ s, compact = false }) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: compact ? 0 : 0 }}>
      <Box sx={{ position: "relative", height: 150, bgcolor: s.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>
        {s.icon}
        {s.popular && (
          <Box sx={{ position: "absolute", top: 8, left: 0, bgcolor: C.red, color: "#fff", fontSize: 12, fontWeight: 700, px: 1, py: 0.25, borderRadius: "0 2px 2px 0", fontFamily: FONT }}>Most booked</Box>
        )}
      </Box>
      <Typography component="h3" sx={{ fontSize: 16, fontWeight: 500, lineHeight: 1.3, mb: 0.5, fontFamily: FONT, color: C.text }}>{s.title}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
        <Typography sx={{ color: C.text, fontSize: 13, fontFamily: FONT }}>{s.rating || liveStats.averageRating}</Typography>
        <Stars value={s.rating || liveStats.averageRating} size={14} />
      </Box>
      <Typography sx={{ color: C.muted, fontSize: 13, lineHeight: 1.45, mb: 1, flex: 1, fontFamily: FONT }}>{s.description}</Typography>
      {s.price && (
        <Typography sx={{ color: C.text, fontSize: 20, lineHeight: 1.1, mb: 0.5, fontFamily: FONT }}>
          <Box component="span" sx={{ fontSize: 13, color: C.muted }}>From </Box>₹{s.price}
        </Typography>
      )}
      <Typography sx={{ color: C.green, fontSize: 13, fontWeight: 600, mb: 1.5, fontFamily: FONT }}>Typical response: 30 minutes</Typography>
      <PrimaryButton fullWidth onClick={bookAction}>Book now</PrimaryButton>
    </Box>
  );

  /* ---------- Render ---------- */

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Quickks – Electrician, Appliance Repair and Home Services</title>
        <meta name="description" content="Book verified electricians, appliance repair and home service experts near you. Fast response, secure payment and a satisfaction guarantee." />
        <link rel="canonical" href="https://www.quickks.in/" />
        <meta property="og:title" content="Quickks – Trusted Home Services" />
        <meta property="og:description" content="Verified professionals at your door, fast. Book electricians, appliance repair and more." />
        <meta property="og:url" content="https://www.quickks.in/" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{jsonLd}</script>
      </Helmet>

      <Box sx={{ minHeight: "100vh", bgcolor: C.bg, fontFamily: FONT, color: C.text, overflowX: "hidden" }}>
        <FloatingContactButton onClick={handleWhatsApp} aria-label="Chat on WhatsApp"><FaWhatsapp size={28} /></FloatingContactButton>

        {/* ===== Header ===== */}
        <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 1000 }}>
          <Box sx={{ bgcolor: C.header, py: 1 }}>
            <Container maxWidth="xl">
              <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 }, flexWrap: { xs: "wrap", md: "nowrap" } }}>
                <Box component="button" type="button" onClick={() => navigate("/")} aria-label="Quickks home" sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "1px solid transparent", borderRadius: "2px", p: "4px 8px", cursor: "pointer", "&:hover": { borderColor: "#fff" }, "&:focus-visible": { outline: `2px solid ${C.orange}` } }}>
                  <Box component="img" src={QuickksLogo} alt="" sx={{ width: 36, height: 36, objectFit: "contain", bgcolor: "#fff", borderRadius: "8px", p: "4px" }} />
                  <Typography sx={{ fontWeight: 800, color: "#fff", fontSize: 22, letterSpacing: "-0.5px", fontFamily: FONT }}>Quickks<Box component="span" sx={{ color: C.orange }}>.</Box></Typography>
                </Box>

                {!isMobile && locationBlock}
                {!isMobile && searchBar}

                {!isMobile && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}>
                    {isAuthenticated ? (
                      <NavButton type="button" onClick={cta.action} aria-label={cta.label}>
                        <Box component="span" sx={{ textAlign: "left", lineHeight: 1.2 }}>
                          <Box component="span" sx={{ display: "block", fontSize: 12 }}>Hello, {greetingName}</Box>
                          <Box component="span" sx={{ display: "block", fontSize: 14, fontWeight: 700 }}>{cta.label}</Box>
                        </Box>
                      </NavButton>
                    ) : (
                      <NavButton type="button" onClick={() => navigate("/login")} aria-label="Sign in">
                        <Box component="span" sx={{ textAlign: "left", lineHeight: 1.2 }}>
                          <Box component="span" sx={{ display: "block", fontSize: 12 }}>Hello, sign in</Box>
                          <Box component="span" sx={{ display: "block", fontSize: 14, fontWeight: 700 }}>Account</Box>
                        </Box>
                      </NavButton>
                    )}
                    <NavButton type="button" onClick={() => navigate(isAuthenticated ? "/customer/dashboard" : "/login")} aria-label="My bookings">
                      <ClipboardList size={22} />
                      <Box component="span" sx={{ fontWeight: 700 }}>Bookings</Box>
                    </NavButton>
                    {!isAuthenticated && <PrimaryButton onClick={() => navigate("/register")} sx={{ ml: 1 }}>Get started</PrimaryButton>}
                  </Box>
                )}

                {isMobile && (
                  <IconButton onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" sx={{ color: "#fff", ml: "auto" }}><Menu size={24} /></IconButton>
                )}

                {isMobile && <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }}>{searchBar}{locationBlock}</Box>}
              </Box>
            </Container>
          </Box>

          {!isMobile && (
            <Box sx={{ bgcolor: C.sub }}>
              <Container maxWidth="xl">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, py: 0.5 }}>
                  <NavButton type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open all menu" sx={{ fontWeight: 700 }}>
                    <Menu size={18} /> All
                  </NavButton>
                  {navItems.map((item) => (
                    item.to
                      ? <NavRouterLink key={item.label} to={item.to}>{item.label}</NavRouterLink>
                      : <NavButton key={item.label} type="button" onClick={() => scrollToSection(item.ref)}>{item.label}</NavButton>
                  ))}
                  <Box sx={{ ml: "auto" }}>
                    <NavRouterLink as="a" href={`tel:${CONTACT.PHONE_TEL}`} aria-label={`Call ${CONTACT.PHONE_DISPLAY}`}>
                      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontWeight: 700 }}><Phone size={14} />{CONTACT.PHONE_DISPLAY}</Box>
                    </NavRouterLink>
                  </Box>
                </Box>
              </Container>
            </Box>
          )}
        </Box>

        {/* ===== Mobile / All drawer ===== */}
        <Drawer anchor={isMobile ? "right" : "left"} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 300, bgcolor: "#fff", color: C.text } }}>
          <Box sx={{ bgcolor: C.sub, color: "#fff", p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <User size={20} />
              <Typography sx={{ fontWeight: 700, fontFamily: FONT }}>{isAuthenticated ? `Hello, ${greetingName}` : "Hello, sign in"}</Typography>
            </Box>
            <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" sx={{ color: "#fff" }}><X size={20} /></IconButton>
          </Box>
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                {...(item.to ? { component: Link, to: item.to } : {})}
                onClick={() => { setMobileMenuOpen(false); if (item.ref) scrollToSection(item.ref); }}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            <ListItemButton component="a" href={`tel:${CONTACT.PHONE_TEL}`}><ListItemText primary={`Call ${CONTACT.PHONE_DISPLAY}`} /></ListItemButton>
          </List>
          <Divider />
          <Stack spacing={1.5} sx={{ p: 2 }}>
            {isAuthenticated ? (
              <PrimaryButton fullWidth onClick={() => { setMobileMenuOpen(false); cta.action(); }}>{cta.label}</PrimaryButton>
            ) : (
              <>
                <PrimaryButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/register"); }}>Get started</PrimaryButton>
                <SecondaryButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}>Sign in</SecondaryButton>
              </>
            )}
          </Stack>
        </Drawer>

        <Box component="main">
          {/* ===== Hero carousel ===== */}
          <Box
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocus={() => setHeroPaused(true)}
            onBlur={() => setHeroPaused(false)}
            sx={{ position: "relative", background: `linear-gradient(180deg, ${slide.from} 0%, ${slide.to} 55%, ${C.bg} 100%)`, transition: prefersReducedMotion ? "none" : "background 0.6s", pt: { xs: 5, md: 8 }, pb: { xs: 22, md: 30 } }}
          >
            <Container maxWidth="lg">
              <Box aria-live="polite" sx={{ maxWidth: 680, px: { xs: 0, md: 6 } }}>
                <Typography component="h1" sx={{ color: "#fff", fontWeight: 700, fontFamily: FONT, fontSize: { xs: "1.9rem", md: "2.9rem" }, lineHeight: 1.15, mb: 2 }}>
                  {slide.title}
                </Typography>
                <Typography sx={{ color: "#E3E6E6", fontSize: { xs: 16, md: 18 }, mb: 3, lineHeight: 1.55, fontFamily: FONT }}>{slide.text}</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <PrimaryButton size="large" onClick={cta.action} sx={{ px: 4, py: 1.1, fontSize: 16 }}>{cta.label}</PrimaryButton>
                  <SecondaryButton size="large" onClick={() => scrollToSection(servicesRef)} sx={{ px: 4, py: 1.1, fontSize: 16 }}>Browse services</SecondaryButton>
                </Stack>
              </Box>
            </Container>

            {!isMobile && (
              <>
                <IconButton onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)} aria-label="Previous slide" sx={{ position: "absolute", left: 8, top: "35%", color: "#fff", borderRadius: 1, height: 120, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}><ChevronLeft size={44} /></IconButton>
                <IconButton onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)} aria-label="Next slide" sx={{ position: "absolute", right: 8, top: "35%", color: "#fff", borderRadius: 1, height: 120, "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}><ChevronRight size={44} /></IconButton>
              </>
            )}
            <Box sx={{ position: "absolute", bottom: { xs: 150, md: 230 }, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 1 }}>
              {heroSlides.map((_, i) => (
                <Box key={i} component="button" type="button" onClick={() => setHeroIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === heroIndex} sx={{ width: 10, height: 10, p: 0, borderRadius: "50%", border: "1px solid #fff", bgcolor: i === heroIndex ? "#fff" : "transparent", cursor: "pointer" }} />
              ))}
            </Box>
          </Box>

          {/* ===== Overlapping quick-card row (Amazon signature) ===== */}
          <Container maxWidth="xl" sx={{ mt: { xs: -18, md: -26 }, position: "relative", zIndex: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5 }}>
              {/* Sign-in / welcome card */}
              <Panel sx={{ p: 2.5, display: "flex", flexDirection: "column" }}>
                {isAuthenticated ? (
                  <>
                    <Typography component="h2" sx={{ fontSize: 21, fontWeight: 700, mb: 1, fontFamily: FONT }}>Welcome back, {greetingName}</Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14, mb: 2, flex: 1, fontFamily: FONT }}>Pick up where you left off or book something new.</Typography>
                    <PrimaryButton fullWidth onClick={cta.action}>{cta.label}</PrimaryButton>
                  </>
                ) : (
                  <>
                    <Typography component="h2" sx={{ fontSize: 21, fontWeight: 700, mb: 1, fontFamily: FONT }}>Sign in for the best experience</Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14, mb: 2, flex: 1, fontFamily: FONT }}>Track your professional, save addresses and rebook in one tap.</Typography>
                    <Stack spacing={1.25}>
                      <PrimaryButton fullWidth onClick={() => navigate("/login")}>Sign in securely</PrimaryButton>
                      <SecondaryButton fullWidth onClick={() => navigate("/register")}>Create your account</SecondaryButton>
                    </Stack>
                  </>
                )}
              </Panel>

              {/* Three quick cards from the popular services */}
              {services.slice(0, 3).map((s, idx) => (
                <Panel key={`quick-${s.id || idx}`} sx={{ p: 2.5, display: "flex", flexDirection: "column" }}>
                  <Typography component="h2" sx={{ fontSize: 21, fontWeight: 700, mb: 1.5, fontFamily: FONT }}>{s.title}</Typography>
                  <Box sx={{ height: 150, bgcolor: s.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5 }}>{s.icon}</Box>
                  <Typography sx={{ color: C.muted, fontSize: 13, mb: 1.5, flex: 1, fontFamily: FONT }}>{s.description}</Typography>
                  <TextLink type="button" onClick={() => { setQuery(s.title); scrollToSection(servicesRef); }}>See availability</TextLink>
                </Panel>
              ))}
            </Box>
          </Container>

          {/* ===== Stats strip ===== */}
          <Container maxWidth="xl" sx={{ mt: 2.5 }}>
            <Panel sx={{ p: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
                {statsData.map((stat) => (
                  <Box key={stat.label} sx={{ textAlign: "center", py: 1 }}>
                    <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 700, lineHeight: 1.1, fontFamily: FONT }}>{stat.value}</Typography>
                    {stat.stars && !isLoadingStats && <Box sx={{ mt: 0.5 }}><Stars value={liveStats.averageRating} size={15} /></Box>}
                    <Typography sx={{ color: C.muted, fontSize: 14, mt: 0.5, fontFamily: FONT }}>{stat.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Panel>
          </Container>

          {/* ===== Popular services (carousel row) ===== */}
          <Box ref={servicesRef} id="services" sx={{ pt: 2.5, scrollMarginTop: 130 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2, md: 2.5 }, position: "relative" }}>
                <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 1.5, mb: 2 }}>
                  <Typography component="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, fontFamily: FONT }}>
                    Popular services{location ? ` in ${location}` : ""}
                  </Typography>
                  {(query || category !== "All") && <TextLink type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear search</TextLink>}
                </Box>

                {isLoadingServices ? (
                  <Box sx={{ display: "flex", gap: 2, overflow: "hidden" }}>
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rectangular" height={340} sx={{ flex: "0 0 220px" }} />)}
                  </Box>
                ) : visibleServices.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 0.5, fontFamily: FONT }}>No services match “{query}”</Typography>
                    <Typography sx={{ color: C.muted, mb: 2, fontFamily: FONT }}>Check the spelling or search for a broader term like “electrician”.</Typography>
                    <SecondaryButton onClick={() => { setQuery(""); setCategory("All"); }}>Show all services</SecondaryButton>
                  </Box>
                ) : (
                  <Box sx={{ position: "relative" }}>
                    {!isMobile && (
                      <IconButton onClick={() => scrollCarousel(-1)} aria-label="Scroll services left" sx={{ position: "absolute", left: -8, top: "35%", zIndex: 2, bgcolor: "#fff", border: `1px solid ${C.border}`, borderRadius: 1, boxShadow: "0 2px 5px rgba(0,0,0,0.2)", "&:hover": { bgcolor: "#F7FAFA" } }}><ChevronLeft size={28} /></IconButton>
                    )}
                    <Box
                      ref={carouselRef}
                      role="list"
                      sx={{ display: "flex", gap: 2, overflowX: "auto", scrollSnapType: "x proximity", pb: 1, scrollbarWidth: "thin" }}
                    >
                      {visibleServices.map((s, idx) => (
                        <Box key={s.id || idx} role="listitem" sx={{ flex: { xs: "0 0 70%", sm: "0 0 38%", md: "0 0 24%", lg: "0 0 19%" }, scrollSnapAlign: "start", minWidth: 200 }}>
                          <ServiceCard s={s} />
                        </Box>
                      ))}
                    </Box>
                    {!isMobile && (
                      <IconButton onClick={() => scrollCarousel(1)} aria-label="Scroll services right" sx={{ position: "absolute", right: -8, top: "35%", zIndex: 2, bgcolor: "#fff", border: `1px solid ${C.border}`, borderRadius: 1, boxShadow: "0 2px 5px rgba(0,0,0,0.2)", "&:hover": { bgcolor: "#F7FAFA" } }}><ChevronRight size={28} /></IconButton>
                    )}
                  </Box>
                )}
              </Panel>
            </Container>
          </Box>

          {/* ===== Why Quickks ===== */}
          <Box ref={featuresRef} id="features" sx={{ pt: 2.5, scrollMarginTop: 130 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2, md: 2.5 } }}>
                <Typography component="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, mb: 2, fontFamily: FONT }}>Why customers book with Quickks</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
                  {features.map((f) => (
                    <Box key={f.title} sx={{ p: 2, border: `1px solid ${C.border}`, borderRadius: "8px" }}>
                      <Box sx={{ mb: 1.5 }}>{f.icon}</Box>
                      <Typography component="h3" sx={{ fontSize: 17, fontWeight: 700, mb: 0.5, fontFamily: FONT }}>{f.title}</Typography>
                      <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.55, fontFamily: FONT }}>{f.description}</Typography>
                    </Box>
                  ))}
                </Box>
              </Panel>
            </Container>
          </Box>

          {/* ===== How it works ===== */}
          <Box sx={{ pt: 2.5 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2, md: 2.5 } }}>
                <Typography component="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, mb: 2, fontFamily: FONT }}>How it works</Typography>
                <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
                  {steps.map((s, i) => (
                    <Box component="li" key={s.title} sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                      <Box sx={{ flexShrink: 0, width: 32, height: 32, borderRadius: "50%", bgcolor: C.sub, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontFamily: FONT }}>{i + 1}</Box>
                      <Box>
                        <Typography component="h3" sx={{ fontSize: 17, fontWeight: 700, mb: 0.25, fontFamily: FONT }}>{s.title}</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.55, fontFamily: FONT }}>{s.description}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Panel>
            </Container>
          </Box>

          {/* ===== Bottom sign-in strip (Amazon "See personalized recommendations") ===== */}
          <Box sx={{ py: 3 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2.5, md: 4 }, textAlign: "center", borderTop: `1px solid ${C.border}` }}>
                <Typography component="h2" sx={{ fontSize: { xs: 20, md: 24 }, fontWeight: 700, mb: 1, fontFamily: FONT }}>Ready to get it fixed?</Typography>
                <Typography sx={{ color: C.muted, mb: 2.5, fontFamily: FONT }}>
                  Questions before you book? Call <Box component="a" href={`tel:${CONTACT.PHONE_TEL}`} sx={{ color: C.link }}>{CONTACT.PHONE_DISPLAY}</Box> or write to <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: C.link }}>{CONTACT.EMAIL}</Box>.
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                  <PrimaryButton size="large" onClick={cta.action} sx={{ px: 5 }}>{cta.label}</PrimaryButton>
                  {!isAuthenticated && <SecondaryButton size="large" onClick={() => navigate("/login")} sx={{ px: 5 }}>Sign in</SecondaryButton>}
                </Stack>
              </Panel>
            </Container>
          </Box>
        </Box>

        {/* ===== Back to top + footer ===== */}
        <Box component="button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })} sx={{ display: "block", width: "100%", bgcolor: C.slate, color: "#fff", border: "none", py: 1.75, cursor: "pointer", fontSize: 13, fontFamily: FONT, "&:hover": { bgcolor: "#485769" }, "&:focus-visible": { outline: `2px solid ${C.orange}`, outlineOffset: -2 } }}>
          Back to top
        </Box>

        <Suspense fallback={<Box sx={{ py: 4, textAlign: "center", bgcolor: C.header }}><CircularProgress size={24} sx={{ color: C.orange }} /></Box>}>
          <Footer />
        </Suspense>

        {/* ===== Dialogs ===== */}
        <Dialog open={showExitIntent && !isAuthenticated} onClose={() => setShowExitIntent(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontFamily: FONT }}>Get ₹100 off your first booking</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 1.5, fontFamily: FONT }}>Enter your email and we will send the offer.</Typography>
            <TextField
              fullWidth
              autoFocus
              type="email"
              label="Email address"
              value={exitEmail}
              onChange={(e) => setExitEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleNewsletter(); }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <SecondaryButton onClick={() => setShowExitIntent(false)}>No thanks</SecondaryButton>
            <PrimaryButton onClick={handleNewsletter} disabled={exitIntentSubmitting}>
              {exitIntentSubmitting ? <CircularProgress size={20} /> : "Send my offer"}
            </PrimaryButton>
          </DialogActions>
        </Dialog>

        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
          <DialogTitle sx={{ fontWeight: 700, fontFamily: FONT }}>Choose your location</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2, fontFamily: FONT }}>We show professionals and response times for your area.</Typography>
            <SecondaryButton fullWidth onClick={detectLocation} disabled={loadingLocation} startIcon={loadingLocation ? <CircularProgress size={16} /> : <LocateFixed size={18} />} sx={{ mb: 2 }}>
              {loadingLocation ? "Detecting…" : "Use my current location"}
            </SecondaryButton>
            <TextField
              fullWidth
              label="City or area"
              placeholder="Enter your city or area"
              value={manualLocation}
              onChange={(e) => setManualLocation(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleLocationConfirm(); }}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <SecondaryButton onClick={() => setShowLocationDialog(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleLocationConfirm} disabled={!manualLocation.trim()}>Apply</PrimaryButton>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
}