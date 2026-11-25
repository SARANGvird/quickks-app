import React, { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { Helmet } from "react-helmet-async";
import { homeService, API_BASE_URL } from "../api/api";
import { FaWhatsapp } from "react-icons/fa";
import {
  Zap, Wrench, Bolt, Settings, MapPin, ShieldCheck, ChevronRight, Menu, X, Star,
  Clock, CreditCard, Search, Phone, LocateFixed, Mail, Shield, Award, Sparkles,
  ArrowRight, ArrowUp, BadgeCheck, CalendarCheck, UserCheck, Wallet
} from "lucide-react";
import {
  Box, Container, Typography, Button, IconButton, Drawer, List, ListItemButton, ListItemText,
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
// Typing-safe variant: keeps spaces while the user is still typing
const sanitizeTyping = (str) => String(str || "").slice(0, 100).replace(/[<>]/g, "");
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

/* ───────── Animations ───────── */
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); }
  70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
  100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
`;
const floatY = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`;

/* ───────── Theme tokens (light, warm, non-marketplace) ───────── */
const C = {
  ink: "#0f172a",
  navy: "#0b1220",
  navy2: "#16223b",
  bg: "#fbfaf6",
  card: "#ffffff",
  text: "#0f172a",
  muted: "#64748b",
  line: "#ece9e0",
  yellow: "#fbbf24",
  yellowDeep: "#f59e0b",
  yellowSoft: "#fff6dc",
  teal: "#0d9488",
  tealSoft: "#e6f7f5",
  green: "#059669",
  shadow: "0 1px 2px rgba(15,23,42,0.04), 0 10px 30px -12px rgba(15,23,42,0.12)",
  shadowHover: "0 2px 4px rgba(15,23,42,0.05), 0 28px 50px -18px rgba(15,23,42,0.22)",
};

const PrimaryButton = styled(Button)({
  background: `linear-gradient(135deg, ${C.yellow} 0%, ${C.yellowDeep} 100%)`,
  color: C.ink,
  borderRadius: 14,
  textTransform: "none",
  fontWeight: 800,
  fontFamily: FONT,
  boxShadow: "0 8px 20px rgba(245,158,11,0.3)",
  padding: "10px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: `linear-gradient(135deg, ${C.yellowDeep} 0%, #d97706 100%)`, boxShadow: "0 12px 26px rgba(245,158,11,0.4)", transform: "translateY(-1px)" },
  "&:focus-visible": { outline: `2px solid ${C.teal}`, outlineOffset: 2 },
  "&.Mui-disabled": { background: "#f1f5f9", color: "#94a3b8", boxShadow: "none" },
});

const GhostButton = styled(Button)({
  background: "transparent",
  color: C.ink,
  border: `1.5px solid ${C.ink}`,
  borderRadius: 14,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  padding: "9px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: C.ink, color: "#fff" },
  "&:focus-visible": { outline: `2px solid ${C.teal}`, outlineOffset: 2 },
  "&.Mui-disabled": { opacity: 0.5 },
});

const SoftButton = styled(Button)({
  background: "#fff",
  color: C.ink,
  border: `1px solid ${C.line}`,
  borderRadius: 14,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  padding: "9px 22px",
  boxShadow: C.shadow,
  "&:hover": { background: "#fafafa", boxShadow: C.shadowHover },
});

const NavLinkBtn = styled("button")({
  background: "none",
  border: "none",
  color: C.ink,
  font: "inherit",
  fontFamily: FONT,
  fontSize: 14.5,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 999,
  cursor: "pointer",
  textDecoration: "none",
  transition: "background 0.2s",
  "&:hover": { background: "#f1efe7" },
  "&:focus-visible": { outline: `2px solid ${C.teal}` },
});
const NavLinkRouter = styled(Link)({
  color: C.ink,
  fontFamily: FONT,
  fontSize: 14.5,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 999,
  textDecoration: "none",
  transition: "background 0.2s",
  "&:hover": { background: "#f1efe7" },
  "&:focus-visible": { outline: `2px solid ${C.teal}` },
});

const TextLink = styled("button")({
  background: "none",
  border: "none",
  padding: 0,
  color: C.teal,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: FONT,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  "&:hover": { textDecoration: "underline" },
  "&:focus-visible": { outline: `2px solid ${C.teal}`, outlineOffset: 2, borderRadius: 2 },
});

const FloatingContactButton = styled(Fab)({
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 1100,
  backgroundColor: "#25D366",
  color: "#fff",
  boxShadow: "0 10px 28px rgba(37,211,102,0.4)",
  "&:hover": { backgroundColor: "#1DA851", transform: "translateY(-2px) scale(1.04)" },
  transition: "all 0.2s ease",
});

const DEFAULT_SERVICES = [
  { id: 1, icon: <Zap size={40} color="#b45309" />, title: "Electrician", description: "Fans, wiring, switchboards and emergency fixes. Verified pros in 30 min.", color: "#fef3c7", popular: true },
  { id: 2, icon: <Wrench size={40} color="#0e7490" />, title: "Appliance Repair", description: "Fridge, washing machine and home appliances. Warranty backed.", color: "#cffafe" },
  { id: 3, icon: <Bolt size={40} color="#c2410c" />, title: "Power Backup", description: "Inverter and generator installation. 24/7 emergency support.", color: "#ffedd5" },
  { id: 4, icon: <Settings size={40} color="#6d28d9" />, title: "Smart Home", description: "Smart devices, automation and premium setups. Certified experts.", color: "#ede9fe" },
];

const Footer = lazy(() => import("../components/Footer").catch(() => ({
  default: () => (
    <Box sx={{ py: 4, textAlign: "center", bgcolor: C.navy }}>
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
        <Star key={n} size={size} color={C.yellowDeep} fill={n <= rounded ? C.yellowDeep : "none"} strokeWidth={n <= rounded ? 0 : 1.5} />
      ))}
    </Box>
  );
}

