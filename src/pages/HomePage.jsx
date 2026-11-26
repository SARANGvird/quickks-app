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
  ArrowRight, ArrowUp, BadgeCheck, CalendarCheck, UserCheck, Wallet, Navigation
} from "lucide-react";
import {
  Box, Container, Typography, Button, IconButton, Drawer, List, ListItemButton, ListItemText,
  Divider, Alert, CircularProgress, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Snackbar, Stack, Fab, Skeleton, useMediaQuery, useTheme
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
const HEAD = '"Sora", "Inter", "Segoe UI", sans-serif';
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
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(198,242,78,0.65); }
  70% { box-shadow: 0 0 0 8px rgba(198,242,78,0); }
  100% { box-shadow: 0 0 0 0 rgba(198,242,78,0); }
`;
const dash = keyframes`
  to { stroke-dashoffset: -40; }
`;

/* ───────── Quickks tokens ───────── */
const C = {
  forest: "#0B3D2E",
  forest2: "#0F4C39",
  forest3: "#14573F",
  lime: "#C6F24E",
  limeDeep: "#A9D92F",
  limeSoft: "#F0FBCB",
  cream: "#FFF8EC",
  creamDeep: "#F6EEDC",
  ink: "#1A1A1A",
  text: "#1A1A1A",
  muted: "#5B6B63",
  line: "#E6E0D0",
  white: "#FFFFFF",
  shadow: "0 1px 2px rgba(11,61,46,0.05), 0 8px 24px -12px rgba(11,61,46,0.14)",
  shadowHover: "0 2px 4px rgba(11,61,46,0.06), 0 24px 44px -18px rgba(11,61,46,0.28)",
};

const PrimaryButton = styled(Button)({
  background: C.forest,
  color: "#fff",
  borderRadius: 12,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  fontSize: 15,
  letterSpacing: 0,
  boxShadow: `0 1px 0 rgba(255,255,255,0.12) inset, 0 6px 16px -6px rgba(11,61,46,0.6)`,
  padding: "10px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: C.forest2, transform: "translateY(-1px)", boxShadow: `0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 22px -8px rgba(11,61,46,0.6), 0 0 0 3px ${C.lime}55` },
  "&:active": { transform: "translateY(0)" },
  "&:focus-visible": { outline: `2px solid ${C.limeDeep}`, outlineOffset: 2 },
  "&.Mui-disabled": { background: "#E7E5DC", color: "#9A9A8E", boxShadow: "none" },
});

const AccentButton = styled(Button)({
  background: C.lime,
  color: C.forest,
  borderRadius: 12,
  textTransform: "none",
  fontWeight: 800,
  fontFamily: FONT,
  fontSize: 15,
  boxShadow: "0 8px 20px -8px rgba(198,242,78,0.8)",
  padding: "10px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: "#D5F876", transform: "translateY(-1px)", boxShadow: "0 12px 26px -8px rgba(198,242,78,0.9)" },
  "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
  "&.Mui-disabled": { background: "#E7E5DC", color: "#9A9A8E", boxShadow: "none" },
});

const OutlineButton = styled(Button)({
  background: "transparent",
  color: C.forest,
  border: `1.5px solid ${C.forest}`,
  borderRadius: 12,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  fontSize: 15,
  padding: "9px 22px",
  transition: "all 0.2s ease",
  "&:hover": { background: C.forest, color: "#fff" },
  "&:focus-visible": { outline: `2px solid ${C.limeDeep}`, outlineOffset: 2 },
  "&.Mui-disabled": { opacity: 0.5 },
});

const OutlineLightButton = styled(Button)({
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  border: "1.5px solid rgba(255,255,255,0.28)",
  borderRadius: 12,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  fontSize: 15,
  padding: "9px 22px",
  backdropFilter: "blur(6px)",
  transition: "all 0.2s ease",
  "&:hover": { background: "rgba(255,255,255,0.14)", borderColor: C.lime },
  "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 2 },
});

const SoftButton = styled(Button)({
  background: "#fff",
  color: C.forest,
  border: `1px solid ${C.line}`,
  borderRadius: 12,
  textTransform: "none",
  fontWeight: 700,
  fontFamily: FONT,
  padding: "9px 22px",
  boxShadow: C.shadow,
  "&:hover": { background: C.cream, borderColor: C.forest },
  "&:focus-visible": { outline: `2px solid ${C.limeDeep}`, outlineOffset: 2 },
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
  borderRadius: 10,
  cursor: "pointer",
  transition: "background 0.2s, color 0.2s",
  "&:hover": { background: C.limeSoft, color: C.forest },
  "&:focus-visible": { outline: `2px solid ${C.limeDeep}` },
});
const NavLinkRouter = styled(Link)({
  color: C.ink,
  fontFamily: FONT,
  fontSize: 14.5,
  fontWeight: 600,
  padding: "8px 14px",
  borderRadius: 10,
  textDecoration: "none",
  transition: "background 0.2s, color 0.2s",
  "&:hover": { background: C.limeSoft, color: C.forest },
  "&:focus-visible": { outline: `2px solid ${C.limeDeep}` },
});

const TextLink = styled("button")({
  background: "none",
  border: "none",
  padding: 0,
  color: C.forest,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: FONT,
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  textDecoration: "underline",
  textDecorationColor: C.lime,
  textDecorationThickness: 3,
  textUnderlineOffset: 4,
  "&:hover": { textDecorationColor: C.forest },
  "&:focus-visible": { outline: `2px solid ${C.limeDeep}`, outlineOffset: 2, borderRadius: 2 },
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

/* Palette-only tints (forest / lime / cream) */
const DEFAULT_SERVICES = [
  { id: 1, icon: <Zap size={38} color={C.forest} strokeWidth={2.1} />, title: "Electrician", description: "Fans, wiring, switchboards and emergency fixes. Verified pros in 30 min.", color: "#EAF9B8", popular: true },
  { id: 2, icon: <Wrench size={38} color={C.forest} strokeWidth={2.1} />, title: "Appliance Repair", description: "Fridge, washing machine and home appliances. Warranty backed.", color: "#DCEFE4" },
  { id: 3, icon: <Bolt size={38} color={C.forest} strokeWidth={2.1} />, title: "Power Backup", description: "Inverter and generator installation. 24/7 emergency support.", color: "#F6EDCF" },
  { id: 4, icon: <Settings size={38} color={C.forest} strokeWidth={2.1} />, title: "Smart Home", description: "Smart devices, automation and premium setups. Certified experts.", color: "#E2ECCB" },
];

const Footer = lazy(() => import("../components/Footer").catch(() => ({
  default: () => (
    <Box sx={{ py: 4, textAlign: "center", bgcolor: C.forest }}>
      <Container maxWidth="lg">
        <Typography sx={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: FONT }}>© {new Date().getFullYear()} Quickks. {CONTACT.EMAIL}</Typography>
      </Container>
    </Box>
  ),
})));

function Stars({ value = 4.8, size = 16, color = C.forest }) {
  const v = Math.max(0, Math.min(5, Number(value) || 0));
  const rounded = Math.round(v);
  return (
    <Box component="span" role="img" aria-label={`${v} out of 5 stars`} sx={{ display: "inline-flex", gap: "2px", verticalAlign: "middle" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} color={color} fill={n <= rounded ? color : "none"} strokeWidth={n <= rounded ? 0 : 1.5} />
      ))}
    </Box>
  );
}

/* Lime circular icon badge */
function LimeBadge({ children, size = 44 }) {
  return (
    <Box sx={{ width: size, height: size, borderRadius: "50%", bgcolor: C.lime, color: C.forest, display: "grid", placeItems: "center", flexShrink: 0 }}>{children}</Box>
  );
}

function LiveDot({ size = 9, reduced }) {
  return <Box component="span" aria-hidden="true" sx={{ display: "inline-block", width: size, height: size, borderRadius: "50%", bgcolor: C.lime, animation: reduced ? "none" : `${pulse} 2s infinite`, flexShrink: 0 }} />;
}

/* Logo: wordmark with lime dot */
function Wordmark({ light = false }) {
  return (
    <Typography component="span" sx={{ fontFamily: HEAD, fontWeight: 800, fontSize: 24, letterSpacing: "-0.04em", color: light ? "#fff" : C.forest, display: "inline-flex", alignItems: "baseline" }}>
      quickks<Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: C.lime, border: light ? "none" : `1.5px solid ${C.forest}`, ml: "2px", display: "inline-block" }} />
    </Typography>
  );
}

/* Headline with one highlighted word: lime + underline stroke */
function Headline({ title, hl, reduced, k }) {
  const idx = hl ? title.indexOf(hl) : -1;
  const before = idx >= 0 ? title.slice(0, idx) : title;
  const after = idx >= 0 ? title.slice(idx + hl.length) : "";
  return (
    <Typography key={k} component="h1" sx={{ color: "#fff", fontFamily: HEAD, fontWeight: 800, fontSize: { xs: "2.15rem", sm: "2.8rem", lg: "3.35rem" }, lineHeight: 1.1, letterSpacing: "-0.03em", animation: reduced ? "none" : `${fadeUp} 0.55s ease-out` }}>
      {before}
      {idx >= 0 && (
        <Box component="span" sx={{ position: "relative", display: "inline-block", color: C.lime }}>
          {hl}
          <Box component="svg" viewBox="0 0 120 12" preserveAspectRatio="none" aria-hidden="true" sx={{ position: "absolute", left: 0, bottom: -8, width: "100%", height: 10 }}>
            <path d="M2 8 C 20 1, 40 13, 60 7 S 100 1, 118 7" fill="none" stroke={C.lime} strokeWidth="3.5" strokeLinecap="round" />
          </Box>
        </Box>
      )}
      {after}
    </Typography>
  );
}

/* Module-level so it is not re-mounted on every HomePage render */
function ServiceCard({ s, fallbackRating, onBook, onDetails }) {
  const rating = s.rating || fallbackRating;
  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "20px", p: 2.4, boxShadow: C.shadow, transition: "all 0.25s ease", animation: `${fadeUp} 0.45s ease-out`, "&:hover": { transform: "translateY(-5px)", boxShadow: `${C.shadowHover}, 0 0 0 4px ${C.lime}55`, borderColor: C.forest }, "&:hover .svc-icon": { transform: "rotate(-6deg) scale(1.06)" } }}
    >
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box className="svc-icon" sx={{ width: 68, height: 68, borderRadius: "18px", bgcolor: s.color, display: "grid", placeItems: "center", transition: "transform 0.3s ease" }}>{s.icon}</Box>
        {s.popular && (
          <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, bgcolor: C.forest, color: C.lime, fontSize: 11, fontWeight: 800, px: 1.2, py: 0.45, borderRadius: 999, fontFamily: FONT, letterSpacing: 0.6 }}><Sparkles size={12} /> POPULAR</Box>
        )}
      </Box>
      <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, mb: 0.6, fontFamily: HEAD, color: C.text, letterSpacing: "-0.01em" }}>{s.title}</Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 1.2 }}>
        <Stars value={rating} size={14} />
        <Typography sx={{ color: C.text, fontSize: 13, fontWeight: 700, fontFamily: FONT }}>{rating}</Typography>
      </Box>
      <Typography sx={{ color: C.muted, fontSize: 14, lineHeight: 1.65, mb: 1.8, flex: 1, fontFamily: FONT }}>{s.description}</Typography>
      {s.price && (
        <Typography sx={{ color: C.text, fontSize: 20, fontWeight: 700, mb: 1.2, fontFamily: HEAD, lineHeight: 1.1 }}>
          <Box component="span" sx={{ fontSize: 13, color: C.muted, fontWeight: 500, fontFamily: FONT }}>Starting </Box>₹{s.price}
        </Typography>
      )}
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, alignSelf: "flex-start", color: C.forest, bgcolor: C.limeSoft, borderRadius: 999, px: 1.3, py: 0.45, fontSize: 12, fontWeight: 700, mb: 2, fontFamily: FONT }}><Clock size={13} /> 60 min arrival • Warranty</Box>
      <Stack direction="row" spacing={1}>
        <PrimaryButton fullWidth size="small" onClick={() => onBook(s)}>Book now</PrimaryButton>
        <IconButton aria-label={`Details for ${s.title}`} onClick={() => onDetails(s)} sx={{ border: `1px solid ${C.line}`, borderRadius: "12px", width: 42, color: C.forest, "&:hover": { bgcolor: C.limeSoft, borderColor: C.forest } }}><ArrowRight size={18} /></IconButton>
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

  const readSavedLocation = () => {
    const saved = storage.get("local", LOCATION_KEY) || "";
    if (!saved || BLOCKED_LOCATION.test(saved)) return "";
    return sanitize(saved);
  };
  const [location, setLocation] = useState(readSavedLocation);
  const [widgetCity, setWidgetCity] = useState(readSavedLocation);
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

  /* Booking card: saves city (if changed) and jumps to the filtered services */
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
    { icon: <ShieldCheck size={24} />, title: "Verified professionals", description: "Aadhaar verified, background checked, rated by 10k+ customers. Your safety is our priority." },
    { icon: <Clock size={24} />, title: "Fast 60-min response", description: "Book in 1 minute. Nearby expert reaches you within 60 minutes, 24/7." },
    { icon: <Award size={24} />, title: "Warranty + Guarantee", description: "Up to 90-day warranty, satisfaction guarantee. If not right, we fix it free." },
    { icon: <CreditCard size={24} />, title: "Secure payments", description: "UPI, Cards, NetBanking, Wallets, COD. 256-bit SSL, up to ₹10K protection." },
  ], []);

  const steps = useMemo(() => [
    { icon: <CalendarCheck size={24} />, title: "Choose a service", description: "Pick what you need fixed, tell us your location. Takes 30 seconds." },
    { icon: <UserCheck size={24} />, title: "Get matched instantly", description: "AI matches closest verified pro free right now. Track live." },
    { icon: <Wallet size={24} />, title: "Job done, pay securely", description: "Review work, pay via secure gateway, rate experience. Warranty auto-applied." },
  ], []);

  const statsData = useMemo(() => {
    const placeholder = "–";
    return [
      { value: isLoadingStats ? placeholder : formatCount(liveStats.totalCustomers), label: "Happy customers" },
      { value: isLoadingStats ? placeholder : formatCount(liveStats.totalProviders), label: "Verified experts", live: true },
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
    { title: "Trusted home services, at your door in 60 minutes", hl: "Trusted", text: "Verified electricians, appliance repair & more. Ratings, secure pay, warranty. Support: connect@quickks.in", tag: "60-min response" },
    { title: "Get ₹100 off your first booking today", hl: "₹100", text: "Create free account, save instantly. Verified pros, SSL secure, no surprises.", tag: "New customer offer" },
    { title: "Power cut? Appliance down? We are on it ⚡", hl: "Power", text: "Emergency fixes from nearby experts who reach fast. Call +91 93713 65677", tag: "Emergency help" },
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

  const sectionHeading = (eyebrow, title, sub, light = false) => (
    <Box sx={{ mb: 5, textAlign: { xs: "left", md: "center" } }}>
      <Typography sx={{ display: "inline-flex", alignItems: "center", gap: 0.8, color: light ? C.forest : C.lime, bgcolor: light ? C.lime : C.forest, fontSize: 12, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase", px: 1.6, py: 0.5, borderRadius: 999, mb: 1.6, fontFamily: FONT }}>{eyebrow}</Typography>
      <Typography component="h2" sx={{ fontSize: { xs: 26, md: 38 }, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.15, fontFamily: HEAD, color: light ? "#fff" : C.forest }}>{title}</Typography>
      {sub && <Typography sx={{ color: light ? "rgba(255,255,255,0.72)" : C.muted, mt: 1.4, fontSize: { xs: 14.5, md: 16 }, fontFamily: FONT, maxWidth: 640, mx: { md: "auto" }, lineHeight: 1.65 }}>{sub}</Typography>}
    </Box>
  );

  const fieldSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px", bgcolor: "#fff", fontFamily: FONT, fontSize: 15,
      "& fieldset": { borderColor: C.line },
      "&:hover fieldset": { borderColor: C.forest },
      "&.Mui-focused fieldset": { borderColor: C.forest, borderWidth: 2 },
    },
    "& .MuiInputLabel-root": { fontFamily: FONT, fontWeight: 600 },
    "& .MuiInputLabel-root.Mui-focused": { color: C.forest },
  };

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
        <meta name="theme-color" content={C.forest} />
        <link rel="preconnect" href="https://nominatim.openstreetmap.org" />
        <script type="application/ld+json">{jsonLd}</script>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@500;600;700;800&display=swap');`}</style>
      </Helmet>

      <Box sx={{ minHeight: "100vh", bgcolor: C.cream, fontFamily: FONT, color: C.text, overflowX: "hidden", WebkitFontSmoothing: "antialiased" }}>
        <FloatingContactButton onClick={handleWhatsApp} aria-label="Chat on WhatsApp"><FaWhatsapp size={28} /></FloatingContactButton>

        {scrolled && (
          <Fab size="small" aria-label="Scroll to top" onClick={() => window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" })} sx={{ position: "fixed", bottom: 96, right: 32, zIndex: 1100, bgcolor: C.lime, color: C.forest, "&:hover": { bgcolor: "#D5F876" } }}><ArrowUp size={18} /></Fab>
        )}

        {/* ───────── Announcement strip ───────── */}
        {!isMobile && (
          <Box sx={{ bgcolor: C.forest, color: "rgba(255,255,255,0.8)", fontSize: 13, fontFamily: FONT }}>
            <Container maxWidth="lg" sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.9 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}><Sparkles size={14} color={C.lime} /> Get ₹100 off your first booking</Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
                <Box component="a" href={`tel:${CONTACT.PHONE_TEL}`} rel="noopener" sx={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 0.7, "&:hover": { color: C.lime } }}><Phone size={13} /> {CONTACT.PHONE_DISPLAY}</Box>
                <Box component="a" href={`mailto:${CONTACT.EMAIL}`} rel="noopener" sx={{ color: "inherit", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 0.7, "&:hover": { color: C.lime } }}><Mail size={13} /> {CONTACT.EMAIL}</Box>
              </Box>
            </Container>
          </Box>
        )}

        {/* ───────── Navbar ───────── */}
        <Box component="header" sx={{ position: "sticky", top: 0, zIndex: 1000, bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(14px) saturate(160%)", borderBottom: `1px solid ${C.line}` }}>
          <Container maxWidth="lg">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.2 }}>
              <Box component="button" type="button" onClick={() => navigate("/")} aria-label="Quickks home" sx={{ display: "flex", alignItems: "center", gap: 1.1, background: "none", border: "none", cursor: "pointer", p: 0, "&:focus-visible": { outline: `2px solid ${C.limeDeep}`, borderRadius: "8px" } }}>
                <Box component="img" src={QuickksLogo} alt="" sx={{ width: 38, height: 38, objectFit: "contain", bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "11px", p: "5px" }} />
                <Wordmark />
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
                <Box component="button" type="button" onClick={() => setShowLocationDialog(true)} aria-label="Change location" sx={{ display: "inline-flex", alignItems: "center", gap: 0.7, bgcolor: C.cream, border: `1px solid ${C.line}`, borderRadius: "10px", px: 1.4, py: 0.8, cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: C.forest, maxWidth: { xs: 130, md: 170 }, transition: "border-color 0.2s", "&:hover": { borderColor: C.forest }, "&:focus-visible": { outline: `2px solid ${C.limeDeep}` } }}>
                  <MapPin size={15} style={{ flexShrink: 0 }} />
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
                  <IconButton onClick={() => setMobileMenuOpen(true)} aria-label="Open menu" sx={{ color: C.forest, border: `1px solid ${C.line}`, bgcolor: "#fff", borderRadius: "12px" }}><Menu size={20} /></IconButton>
                )}
              </Box>
            </Box>
          </Container>
        </Box>

        {/* ───────── Drawer ───────── */}
        <Drawer anchor="right" open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} PaperProps={{ sx: { width: 320, maxWidth: "88vw", bgcolor: C.cream, borderRadius: "24px 0 0 24px" } }}>
          <Box sx={{ bgcolor: C.forest, color: "#fff", p: 2.4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontFamily: HEAD, fontSize: 15 }}>{isAuthenticated ? `Hello, ${greetingName}` : "Welcome to Quickks"}</Typography>
              <Typography sx={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: FONT }}>{CONTACT.EMAIL}</Typography>
            </Box>
            <IconButton onClick={() => setMobileMenuOpen(false)} aria-label="Close menu" sx={{ color: "#fff", bgcolor: "rgba(255,255,255,0.1)" }}><X size={18} /></IconButton>
          </Box>
          <List sx={{ py: 1 }}>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                {...(item.to ? { component: Link, to: item.to } : {})}
                onClick={() => { setMobileMenuOpen(false); if (item.ref) setTimeout(() => scrollToSection(item.ref), 250); }}
                sx={{ borderRadius: "12px", mx: 1, mb: 0.4, "&:hover": { bgcolor: C.limeSoft } }}
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
                <OutlineButton fullWidth onClick={() => { setMobileMenuOpen(false); navigate("/login"); }}>Sign in</OutlineButton>
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
            sx={{
              position: "relative", overflow: "hidden", color: "#fff",
              pt: { xs: 6, md: 10 }, pb: { xs: 14, md: 18 },
              background: `radial-gradient(900px at 85% -10%, ${C.lime}2e 0%, transparent 55%), radial-gradient(700px at 0% 100%, ${C.forest3} 0%, transparent 60%), linear-gradient(135deg, ${C.forest} 0%, ${C.forest2} 100%)`,
              "&::before": { content: '""', position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 1.2px, transparent 1.2px)", backgroundSize: "26px 26px", maskImage: "linear-gradient(180deg, #000 0%, transparent 85%)", WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 85%)" },
            }}
          >
            <Container maxWidth="lg" sx={{ position: "relative" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.1fr 0.9fr" }, gap: { xs: 6, lg: 8 }, alignItems: "center" }}>
                <Box aria-live="polite">
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1.2, bgcolor: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 999, px: 1.8, py: 0.7, mb: 3 }}>
                    <LiveDot reduced={prefersReducedMotion} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: FONT, color: "#fff" }}>{liveStats.totalProviders}+ pros online • {slide.tag}</Typography>
                  </Box>

                  <Box sx={{ minHeight: { lg: 190 } }}>
                    <Headline title={slide.title} hl={slide.hl} reduced={prefersReducedMotion} k={`h-${heroIndex}`} />
                  </Box>
                  <Typography key={`p-${heroIndex}`} sx={{ color: "rgba(255,255,255,0.78)", fontSize: { xs: 16, md: 18 }, lineHeight: 1.7, fontFamily: FONT, maxWidth: 560, mt: 3.5, mb: 2.5, animation: prefersReducedMotion ? "none" : `${fadeUp} 0.7s ease-out` }}>{slide.text}</Typography>

                  <Typography sx={{ display: "inline-flex", alignItems: "center", gap: 1, fontFamily: HEAD, fontSize: 14, fontWeight: 600, color: C.lime, mb: 3.5 }}><Navigation size={15} /> Gharacha manus, 60 min madhe</Typography>

                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <AccentButton size="large" onClick={cta.action} sx={{ px: 4, py: 1.4, fontSize: 16 }}>{cta.label} <ChevronRight size={18} style={{ marginLeft: 4 }} /></AccentButton>
                    <OutlineLightButton size="large" onClick={() => scrollToSection(servicesRef)} sx={{ px: 4, py: 1.3, fontSize: 16 }}>Browse services</OutlineLightButton>
                  </Stack>

                  <Stack direction="row" spacing={2.5} mt={4} alignItems="center" flexWrap="wrap" useFlexGap>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.8, fontSize: 13.5, fontWeight: 600, color: "#fff" }}><Shield size={16} color={C.lime} /> Verified & Secure</Box>
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.9 }}><Stars value={4.8} size={14} color={C.lime} /><Typography sx={{ fontSize: 13.5, fontWeight: 600, color: "#fff" }}>4.8/5 (10k+ reviews)</Typography></Box>
                  </Stack>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 4 }} role="tablist" aria-label="Hero slides">
                    {heroSlides.map((_, i) => (
                      <Box key={i} component="button" type="button" role="tab" onClick={() => setHeroIndex(i)} aria-label={`Show slide ${i + 1}`} aria-selected={i === heroIndex} aria-current={i === heroIndex} sx={{ width: i === heroIndex ? 32 : 10, height: 6, p: 0, borderRadius: 999, border: "none", bgcolor: i === heroIndex ? C.lime : "rgba(255,255,255,0.3)", cursor: "pointer", transition: "all 0.3s ease", "&:hover": { bgcolor: i === heroIndex ? C.lime : "rgba(255,255,255,0.55)" } }} />
                    ))}
                  </Box>
                </Box>

                {/* Booking card */}
                <Box sx={{ position: "relative" }}>
                  <Box component="form" onSubmit={handleFindPros} role="search" sx={{ bgcolor: "#fff", color: C.text, borderRadius: "24px", p: { xs: 2.5, md: 3.2 }, boxShadow: "0 30px 60px -24px rgba(0,0,0,0.5)", border: `1px solid ${C.line}` }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.4, mb: 2.4 }}>
                      <LimeBadge size={42}><Search size={20} /></LimeBadge>
                      <Box>
                        <Typography component="h2" sx={{ fontFamily: HEAD, fontWeight: 700, fontSize: 18, color: C.forest, lineHeight: 1.2 }}>Book a verified pro</Typography>
                        <Typography sx={{ fontSize: 13, color: C.muted, fontFamily: FONT }}>Takes under a minute</Typography>
                      </Box>
                    </Box>
                    <Stack spacing={1.8}>
                      <TextField
                        select
                        SelectProps={{ native: true }}
                        value={category}
                        onChange={(e) => setCategory(sanitize(e.target.value))}
                        label="Service"
                        size="small"
                        fullWidth
                        inputProps={{ "aria-label": "Choose a service" }}
                        InputLabelProps={{ shrink: true }}
                        sx={fieldSx}
                      >
                        {categories.map((c) => <option key={c} value={c}>{c === "All" ? "All services" : c}</option>)}
                      </TextField>
                      <TextField
                        size="small"
                        fullWidth
                        label="Your city"
                        placeholder="e.g. Pune"
                        value={widgetCity}
                        onChange={(e) => setWidgetCity(sanitizeTyping(e.target.value))}
                        InputLabelProps={{ shrink: true }}
                        inputProps={{ maxLength: 100, "aria-label": "Your city" }}
                        InputProps={{ endAdornment: (
                          <IconButton size="small" onClick={detectLocation} disabled={loadingLocation} aria-label="Detect my location" edge="end">
                            {loadingLocation ? <CircularProgress size={16} sx={{ color: C.forest }} /> : <LocateFixed size={18} color={C.forest} />}
                          </IconButton>
                        ) }}
                        sx={fieldSx}
                      />
                      <PrimaryButton type="submit" fullWidth startIcon={<Search size={18} />} sx={{ py: 1.3 }}>Find pros</PrimaryButton>
                    </Stack>

                    <Stack direction="row" spacing={0.8} mt={2.2} flexWrap="wrap" useFlexGap alignItems="center">
                      <Typography sx={{ fontSize: 12.5, color: C.muted, fontWeight: 600, fontFamily: FONT, mr: 0.4 }}>Popular:</Typography>
                      {services.slice(0, 4).map((s, i) => (
                        <Box key={`chip-${s.id || i}`} component="button" type="button" onClick={() => { setCategory(s.title); setQuery(""); scrollToSection(servicesRef); }} aria-label={`Browse ${s.title}`} sx={{ cursor: "pointer", fontFamily: FONT, fontSize: 12.5, fontWeight: 700, color: C.forest, bgcolor: C.limeSoft, border: "1px solid transparent", borderRadius: 999, px: 1.3, py: 0.5, transition: "all 0.2s", "&:hover": { borderColor: C.forest, bgcolor: C.lime }, "&:focus-visible": { outline: `2px solid ${C.limeDeep}` } }}>{s.title}</Box>
                      ))}
                    </Stack>

                    {/* Live tracking strip with dotted route */}
                    <Box sx={{ mt: 2.6, pt: 2.2, borderTop: `1px dashed ${C.line}`, display: "flex", alignItems: "center", gap: 1.4 }}>
                      <LimeBadge size={38}><Navigation size={17} /></LimeBadge>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontFamily: HEAD, fontWeight: 700, fontSize: 14, color: C.forest }}>Pro arriving in 32 min</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mt: 0.2 }}>
                          <Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#22A559", animation: prefersReducedMotion ? "none" : `${pulse} 2s infinite` }} />
                          <Typography sx={{ fontSize: 12, color: C.muted, fontWeight: 600, fontFamily: FONT }}>Live Tracking</Typography>
                        </Box>
                      </Box>
                      <Box component="svg" viewBox="0 0 120 12" aria-hidden="true" sx={{ width: 90, height: 10, flexShrink: 0, "& path": { animation: prefersReducedMotion ? "none" : `${dash} 1.6s linear infinite` } }}>
                        <path d="M2 6 L 118 6" stroke={C.forest} strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" fill="none" />
                      </Box>
                      <Box sx={{ width: 22, height: 22, borderRadius: "50%", bgcolor: C.lime, border: `2px solid ${C.forest}`, display: "grid", placeItems: "center", flexShrink: 0 }}><MapPin size={11} color={C.forest} /></Box>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Container>
          </Box>

          {/* ───────── Account strip (overlaps hero) ───────── */}
          <Container maxWidth="lg" sx={{ mt: { xs: -9, md: -11 }, position: "relative", zIndex: 2 }}>
            <Box sx={{ bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "22px", boxShadow: C.shadowHover, p: { xs: 2.4, md: 3 }, display: "flex", flexDirection: { xs: "column", md: "row" }, alignItems: { md: "center" }, gap: 2.4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.8, flex: 1 }}>
                <LimeBadge size={52}>{isAuthenticated ? <Typography sx={{ fontFamily: HEAD, fontWeight: 800, fontSize: 20 }}>{greetingName[0]?.toUpperCase()}</Typography> : <Shield size={24} />}</LimeBadge>
                <Box>
                  <Typography component="h2" sx={{ fontSize: 19, fontWeight: 700, fontFamily: HEAD, color: C.forest }}>{isAuthenticated ? `Welcome back, ${greetingName}` : "Secure & trusted"}</Typography>
                  <Typography sx={{ color: C.muted, fontSize: 14, fontFamily: FONT, lineHeight: 1.55 }}>{isAuthenticated ? `Pick up where you left off or book something new. Support: ${CONTACT.EMAIL}` : `Track pro, save addresses, rebook 1-tap. SSL secured. Help: ${CONTACT.EMAIL}`}</Typography>
                </Box>
              </Box>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
                {isAuthenticated ? (
                  <PrimaryButton onClick={cta.action}>{cta.label}</PrimaryButton>
                ) : (
                  <>
                    <PrimaryButton onClick={() => navigate("/login")}>Sign in securely</PrimaryButton>
                    <OutlineButton onClick={() => navigate("/register")}>Create account – free</OutlineButton>
                  </>
                )}
              </Stack>
            </Box>
          </Container>

          {/* ───────── Trust badges ───────── */}
          <Container maxWidth="lg" sx={{ mt: 3 }}>
            <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
              {[
                { icon: <Shield size={22} />, title: "Verified & Secure", sub: "Aadhaar checked professionals" },
                { icon: <Clock size={22} />, title: "60-minute arrival", sub: "Nearby expert, 24/7" },
                { icon: <BadgeCheck size={22} />, title: "4.8/5 (10k+ reviews)", sub: "Warranty on every job" },
              ].map((b) => (
                <Box component="li" key={b.title} sx={{ display: "flex", alignItems: "center", gap: 1.6, bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "18px", p: 2 }}>
                  <LimeBadge size={46}>{b.icon}</LimeBadge>
                  <Box>
                    <Typography sx={{ fontFamily: HEAD, fontWeight: 700, fontSize: 15, color: C.forest }}>{b.title}</Typography>
                    <Typography sx={{ fontSize: 13, color: C.muted, fontFamily: FONT }}>{b.sub}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Container>

          {/* ───────── Stats ───────── */}
          <Container maxWidth="lg" sx={{ mt: 3 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }, borderRadius: "22px", overflow: "hidden", bgcolor: C.forest, color: "#fff", position: "relative", "&::before": { content: '""', position: "absolute", top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${C.lime}33, transparent 70%)`, pointerEvents: "none" } }}>
              {statsData.map((stat, i) => (
                <Box key={stat.label} sx={{ position: "relative", textAlign: "center", py: 3.2, px: 1.5, borderLeft: { md: i === 0 ? "none" : "1px solid rgba(255,255,255,0.1)" }, borderTop: { xs: i > 1 ? "1px solid rgba(255,255,255,0.1)" : "none", md: "none" } }}>
                  <Typography sx={{ fontSize: { xs: 28, md: 38 }, fontWeight: 800, lineHeight: 1.1, fontFamily: HEAD, letterSpacing: "-0.02em", color: stat.stars ? C.lime : "#fff" }}>{stat.value}</Typography>
                  {stat.stars && !isLoadingStats && <Box sx={{ mt: 0.7, display: "flex", justifyContent: "center" }}><Stars value={liveStats.averageRating} size={15} color={C.lime} /></Box>}
                  <Typography sx={{ color: "rgba(255,255,255,0.65)", fontSize: 12, mt: 1, fontFamily: FONT, fontWeight: 700, letterSpacing: 1.1, textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 1 }}>
                    {stat.live && <LiveDot size={8} reduced={prefersReducedMotion} />}{stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Container>

          {/* ───────── Services ───────── */}
          <Box ref={servicesRef} id="services" sx={{ pt: { xs: 8, md: 12 }, scrollMarginTop: 90 }}>
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
                <TextField select SelectProps={{ native: true }} size="small" value={sortBy} onChange={(e) => setSortBy(e.target.value)} inputProps={{ "aria-label": "Sort services" }} sx={{ minWidth: 200, ...fieldSx }}>
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
                      <Box key={c} component="button" type="button" role="tab" aria-selected={active} onClick={() => setCategory(c)} sx={{ flexShrink: 0, cursor: "pointer", fontFamily: FONT, fontSize: 13.5, fontWeight: 700, px: 2, py: 0.9, borderRadius: 999, border: `1.5px solid ${active ? C.forest : C.line}`, bgcolor: active ? C.forest : "#fff", color: active ? C.lime : C.forest, transition: "all 0.2s", "&:hover": { borderColor: C.forest }, "&:focus-visible": { outline: `2px solid ${C.limeDeep}`, outlineOffset: 2 } }}>{c}</Box>
                    );
                  })}
                </Box>
              )}

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2.5 }} aria-live="polite">
                <Typography sx={{ color: C.muted, fontSize: 14, fontFamily: FONT }}>{isLoadingServices ? "Loading services…" : `${visibleServices.length} service${visibleServices.length === 1 ? "" : "s"} found`}</Typography>
                {filtersActive && <TextLink type="button" onClick={clearFilters}>Clear filters</TextLink>}
              </Box>

              {isLoadingServices ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.5 }}>
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} variant="rounded" height={360} sx={{ borderRadius: "20px" }} />)}
                </Box>
              ) : visibleServices.length === 0 ? (
                <Box sx={{ py: 8, px: 2, textAlign: "center", bgcolor: "#fff", border: `1.5px dashed ${C.line}`, borderRadius: "22px" }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 1, fontFamily: HEAD, color: C.forest }}>No services match “{sanitize(query)}”</Typography>
                  <Typography sx={{ color: C.muted, mb: 2.5, fontFamily: FONT }}>Check spelling or try broader term. Contact {CONTACT.EMAIL} for help.</Typography>
                  <OutlineButton onClick={clearFilters}>Show all services</OutlineButton>
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
          <Box ref={howRef} id="how" sx={{ pt: { xs: 8, md: 12 }, scrollMarginTop: 90 }}>
            <Container maxWidth="lg">
              {sectionHeading("How it works", "Fixed in 3 simple steps", "From booking to warranty, everything happens in one place.")}
              <Box component="ol" sx={{ listStyle: "none", m: 0, p: 0, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 3, position: "relative" }}>
                {!isMobile && (
                  <Box component="svg" viewBox="0 0 400 12" preserveAspectRatio="none" aria-hidden="true" sx={{ position: "absolute", top: 54, left: "17%", width: "66%", height: 10, pointerEvents: "none", "& path": { animation: prefersReducedMotion ? "none" : `${dash} 1.6s linear infinite` } }}>
                    <path d="M0 6 L 400 6" stroke={C.forest} strokeOpacity="0.45" strokeWidth="3" strokeLinecap="round" strokeDasharray="1 9" fill="none" />
                  </Box>
                )}
                {steps.map((s, i) => (
                  <Box component="li" key={s.title} sx={{ position: "relative", bgcolor: "#fff", border: `1px solid ${C.line}`, borderRadius: "22px", p: 3.2, pt: 4, textAlign: "center", boxShadow: C.shadow, transition: "all 0.25s", "&:hover": { transform: "translateY(-4px)", borderColor: C.forest, boxShadow: `${C.shadowHover}, 0 0 0 4px ${C.lime}55` } }}>
                    <Box sx={{ position: "relative", width: 60, height: 60, borderRadius: "50%", bgcolor: C.forest, color: C.lime, display: "grid", placeItems: "center", mx: "auto", mb: 2.2 }}>
                      {s.icon}
                      <Box sx={{ position: "absolute", top: -6, right: -8, width: 26, height: 26, borderRadius: "50%", bgcolor: C.lime, color: C.forest, fontFamily: HEAD, fontWeight: 800, fontSize: 13, display: "grid", placeItems: "center", border: "2px solid #fff" }}>{i + 1}</Box>
                    </Box>
                    <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, mb: 0.8, fontFamily: HEAD, color: C.forest }}>{s.title}</Typography>
                    <Typography sx={{ color: C.muted, fontSize: 14.5, lineHeight: 1.7, fontFamily: FONT }}>{s.description}</Typography>
                  </Box>
                ))}
              </Box>
            </Container>
          </Box>

          {/* ───────── Why Quickks ───────── */}
          <Box ref={featuresRef} id="features" sx={{ pt: { xs: 8, md: 12 }, scrollMarginTop: 90 }}>
            <Container maxWidth="lg">
              <Box sx={{ bgcolor: C.forest, borderRadius: "32px", px: { xs: 2.5, md: 6 }, py: { xs: 6, md: 8 }, position: "relative", overflow: "hidden", "&::before": { content: '""', position: "absolute", top: -120, right: -80, width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, ${C.lime}2e, transparent 70%)`, pointerEvents: "none" } }}>
                <Box sx={{ position: "relative" }}>
                  {sectionHeading("Why Quickks", "Why 10k+ customers trust Quickks", `Secure, verified, warranty backed • Support: ${CONTACT.EMAIL}`, true)}
                  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2.2 }}>
                    {features.map((f) => (
                      <Box key={f.title} sx={{ p: 3, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", transition: "all 0.25s", "&:hover": { borderColor: C.lime, bgcolor: "rgba(255,255,255,0.1)", transform: "translateY(-4px)", boxShadow: `0 0 28px ${C.lime}33` } }}>
                        <LimeBadge size={50}>{f.icon}</LimeBadge>
                        <Typography component="h3" sx={{ fontSize: 17, fontWeight: 700, mt: 2.2, mb: 0.9, fontFamily: HEAD, color: "#fff" }}>{f.title}</Typography>
                        <Typography sx={{ color: "rgba(255,255,255,0.72)", fontSize: 14, lineHeight: 1.7, fontFamily: FONT }}>{f.description}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            </Container>
          </Box>

          {/* ───────── CTA ───────── */}
          <Box sx={{ py: { xs: 8, md: 12 } }}>
            <Container maxWidth="lg">
              <Box sx={{ position: "relative", overflow: "hidden", borderRadius: "32px", p: { xs: 4, md: 8 }, textAlign: "center", bgcolor: C.lime, color: C.forest, "&::before": { content: '""', position: "absolute", inset: 0, backgroundImage: `radial-gradient(${C.forest}22 1.3px, transparent 1.3px)`, backgroundSize: "22px 22px" } }}>
                <Box sx={{ position: "relative" }}>
                  <Typography component="h2" sx={{ fontSize: { xs: 28, md: 44 }, fontWeight: 800, mb: 1.6, fontFamily: HEAD, letterSpacing: "-0.03em" }}>Ready to get it fixed? ⚡</Typography>
                  <Typography sx={{ color: `${C.forest}cc`, mb: 4, fontFamily: FONT, fontSize: { xs: 15, md: 17 }, maxWidth: 560, mx: "auto", lineHeight: 1.7 }}>
                    Questions? Call <Box component="a" href={`tel:${CONTACT.PHONE_TEL}`} sx={{ color: C.forest, fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 4 }}>{CONTACT.PHONE_DISPLAY}</Box> or email <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: C.forest, fontWeight: 800, textDecoration: "underline", textUnderlineOffset: 4 }}>{CONTACT.EMAIL}</Box>
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="center">
                    <PrimaryButton size="large" onClick={cta.action} sx={{ px: 5, py: 1.4, fontSize: 16 }}>{cta.label}</PrimaryButton>
                    {!isAuthenticated && <OutlineButton size="large" onClick={() => navigate("/login")} sx={{ px: 5, py: 1.3, fontSize: 16 }}>Sign in</OutlineButton>}
                  </Stack>
                  <Typography sx={{ color: `${C.forest}b3`, fontSize: 12.5, mt: 3.5, display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 1, fontFamily: FONT, fontWeight: 600 }}><Shield size={14} /> SSL secured • Verified pros • Warranty backed • {CONTACT.EMAIL}</Typography>
                </Box>
              </Box>
            </Container>
          </Box>
        </Box>

        <Suspense fallback={<Box sx={{ py: 4, textAlign: "center", bgcolor: C.forest }}><CircularProgress size={24} sx={{ color: C.lime }} /></Box>}>
          <Footer />
        </Suspense>

        {/* ───────── Service details dialog ───────── */}
        <Dialog open={Boolean(selectedService)} onClose={() => setSelectedService(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}>
          {selectedService && (
            <>
              <Box sx={{ bgcolor: selectedService.color, py: 4.5, display: "grid", placeItems: "center", position: "relative" }}>
                <IconButton onClick={() => setSelectedService(null)} aria-label="Close" sx={{ position: "absolute", top: 10, right: 10, bgcolor: "rgba(255,255,255,0.75)", "&:hover": { bgcolor: "#fff" } }}><X size={18} /></IconButton>
                <Box sx={{ transform: "scale(1.6)" }}>{selectedService.icon}</Box>
              </Box>
              <DialogTitle sx={{ fontWeight: 800, fontFamily: HEAD, color: C.forest, pb: 0.5 }}>{selectedService.title}</DialogTitle>
              <DialogContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1.5 }}>
                  <Stars value={selectedService.rating || liveStats.averageRating} size={15} />
                  <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{selectedService.rating || liveStats.averageRating}</Typography>
                </Box>
                <Typography sx={{ color: C.muted, fontSize: 14.5, lineHeight: 1.7, mb: 2, fontFamily: FONT }}>{selectedService.description}</Typography>
                <Stack spacing={1}>
                  {["Aadhaar verified professionals", "Arrives within 60 minutes", "Up to 90-day warranty"].map((t) => (
                    <Box key={t} sx={{ display: "flex", alignItems: "center", gap: 1.2, fontSize: 14, fontWeight: 600, fontFamily: FONT }}><LimeBadge size={24}><ShieldCheck size={14} /></LimeBadge> {t}</Box>
                  ))}
                  {selectedService.price && <Box sx={{ fontSize: 16, fontWeight: 700, mt: 0.5, fontFamily: HEAD }}>Starting ₹{selectedService.price}</Box>}
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
          <Box sx={{ height: 6, background: `linear-gradient(90deg, ${C.forest}, ${C.lime})` }} />
          <DialogTitle sx={{ fontWeight: 800, fontFamily: HEAD, color: C.forest, fontSize: 22 }}>Get ₹100 off – today only! 🎉</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2, fontFamily: FONT, lineHeight: 1.6 }}>Enter email, get offer instantly. Secure, no spam. Support: {CONTACT.EMAIL}</Typography>
            <TextField fullWidth autoFocus type="email" label="Email address" value={exitEmail} onChange={(e) => setExitEmail(sanitize(e.target.value))} inputProps={{ maxLength: 100 }} onKeyDown={(e) => { if (e.key === "Enter") handleNewsletter(); }} sx={{ mt: 0.5, ...fieldSx }} />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, pt: 1 }}>
            <SoftButton onClick={() => setShowExitIntent(false)}>No thanks</SoftButton>
            <PrimaryButton onClick={handleNewsletter} disabled={exitIntentSubmitting || !isValidEmail(exitEmail)}>{exitIntentSubmitting ? <CircularProgress size={20} sx={{ color: C.forest }} /> : "Send my offer"}</PrimaryButton>
          </DialogActions>
        </Dialog>

        {/* ───────── Location dialog ───────── */}
        <Dialog open={showLocationDialog} onClose={() => setShowLocationDialog(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: "24px", overflow: "hidden" } }}>
          <Box sx={{ height: 6, background: `linear-gradient(90deg, ${C.forest}, ${C.lime})` }} />
          <DialogTitle sx={{ fontWeight: 800, fontFamily: HEAD, color: C.forest }}>Choose location 📍</DialogTitle>
          <DialogContent>
            <Typography sx={{ color: C.muted, fontSize: 14, mb: 2.5, fontFamily: FONT }}>We show pros & response times for your area.</Typography>
            <SoftButton fullWidth onClick={detectLocation} disabled={loadingLocation} startIcon={loadingLocation ? <CircularProgress size={16} sx={{ color: C.forest }} /> : <LocateFixed size={18} />} sx={{ mb: 2.5, py: 1.2 }}>
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