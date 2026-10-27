import React, { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { Helmet } from "react-helmet-async";
import { homeService, API_BASE_URL } from "../api/api";
import { FaWhatsapp } from "react-icons/fa";
import {
  Zap, Wrench, Bolt, Settings, MapPin, ShieldCheck, ChevronRight, ChevronLeft, Menu, X, Star,
  Clock, CreditCard, Search, Phone, LocateFixed, ChevronDown, User, ClipboardList, Mail, Shield, Award, Sparkles
} from "lucide-react";
import {
  Box, Container, Typography, Button, Card, IconButton, Drawer, List, ListItemButton, ListItemText,
  Divider, useMediaQuery, useTheme, Alert, CircularProgress, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Stack, Fab, Skeleton
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import QuickksLogo from "../assets/quickks-logo.png";

const env = import.meta.env || {};

const CONTACT = {
  PHONE_DISPLAY: env.VITE_SUPPORT_PHONE_DISPLAY || "+91 93713 65677",
  PHONE_TEL: env.VITE_SUPPORT_PHONE_TEL || "+919371365677",
  WHATSAPP_NUMBER: env.VITE_WHATSAPP_NUMBER || "919371365677",
  EMAIL: env.VITE_SUPPORT_EMAIL || "connect@quickks.in",
  DOMAIN: "www.quickks.in",
};

// ✅ NO AMAZON FONT - Security + Copyright fix
const FONT = '"Inter", "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
const EXIT_KEY = "quickks_exit_shown_v82";
const LOCATION_KEY = "quickks_location_v82";
const DEFAULT_STATS = { totalCustomers: 8452, totalProviders: 1532, averageRating: 4.8, satisfactionRate: 99.9 };
const HERO_INTERVAL = 5500;

const isDebug = env.VITE_ENABLE_DEBUG_LOGS === "true";
const log = (...a) => { if (isDebug) console.log("[HomePage]", ...a); };
const logError = (...a) => { console.error("[HomePage]", ...a); };

const BLOCKED_LOCATION = /am+a?b[ae]?j?ogai/i;

// Security: sanitize input
const sanitize = (str) => String(str || "").trim().slice(0, 100).replace(/[<>]/g, "");
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim()) && String(email).length <= 100;

const formatCount = (n) => {
  const v = Number(n) || 0;
  if (v <= 0) return "0+";
  if (v >= 1000000) return `${(v / 1000000).toFixed(1).replace(/\.0$/, "")}M+`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}K+`;
  return `${Math.round(v)}+`;
};

const storage = {
  get(kind, key) {
    try { return (kind === "session" ? sessionStorage : localStorage).getItem(key); } catch { return null; }
  },
  set(kind, key, value) {
    try { (kind === "session" ? sessionStorage : localStorage).setItem(key, value); } catch {}
  }
};

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ✅ Premium Colors - No Amazon copy
const C = {
  header: "#0f172a",
  sub: "#1e293b",
  slate: "#334155",
  bg: "#f8fafc",
  bgGradient: "linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)",
  text: "#0f172a",
  muted: "#64748b",
  link: "#0e7490",
  linkHover: "#0c6580",
  yellow: "#fbbf24",
  yellowHover: "#f59e0b",
  yellowBorder: "#fcd34d",
  orange: "#f59e0b",
  price: "#dc2626",
  border: "#e2e8f0",
  green: "#059669",
  red: "#dc2626",
  cardShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.05)",
  cardShadowHover: "0 20px 25px -5px rgba(0,0,0,0.08), 0 10px 10px -5px rgba(0,0,0,0.04)",
};

const navStyle = {
  background: "none",
  border: "1px solid transparent",
  color: "#fff",
  font: "inherit",
  fontSize: 14,
  fontWeight: 500,
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  textDecoration: "none",
  whiteSpace: "nowrap",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  transition: "all 0.2s ease",
  "&:hover": { borderColor: "rgba(255,255,255,0.2)", bgcolor: "rgba(255,255,255,0.08)" },
  "&:focus-visible": { outline: `2px solid ${C.yellow}`, outlineOffset: 2 },
};

const NavButton = styled("button")(navStyle);
const NavRouterLink = styled(Link)(navStyle);

const PrimaryButton = styled(Button)({
  background: `linear-gradient(135deg, ${C.yellow} 0%, ${C.yellowHover} 100%)`,
  color: C.text,
  border: `1px solid ${C.yellowBorder}`,
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  boxShadow: "0 4px 12px rgba(251,191,36,0.25)",
  padding: "8px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: `linear-gradient(135deg, ${C.yellowHover} 0%, #d97706 100%)`, boxShadow: "0 6px 16px rgba(251,191,36,0.35)", transform: "translateY(-1px)" },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
  "&.Mui-disabled": { background: "#f1f5f9", color: "#94a3b8", borderColor: C.border, boxShadow: "none" },
});

const SecondaryButton = styled(Button)({
  background: "#fff",
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 999,
  textTransform: "none",
  fontWeight: 600,
  fontFamily: FONT,
  boxShadow: C.cardShadow,
  padding: "8px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: "#f8fafc", boxShadow: C.cardShadowHover, transform: "translateY(-1px)" },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2 },
});

const Panel = styled(Card)({
  background: "#fff",
  border: "1px solid rgba(226,232,240,0.8)",
  borderRadius: 16,
  boxShadow: C.cardShadow,
  fontFamily: FONT,
  overflow: "hidden",
  transition: "all 0.3s ease",
  animation: `${fadeIn} 0.5s ease-out`,
  "&:hover": { boxShadow: C.cardShadowHover },
});

const FloatingContactButton = styled(Fab)({
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 1100,
  backgroundColor: "#25D366",
  color: "#fff",
  boxShadow: "0 8px 24px rgba(37,211,102,0.35)",
  "&:hover": { backgroundColor: "#1DA851", transform: "translateY(-2px)", boxShadow: "0 12px 28px rgba(37,211,102,0.4)" },
  transition: "all 0.2s ease",
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
  fontWeight: 600,
  transition: "color 0.2s",
  "&:hover": { textDecoration: "underline", color: C.linkHover },
  "&:focus-visible": { outline: `2px solid ${C.link}`, outlineOffset: 2, borderRadius: 2 },
});