/* Module-level so it is not re-mounted on every HomePage render */
function ServiceCard({ s, fallbackRating, onBook, onDetails }) {
  const rating = s.rating || fallbackRating;
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "22px", p: 2.2, boxShadow: C.shadow, transition: "all 0.25s ease", animation: `${fadeUp} 0.45s ease-out`, "&:hover": { transform: "translateY(-5px)", boxShadow: C.shadowHover, borderColor: C.yellow }, "&:hover .svc-icon": { transform: "rotate(-6deg) scale(1.08)" } }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.8 }}>
        <Box className="svc-icon" sx={{ width: 72, height: 72, borderRadius: "20px", bgcolor: s.color, display: "grid", placeItems: "center", transition: "transform 0.3s ease" }}>{s.icon}</Box>
        {s.popular && (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, bgcolor: C.yellowSoft, color: "#92400e", border: `1px solid ${C.yellow}`, fontSize: 11, fontWeight: 800, px: 1.1, py: 0.4, borderRadius: 999, fontFamily: FONT, letterSpacing: 0.4 }}><Sparkles size={12} /> POPULAR</Box>
        )}
      </Box>
      <Typography component="h3" sx={{ fontSize: 18, fontWeight: 800, mb: 0.6, fontFamily: FONT, color: C.text }}>{s.title}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 1 }}>
        <Stars value={rating} size={14} />
        <Typography sx={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>{rating}</Typography>
      </Box>
      <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.6, mb: 1.6, flex: 1, fontFamily: FONT }}>{s.description}</Typography>
      {s.price && (
        <Typography sx={{ color: C.text, fontSize: 20, fontWeight: 800, mb: 1, fontFamily: FONT, lineHeight: 1.1 }}>
          <Box component="span" sx={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>Starting </Box>₹{s.price}
        </Typography>
      )}
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, alignSelf: "flex-start", color: C.green, bgcolor: "#ecfdf5", borderRadius: 999, px: 1.2, py: 0.4, fontSize: 12, fontWeight: 700, mb: 2, fontFamily: FONT }}><Clock size={13} /> 60 min arrival • Warranty</Box>
      <Stack direction="row" spacing={1}>
        <PrimaryButton fullWidth size="small" onClick={() => onBook(s)}>Book now</PrimaryButton>
        <IconButton aria-label={`Details for ${s.title}`} onClick={() => onDetails(s)} sx={{ border: `1px solid ${C.line}`, borderRadius: "12px", width: 42 }}><ArrowRight size={18} /></IconButton>
      </Stack>
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
  const howRef = useRef(null);

  const [location, setLocation] = useState(() => {
    const saved = storage.get("local", LOCATION_KEY) || "";
    if (!saved || BLOCKED_LOCATION.test(saved)) return "";
    return sanitize(saved);
  });
  const [widgetCity, setWidgetCity] = useState(() => {
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
  const [sortBy, setSortBy] = useState("recommended");
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedService, setSelectedService] = useState(null);

  useEffect(() => {
    mountedRef.current = true;
    log("Mounted, API:", API_BASE_URL);
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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
      return false;
    }
    setLocation(clean);
    setWidgetCity(clean);
    storage.set("local", LOCATION_KEY, clean);
    showMessage(`Location set to ${clean}`);
    return true;
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
    if (saveLocation(city)) {
      setShowLocationDialog(false);
      setManualLocation("");
    }
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

  /* Hero booking widget: saves city (if changed) and jumps to the filtered services */
  const handleFindPros = useCallback((e) => {
    e.preventDefault();
    const city = sanitize(widgetCity);
    if (city && city !== location) {
      if (!saveLocation(city)) return;
    }
    scrollToSection(servicesRef);
  }, [widgetCity, location, saveLocation, scrollToSection]);

  const cta = useMemo(() => {
    if (!isAuthenticated) return { label: "Get started free", action: () => navigate("/register") };
    const role = String(user?.role || "").toUpperCase().replace(/^ROLE_/, "");
    if (role === "ADMIN" || role === "SUPER_ADMIN") return { label: "Go to admin", action: () => navigate("/admin/dashboard") };
    if (role === "PROVIDER") return { label: "Provider dashboard", action: () => navigate("/provider/dashboard") };
    return { label: "My dashboard", action: () => navigate("/customer/dashboard") };
  }, [isAuthenticated, user, navigate]);

  /* Booking: carries the chosen service + city along to the next screen */
  const bookService = useCallback((s) => {
    const state = { service: s?.title || null, location: location || null };
    if (!isAuthenticated) { navigate("/register", { state }); return; }
    const role = String(user?.role || "").toUpperCase().replace(/^ROLE_/, "");
    if (role === "ADMIN" || role === "SUPER_ADMIN") navigate("/admin/dashboard", { state });
    else if (role === "PROVIDER") navigate("/provider/dashboard", { state });
    else navigate("/customer/dashboard", { state });
  }, [isAuthenticated, user, navigate, location]);

  const features = useMemo(() => [
    { icon: <ShieldCheck size={28} color={C.green} />, title: "Verified professionals", description: "Aadhaar verified, background checked, rated by 10k+ customers. Your safety is our priority." },
    { icon: <Clock size={28} color={C.green} />, title: "Fast 60-min response", description: "Book in 1 minute. Nearby expert reaches you within 60 minutes, 24/7." },
    { icon: <Award size={28} color={C.green} />, title: "Warranty + Guarantee", description: "Up to 90-day warranty, satisfaction guarantee. If not right, we fix it free." },
    { icon: <CreditCard size={28} color={C.green} />, title: "Secure payments", description: "UPI, Cards, NetBanking, Wallets, COD. 256-bit SSL, up to ₹10K protection." },
  ], []);

  const steps = useMemo(() => [
    { icon: <CalendarCheck size={22} />, title: "Choose a service", description: "Pick what you need fixed, tell us your location. Takes 30 seconds." },
    { icon: <UserCheck size={22} />, title: "Get matched instantly", description: "AI matches closest verified pro free right now. Track live." },
    { icon: <Wallet size={22} />, title: "Job done, pay securely", description: "Review work, pay via secure gateway, rate experience. Warranty auto-applied." },
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
    { label: "Services", ref: servicesRef },
    { label: "How it works", ref: howRef },
    { label: "Why Quickks", ref: featuresRef },
    { label: "About", to: "/about" },
    { label: "Contact", to: "/contact" },
  ], []);

  const categories = useMemo(() => ["All", ...Array.from(new Set(services.map((s) => s.title).filter(Boolean)))], [services]);

  const visibleServices = useMemo(() => {
    const q = sanitize(query).toLowerCase();
    const filtered = services.filter((s) => {
      if (category !== "All" && s.title !== category) return false;
      if (!q) return true;
      return `${s.title} ${s.description}`.toLowerCase().includes(q);
    });
    const num = (v) => Number(v) || 0;
    if (sortBy === "rating") return [...filtered].sort((a, b) => num(b.rating || liveStats.averageRating) - num(a.rating || liveStats.averageRating));
    if (sortBy === "price") return [...filtered].sort((a, b) => (num(a.price) || Infinity) - (num(b.price) || Infinity));
    if (sortBy === "name") return [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    return filtered;
  }, [services, query, category, sortBy, liveStats.averageRating]);

  const heroSlides = useMemo(() => [
    { title: "Trusted home services, at your door in 60 minutes", text: "Verified electricians, appliance repair & more. Ratings, secure pay, warranty. Support: connect@quickks.in", tag: "60-min response" },
    { title: "Get ₹100 off your first booking today", text: "Create free account, save instantly. Verified pros, SSL secure, no surprises.", tag: "New customer offer" },
    { title: "Power cut? Appliance down? We are on it ⚡", text: "Emergency fixes from nearby experts who reach fast. Call +91 93713 65677", tag: "Emergency help" },
  ], []);

  useEffect(() => {
    if (heroPaused || prefersReducedMotion) return undefined;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroSlides.length), HERO_INTERVAL);
    return () => clearInterval(t);
  }, [heroPaused, prefersReducedMotion, heroSlides.length]);

  const greetingName = sanitize(user?.name || user?.firstName || user?.fullName || user?.email?.split("@")[0] || "there");
  const closeSnackbar = () => setSnackbar((p) => ({ ...p, open: false }));
  const slide = heroSlides[heroIndex] || heroSlides[0];
  const clearFilters = () => { setQuery(""); setCategory("All"); setSortBy("recommended"); };
  const filtersActive = Boolean(query) || category !== "All" || sortBy !== "recommended";

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

  const sectionHeading = (eyebrow, title, sub) => (
    <Box sx={{ mb: 3.5, textAlign: { xs: "left", md: "center" } }}>
      <Typography sx={{ display: "inline-block", color: C.teal, bgcolor: C.tealSoft, fontSize: 12, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", px: 1.4, py: 0.4, borderRadius: 999, mb: 1.2, fontFamily: FONT }}>{eyebrow}</Typography>
      <Typography component="h2" sx={{ fontSize: { xs: 26, md: 36 }, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: FONT, color: C.text }}>{title}</Typography>
      {sub && <Typography sx={{ color: C.muted, mt: 1, fontSize: { xs: 14.5, md: 16 }, fontFamily: FONT, maxWidth: 620, mx: { md: "auto" } }}>{sub}</Typography>}
    </Box>
  );

  const fieldSx = { "& .MuiOutlinedInput-root": { borderRadius: "14px", bgcolor: "#fff", fontFamily: FONT, "& fieldset": { borderColor: C.line }, "&:hover fieldset": { borderColor: C.yellowDeep }, "&.Mui-focused fieldset": { borderColor: C.yellowDeep } } };

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
        <meta name="theme-color" content={C.navy} />
        <link rel="preconnect" href="https://nominatim.openstreetmap.org" />
        <script type="application/ld+json">{jsonLd}</script>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
      </Helmet>

      <Box sx={{ minHeight: "100vh", bgcolor: C.bg, fontFamily: FONT, color: C.text, overflowX: "hidden" }}>
        <FloatingContactButton onClick={handleWhatsApp} aria-label="Chat on WhatsApp"><FaWhatsapp size={28} /></FloatingContactButton>

        {scrolled && (
          <Fab size="small" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })} sx={{ position: "fixed", bottom: 96, right: 32, zIndex: 1100, bgcolor: C.ink, color: "#fff", "&:hover": { bgcolor: C.navy2 } }}><ArrowUp size={18} /></Fab>
        )}

        {/* ───────── Top announcement strip ───────── */}
        {!isMobile && (
          <Box sx={{ bgcolor: C.navy, color: "#cbd5e1", fontSize: 13, fontFamily: FONT }}>
            <Container maxWidth="lg" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.9 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Sparkles size={14} color={C.yellow} /> Get ₹100 off your first booking</Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
                <Box component="a" href={`tel:${CONTACT.PHONE_TEL}`} rel="noopener" sx={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 0.7, "&:hover": { color: "#fff" } }}><Phone size={13} /> {CONTACT.PHONE_DISPLAY}</Box>
                <Box component="a" href={`mailto:${CONTACT.EMAIL}`} rel="noopener" sx={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 0.7, "&:hover": { color: "#fff" } }}><Mail size={13} /> {CONTACT.EMAIL}</Box>
              </Box>
            </Container>
          </Box>
        )}

        {/* ───────── Navbar ───────── */}
        <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 1000, bgcolor: "rgba(251,250,246,0.88)", backdropFilter: "blur(14px) saturate(160%)", borderBottom: `1px solid ${C.line}` }}>
          <Container maxWidth="lg">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.1 }}>
              <Box component="button" type="button" onClick={() => navigate("/")} aria-label="Quickks home" sx={{ display: "flex", alignItems: "center", gap: 1, background: "none", border: "none", cursor: "pointer", p: 0, "&:focus-visible": { outline: `2px solid ${C.teal}`, borderRadius: "8px" } }}>
                <Box component="img" src={QuickksLogo} alt="Quickks" sx={{ width: 38, height: 38, objectFit: "contain", bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "12px", p: "5px" }} />
                <Typography sx={{ fontWeight: 900, color: C.ink, fontSize: 22, letterSpacing: "-0.04em", fontFamily: FONT }}>Quickks<Box component="span" sx={{ color: C.yellowDeep }}>.</Box></Typography>
              </Box>

              {!isMobile && (
                <Box component="nav" aria-label="Main" sx={{ display: "flex", alignItems: "center", gap: 0.3, mx: "auto" }}>
                  {navItems.map((item) => (
                    item.to
                      ? <NavLinkRouter key={item.label} to={item.to}>{item.label}</NavLinkRouter>
                      : <NavLinkBtn key={item.label} type="button" onClick={() => scrollToSection(item.ref)}>{item.label}</NavLinkBtn>
                  ))}
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center", gap: 1, ml: isMobile ? "auto" : 0 }}>
                <Box component="button" type="button" onClick={() => setShowLocationDialog(true)} aria-label="Change location" sx={{ display: "inline-flex", alignItems: "center", gap: 0.7, bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, px: 1.4, py: 0.7, cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.ink, maxWidth: { xs: 130, md: 170 }, "&:hover": { borderColor: C.yellowDeep }, "&:focus-visible": { outline: `2px solid ${C.teal}` } }}>
                  <MapPin size={15} color={C.teal} style={{ flexShrink: 0 }} />
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{loadingLocation ? "Detecting…" : location || "Set location"}</Box>
                </Box>

                {!isMobile && (
                  isAuthenticated ? (
                    <PrimaryButton onClick={cta.action} size="small" aria-label={cta.label}>{cta.label}</PrimaryButton>
                  ) : (
                    <>
                      <NavLinkBtn type="button" onClick={() => navigate("/login")}>Sign in</NavLinkBtn>
                      <PrimaryButton onClick={() => navigate("/register")} size="small">Get started</PrimaryButton>
                    </>
                  )
                )}

                {isMobile && (
                  <IconButton onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" sx={{ color: C.ink, border: `1px solid ${C.line}`, bgcolor: "#fff", borderRadius: "12px" }}><Menu size={20} /></IconButton>
                )}
              </Box>
            </Box>
          </Container>
        </Box>

        {/* ───────── Drawer ───────── */}
        <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 320, maxWidth: "88vw", bgcolor: C.bg, borderRadius: "22px 0 0 22px" } }}>
          <Box sx={{ background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navy2} 100%)`, color: "#fff", p: 2.2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 800, fontFamily: FONT, fontSize: 15 }}>{isAuthenticated ? `Hello, ${greetingName}` : "Welcome to Quickks"}</Typography>
              <Typography sx={{ fontSize: 12, color: "#94a3b8", fontFamily: FONT }}>{CONTACT.EMAIL}</Typography>
            </Box>
            <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}><X size={18} /></IconButton>
          </Box>
          <List sx={{ py: 1 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                {...(item.to ? { component: Link, to: item.to } : {})}
                onClick={() => { setMobileMenuOpen(false); if (item.ref) setTimeout(() => scrollToSection(item.ref), 250); }}
                sx={{ borderRadius: "12px", mx: 1, mb: 0.4 }}
              >
                <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 700, fontFamily: FONT }} />
                <ChevronRight size={16} color={C.muted} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton component="a" href={`tel:${CONTACT.PHONE_TEL}`} rel="noopener" sx={{ borderRadius: "12px", mx: 1 }}><Phone size={16} style={{ marginRight: 12 }} /><ListItemText primary={`Call ${CONTACT.PHONE_DISPLAY}`} /></ListItemButton>
            <ListItemButton component="a" href={`mailto:${CONTACT.EMAIL}`} rel="noopener" sx={{ borderRadius: "12px", mx: 1 }}><Mail size={16} style={{ marginRight: 12 }} /><ListItemText primary={CONTACT.EMAIL} /></ListItemButton>
          </List>
          <Divider />
          <Stack spacing={1.2} sx={{ p: 2 }}>
            {isAuthenticated ? (
              <PrimaryButton fullWidth onClick={() => { setMobileMenuOpen(false); cta.action(); }}>{cta.label}</PrimaryButton>
            ) : (
              <>
                <PrimaryButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/register"); }}>Get started free</PrimaryButton>
                <GhostButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}>Sign in</GhostButton>
              </>
            )}
          </Stack>
        </Drawer>

        <Box component="main">
          {/* ───────── Hero ───────── */}
          <Box
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocus={() => setHeroPaused(true)}
            onBlur={() => setHeroPaused(false)}
            sx={{ position: "relative", overflow: "hidden", pt: { xs: 5, md: 9 }, pb: { xs: 6, md: 10 }, background: `radial-gradient(700px at 85% 10%, ${C.yellow}33 0%, transparent 60%), radial-gradient(600px at 0% 100%, ${C.teal}1f 0%, transparent 60%), ${C.bg}` }}
          >
            <Container maxWidth="lg" sx={{ position: "relative" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.15fr 0.85fr" }, gap: { xs: 5, md: 6 }, alignItems: "center" }}>
                <Box aria-live="polite">
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1, bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, px: 1.6, py: 0.6, mb: 2.4, boxShadow: C.shadow }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#22c55e", animation: prefersReducedMotion ? "none" : `${pulse} 2s infinite` }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: FONT }}>{liveStats.totalProviders}+ pros online • {slide.tag}</Typography>
                  </Box>
                  <Typography key={`h-${heroIndex}`} component="h1" sx={{ fontWeight: 900, fontFamily: FONT, fontSize: { xs: "2.2rem", md: "3.5rem" }, lineHeight: 1.06, letterSpacing: "-0.035em", mb: 2.2, color: C.ink, animation: prefersReducedMotion ? "none" : `${fadeUp} 0.55s ease-out`, minHeight: { md: "3.8em" } }}>{slide.title}</Typography>
                  <Typography key={`p-${heroIndex}`} sx={{ color: C.muted, fontSize: { xs: 16, md: 18 }, lineHeight: 1.65, fontFamily: FONT, maxWidth: 560, mb: 3, animation: prefersReducedMotion ? "none" : `${fadeUp} 0.7s ease-out` }}>{slide.text}</Typography>

                  {/* Booking widget */}
                  <Box component="form" onSubmit={handleFindPros} role="search" sx={{ bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "22px", p: 1.5, boxShadow: C.shadowHover, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr auto" }, gap: 1.2, alignItems: "stretch", maxWidth: 640 }}>
                    <TextField
                      select
                      SelectProps={{ native: true }}
                      value={category}
                      onChange={(e) => setCategory(sanitize(e.target.value))}
                      label="Service"
                      size="small"
                      inputProps={{ "aria-label": "Choose a service" }}
                      InputLabelProps={{ shrink: true }}
                      sx={fieldSx}
                    >
                      {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All services" : c}</option>)}
                    </TextField>
                    <TextField
                      size="small"
                      label="Your city"
                      placeholder="e.g. Pune"
                      value={widgetCity}
                      onChange={(e) => setWidgetCity(sanitizeTyping(e.target.value))}
                      InputLabelProps={{ shrink: true }}
                      inputProps={{ maxLength: 100, "aria-label": "Your city" }}
                      InputProps={{ endAdornment: (
                        <IconButton size="small" onClick={detectLocation} disabled={loadingLocation} aria-label="Detect my location" edge="end">
                          {loadingLocation ? <CircularProgress size={16} /> : <LocateFixed size={18} color={C.teal} />}
                        </IconButton>
                      ) }}
                      sx={fieldSx}
                    />
                    <PrimaryButton type="submit" startIcon={<Search size={18} />} sx={{ borderRadius: "14px", minHeight: 40 }}>Find pros</PrimaryButton>
                  </Box>

                  <Stack direction="row" spacing={1.2} mt={2.5} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.7, fontSize: 13, fontWeight: 700, color: C.green }}><Shield size={15} /> Verified & Secure</Box>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.7 }}><Stars value={4.8} size={14} /><Typography sx={{ fontSize: 13, fontWeight: 700 }}>4.8/5 (10k+ reviews)</Typography></Box>
                  </Stack>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mt: 3 }}>
                    {heroSlides.map((_, i) => (
                      <Box key={i} component="button" type="button" onClick={() => setHeroIndex(i)} aria-label={`Show slide ${i + 1}`} aria-current={i === heroIndex} sx={{ width: i === heroIndex ? 30 : 10, height: 10, p: 0, borderRadius: 999, border: "none", bgcolor: i === heroIndex ? C.ink : "#d6d3c8", cursor: "pointer", transition: "all 0.3s ease" }} />
                    ))}
                  </Box>
                </Box>

                {/* Hero visual: clickable service tiles */}
                <Box sx={{ position: "relative" }}>
                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.8 }}>
                    {services.slice(0, 4).map((s, i) => (
                      <Box
                        key={`tile-${s.id || i}`}
                        component="button"
                        type="button"
                        onClick={() => { setCategory(s.title); setQuery(""); scrollToSection(servicesRef); }}
                        aria-label={`Browse ${s.title}`}
                        sx={{ textAlign: "left", cursor: "pointer", border: `1px solid ${C.line}`, borderRadius: "24px", bgcolor: "#fff", p: 2, fontFamily: FONT, boxShadow: C.shadow, transition: "all 0.25s", mt: i % 2 === 1 ? 3 : 0, animation: prefersReducedMotion ? "none" : `${floatY} ${5 + i}s ease-in-out infinite`, "&:hover": { boxShadow: C.shadowHover, borderColor: C.yellow }, "&:focus-visible": { outline: `2px solid ${C.teal}` } }}
                      >
                        <Box sx={{ width: 64, height: 64, borderRadius: "18px", bgcolor: s.color, display: "grid", placeItems: "center", mb: 1.4 }}>{s.icon}</Box>
                        <Typography sx={{ fontWeight: 800, fontSize: 15.5, mb: 0.3, fontFamily: FONT }}>{s.title}</Typography>
                        <Typography sx={{ fontSize: 12.5, color: C.green, fontWeight: 700, display: "flex", alignItems: "center", gap: 0.5, fontFamily: FONT }}><Clock size={12} /> 60 min</Typography>
                      </Box>
                    ))}
                  </Box>
                  <Box sx={{ position: "absolute", left: { xs: 8, md: -18 }, bottom: -18, bgcolor: C.ink, color: "#fff", borderRadius: "16px", px: 1.8, py: 1.1, display: "flex", alignItems: "center", gap: 1, boxShadow: "0 16px 32px rgba(15,23,42,0.3)" }}>
                    <BadgeCheck size={20} color={C.yellow} />
                    <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: FONT }}>Aadhaar-verified experts</Typography>
                  </Box>
                </Box>
              </Box>
            </Container>
          </Box>

          {/* ───────── Account strip ───────── */}
          <Container maxWidth="lg" sx={{ mt: { xs: -1, md: -2 }, position: "relative", zIndex: 2 }}>
            <Box sx={{ bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "22px", boxShadow: C.shadow, p: { xs: 2.2, md: 2.8 }, display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, gap: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
                <Box sx={{ width: 48, height: 48, borderRadius: "15px", background: isAuthenticated ? `linear-gradient(135deg, ${C.yellow}, ${C.yellowDeep})` : C.tealSoft, display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0 }}>
                  {isAuthenticated ? greetingName[0]?.toUpperCase() : <Shield size={22} color={C.teal} />}
                </Box>
                <Box>
                  <Typography component="h2" sx={{ fontSize: 18, fontWeight: 800, fontFamily: FONT }}>{isAuthenticated ? `Welcome back, ${greetingName}` : "Secure & trusted"}</Typography>
                  <Typography sx={{ color: C.muted, fontSize: 14, fontFamily: FONT }}>{isAuthenticated ? `Pick up where you left off or book something new. Support: ${CONTACT.EMAIL}` : `Track pro, save addresses, rebook 1-tap. SSL secured. Help: ${CONTACT.EMAIL}`}</Typography>
                </Box>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                {isAuthenticated ? (
                  <PrimaryButton onClick={cta.action}>{cta.label}</PrimaryButton>
                ) : (
                  <>
                    <PrimaryButton onClick={() => navigate("/login")}>Sign in securely</PrimaryButton>
                    <GhostButton onClick={() => navigate("/register")}>Create account – free</GhostButton>
                  </>
                )}
              </Stack>
            </Box>
          </Container>

          {/* ───────── Stats ───────── */}
          <Container maxWidth="lg" sx={{ mt: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2 }}>
              {statsData.map((stat) => (
                <Box key={stat.label} sx={{ textAlign: "center", py: 2.4, px: 1, borderRadius: "20px", bgcolor: C.navy, color: "#fff", position: "relative", overflow: "hidden", "&::before": { content: '""', position: "absolute", top: -30, right: -30, width: 90, height: 90, borderRadius: "50%", background: `radial-gradient(circle, ${C.yellow}40, transparent 70%)` } }}>
                  <Typography sx={{ position: "relative", fontSize: { xs: 28, md: 36 }, fontWeight: 900, lineHeight: 1.1, fontFamily: FONT, color: stat.stars ? C.yellow : "#fff" }}>{stat.value}</Typography>
                  {stat.stars && !isLoadingStats && <Box sx={{ mt: 0.6, display: "flex", justifyContent: "center" }}><Stars value={liveStats.averageRating} size={15} /></Box>}
                  <Typography sx={{ position: "relative", color: "#94a3b8", fontSize: 12, mt: 0.8, fontFamily: FONT, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{stat.label}</Typography>
                </Box>
              ))}
            </Box>
          </Container>

          {/* ───────── Services ───────── */}
          <Box ref={servicesRef} id="services" sx={{ pt: { xs: 7, md: 10 }, scrollMarginTop: 90 }}>
            <Container maxWidth="lg">
              {sectionHeading("Services", "Popular services near you", location ? `Showing pros available in ${location}.` : "Pick a service, set your city and book in a minute.")}

              <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 1.5, mb: 2, alignItems: { md: "center" } }}>
                <TextField
                  size="small"
                  value={query}
                  onChange={(e) => setQuery(sanitizeTyping(e.target.value))}
                  placeholder="Search e.g. fan repair, electrician near me"
                  inputProps={{ maxLength: 100, "aria-label": "Search services" }}
                  InputProps={{ startAdornment: <Search size={18} color={C.muted} style={{ marginRight: 8 }} />, endAdornment: query ? <IconButton size="small" aria-label="Clear search" onClick={() => setQuery("")} edge="end"><X size={16} /></IconButton> : null }}
                  sx={{ flex: 1, ...fieldSx }}
                />
                <TextField select SelectProps={{ native: true }} size="small" value={sortBy} onChange={(e) => setSortBy(e.target.value)} inputProps={{ "aria-label": "Sort services" }} sx={{ minWidth: 190, ...fieldSx }}>
                  <option value="recommended">Sort: Recommended</option>
                  <option value="rating">Sort: Top rated</option>
                  <option value="price">Sort: Price low to high</option>
                  <option value="name">Sort: Name A–Z</option>
                </TextField>
              </Box>

              {!isLoadingServices && categories.length > 1 && (
                <Box role="tablist" aria-label="Service categories" sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1.5, mb: 1, scrollbarWidth: "none", "&::-webkit-scrollbar": { display: "none" } }}>
                  {categories.map((c) => {
                    const active = category === c;
                    return (
                      <Box key={c} component="button" type="button" role="tab" aria-selected={active} onClick={() => setCategory(c)} sx={{ flexShrink: 0, cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 700, px: 2, py: 0.8, borderRadius: 999, border: `1.5px solid ${active ? C.ink : C.line}`, bgcolor: active ? C.ink : "#fff", color: active ? "#fff" : C.ink, transition: "all 0.2s", "&:hover": { borderColor: C.ink }, "&:focus-visible": { outline: `2px solid ${C.teal}`, outlineOffset: 2 } }}>{c}</Box>
                    );
                  })}
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }} aria-live="polite">
                <Typography sx={{ color: C.muted, fontSize: 14, fontFamily: FONT }}>{isLoadingServices ? "Loading services…" : `${visibleServices.length} service${visibleServices.length === 1 ? "" : "s"} found`}</Typography>
                {filtersActive && <TextLink type="button" onClick={clearFilters}>Clear filters</TextLink>}
              </Box>

              {isLoadingServices ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5 }}>
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={340} sx={{ borderRadius: "22px" }} />)}
                </Box>
              ) : visibleServices.length === 0 ? (
                <Box sx={{ py: 8, textAlign: "center", bgcolor: "#fff", border: `1px dashed ${C.line}`, borderRadius: "22px" }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1, fontFamily: FONT }}>No services match “{sanitize(query)}”</Typography>
                  <Typography sx={{ color: C.muted, mb: 2.5, fontFamily: FONT }}>Check spelling or try broader term. Contact {CONTACT.EMAIL} for help.</Typography>
                  <GhostButton onClick={clearFilters}>Show all services</GhostButton>
                </Box>
              ) : (
                <Box role="list" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5 }}>
                  {visibleServices.map((s, idx) => (
                    <Box key={s.id || idx} role="listitem">
                      <ServiceCard s={s} fallbackRating={liveStats.averageRating} onBook={bookService} onDetails={setSelectedService} />
                    </Box>
                  ))}
                </Box>
              )}
            </Container>
          </Box>

          {/* ───────── How it works ───────── */}
          <Box ref={howRef} id="how" sx={{ pt: { xs: 7, md: 10 }, scrollMarginTop: 90 }}>
            <Container maxWidth="lg">
              {sectionHeading("How it works", "Fixed in 3 simple steps", "From booking to warranty, everything happens in one place.")}
              <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2.5 }}>
                {steps.map((s, i) => (
                  <Box component="li" key={s.title} sx={{ position: "relative", bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "24px", p: 3, boxShadow: C.shadow, transition: "all 0.25s", "&:hover": { transform: "translateY(-4px)", boxShadow: C.shadowHover } }}>
                    <Typography sx={{ position: "absolute", top: 14, right: 22, fontSize: 64, fontWeight: 900, color: "#f1efe7", lineHeight: 1, fontFamily: FONT }}>{i + 1}</Typography>
                    <Box sx={{ position: "relative", width: 50, height: 50, borderRadius: "16px", bgcolor: C.ink, color: C.yellow, display: "grid", placeItems: "center", mb: 2 }}>{s.icon}</Box>
                    <Typography component="h3" sx={{ position: "relative", fontSize: 18, fontWeight: 800, mb: 0.8, fontFamily: FONT }}>{s.title}</Typography>
                    <Typography sx={{ position: "relative", color: C.muted, fontSize: 14.5, lineHeight: 1.65, fontFamily: FONT }}>{s.description}</Typography>
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>

          {/* ───────── Why Quickks ───────── */}
          <Box ref={featuresRef} id="features" sx={{ pt: { xs: 7, md: 10 }, scrollMarginTop: 90 }}>
            <Container maxWidth="lg">
              {sectionHeading("Why Quickks", "Why 10k+ customers trust Quickks", `Secure, verified, warranty backed • Support: ${CONTACT.EMAIL}`)}
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, gap: 2.5 }}>
                {features.map((f) => (
                  <Box key={f.title} sx={{ p: 2.8, bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "24px", transition: "all 0.25s", "&:hover": { borderColor: C.green, boxShadow: "0 18px 36px rgba(5,150,105,0.12)", transform: "translateY(-4px)" } }}>
                    <Box sx={{ width: 54, height: 54, borderRadius: "16px", background: "linear-gradient(135deg, #ecfdf5, #d1fae5)", display: "grid", placeItems: "center", mb: 2 }}>{f.icon}</Box>
                    <Typography component="h3" sx={{ fontSize: 17, fontWeight: 800, mb: 0.8, fontFamily: FONT }}>{f.title}</Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.65, fontFamily: FONT }}>{f.description}</Typography>
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>

          {/* ───────── CTA ───────── */}
          <Box sx={{ py: { xs: 7, md: 10 } }}>
            <Container maxWidth="lg">
              <Box sx={{ position: "relative", overflow: "hidden", borderRadius: "32px", p: { xs: 3.5, md: 7 }, textAlign: "center", color: "#fff", background: `linear-gradient(135deg, ${C.navy} 0%, ${C.navy2} 100%)` }}>
                <Box sx={{ position: "absolute", top: -80, right: -60, width: 260, height: 260, borderRadius: "50%", background: `radial-gradient(circle, ${C.yellow}55, transparent 70%)` }} />
                <Box sx={{ position: "absolute", bottom: -90, left: -60, width: 280, height: 280, borderRadius: "50%", background: `radial-gradient(circle, ${C.teal}55, transparent 70%)` }} />
                <Box sx={{ position: "relative" }}>
                  <Typography component="h2" sx={{ fontSize: { xs: 26, md: 40 }, fontWeight: 900, mb: 1.5, fontFamily: FONT, letterSpacing: "-0.03em" }}>Ready to get it fixed? ⚡</Typography>
                  <Typography sx={{ color: "#cbd5e1", mb: 3.5, fontFamily: FONT, fontSize: { xs: 14.5, md: 17 }, maxWidth: 540, mx: "auto", lineHeight: 1.65 }}>
                    Questions? Call <Box component="a" href={`tel:${CONTACT.PHONE_TEL}`} sx={{ color: C.yellow, fontWeight: 800, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{CONTACT.PHONE_DISPLAY}</Box> or email <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: C.yellow, fontWeight: 800, textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{CONTACT.EMAIL}</Box>
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                    <PrimaryButton size="large" onClick={cta.action} sx={{ px: 5, py: 1.3, fontSize: 16 }}>{cta.label}</PrimaryButton>
                    {!isAuthenticated && <Button size="large" onClick={() => navigate("/login")} sx={{ px: 5, py: 1.3, fontSize: 16, color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)", borderRadius: "14px", textTransform: "none", fontWeight: 700, fontFamily: FONT, "&:hover": { bgcolor: "rgba(255,255,255,0.1)", borderColor: "#fff" } }}>Sign in</Button>}
                  </Stack>
                  <Typography sx={{ color: "#94a3b8", fontSize: 12.5, mt: 3, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 1, fontFamily: FONT }}><Shield size={14} /> SSL secured • Verified pros • Warranty backed • {CONTACT.EMAIL}</Typography>
                </Box>
              </Box>
            </Container>
          </Box>
        </Box>

        <Suspense fallback={<Box sx={{ py: 4, textAlign: "center", bgcolor: C.navy }}><CircularProgress size={24} sx={{ color: C.yellow }} /></Box>}>
          <Footer />
        </Suspense>

        {/* ───────── Service details dialog ───────── */}
        <Dialog open={Boolean(selectedService)} onClose={() => setSelectedService(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}>
          {selectedService && (
            <>
              <Box sx={{ bgcolor: selectedService.color, py: 4, display: "grid", placeItems: "center", position: "relative" }}>
                <IconButton onClick={() => setSelectedService(null)} aria-label="Close" sx={{ position: "absolute", top: 10, right: 10, bgcolor: "rgba(255,255,255,0.7)" }}><X size={18} /></IconButton>
                <Box sx={{ transform: "scale(1.6)" }}>{selectedService.icon}</Box>
              </Box>
              <DialogTitle sx={{ fontWeight: 900, fontFamily: FONT, pb: 0.5 }}>{selectedService.title}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1.5 }}>
                  <Stars value={selectedService.rating || liveStats.averageRating} size={15} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{selectedService.rating || liveStats.averageRating}</Typography>
                </Box>
                <Typography sx={{ color: C.muted, fontSize: 14.5, lineHeight: 1.65, mb: 2, fontFamily: FONT }}>{selectedService.description}</Typography>
                <Stack spacing={0.8}>
                  {["Aadhaar verified professionals", "Arrives within 60 minutes", "Up to 90-day warranty"].map((t) => (
                    <Box key={t} sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 14, fontWeight: 600, fontFamily: FONT }}><ShieldCheck size={16} color={C.green} /> {t}</Box>
                  ))}
                  {selectedService.price && <Box sx={{ fontSize: 15, fontWeight: 800, mt: 0.5, fontFamily: FONT }}>Starting ₹{selectedService.price}</Box>}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2.5, pt: 1 }}>
                <SoftButton onClick={() => setSelectedService(null)}>Close</SoftButton>
                <PrimaryButton onClick={() => { const s = selectedService; setSelectedService(null); bookService(s); }}>Book now</PrimaryButton>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* ───────── Exit intent dialog ───────── */}
        <Dialog open={showExitIntent && !isAuthenticated} onClose={() => setShowExitIntent(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}>
          <Box sx={{ height: 6, background: `linear-gradient(90deg, ${C.yellow}, ${C.teal})` }} />
          <DialogTitle sx={{ fontWeight: 900, fontFamily: FONT, fontSize: 21 }}>Get ₹100 off – today only! 🎉</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2, fontFamily: FONT, lineHeight: 1.55 }}>Enter email, get offer instantly. Secure, no spam. Support: {CONTACT.EMAIL}</Typography>
            <TextField fullWidth autoFocus type="email" label="Email address" value={exitEmail} onChange={(e) => setExitEmail(sanitize(e.target.value))} inputProps={{ maxLength: 100 }} onKeyDown={(e) => { if (e.key === "Enter") handleNewsletter(); }} sx={{ mt: 0.5, ...fieldSx }} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <SoftButton onClick={() => setShowExitIntent(false)}>No thanks</SoftButton>
            <PrimaryButton onClick={handleNewsletter} disabled={exitIntentSubmitting || !isValidEmail(exitEmail)}>{exitIntentSubmitting ? <CircularProgress size={20} /> : "Send my offer"}</PrimaryButton>
          </DialogActions>
        </Dialog>

        {/* ───────── Location dialog ───────── */}
        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}>
          <Box sx={{ height: 6, background: `linear-gradient(90deg, ${C.yellow}, ${C.teal})` }} />
          <DialogTitle sx={{ fontWeight: 800, fontFamily: FONT }}>Choose location 📍</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, fontFamily: FONT }}>We show pros & response times for your area.</Typography>
            <SoftButton fullWidth onClick={detectLocation} disabled={loadingLocation} startIcon={loadingLocation ? <CircularProgress size={16} /> : <LocateFixed size={18} />} sx={{ mb: 2.5, py: 1.2 }}>
              {loadingLocation ? "Detecting…" : "Use current location"}
            </SoftButton>
            <TextField fullWidth label="City or area" placeholder="e.g. Pune, Kothrud" value={manualLocation} onChange={(e) => setManualLocation(sanitizeTyping(e.target.value))} inputProps={{ maxLength: 100 }} onKeyDown={(e) => { if (e.key === "Enter") handleLocationConfirm(); }} sx={fieldSx} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <SoftButton onClick={() => setShowLocationDialog(false)}>Cancel</SoftButton>
            <PrimaryButton onClick={handleLocationConfirm} disabled={!sanitize(manualLocation)}>Apply</PrimaryButton>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={closeSnackbar} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <Alert severity={snackbar.severity} onClose={closeSnackbar} sx={{ borderRadius: "14px", fontWeight: 600, boxShadow: "0 12px 32px rgba(0,0,0,0.18)" }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ErrorBoundary>
  );
}