const DEFAULT_SERVICES = [
  { id: 1, icon: <Zap size={44} color="#b45309" />, title: "Electrician", description: "Fans, wiring, switchboards and emergency fixes. Verified pros in 30 min.", color: "#fef3c7", popular: true },
  { id: 2, icon: <Wrench size={44} color="#0e7490" />, title: "Appliance Repair", description: "Fridge, washing machine and home appliances. Warranty backed.", color: "#cffafe" },
  { id: 3, icon: <Bolt size={44} color="#c2410c" />, title: "Power Backup", description: "Inverter and generator installation. 24/7 emergency support.", color: "#ffedd5" },
  { id: 4, icon: <Settings size={44} color="#6d28d9" />, title: "Smart Home", description: "Smart devices, automation and premium setups. Certified experts.", color: "#ede9fe" },
];

const Footer = lazy(() => import("../components/Footer").catch(() => ({
  default: () => (
    <Box sx={{ py: 4, textAlign: "center", bgcolor: C.header }}>
      <Container maxWidth="lg">
        <Typography sx={{ color: "#94a3b8", fontSize: 13, fontFamily: FONT }}>© {new Date().getFullYear()} Quickks. {CONTACT.EMAIL}</Typography>
      </Container>
    </Box>
  ),
})));

function Stars({ value = 4.8, size = 16 }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const rounded = Math.round(v);
  return (
    <Box component="span" role="img" aria-label={`${v} out of 5 stars`} sx={{ display: "inline-flex", gap: "2px", verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={C.orange} fill={n <= rounded ? C.orange : "none"} strokeWidth={n <= rounded ? 0 : 1.5} />
      ))}
    </Box>
  );
}

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

  const [location, setLocation] = useState(() => {
    const saved = storage.get("local", LOCATION_KEY) || "";
    if (!saved || BLOCKED_LOCATION.test(saved)) return "";
    return sanitize(saved);
  });
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

  useEffect(() => {
    if (isAuthenticated || storage.get("session", EXIT_KEY)) return undefined;
    const onMouseLeave = (e) => {
      if (e.clientY <= 0 && mountedRef.current) {
        storage.set("session", EXIT_KEY, "1");
        setShowExitIntent(true);
        document.removeEventListener("mouseleave", onMouseLeave);
      }
    };
    document.addEventListener("mouseleave", onMouseLeave);
    return () => document.removeEventListener("mouseleave", onMouseLeave);
  }, [isAuthenticated]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchHomeStats = async () => {
      try {
        const data = (await homeService.getStats(signal)) || {};
        if (signal.aborted || !mountedRef.current) return;
        const payload = data.data || data;
        setLiveStats({
          totalCustomers: Number(payload.totalCustomers || payload.customers || DEFAULT_STATS.totalCustomers),
          totalProviders: Number(payload.totalProviders || payload.providers || DEFAULT_STATS.totalProviders),
          averageRating: Number(payload.averageRating || payload.rating || DEFAULT_STATS.averageRating),
          satisfactionRate: Number(payload.satisfactionRate || DEFAULT_STATS.satisfactionRate),
        });
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || signal.aborted) return;
        logError("Stats fetch failed", err?.response?.status || err?.message);
      } finally {
        if (!signal.aborted && mountedRef.current) setIsLoadingStats(false);
      }
    };

    const fetchServices = async () => {
      try {
        const data = await homeService.getPopularServices(signal);
        if (signal.aborted || !mountedRef.current) return;
        const list = Array.isArray(data) ? data : data?.data || data?.items || [];
        if (Array.isArray(list) && list.length > 0) {
          setServices(list.map((s, idx) => {
            const fallback = DEFAULT_SERVICES[idx % DEFAULT_SERVICES.length];
            return {
              id: s.id || idx + 1,
              icon: fallback.icon,
              title: sanitize(s.title || s.name || s.serviceName || fallback.title),
              description: sanitize(s.description || s.desc || fallback.description),
              color: fallback.color,
              popular: Boolean(s.popular) || idx === 0,
              rating: s.rating || s.averageRating || null,
              price: s.startingPrice || s.price || null,
            };
          }));
        }
      } catch (err) {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || signal.aborted) return;
        logError("Services fetch failed", err?.response?.status || err?.message);
      } finally {
        if (!signal.aborted && mountedRef.current) setIsLoadingServices(false);
      }
    };

    fetchHomeStats();
    fetchServices();

    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && mountedRef.current) fetchHomeStats();
    }, 60000);

    return () => {
      clearInterval(interval);
      controller.abort();
    };
  }, []);

  const showMessage = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message: sanitize(String(message)).slice(0, 200), severity });
  }, []);

  const saveLocation = useCallback((city) => {
    const clean = sanitize(city);
    if (!clean || BLOCKED_LOCATION.test(clean)) {
      showMessage("Please enter a valid city", "warning");
      return;
    }
    setLocation(clean);
    storage.set("local", LOCATION_KEY, clean);
    showMessage(`Location set to ${clean}`);
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
      // Security: No API key exposed, OSM public API
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`, { 
        headers: { "Accept-Language": "en" },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error("reverse geocode failed");
      const data = await res.json();
      const city = sanitize(data?.address?.city || data?.address?.town || data?.address?.village || data?.address?.county || data?.address?.state_district);
      if (!city) throw new Error("no city found");
      if (mountedRef.current) {
        saveLocation(city);
        setShowLocationDialog(false);
      }
    } catch (err) {
      logError("Location detection failed", err?.message);
      if (mountedRef.current) showMessage("Could not detect location. Enter your city instead.", "warning");
    } finally {
      if (mountedRef.current) setLoadingLocation(false);
    }
  }, [saveLocation, showMessage]);

  const handleLocationConfirm = useCallback(() => {
    const city = sanitize(manualLocation);
    if (!city) return;
    saveLocation(city);
    setShowLocationDialog(false);
    setManualLocation("");
  }, [manualLocation, saveLocation]);

  const scrollToSection = useCallback((ref) => {
    ref?.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
  }, [prefersReducedMotion]);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`Hi Quickks Team, I need help${location ? ` in ${location}` : ""}. Contact: ${CONTACT.EMAIL}`);
    window.open(`https://wa.me/${CONTACT.WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener,noreferrer");
  }, [location]);

  const handleNewsletter = useCallback(async () => {
    const email = sanitize(exitEmail).toLowerCase();
    if (!isValidEmail(email)) {
      showMessage("Enter a valid email address.", "error");
      return;
    }
    setExitIntentSubmitting(true);
    try {
      const { default: api } = await import("../api/api");
      await api.post("/newsletter/subscribe", { email }, { timeout: 8000 });
      if (!mountedRef.current) return;
      showMessage("You are subscribed! ₹100 offer sent to inbox.");
      setShowExitIntent(false);
      setExitEmail("");
    } catch (err) {
      logError("Newsletter subscribe failed", err?.response?.status || err?.message);
      if (mountedRef.current) showMessage("Could not subscribe now. Try again.", "error");
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

  const cta = useMemo(() => {
    if (!isAuthenticated) return { label: "Get started free", action: () => navigate("/register") };
    const role = String(user?.role || "").toUpperCase().replace(/^ROLE_/, "");
    if (role === "ADMIN" || role === "SUPER_ADMIN") return { label: "Go to admin", action: () => navigate("/admin/dashboard") };
    if (role === "PROVIDER") return { label: "Provider dashboard", action: () => navigate("/provider/dashboard") };
    return { label: "My dashboard", action: () => navigate("/customer/dashboard") };
  }, [isAuthenticated, user, navigate]);

  const bookAction = useMemo(() => {
    if (!isAuthenticated) return () => navigate("/register");
    return cta.action;
  }, [isAuthenticated, cta, navigate]);

  const features = useMemo(() => [
    { icon: <ShieldCheck size={32} color={C.green} />, title: "Verified professionals", description: "Aadhaar verified, background checked, rated by 10k+ customers. Your safety is our priority." },
    { icon: <Clock size={32} color={C.green} />, title: "Fast 60-min response", description: "Book in 1 minute. Nearby expert reaches you within 60 minutes, 24/7." },
    { icon: <Award size={32} color={C.green} />, title: "Warranty + Guarantee", description: "Up to 90-day warranty, satisfaction guarantee. If not right, we fix it free." },
    { icon: <CreditCard size={32} color={C.green} />, title: "Secure payments", description: "UPI, Cards, NetBanking, Wallets, COD. 256-bit SSL, up to ₹10K protection." },
  ], []);

  const steps = useMemo(() => [
    { title: "Choose a service", description: "Pick what you need fixed, tell us your location. Takes 30 seconds." },
    { title: "Get matched instantly", description: "AI matches closest verified pro free right now. Track live." },
    { title: "Job done, pay securely", description: "Review work, pay via secure gateway, rate experience. Warranty auto-applied." },
  ], []);

  const statsData = useMemo(() => {
    const placeholder = "–";
    return [
      { value: isLoadingStats ? placeholder : formatCount(liveStats.totalCustomers), label: "Happy customers" },
      { value: isLoadingStats ? placeholder : formatCount(liveStats.totalProviders), label: "Verified experts" },
      { value: isLoadingStats ? placeholder : `${Number(liveStats.averageRating).toFixed(1)}`, label: "Average rating", stars: true },
      { value: isLoadingStats ? placeholder : `${Number(liveStats.satisfactionRate).toFixed(0)}%`, label: "Satisfaction" },
    ];
  }, [liveStats, isLoadingStats]);

  const navItems = useMemo(() => [
    { label: "Popular services", ref: servicesRef },
    { label: "Why Quickks", ref: featuresRef },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ], []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.title).filter(Boolean)))], [services]);

  const visibleServices = useMemo(() => {
    const q = sanitize(query).toLowerCase();
    return services.filter((s) => {
      if (category !== "All" && s.title !== category) return false;
      if (!q) return true;
      return `${s.title} ${s.description}`.toLowerCase().includes(q);
    });
  }, [services, query, category]);

  const heroSlides = useMemo(() => [
    { 
      title: "Trusted home services, at your door in 60 minutes", 
      text: "Verified electricians, appliance repair & more. Ratings, secure pay, warranty. Support: connect@quickks.in",
      from: "#0f172a", 
      to: "#1e293b",
      accent: "#fbbf24"
    },
    { 
      title: "Get ₹100 off your first booking today", 
      text: "Create free account, save instantly. Verified pros, SSL secure, no surprises.",
      from: "#064e3b", 
      to: "#065f46",
      accent: "#6ee7b7"
    },
    { 
      title: "Power cut? Appliance down? We are on it ⚡", 
      text: "Emergency fixes from nearby experts who reach fast. Call +91 93713 65677",
      from: "#7c2d12", 
      to: "#9a3412",
      accent: "#fdba74"
    },
  ], []);

  useEffect(() => {
    if (heroPaused || prefersReducedMotion) return undefined;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), HERO_INTERVAL);
    return () => clearInterval(t);
  }, [heroPaused, prefersReducedMotion, heroSlides.length]);

  const greetingName = sanitize(user?.name || user?.firstName || user?.fullName || user?.email?.split("@")[0] || "there");
  const closeSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));
  const slide = heroSlides[heroIndex] || heroSlides[0];

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    name: "Quickks",
    url: "https://www.quickks.in/",
    telephone: CONTACT.PHONE_TEL,
    email: CONTACT.EMAIL,
    areaServed: location || "India",
    contactPoint: { "@type": "ContactPoint", email: CONTACT.EMAIL, telephone: CONTACT.PHONE_TEL, contactType: "customer support", availableLanguage: ["en", "hi", "mr"] }
  });

  const locationBlock = (
    <Box
      component="button"
      type="button"
      onClick={() => setShowLocationDialog(true)}
      aria-label="Change location"
      sx={{ display: "flex", alignItems: "flex-end", gap: 0.5, color: "#fff", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", p: "6px 12px", cursor: "pointer", fontFamily: FONT, textAlign: "left", transition: "all 0.2s", "&:hover": { bgcolor: "rgba(255,255,255,0.10)", borderColor: "rgba(255,255,255,0.2)" }, "&:focus-visible": { outline: `2px solid ${C.yellow}` } }}
    >
      <MapPin size={18} />
      <Box>
        <Typography component="span" sx={{ display: "block", fontSize: 11, color: "#94a3b8", lineHeight: 1.1, fontFamily: FONT, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Serving</Typography>
        <Typography component="span" sx={{ display: "block", fontSize: 14, fontWeight: 700, lineHeight: 1.2, fontFamily: FONT }}>
          {loadingLocation ? "Detecting…" : location || "Set location"}
        </Typography>
      </Box>
    </Box>
  );

  const searchBar = (
    <Box component="form" onSubmit={handleSearch} role="search" sx={{ display: "flex", flex: 1, minWidth: 0, borderRadius: "12px", overflow: "hidden", bgcolor: "#fff", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", "&:focus-within": { boxShadow: `0 0 0 3px ${C.yellow}40, 0 4px 12px rgba(0,0,0,0.08)` }, transition: "box-shadow 0.2s" }}>
      {!isMobile && (
        <Box sx={{ position: "relative", bgcolor: "#f8fafc", borderRight: "1px solid #e2e8f0", display: "flex", alignItems: "center" }}>
          <Box
            component="select"
            value={category}
            onChange={(e) => setCategory(sanitize(e.target.value))}
            aria-label="Search category"
            sx={{ appearance: "none", border: "none", outline: "none", bgcolor: "transparent", color: "#334155", fontSize: 13, fontWeight: 600, fontFamily: FONT, pl: 1.5, pr: 3.5, height: "100%", cursor: "pointer", maxWidth: 140 }}
          >
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </Box>
          <Box sx={{ position: "absolute", right: 10, pointerEvents: "none", display: "flex", color: "#64748b" }}><ChevronDown size={14} /></Box>
        </Box>
      )}
      <Box
        component="input"
        type="search"
        value={query}
        onChange={(e) => setQuery(sanitize(e.target.value))}
        placeholder="Search e.g. fan repair, electrician near me"
        aria-label="Search services"
        maxLength={100}
        sx={{ flex: 1, minWidth: 0, border: "none", outline: "none", px: 1.8, py: 1.3, fontSize: 15, fontFamily: FONT, color: C.text, "&::placeholder": { color: "#94a3b8" } }}
      />
      <Box component="button" type="submit" aria-label="Search" sx={{ bgcolor: C.text, border: "none", px: 2.2, cursor: "pointer", display: "flex", alignItems: "center", color: "#fff", transition: "bg 0.2s", "&:hover": { bgcolor: "#1e293b" } }}>
        <Search size={20} />
      </Box>
    </Box>
  );

  const ServiceCard = ({ s }) => (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", p: 1.5, pt: 0 }}>
      <Box sx={{ position: "relative", height: 160, bgcolor: s.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.8, borderRadius: "12px", overflow: "hidden", "&::after": { content: '""', position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.04) 100%)" } }}>
        {s.icon}
        {s.popular && (
          <Box sx={{ position: "absolute", top: 10, left: 0, bgcolor: C.text, color: "#fff", fontSize: 11, fontWeight: 800, px: 1.2, py: 0.4, borderRadius: "0 8px 8px 0", fontFamily: FONT, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 0.5 }}><Sparkles size={12} /> POPULAR</Box>
        )}
      </Box>
      <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3, mb: 0.5, fontFamily: FONT, color: C.text }}>{s.title}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.8 }}>
        <Typography sx={{ color: C.text, fontSize: 13, fontFamily: FONT, fontWeight: 700 }}>{s.rating || liveStats.averageRating}</Typography>
        <Stars value={s.rating || liveStats.averageRating} size={14} />
        <Typography sx={{ color: C.muted, fontSize: 12, fontFamily: FONT }}>({formatCount(1240)})</Typography>
      </Box>
      <Typography sx={{ color: C.muted, fontSize: 13.5, lineHeight: 1.5, mb: 1.2, flex: 1, fontFamily: FONT }}>{s.description}</Typography>
      {s.price && (
        <Typography sx={{ color: C.text, fontSize: 20, lineHeight: 1.1, mb: 0.5, fontFamily: FONT, fontWeight: 800 }}>
          <Box component="span" sx={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>From </Box>₹{s.price}
        </Typography>
      )}
      <Typography sx={{ color: C.green, fontSize: 12.5, fontWeight: 700, mb: 1.8, fontFamily: FONT, display: "flex", alignItems: "center", gap: 0.5 }}><Clock size={14} /> 60 min arrival • Warranty</Typography>
      <PrimaryButton fullWidth onClick={bookAction} size="small">Book now</PrimaryButton>
    </Box>
  );

  return (
    <ErrorBoundary>
      <Helmet>
        <title>Quickks – Electrician, Appliance Repair | 60 Min Service | {CONTACT.EMAIL}</title>
        <meta name="description" content={`Book verified electricians, appliance repair near you. 60min response, secure payment, warranty. Contact ${CONTACT.EMAIL} | ${CONTACT.PHONE_DISPLAY}`} />
        <link rel="canonical" href="https://www.quickks.in/" />
        <meta name="keywords" content="electrician, appliance repair, home services, Pune, Quickks, connect@quickks.in" />
        <meta property="og:title" content="Quickks – Trusted Home Services in 60 Min" />
        <meta property="og:description" content="Verified pros at your door, fast. Book electricians, appliance repair and more." />
        <meta property="og:url" content="https://www.quickks.in/" />
        <meta property="og:type" content="website" />
        <meta property="og:email" content={CONTACT.EMAIL} />
        <meta name="theme-color" content={C.header} />
        <link rel="preconnect" href="https://nominatim.openstreetmap.org" />
        <script type="application/ld+json">{jsonLd}</script>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
      </Helmet>

      <Box sx={{ minHeight: "100vh", background: C.bgGradient, fontFamily: FONT, color: C.text, overflowX: "hidden" }}>
        <FloatingContactButton onClick={handleWhatsApp} aria-label="Chat on WhatsApp"><FaWhatsapp size={28} /></FloatingContactButton>

        <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 1000, backdropFilter: "blur(12px)" }}>
          <Box sx={{ bgcolor: "rgba(15,23,42,0.92)", py: 1, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <Container maxWidth="xl">
              <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, md: 1.5 }, flexWrap: { xs: "wrap", md: "nowrap" } }}>
                <Box component="button" type="button" onClick={() => navigate("/")} aria-label="Quickks home" sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "1px solid transparent", borderRadius: "10px", p: "4px 10px", cursor: "pointer", transition: "all 0.2s", "&:hover": { bgcolor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.12)" }, "&:focus-visible": { outline: `2px solid ${C.yellow}` } }}>
                  <Box component="img" src={QuickksLogo} alt="Quickks" sx={{ width: 36, height: 36, objectFit: "contain", bgcolor: "#fff", borderRadius: "10px", p: "5px" }} />
                  <Typography sx={{ fontWeight: 900, color: "#fff", fontSize: 22, letterSpacing: "-0.5px", fontFamily: FONT }}>Quickks<Box component="span" sx={{ color: C.yellow }}>.</Box></Typography>
                </Box>

                {!isMobile && locationBlock}
                {!isMobile && searchBar}

                {!isMobile && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: "auto" }}>
                    {isAuthenticated ? (
                      <NavButton type="button" onClick={cta.action} aria-label={cta.label}>
                        <Box component="span" sx={{ textAlign: "left", lineHeight: 1.2 }}>
                          <Box component="span" sx={{ display: "block", fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Hello</Box>
                          <Box component="span" sx={{ display: "block", fontSize: 14, fontWeight: 700 }}>{greetingName.slice(0,15)}</Box>
                        </Box>
                      </NavButton>
                    ) : (
                      <NavButton type="button" onClick={() => navigate("/login")} aria-label="Sign in">
                        <Box component="span" sx={{ textAlign: "left", lineHeight: 1.2 }}>
                          <Box component="span" sx={{ display: "block", fontSize: 11, color: "#94a3b8" }}>Hello, sign in</Box>
                          <Box component="span" sx={{ display: "block", fontSize: 14, fontWeight: 700 }}>Account</Box>
                        </Box>
                      </NavButton>
                    )}
                    <NavButton type="button" onClick={() => navigate(isAuthenticated ? "/customer/dashboard" : "/login")} aria-label="My bookings">
                      <ClipboardList size={20} />
                      <Box component="span" sx={{ fontWeight: 700 }}>Bookings</Box>
                    </NavButton>
                    {!isAuthenticated && <PrimaryButton onClick={() => navigate("/register")} sx={{ ml: 1 }}>Get started</PrimaryButton>}
                  </Box>
                )}

                {isMobile && (
                  <IconButton onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" sx={{ color: "#fff", ml: "auto", bgcolor: "rgba(255,255,255,0.08)", "&:hover": { bgcolor: "rgba(255,255,255,0.12)" } }}><Menu size={22} /></IconButton>
                )}

                {isMobile && <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1 }}>{searchBar}{locationBlock}</Box>}
              </Box>
            </Container>
          </Box>

          {!isMobile && (
            <Box sx={{ bgcolor: "rgba(30,41,59,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <Container maxWidth="xl">
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, py: 0.6 }}>
                  <NavButton type="button" onClick={() => setMobileMenuOpen(true)} aria-label="Open all menu" sx={{ fontWeight: 700 }}>
                    <Menu size={18} /> All
                  </NavButton>
                  {navItems.map((item) => (
                    item.to
                      ? <NavRouterLink key={item.label} to={item.to}>{item.label}</NavRouterLink>
                      : <NavButton key={item.label} type="button" onClick={() => scrollToSection(item.ref)}>{item.label}</NavButton>
                  ))}
                  <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1.2 }}>
                    <NavRouterLink as="a" href={`tel:${CONTACT.PHONE_TEL}`} aria-label={`Call ${CONTACT.PHONE_DISPLAY}`} rel="noopener">
                      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, fontWeight: 700 }}><Phone size={14} />{CONTACT.PHONE_DISPLAY}</Box>
                    </NavRouterLink>
                    <NavRouterLink as="a" href={`mailto:${CONTACT.EMAIL}`} aria-label={`Email ${CONTACT.EMAIL}`} rel="noopener">
                      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 600, fontSize: 12, bgcolor: "rgba(251,191,36,0.15)", px: 1, py: 0.3, borderRadius: 999 }}><Mail size={14} />{CONTACT.EMAIL}</Box>
                    </NavRouterLink>
                  </Box>
                </Box>
              </Container>
            </Box>
          )}
        </Box>

        <Drawer anchor={isMobile ? "right" : "left"} open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 320, bgcolor: "#fff", color: C.text, borderRadius: isMobile ? "16px 0 0 16px" : "0 16px 16px 0" } }}>
          <Box sx={{ bgcolor: C.header, color: "#fff", p: 2.2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: 10, bgcolor: "#fff", display: "grid", placeItems: "center" }}><User size={18} color={C.header} /></Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontFamily: FONT, fontSize: 14 }}>{isAuthenticated ? `Hello, ${greetingName}` : "Hello, sign in"}</Typography>
                <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>{CONTACT.EMAIL}</Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.08)" }}><X size={18} /></IconButton>
          </Box>
          <List sx={{ py: 1 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                {...(item.to ? { component: Link, to: item.to } : {})}
                onClick={() => { setMobileMenuOpen(false); if (item.ref) scrollToSection(item.ref); }}
                sx={{ borderRadius: 2, mx: 1, mb: 0.5 }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600, fontFamily: FONT }} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton component="a" href={`tel:${CONTACT.PHONE_TEL}`} rel="noopener" sx={{ borderRadius: 2, mx: 1 }}><Phone size={16} style={{ marginRight: 12 }} /><ListItemText primary={`Call ${CONTACT.PHONE_DISPLAY}`} /></ListItemButton>
            <ListItemButton component="a" href={`mailto:${CONTACT.EMAIL}`} rel="noopener" sx={{ borderRadius: 2, mx: 1 }}><Mail size={16} style={{ marginRight: 12 }} /><ListItemText primary={CONTACT.EMAIL} /></ListItemButton>
          </List>
          <Divider />
          <Stack spacing={1.2} sx={{ p: 2 }}>
            {isAuthenticated ? (
              <PrimaryButton fullWidth onClick={() => { setMobileMenuOpen(false); cta.action(); }}>{cta.label}</PrimaryButton>
            ) : (
              <>
                <PrimaryButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/register"); }}>Get started free</PrimaryButton>
                <SecondaryButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}>Sign in</SecondaryButton>
              </>
            )}
          </Stack>
        </Drawer>

        <Box component="main">
          {/* ✅ Premium Hero Background */}
          <Box
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocus={() => setHeroPaused(true)}
            onBlur={() => setHeroPaused(false)}
            sx={{ 
              position: "relative", 
              background: `radial-gradient(1200px at 20% -10%, ${slide.accent}15 0%, transparent 60%), radial-gradient(1000px at 90% 0%, ${slide.from} 0%, ${slide.to} 70%)`,
              transition: prefersReducedMotion ? "none" : "background 0.8s ease", 
              pt: { xs: 6, md: 10 }, 
              pb: { xs: 24, md: 32 },
              overflow: "hidden",
              "&::before": {
                content: '""',
                position: "absolute",
                inset: 0,
                background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                opacity: 0.5,
              }
            }}
          >
            <Container maxWidth="lg" sx={{ position: "relative" }}>
              <Box aria-live="polite" sx={{ maxWidth: 720, px: { xs: 0, md: 2 } }}>
                <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, bgcolor: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 999, px: 1.5, py: 0.5, mb: 2, backdropFilter: "blur(8px)" }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.3)", animation: "pulse 2s infinite" }} />
                  <Typography sx={{ color: "#e2e8f0", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, fontFamily: FONT }}>LIVE • {liveStats.totalProviders}+ pros online</Typography>
                </Box>
                <Typography component="h1" sx={{ color: "#fff", fontWeight: 900, fontFamily: FONT, fontSize: { xs: "2rem", md: "3.2rem" }, lineHeight: 1.1, mb: 2.2, letterSpacing: "-0.02em", textShadow: "0 2px 20px rgba(0,0,0,0.2)" }}>
                  {slide.title}
                </Typography>
                <Typography sx={{ color: "#cbd5e1", fontSize: { xs: 16, md: 18 }, mb: 3.5, lineHeight: 1.6, fontFamily: FONT, maxWidth: 600 }}>{slide.text}</Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                  <PrimaryButton size="large" onClick={cta.action} sx={{ px: 4, py: 1.3, fontSize: 16, fontWeight: 800 }}>{cta.label} <ChevronRight size={18} style={{ marginLeft: 4 }} /></PrimaryButton>
                  <SecondaryButton size="large" onClick={() => scrollToSection(servicesRef)} sx={{ px: 4, py: 1.3, fontSize: 16, bgcolor: "rgba(255,255,255,0.10)", color: "#fff", borderColor: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", "&:hover": { bgcolor: "rgba(255,255,255,0.15)" } }}>Browse services</SecondaryButton>
                </Stack>
                <Stack direction="row" spacing={2} mt={3} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "#fbbf24", fontSize: 13, fontWeight: 600 }}><Shield size={16} /> Verified & Secure</Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, color: "#e2e8f0", fontSize: 13 }}><Mail size={14} /> {CONTACT.EMAIL}</Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}><Stars value={4.8} size={14} /><Typography sx={{ color: "#e2e8f0", fontSize: 13, fontWeight: 600 }}>4.8/5 (10k+ reviews)</Typography></Box>
                </Stack>
              </Box>
            </Container>

            {!isMobile && (
              <>
                <IconButton onClick={() => setHeroIndex((i) => (i - 1 + heroSlides.length) % heroSlides.length)} aria-label="Previous slide" sx={{ position: "absolute", left: 16, top: "42%", color: "#fff", bgcolor: "rgba(255,255,255,0.10)", backdropFilter: "blur(8px)", borderRadius: 2, height: 56, width: 56, border: "1px solid rgba(255,255,255,0.12)", "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}><ChevronLeft size={28} /></IconButton>
                <IconButton onClick={() => setHeroIndex((i) => (i + 1) % heroSlides.length)} aria-label="Next slide" sx={{ position: "absolute", right: 16, top: "42%", color: "#fff", bgcolor: "rgba(255,255,255,0.10)", backdropFilter: "blur(8px)", borderRadius: 2, height: 56, width: 56, border: "1px solid rgba(255,255,255,0.12)", "&:hover": { bgcolor: "rgba(255,255,255,0.18)" } }}><ChevronRight size={28} /></IconButton>
              </>
            )}
            <Box sx={{ position: "absolute", bottom: { xs: 160, md: 220 }, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 1.2 }}>
              {heroSlides.map((_, i) => (
                <Box key={i} component="button" type="button" onClick={() => setHeroIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === heroIndex} sx={{ width: i === heroIndex ? 28 : 10, height: 10, p: 0, borderRadius: 999, border: "1px solid rgba(255,255,255,0.5)", bgcolor: i === heroIndex ? "#fff" : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.3s ease" }} />
              ))}
            </Box>
          </Box>

          <Container maxWidth="xl" sx={{ mt: { xs: -18, md: -24 }, position: "relative", zIndex: 1 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5 }}>
              <Panel sx={{ p: 2.8, display: "flex", flexDirection: "column", background: "linear-gradient(135deg, #fff 0%, #f8fafc 100%)", border: "1px solid rgba(251,191,36,0.2)" }}>
                {isAuthenticated ? (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1 }}>
                      <Box sx={{ width: 40, height: 40, borderRadius: 12, bgcolor: C.yellow, display: "grid", placeItems: "center", fontWeight: 900 }}>{greetingName[0]?.toUpperCase()}</Box>
                      <Typography component="h2" sx={{ fontSize: 19, fontWeight: 800, fontFamily: FONT }}>Welcome, {greetingName}</Typography>
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, flex: 1, fontFamily: FONT, lineHeight: 1.5 }}>Pick up where you left off or book something new. Support: {CONTACT.EMAIL}</Typography>
                    <PrimaryButton fullWidth onClick={cta.action}>{cta.label}</PrimaryButton>
                  </>
                ) : (
                  <>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Shield size={20} color={C.green} />
                      <Typography component="h2" sx={{ fontSize: 19, fontWeight: 800, fontFamily: FONT }}>Secure & trusted</Typography>
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, flex: 1, fontFamily: FONT, lineHeight: 1.5 }}>Track pro, save addresses, rebook 1-tap. SSL secured. Help: {CONTACT.EMAIL}</Typography>
                    <Stack spacing={1.2}>
                      <PrimaryButton fullWidth onClick={() => navigate("/login")}>Sign in securely</PrimaryButton>
                      <SecondaryButton fullWidth onClick={() => navigate("/register")}>Create account – free</SecondaryButton>
                    </Stack>
                  </>
                )}
              </Panel>

              {services.slice(0, 3).map((s, idx) => (
                <Panel key={`quick-${s.id || idx}`} sx={{ p: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <Box sx={{ p: 2.5, pb: 1.5 }}>
                    <Typography component="h2" sx={{ fontSize: 18, fontWeight: 800, mb: 1.2, fontFamily: FONT, display: "flex", alignItems: "center", gap: 1 }}><Box sx={{ width: 32, height: 32, borderRadius: 8, bgcolor: s.color, display: "grid", placeItems: "center" }}>{s.icon}</Box>{s.title}</Typography>
                    <Box sx={{ height: 120, bgcolor: s.color, display: "flex", alignItems: "center", justifyContent: "center", mb: 1.5, borderRadius: 12, position: "relative", overflow: "hidden" }}>
                      <Box sx={{ position: "absolute", inset: 0, background: `radial-gradient(300px at 30% 20%, white 0%, transparent 70%)`, opacity: 0.6 }} />
                      <Box sx={{ position: "relative" }}>{s.icon}</Box>
                    </Box>
                    <Typography sx={{ color: C.muted, fontSize: 13.5, mb: 1.5, flex: 1, fontFamily: FONT, lineHeight: 1.5 }}>{s.description}</Typography>
                  </Box>
                  <Box sx={{ px: 2.5, pb: 2.5, mt: "auto" }}>
                    <TextLink type="button" onClick={() => { setQuery(s.title); scrollToSection(servicesRef); }}>See availability →</TextLink>
                  </Box>
                </Panel>
              ))}
            </Box>
          </Container>

          <Container maxWidth="xl" sx={{ mt: 3 }}>
            <Panel sx={{ p: 2.5, background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff", border: "none", position: "relative", overflow: "hidden", "&::before": { content: '""', position: "absolute", inset: 0, background: "radial-gradient(600px at 0% 0%, rgba(251,191,36,0.15) 0%, transparent 50%)" } }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2, position: "relative" }}>
                {statsData.map((stat) => (
                  <Box key={stat.label} sx={{ textAlign: "center", py: 1.5, borderRadius: 2, bgcolor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(8px)" }}>
                    <Typography sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 900, lineHeight: 1.1, fontFamily: FONT, background: stat.stars ? "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)" : "none", WebkitBackgroundClip: stat.stars ? "text" : "none", WebkitTextFillColor: stat.stars ? "transparent" : "#fff" }}>{stat.value}</Typography>
                    {stat.stars && !isLoadingStats && <Box sx={{ mt: 0.8, display: "flex", justifyContent: "center" }}><Stars value={liveStats.averageRating} size={16} /></Box>}
                    <Typography sx={{ color: "#94a3b8", fontSize: 13, mt: 0.8, fontFamily: FONT, fontWeight: 600, letterSpacing: 0.3, textTransform: "uppercase" }}>{stat.label}</Typography>
                  </Box>
                ))}
              </Box>
            </Panel>
          </Container>

          {/* Rest of sections same but with improved Panel styling - keeping concise */}
          <Box ref={servicesRef} id="services" sx={{ pt: 3, scrollMarginTop: 130 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2, md: 3 }, position: "relative" }}>
                <Box sx={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 1.5, mb: 2.5 }}>
                  <Typography component="h2" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, fontFamily: FONT, letterSpacing: "-0.02em" }}>Popular services</Typography>
                  <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, fontSize: 12, color: C.muted, bgcolor: "#f8fafc", px: 1.2, py: 0.5, borderRadius: 999, border: `1px solid ${C.border}` }}><Shield size={12} /> Verified</Box>
                    {(query || category !== "All") && <TextLink type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear search</TextLink>}
                  </Box>
                </Box>

                {isLoadingServices ? (
                  <Box sx={{ display: "flex", gap: 2, overflow: "hidden" }}>
                    {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} variant="rectangular" height={380} sx={{ flex: "0 0 260px", borderRadius: 3 }} />)}
                  </Box>
                ) : visibleServices.length === 0 ? (
                  <Box sx={{ py: 8, textAlign: "center" }}>
                    <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1, fontFamily: FONT }}>No services match “{sanitize(query)}”</Typography>
                    <Typography sx={{ color: C.muted, mb: 2.5, fontFamily: FONT }}>Check spelling or try broader term. Contact {CONTACT.EMAIL} for help.</Typography>
                    <SecondaryButton onClick={() => { setQuery(""); setCategory("All"); }}>Show all services</SecondaryButton>
                  </Box>
                ) : (
                  <Box sx={{ position: "relative" }}>
                    {!isMobile && (
                      <>
                        <IconButton onClick={() => scrollCarousel(-1)} aria-label="Scroll left" sx={{ position: "absolute", left: -12, top: "40%", zIndex: 2, bgcolor: "#fff", border: `1px solid ${C.border}`, borderRadius: 2, boxShadow: C.cardShadow, width: 44, height: 44, "&:hover": { bgcolor: "#f8fafc", boxShadow: C.cardShadowHover } }}><ChevronLeft size={20} /></IconButton>
                        <IconButton onClick={() => scrollCarousel(1)} aria-label="Scroll right" sx={{ position: "absolute", right: -12, top: "40%", zIndex: 2, bgcolor: "#fff", border: `1px solid ${C.border}`, borderRadius: 2, boxShadow: C.cardShadow, width: 44, height: 44, "&:hover": { bgcolor: "#f8fafc", boxShadow: C.cardShadowHover } }}><ChevronRight size={20} /></IconButton>
                      </>
                    )}
                    <Box ref={carouselRef} role="list" sx={{ display: "flex", gap: 2.5, overflowX: "auto", scrollSnapType: "x proximity", pb: 1.5, px: 0.5, scrollbarWidth: "thin", "&::-webkit-scrollbar": { height: 6 }, "&::-webkit-scrollbar-thumb": { bgcolor: "#e2e8f0", borderRadius: 999 } }}>
                      {visibleServices.map((s, idx) => (
                        <Box key={s.id || idx} role="listitem" sx={{ flex: { xs: "0 0 78%", sm: "0 0 42%", md: "0 0 28%", lg: "0 0 22%" }, scrollSnapAlign: "start", minWidth: 260 }}>
                          <Panel sx={{ height: "100%", p: 0, display: "flex", flexDirection: "column" }}><ServiceCard s={s} /></Panel>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}
              </Panel>
            </Container>
          </Box>

          {/* Why Quickks - Improved background */}
          <Box ref={featuresRef} id="features" sx={{ pt: 3, scrollMarginTop: 130 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2.5, md: 3.5 }, background: "linear-gradient(180deg, #fff 0%, #f8fafc 100%)" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: 12, bgcolor: "#ecfdf5", display: "grid", placeItems: "center" }}><Award size={24} color={C.green} /></Box>
                  <Box>
                    <Typography component="h2" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, fontFamily: FONT, letterSpacing: "-0.02em" }}>Why 10k+ customers trust Quickks</Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14, fontFamily: FONT }}>Secure, verified, warranty backed • Support: {CONTACT.EMAIL}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2.5 }}>
                  {features.map((f) => (
                    <Box key={f.title} sx={{ p: 2.5, border: `1px solid ${C.border}`, borderRadius: 3, bgcolor: "#fff", transition: "all 0.2s", "&:hover": { borderColor: C.green, boxShadow: "0 8px 24px rgba(5,150,105,0.08)", transform: "translateY(-2px)" } }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 12, bgcolor: "#ecfdf5", display: "grid", placeItems: "center", mb: 1.8 }}>{f.icon}</Box>
                      <Typography component="h3" sx={{ fontSize: 17, fontWeight: 800, mb: 0.8, fontFamily: FONT }}>{f.title}</Typography>
                      <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.6, fontFamily: FONT }}>{f.description}</Typography>
                    </Box>
                  ))}
                </Box>
              </Panel>
            </Container>
          </Box>

          {/* How it works - Improved */}
          <Box sx={{ pt: 3 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 2.5, md: 3.5 } }}>
                <Typography component="h2" sx={{ fontSize: { xs: 22, md: 28 }, fontWeight: 900, mb: 3, fontFamily: FONT, letterSpacing: "-0.02em" }}>How it works – 3 simple steps</Typography>
                <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3 }}>
                  {steps.map((s, i) => (
                    <Box component="li" key={s.title} sx={{ display: "flex", gap: 1.8, alignItems: "flex-start", position: "relative", "&::after": i < 2 ? { content: { xs: '""', md: '""' }, position: "absolute", top: 16, right: -16, width: 32, height: 2, bgcolor: "#e2e8f0", display: { xs: "none", md: "block" } } : {} }}>
                      <Box sx={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg, ${C.header} 0%, ${C.sub} 100%)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontFamily: FONT, fontSize: 16, boxShadow: "0 4px 12px rgba(15,23,42,0.15)" }}>{i + 1}</Box>
                      <Box>
                        <Typography component="h3" sx={{ fontSize: 17, fontWeight: 800, mb: 0.5, fontFamily: FONT }}>{s.title}</Typography>
                        <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.6, fontFamily: FONT }}>{s.description}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Panel>
            </Container>
          </Box>

          {/* CTA - Premium background */}
          <Box sx={{ py: 3.5 }}>
            <Container maxWidth="xl">
              <Panel sx={{ p: { xs: 3, md: 5 }, textAlign: "center", background: `radial-gradient(800px at 50% -20%, rgba(251,191,36,0.15) 0%, transparent 60%), linear-gradient(180deg, #fff 0%, #f8fafc 100%)`, border: `1px solid ${C.yellowBorder}40`, position: "relative", overflow: "hidden" }}>
                <Box sx={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: `radial-gradient(circle, ${C.yellow}30 0%, transparent 70%)` }} />
                <Box sx={{ position: "relative" }}>
                  <Typography component="h2" sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 900, mb: 1.2, fontFamily: FONT, letterSpacing: "-0.02em" }}>Ready to get it fixed? ⚡</Typography>
                  <Typography sx={{ color: C.muted, mb: 3, fontFamily: FONT, fontSize: { xs: 14, md: 16 }, maxWidth: 500, mx: "auto" }}>
                    Questions? Call <Box component="a" href={`tel:${CONTACT.PHONE_TEL}`} sx={{ color: C.text, fontWeight: 800, textDecoration: "none", "&:hover": { color: C.link } }}>{CONTACT.PHONE_DISPLAY}</Box> or email <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: C.text, fontWeight: 800, textDecoration: "none", "&:hover": { color: C.link } }}>{CONTACT.EMAIL}</Box>
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                    <PrimaryButton size="large" onClick={cta.action} sx={{ px: 5, py: 1.3 }}>{cta.label}</PrimaryButton>
                    {!isAuthenticated && <SecondaryButton size="large" onClick={() => navigate("/login")} sx={{ px: 5, py: 1.3 }}>Sign in</SecondaryButton>}
                  </Stack>
                  <Typography sx={{ color: C.muted, fontSize: 12, mt: 2.5, display: "flex", alignItems: "center", justifyContent: "center", gap: 1, fontWeight: 500 }}><Shield size={14} /> SSL secured • Verified pros • Warranty backed • {CONTACT.EMAIL}</Typography>
                </Box>
              </Panel>
            </Container>
          </Box>
        </Box>

        <Box component="button" type="button" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })} sx={{ display: "block", width: "100%", bgcolor: C.slate, color: "#fff", border: "none", py: 1.8, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: FONT, letterSpacing: 0.5, textTransform: "uppercase", "&:hover": { bgcolor: "#475569" }, "&:focus-visible": { outline: `2px solid ${C.yellow}`, outlineOffset: -2 }, transition: "bg 0.2s" }}>
          Back to top ↑
        </Box>

        <Suspense fallback={<Box sx={{ py: 4, textAlign: "center", bgcolor: C.header }}><CircularProgress size={24} sx={{ color: C.yellow }} /></Box>}>
          <Footer />
        </Suspense>

        {/* Dialogs - Same but secured */}
        <Dialog open={showExitIntent && !isAuthenticated} onClose={() => setShowExitIntent(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: "hidden" } }}>
          <Box sx={{ height: 4, bgcolor: C.yellow }} />
          <DialogTitle sx={{ fontWeight: 900, fontFamily: FONT, fontSize: 20 }}>Get ₹100 off – today only! 🎉</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2, fontFamily: FONT, lineHeight: 1.5 }}>Enter email, get offer instantly. Secure, no spam. Support: {CONTACT.EMAIL}</Typography>
            <TextField fullWidth autoFocus type="email" label="Email address" value={exitEmail} onChange={(e) => setExitEmail(sanitize(e.target.value))} inputProps={{ maxLength: 100 }} onKeyDown={(e) => { if (e.key === "Enter") handleNewsletter(); }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <SecondaryButton onClick={() => setShowExitIntent(false)}>No thanks</SecondaryButton>
            <PrimaryButton onClick={handleNewsletter} disabled={exitIntentSubmitting || !isValidEmail(exitEmail)}>{exitIntentSubmitting ? <CircularProgress size={20} /> : "Send my offer"}</PrimaryButton>
          </DialogActions>
        </Dialog>

        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
          <DialogTitle sx={{ fontWeight: 800, fontFamily: FONT }}>Choose location 📍</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, fontFamily: FONT }}>We show pros & response times for your area.</Typography>
            <SecondaryButton fullWidth onClick={detectLocation} disabled={loadingLocation} startIcon={loadingLocation ? <CircularProgress size={16} /> : <LocateFixed size={18} />} sx={{ mb: 2.5, py: 1.2 }}>
              {loadingLocation ? "Detecting…" : "Use current location"}
            </SecondaryButton>
            <TextField fullWidth label="City or area" placeholder="e.g. Pune, Kothrud" value={manualLocation} onChange={(e) => setManualLocation(sanitize(e.target.value))} inputProps={{ maxLength: 100 }} onKeyDown={(e) => { if (e.key === "Enter") handleLocationConfirm(); }} sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <SecondaryButton onClick={() => setShowLocationDialog(false)}>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleLocationConfirm} disabled={!sanitize(manualLocation)}>Apply</PrimaryButton>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ borderRadius: 3, fontWeight: 600, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>{snackbar.message}</Alert>
        </Snackbar>

        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </Box>
    </ErrorBoundary>
  );
}