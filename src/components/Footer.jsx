import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Container,
  Stack,
  TextField,
  Button,
  IconButton,
  Divider,
  Chip,
  Tooltip,
} from "@mui/material";
import { styled } from "@mui/material/styles";
<<<<<<< HEAD
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ArrowUp,
  Truck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Star,
  Lock,
  Zap,
  ShieldCheck,
  BadgeCheck,
  CreditCard,
  Landmark,
  Smartphone,
  Banknote,
} from "lucide-react";
import {
  FaFacebook,
  FaXTwitter,
  FaInstagram,
  FaLinkedin,
  FaYoutube,
  FaWhatsapp,
} from "react-icons/fa6";
=======
import { Mail, Phone, MapPin, Send, ArrowUp, Truck, Clock, CheckCircle2, Star, Lock, Zap, ShieldCheck, BadgeCheck } from "lucide-react";
import { FaFacebook, FaXTwitter, FaInstagram, FaLinkedin, FaYoutube, FaWhatsapp } from "react-icons/fa6";
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
import api from "../api/api";
import quickksLogo from "../assets/image.png";

/* ════════════════════════════════════════════════════════════════
   QUICKKS FOOTER  ·  Forest #0B3D2E · Lime #C6F24E · Cream #FFF8EC
   Layout: Newsletter card → Trust bar → 4-column links grid → Legal bar
   ════════════════════════════════════════════════════════════════ */

/* ───────── Tokens ───────── */
const FONT = '"Inter", "Segoe UI", sans-serif';
const HEAD = '"Sora", "Inter", "Segoe UI", sans-serif';
const C = {
  forest: "#0B3D2E",
  forestDeep: "#082C21",
  forest2: "#0F4C39",
  lime: "#C6F24E",
  limeDeep: "#A9D92F",
  cream: "#FFF8EC",
  text: "#E7EFEA",
  muted: "rgba(231,239,234,0.68)",
  faint: "rgba(231,239,234,0.5)",
  line: "rgba(255,255,255,0.10)",
  glass: "rgba(255,255,255,0.06)",
};

/* ───────── Static data (outside the component: created once) ───────── */
const CONTACT = {
  EMAIL: "connect@quickks.in",
  PHONE_DISPLAY: "+91 93713 65677",
  PHONE_TEL: "+919371365677",
  WHATSAPP: "919371365677",
  ADDRESS: "Pune, Maharashtra, India - 411001",
  MAPS_URL: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Pune, Maharashtra, India - 411001")}`,
  LINKEDIN_URL: "https://www.linkedin.com/company/quickks-fast-reliable-on-time-service/",
};

const QUICK_LINKS = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
  { name: "How It Works", path: "/how-it-works" },
  { name: "About Us", path: "/about" },
  { name: "Contact", path: "/contact" },
  { name: "Become a Provider", path: "/become-provider" },
];

const SERVICE_LINKS = [
  { name: "Electrician Services", path: "/services/electrician" },
  { name: "Appliance Repair", path: "/services/appliance-repair" },
  { name: "Plumbing", path: "/services/plumbing" },
  { name: "Smart Home Setup", path: "/services/smart-home" },
  { name: "Emergency Services", path: "/services/emergency" },
];

const SUPPORT_LINKS = [
  { name: "Help Center", path: "/help" },
  { name: "FAQ", path: "/faq" },
  { name: "Terms of Service", path: "/terms" },
  { name: "Privacy Policy", path: "/privacy" },
  { name: "Refund & Warranty", path: "/refund-policy" },
  { name: "Sitemap", path: "/sitemap" },
];

const LEGAL_LINKS = [...SUPPORT_LINKS.slice(2), { name: "Cookies", path: "/cookies" }];

const SOCIAL_LINKS = [
  { Icon: FaFacebook, url: "https://facebook.com/quickks", label: "Facebook" },
  { Icon: FaXTwitter, url: "https://x.com/quickks", label: "X (Twitter)" },
  { Icon: FaInstagram, url: "https://instagram.com/quickks", label: "Instagram" },
  { Icon: FaLinkedin, url: "https://www.linkedin.com/company", label: "LinkedIn" },
  { Icon: FaYoutube, url: "https://youtube.com/@quickks", label: "YouTube" },
  { Icon: FaWhatsapp, url: `https://wa.me/${CONTACT.WHATSAPP}?text=Hi%20Quickks%20Team`, label: "WhatsApp" },
];

const PAYMENTS = [
  { label: "UPI", Icon: Zap },
  { label: "Cards", Icon: CreditCard },
  { label: "NetBanking", Icon: Landmark },
  { label: "Wallets", Icon: Smartphone },
  { label: "COD", Icon: Banknote },
];

/* tone: "accent" = lime tint · "neutral" = glass */
const TRUST_BADGES = [
  { Icon: ShieldCheck, label: "Verified & Reliable", tone: "accent", title: "Verified professionals you can rely on" },
  { Icon: BadgeCheck, label: "On-Time Service", tone: "accent", title: "Fast, reliable & on-time doorstep service" },
  { Icon: Clock, label: "24/7 Support", tone: "accent", title: `Round-the-clock help via ${CONTACT.EMAIL}` },
  { Icon: Truck, label: "Fast 60 Min Arrival", tone: "neutral", title: "Fast response and average arrival time" },
  { Icon: Star, label: "4.8/5 Rated", tone: "neutral", title: "Based on 10k+ reviews" },
  { Icon: Lock, label: "Secure & Encrypted", tone: "neutral", title: "256-bit SSL secured" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ───────── Styled primitives ───────── */
const Root = styled(Box)({
  backgroundColor: C.forest,
  color: C.text,
  position: "relative",
  marginTop: "auto",
<<<<<<< HEAD
  fontFamily: FONT,
  overflow: "hidden",
  /* soft lime glow + dot texture */
  "&::before": {
    content: '""',
    position: "absolute",
    top: -160,
    right: -120,
    width: 420,
    height: 420,
    borderRadius: "50%",
    background: `radial-gradient(circle, ${C.lime}26, transparent 70%)`,
    pointerEvents: "none",
  },
  "&::after": {
    content: '""',
    position: "absolute",
    inset: 0,
    backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1.2px, transparent 1.2px)",
    backgroundSize: "26px 26px",
    pointerEvents: "none",
=======
  fontFamily: '"Inter", "Segoe UI", sans-serif',
});

const SectionTitle = styled(Typography)({
  fontWeight: 800,
  fontSize: "0.95rem",
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#f8fafc",
  marginBottom: "18px",
  position: "relative",
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: -6,
    left: 0,
    width: 24,
    height: 2,
    background: "#fbbf24",
    borderRadius: 2,
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
  },
});

const ColumnTitle = styled(Typography)({
  fontFamily: HEAD,
  fontWeight: 700,
  fontSize: "0.95rem",
  letterSpacing: 0.2,
  color: "#fff",
  marginBottom: 22,
  position: "relative",
  paddingBottom: 10,
  "&::after": {
    content: '""',
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 28,
    height: 3,
    background: C.lime,
    borderRadius: 3,
  },
});

const FooterLink = styled(Link, {
  shouldForwardProp: (prop) => prop !== "active",
})(({ active }) => ({
  color: active ? C.lime : C.muted,
  textDecoration: "none",
  fontSize: "0.92rem",
  fontWeight: active ? 700 : 500,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "color 0.2s ease, transform 0.2s ease",
  "&:hover": { color: C.lime, transform: "translateX(4px)" },
  "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 3, borderRadius: 4 },
}));

const SocialBtn = styled(IconButton)({
  width: 42,
  height: 42,
<<<<<<< HEAD
  backgroundColor: C.glass,
  border: `1px solid ${C.line}`,
  color: C.muted,
=======
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#94a3b8",
  "&:hover": {
    backgroundColor: "#fbbf24",
    color: "#0f172a",
    borderColor: "#fbbf24",
    transform: "translateY(-3px)",
    boxShadow: "0 8px 16px rgba(251,191,36,0.25)",
  },
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
  transition: "all 0.22s ease",
  "&:hover": {
    backgroundColor: C.lime,
    color: C.forest,
    borderColor: C.lime,
    transform: "translateY(-3px)",
    boxShadow: `0 8px 18px ${C.lime}40`,
  },
  "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 2 },
});

<<<<<<< HEAD
const TrustBadge = styled(Chip, {
  shouldForwardProp: (prop) => prop !== "tone",
})(({ tone }) => ({
  fontFamily: FONT,
=======
const BackTop = styled(IconButton)(({ visible }) => ({
  position: "fixed",
  right: 20,
  bottom: 20,
  width: 46,
  height: 46,
  backgroundColor: "#fbbf24",
  color: "#0f172a",
  boxShadow: "0 10px 24px rgba(251,191,36,0.35)",
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? "auto" : "none",
  transform: visible ? "translateY(0)" : "translateY(12px)",
  transition: "all 0.28s ease",
  zIndex: 1200,
  "&:hover": { backgroundColor: "#f59e0b", transform: "translateY(-2px)" },
}));

const TrustBadge = styled(Chip)(({ variant }) => ({
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
  fontWeight: 700,
  fontSize: "0.75rem",
  height: 30,
  borderRadius: 999,
  cursor: "default",
  transition: "all 0.2s ease",
  "& .MuiChip-icon": { marginLeft: 8, color: "inherit" },
  "&:hover": { transform: "translateY(-1px)", boxShadow: "0 6px 14px rgba(0,0,0,0.2)" },
  ...(tone === "accent"
    ? { backgroundColor: `${C.lime}22`, color: C.lime, border: `1px solid ${C.lime}44` }
    : { backgroundColor: C.glass, color: C.text, border: `1px solid ${C.line}` }),
}));

<<<<<<< HEAD
/* ───────── Small building blocks ───────── */
function ContactItem({ Icon, label, children, accent = false }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          bgcolor: accent ? C.lime : C.glass,
          border: `1px solid ${accent ? C.lime : C.line}`,
          color: accent ? C.forest : C.lime,
        }}
      >
        <Icon size={17} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          sx={{ color: C.faint, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, display: "block", lineHeight: 1.3 }}
        >
          {label}
        </Typography>
        {children}
      </Box>
    </Stack>
  );
}

const contactTextSx = {
  display: "block",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 600,
  fontSize: "0.95rem",
  lineHeight: 1.5,
  wordBreak: "break-word",
};

function LinkColumn({ title, links, pathname, children }) {
  return (
    <Box component="nav" aria-label={title}>
      <ColumnTitle component="h3">{title}</ColumnTitle>
      <Stack component="ul" spacing={1.4} sx={{ listStyle: "none", m: 0, p: 0 }}>
        {links.map((l) => (
          <li key={l.path}>
            <FooterLink to={l.path} active={pathname === l.path ? 1 : 0} aria-current={pathname === l.path ? "page" : undefined}>
              {l.name}
            </FooterLink>
          </li>
        ))}
      </Stack>
      {children}
    </Box>
  );
}

/* ───────── Newsletter ───────── */
function NewsletterCard() {
=======
const IconActionBox = styled("a")({
  width: 38,
  height: 38,
  borderRadius: 12,
  display: "grid",
  placeItems: "center",
  textDecoration: "none",
  transition: "all 0.2s ease",
  flexShrink: 0,
  "&:hover": {
    transform: "scale(1.06)",
    borderColor: "#fbbf24",
  },
  "&:focus-visible": {
    outline: "2px solid #fbbf24",
    outlineOffset: 2,
  },
});

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

<<<<<<< HEAD
  const flash = useCallback((next) => {
    setStatus(next);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setStatus(null), 6000);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const cleanEmail = email.trim().toLowerCase().slice(0, 100);
      if (!cleanEmail) return flash({ type: "error", msg: "Enter your email" });
      if (!EMAIL_RE.test(cleanEmail)) return flash({ type: "error", msg: "Enter a valid email" });

      setLoading(true);
      setStatus(null);
      try {
        const res = await api.post("/newsletter/subscribe", { email: cleanEmail }, { timeout: 8000 });
        if (res.data?.success || res.status === 200 || res.status === 201) {
          flash({ type: "success", msg: `Subscribed! Confirmation sent to ${cleanEmail} 🎉` });
          setEmail("");
        } else {
          flash({ type: "error", msg: res.data?.message || "Subscription failed" });
        }
      } catch (err) {
        flash({
          type: "error",
          msg: err?.response?.status === 429 ? "Too many requests, try later" : "Unable to subscribe, try again",
        });
      } finally {
        setLoading(false);
      }
    },
    [email, flash]
  );
=======
  const serviceLinks = useMemo(() => [
    { name: "Electrician Services", path: "/services/electrician" },
    { name: "Appliance Repair", path: "/services/appliance-repair" },
    { name: "Plumbing", path: "/services/plumbing" },
    { name: "Smart Home Setup", path: "/services/smart-home" },
    { name: "Emergency Services", path: "/services/emergency" },
  ], []);

  const supportLinks = useMemo(() => [
    { name: "Help Center", path: "/help" },
    { name: "FAQ", path: "/faq" },
    { name: "Terms of Service", path: "/terms" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Refund & Warranty", path: "/refund-policy" },
    { name: "Sitemap", path: "/sitemap" },
  ], []);

  const socialLinks = useMemo(() => [
    { Icon: FaFacebook, url: "https://facebook.com/quickks", label: "Facebook" },
    { Icon: FaXTwitter, url: "https://x.com/quickks", label: "X (Twitter)" },
    { Icon: FaInstagram, url: "https://instagram.com/quickks", label: "Instagram" },
    { Icon: FaLinkedin, url: CONTACT.LINKEDIN_URL, label: "LinkedIn" },
    { Icon: FaYoutube, url: "https://youtube.com/@quickks", label: "YouTube" },
    { Icon: FaWhatsapp, url: `https://wa.me/${CONTACT.WHATSAPP}?text=Hi%20Quickks%20Team`, label: "WhatsApp" },
  ], []);

  const payments = useMemo(() => [
    { label: "UPI", icon: "⚡" },
    { label: "Cards", icon: "💳" },
    { label: "NetBanking", icon: "🏦" },
    { label: "Wallets", icon: "📱" },
    { label: "COD", icon: "💵" },
  ], []);

  const trustBadges = useMemo(() => [
    { icon: <ShieldCheck size={14} />, label: "Verified Pros", variant: "success", title: "Verified professionals" },
    { icon: <BadgeCheck size={14} />, label: "Warranty Backed", variant: "warning", title: "Service warranty included" },
    { icon: <Clock size={14} />, label: "24/7 Support", variant: "warning", title: "Round the clock help via " + CONTACT.EMAIL },
    { icon: <Truck size={14} />, label: "60 Min Arrival", variant: "info", title: "Average arrival time" },
    { icon: <Star size={14} />, label: "4.8/5 Rated", variant: "neutral", title: "Based on 10k+ reviews" },
    { icon: <Lock size={14} />, label: "Secure & Encrypted", variant: "neutral", title: "256-bit SSL secured" },
  ], []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNewsletter = useCallback(async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase().slice(0, 100);
    if (!cleanEmail) { setStatus({ type: "error", msg: "Enter your email" }); return; }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(cleanEmail)) { setStatus({ type: "error", msg: "Enter a valid email" }); return; }
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.post("/newsletter/subscribe", { email: cleanEmail }, { timeout: 8000 });
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setStatus({ type: "success", msg: `Subscribed! Confirmation sent to ${cleanEmail} 🎉` });
        setEmail("");
      } else {
        setStatus({ type: "error", msg: res.data?.message || "Subscription failed" });
      }
    } catch (err) {
      const msg = err?.response?.status === 429 ? "Too many requests, try later" : "Unable to subscribe, try again";
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 6000);
    }
  }, [email]);
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)

  const ok = status?.type === "success";

  return (
    <Box
      sx={{
        position: "relative",
        overflow: "hidden",
        borderRadius: "28px",
        bgcolor: C.lime,
        color: C.forest,
        px: { xs: 3, md: 5 },
        py: { xs: 3.5, md: 4.5 },
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
        gap: { xs: 3, md: 5 },
        alignItems: "center",
        "&::before": {
          content: '""',
          position: "absolute",
          inset: 0,
          backgroundImage: `radial-gradient(${C.forest}1f 1.3px, transparent 1.3px)`,
          backgroundSize: "20px 20px",
          pointerEvents: "none",
        },
      }}
    >
      <Box sx={{ position: "relative" }}>
        <Typography component="h2" sx={{ fontFamily: HEAD, fontWeight: 800, fontSize: { xs: "1.5rem", md: "1.9rem" }, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          Stay Updated
        </Typography>
        <Typography sx={{ mt: 1, color: `${C.forest}cc`, fontSize: "0.95rem", lineHeight: 1.65, maxWidth: 440 }}>
          Get offers, fast service updates and safety checks. No spam, unsubscribe anytime.
        </Typography>
      </Box>

      <Box sx={{ position: "relative" }}>
        <Box
          component="form"
          onSubmit={handleSubmit}
          noValidate
          sx={{
            display: "flex",
            gap: 1,
            p: 0.7,
            borderRadius: 999,
            bgcolor: "#fff",
            border: "2px solid transparent",
            boxShadow: `0 6px 0 0 ${C.forest}`,
            transition: "border-color 0.2s",
            "&:focus-within": { borderColor: C.forest },
          }}
        >
          <TextField
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            size="small"
            type="email"
            autoComplete="email"
            inputProps={{ maxLength: 100, "aria-label": "Newsletter email" }}
            sx={{
              flex: 1,
              "& .MuiOutlinedInput-root": {
                borderRadius: 999,
                "& fieldset": { border: "none" },
                "& input": { color: C.forest, py: 1.2, px: 2, fontSize: "0.95rem", fontFamily: FONT, "&::placeholder": { color: "#6B7A72", opacity: 1 } },
              },
            }}
          />
          <Button
            type="submit"
            disabled={loading}
            aria-label="Subscribe to newsletter"
            sx={{
              minWidth: 0,
              px: 2.6,
              borderRadius: 999,
              bgcolor: C.forest,
              color: "#fff",
              textTransform: "none",
              fontWeight: 700,
              fontFamily: FONT,
              gap: 1,
              "&:hover": { bgcolor: C.forest2 },
              "&.Mui-disabled": { bgcolor: "#D6D9D2", color: "#7A857E" },
            }}
          >
            {loading ? (
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  border: "2px solid #fff",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "qspin 0.7s linear infinite",
                  "@keyframes qspin": { to: { transform: "rotate(360deg)" } },
                }}
              />
            ) : (
              <>
                <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>Subscribe</Box>
                <Send size={17} />
              </>
            )}
          </Button>
        </Box>

        <Box aria-live="polite" sx={{ minHeight: 40 }}>
          {status && (
            <Box
              role={ok ? "status" : "alert"}
              sx={{
                mt: 1.8,
                px: 1.6,
                py: 0.9,
                borderRadius: "12px",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "flex",
                gap: 0.9,
                alignItems: "center",
                bgcolor: ok ? C.forest : "#fff",
                color: ok ? C.lime : "#B42318",
                border: ok ? "none" : "1px solid #F5C2BD",
              }}
            >
              {ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
              {status.msg}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

/* ───────── Footer ───────── */
const Footer = () => {
  const { pathname } = useLocation();
  const year = new Date().getFullYear();
  const scrollTop = useCallback(
    () => window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }),
    []
  );

  return (
    <Root component="footer" role="contentinfo">
<<<<<<< HEAD
      <Box sx={{ position: "relative", zIndex: 1 }}>
        {/* 1 · Newsletter */}
        <Container maxWidth="lg" sx={{ pt: { xs: 6, md: 8 } }}>
          <NewsletterCard />
        </Container>

        {/* 2 · Trust bar */}
        <Container maxWidth="lg" sx={{ py: 3.2 }}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", lg: "center" }} spacing={2}>
=======
      {/* Trust Bar */}
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", bgcolor: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}>
        <Container maxWidth="lg" sx={{ py: 2.4 }}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", lg: "center" }} spacing={1.8}>
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              {TRUST_BADGES.map(({ Icon, label, tone, title }) => (
                <Tooltip key={label} title={title} arrow>
                  <TrustBadge icon={<Icon size={14} />} label={label} tone={tone} size="small" />
                </Tooltip>
              ))}
            </Stack>
<<<<<<< HEAD

            <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" sx={{ color: C.faint, fontWeight: 800, letterSpacing: 1, fontSize: "0.7rem" }}>
                SECURE PAYMENTS
              </Typography>
              {PAYMENTS.map(({ label, Icon }) => (
                <Tooltip key={label} title={`Pay securely via ${label}`} arrow>
                  <Box
                    sx={{
                      px: 1.3,
                      py: 0.55,
                      borderRadius: "10px",
                      bgcolor: C.cream,
                      color: C.forest,
                      fontSize: "0.72rem",
=======
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 800, letterSpacing: 0.6, fontSize: "0.7rem" }}>SECURE PAYMENTS:</Typography>
              <Stack direction="row" spacing={0.8} flexWrap="wrap" useFlexGap>
                {payments.map((p) => (
                  <Tooltip key={p.label} title={`Pay securely via ${p.label}`} arrow>
                    <Box sx={{
                      px: 1.2, py: 0.45,
                      borderRadius: 1.2,
                      bgcolor: "#fff",
                      color: "#0f172a",
                      fontSize: "0.70rem",
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.6,
                      transition: "all 0.2s",
<<<<<<< HEAD
                      "&:hover": { transform: "translateY(-1px)", boxShadow: `0 0 0 3px ${C.lime}66` },
                    }}
                  >
                    <Icon size={13} /> {label}
                  </Box>
                </Tooltip>
              ))}
            </Stack>
          </Stack>
        </Container>

        <Divider sx={{ borderColor: C.line, borderStyle: "dashed" }} />

        {/* 3 · Main grid */}
        <Container maxWidth="lg" sx={{ py: { xs: 6, md: 8 } }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "1.6fr 1fr 1fr 1fr" },
              gap: { xs: 5, md: 5 },
            }}
          >
            {/* Brand + contact */}
            <Stack spacing={3} sx={{ gridColumn: { sm: "1 / -1", md: "auto" } }}>
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.2}>
                  <Box
                    sx={{
                      width: 38,
                      height: 38,
                      borderRadius: "12px",
                      bgcolor: C.lime,
                      color: C.forest,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: HEAD,
                      fontSize: "1.2rem",
                      fontWeight: 800,
                    }}
                  >
                    Q
                  </Box>
                  <Typography component="span" sx={{ fontFamily: HEAD, fontWeight: 800, fontSize: "1.75rem", letterSpacing: "-0.04em", color: "#fff", lineHeight: 1, display: "inline-flex", alignItems: "baseline" }}>
                    quickks
                    <Box component="span" sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: C.lime, ml: "3px", display: "inline-block" }} />
                  </Typography>
                </Stack>
                <Typography sx={{ mt: 2, color: C.muted, lineHeight: 1.8, fontSize: "0.95rem", maxWidth: 400 }}>
                  Quickks connects you with trusted electricians, appliance repair experts and smart home pros.
                  Fast, reliable and on-time service across Pune and 25+ cities.
                </Typography>
                <Typography sx={{ mt: 1.5, fontFamily: HEAD, fontWeight: 600, fontSize: "0.85rem", color: C.lime }}>
                  Gharacha manus, 60 min madhe
                </Typography>
              </Box>

              <Stack spacing={1.8}>
                <ContactItem Icon={Mail} label="Email Support" accent>
                  <Typography component="a" href={`mailto:${CONTACT.EMAIL}`} rel="noopener" sx={{ ...contactTextSx, "&:hover": { color: C.lime, textDecoration: "underline" } }}>
                    {CONTACT.EMAIL}
                  </Typography>
                </ContactItem>
                <ContactItem Icon={Phone} label="Call Us">
                  <Typography component="a" href={`tel:${CONTACT.PHONE_TEL}`} sx={{ ...contactTextSx, "&:hover": { color: C.lime } }}>
                    {CONTACT.PHONE_DISPLAY}
                  </Typography>
                </ContactItem>
                <ContactItem Icon={MapPin} label="Headquarters">
                  <Typography sx={{ ...contactTextSx, fontWeight: 500, fontSize: "0.92rem", color: C.text }}>{CONTACT.ADDRESS}</Typography>
                </ContactItem>
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {SOCIAL_LINKS.map(({ Icon, url, label }) => (
                  <Tooltip key={label} title={label} arrow>
                    <SocialBtn component="a" href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                      <Icon size={18} />
                    </SocialBtn>
=======
                      "&:hover": { transform: "translateY(-1px)", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" },
                    }}>
                      <span>{p.icon}</span> {p.label}
                    </Box>
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
                  </Tooltip>
                ))}
              </Stack>
            </Stack>

            {/* Link columns */}
            <LinkColumn title="Quick Links" links={QUICK_LINKS} pathname={pathname} />

            <LinkColumn title="Our Services" links={SERVICE_LINKS} pathname={pathname}>
              <Box
                component="a"
                href={`tel:${CONTACT.PHONE_TEL}`}
                sx={{
                  mt: 2.6,
                  p: 1.5,
                  borderRadius: "14px",
                  bgcolor: `${C.lime}1a`,
                  border: `1px solid ${C.lime}40`,
                  display: "flex",
                  gap: 1.2,
                  alignItems: "center",
                  textDecoration: "none",
                  transition: "all 0.2s",
                  "&:hover": { bgcolor: `${C.lime}2e`, borderColor: C.lime },
                  "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 2 },
                }}
              >
                <Zap size={17} color={C.lime} style={{ flexShrink: 0 }} />
                <Typography variant="caption" sx={{ color: C.lime, fontWeight: 700, fontSize: "0.8rem", lineHeight: 1.4 }}>
                  Fast & On-Time: {CONTACT.PHONE_DISPLAY}
                </Typography>
              </Box>
            </LinkColumn>

            <LinkColumn title="Support" links={SUPPORT_LINKS} pathname={pathname}>
              <Stack
                direction="row"
                spacing={1.2}
                alignItems="center"
                sx={{ mt: 2.6, p: 1.4, borderRadius: "14px", bgcolor: C.glass, border: `1px solid ${C.line}` }}
              >
                <Box sx={{ width: 30, height: 30, borderRadius: "9px", bgcolor: C.lime, color: C.forest, display: "grid", placeItems: "center", fontFamily: HEAD, fontWeight: 800, fontSize: "0.8rem", flexShrink: 0 }}>
                  Q
                </Box>
                <Typography variant="caption" sx={{ color: C.muted, fontSize: "0.78rem", lineHeight: 1.4, fontWeight: 500 }}>
                  Fast • Reliable • On-Time • Trusted by 10k+ homes
                </Typography>
              </Stack>
            </LinkColumn>
          </Box>
        </Container>

        <Divider sx={{ borderColor: C.line }} />

        {/* 4 · Legal bar */}
        <Container maxWidth="lg" sx={{ py: 2.8 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
            <Typography variant="body2" sx={{ color: C.faint, fontSize: "0.85rem", lineHeight: 1.6 }}>
              © {year} Quickks. All rights reserved. Fast, reliable &amp; on-time service made in Pune with{" "}
              <Box component="span" sx={{ color: C.lime }}>♥</Box> for Bharat.
            </Typography>

            <Stack direction="row" spacing={2.4} flexWrap="wrap" useFlexGap alignItems="center">
              {LEGAL_LINKS.map((l) => (
                <Typography
                  key={l.path}
                  component={Link}
                  to={l.path}
                  sx={{
                    color: C.faint,
                    textDecoration: "none",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    transition: "color 0.2s",
                    "&:hover": { color: "#fff" },
                    "&:focus-visible": { outline: `2px solid ${C.lime}`, outlineOffset: 2, borderRadius: 1 },
                  }}
                >
                  {l.name}
                </Typography>
              ))}
              <Button
                onClick={scrollTop}
                aria-label="Back to top"
                startIcon={<ArrowUp size={15} />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: "0.82rem",
                  fontFamily: FONT,
                  color: C.forest,
                  bgcolor: C.lime,
                  borderRadius: 999,
                  px: 1.8,
                  py: 0.5,
                  "&:hover": { bgcolor: "#D5F876", transform: "translateY(-1px)" },
                  "&:focus-visible": { outline: "2px solid #fff", outlineOffset: 2 },
                }}
              >
                Back to top
              </Button>
            </Stack>
          </Stack>
        </Container>
      </Box>
<<<<<<< HEAD


      {/* Main Footer */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 7 } }}>
        <Grid container spacing={{ xs: 4, md: 3 }}>
          <Grid item xs={12} md={4.5}>
            <Stack spacing={2.4}>
              <Box>
                <Box
                  component={Link}
                  to="/"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    textDecoration: "none",
                  }}
                >
                  <Box
                    component="img"
                    src={quickksLogo}
                    alt="Quickks - Fast. Reliable. On Time."
                    sx={{
                      height: { xs: 56, md: 68 },
                      width: "auto",
                      objectFit: "contain",
                      borderRadius: 1.5,
                    }}
                  />
                </Box>
                <Typography sx={{ mt: 1.6, color: "#94a3b8", lineHeight: 1.75, fontSize: "0.95rem", maxWidth: 400 }}>
                  Quickks connects you with trusted electricians, appliance repair experts and smart home pros. Verified, on-time and warranty backed across Pune and 25+ cities.
                  <Box component="span" sx={{ display: "block", mt: 1, color: "#cbd5e1", fontWeight: 600 }}>
                    Need help?{" "}
                    <Box
                      component="a"
                      href={`mailto:${CONTACT.EMAIL}`}
                      sx={{ color: "#fbbf24", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}
                    >
                      {CONTACT.EMAIL}
                    </Box>
                  </Box>
                </Typography>
              </Box>

              <Stack spacing={1.4}>
                {/* Email Support + Clickable Email Logo */}
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Tooltip title={`Email ${CONTACT.EMAIL}`} arrow>
                    <IconActionBox
                      href={`mailto:${CONTACT.EMAIL}`}
                      aria-label={`Send email to ${CONTACT.EMAIL}`}
                      sx={{ bgcolor: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.18)" }}
                    >
                      <Mail size={16} color="#fbbf24" />
                    </IconActionBox>
                  </Tooltip>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, display: "block" }}>
                      Email Support
                    </Typography>
                    <Typography
                      component="a"
                      href={`mailto:${CONTACT.EMAIL}`}
                      sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}
                    >
                      {CONTACT.EMAIL}
                    </Typography>
                  </Box>
                </Stack>

                {/* Call Us + Clickable Phone Logo */}
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Tooltip title={`Call ${CONTACT.PHONE_DISPLAY}`} arrow>
                    <IconActionBox
                      href={`tel:${CONTACT.PHONE_TEL}`}
                      aria-label={`Call ${CONTACT.PHONE_DISPLAY}`}
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      <Phone size={16} color="#fbbf24" />
                    </IconActionBox>
                  </Tooltip>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, display: "block" }}>
                      Call Us
                    </Typography>
                    <Typography
                      component="a"
                      href={`tel:${CONTACT.PHONE_TEL}`}
                      sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}
                    >
                      {CONTACT.PHONE_DISPLAY}
                    </Typography>
                  </Box>
                </Stack>

                {/* Headquarters + Clickable Location Logo */}
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <Tooltip title="Open location in Google Maps" arrow>
                    <IconActionBox
                      href={CONTACT.MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${CONTACT.ADDRESS} in Google Maps`}
                      sx={{ bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", mt: 0.2 }}
                    >
                      <MapPin size={16} color="#fbbf24" />
                    </IconActionBox>
                  </Tooltip>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, display: "block" }}>
                      Headquarters
                    </Typography>
                    <Typography
                      component="a"
                      href={CONTACT.MAPS_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontSize: "0.92rem", lineHeight: 1.5, fontWeight: 500, "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}
                    >
                      {CONTACT.ADDRESS}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1} pt={1} flexWrap="wrap" useFlexGap>
                {socialLinks.map(({ Icon, url, label }) => (
                  <Tooltip key={label} title={label} arrow>
                    <SocialBtn component="a" href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={18} /></SocialBtn>
                  </Tooltip>
                ))}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={6} md={2}>
            <SectionTitle>Quick Links</SectionTitle>
            <Stack spacing={1.2}>{quickLinks.map((l) => (<NavLink key={l.name} to={l.path} active={location.pathname === l.path ? 1 : 0}>{l.name}</NavLink>))}</Stack>
          </Grid>

          <Grid item xs={6} md={2.5}>
            <SectionTitle>Our Services</SectionTitle>
            <Stack spacing={1.2}>{serviceLinks.map((l) => (<NavLink key={l.name} to={l.path} active={location.pathname === l.path ? 1 : 0}>{l.name}</NavLink>))}</Stack>
            <Box
              component="a"
              href={`tel:${CONTACT.PHONE_TEL}`}
              sx={{
                mt: 2.2,
                p: 1.3,
                borderRadius: 1.5,
                bgcolor: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.15)",
                display: "flex",
                gap: 1,
                alignItems: "center",
                textDecoration: "none",
                "&:hover": { bgcolor: "rgba(251,191,36,0.14)" },
              }}
            >
              <Zap size={16} color="#fbbf24" />
              <Typography variant="caption" sx={{ color: "#fde68a", fontWeight: 700, fontSize: "0.78rem" }}>
                Emergency? Call {CONTACT.PHONE_DISPLAY}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <SectionTitle>Stay Updated</SectionTitle>
            <Typography variant="body2" sx={{ color: "#94a3b8", lineHeight: 1.6, mb: 2, fontSize: "0.9rem" }}>
              Get offers, service tips and safety checks. No spam, unsubscribe anytime. Support:{" "}
              <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: "#e2e8f0", fontWeight: 700, textDecoration: "none", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}>
                {CONTACT.EMAIL}
              </Box>
            </Typography>
            <Box
              component="form"
              onSubmit={handleNewsletter}
              noValidate
              sx={{
                display: "flex",
                gap: 1,
                p: 0.6,
                borderRadius: 999,
                bgcolor: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.10)",
                "&:focus-within": { borderColor: "#fbbf24", boxShadow: "0 0 0 3px rgba(251,191,36,0.15)" },
                transition: "all 0.2s",
              }}
            >
              <TextField
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                size="small"
                type="email"
                autoComplete="email"
                inputProps={{ maxLength: 100 }}
                aria-label="Newsletter email"
                sx={{
                  flex: 1,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 999,
                    bgcolor: "transparent",
                    "& fieldset": { border: "none" },
                    "& input": { color: "#e2e8f0", py: 1.1, fontSize: "0.9rem", "&::placeholder": { color: "#64748b" } },
                  },
                }}
              />
              <Button
                type="submit"
                disabled={loading}
                aria-label="Subscribe to newsletter"
                sx={{
                  minWidth: 44,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  bgcolor: "#fbbf24",
                  color: "#0f172a",
                  "&:hover": { bgcolor: "#f59e0b" },
                  "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.12)", color: "#64748b" },
                }}
              >
                {loading ? (
                  <Box sx={{ width: 16, height: 16, border: "2px solid #0f172a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} />
                ) : (
                  <Send size={18} />
                )}
              </Button>
            </Box>
            {status && (
              <Box
                role="alert"
                sx={{
                  mt: 1.2,
                  px: 1.4,
                  py: 0.9,
                  borderRadius: 1.5,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  bgcolor: status.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  color: status.type === "success" ? "#6ee7b7" : "#fca5a5",
                  border: `1px solid ${status.type === "success" ? "rgba(16,185,129,0.22)" : "rgba(239,68,68,0.22)"}`,
                  display: "flex",
                  gap: 0.8,
                  alignItems: "center",
                }}
              >
                {status.type === "success" ? <CheckCircle2 size={14} /> : null}
                {status.msg}
              </Box>
            )}
            <Stack direction="row" spacing={1} mt={2.5} alignItems="center" sx={{ p: 1.2, borderRadius: 1.2, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Box
                component="img"
                src={quickksLogo}
                alt="Quickks"
                sx={{ width: 28, height: 28, borderRadius: 1, objectFit: "contain", flexShrink: 0 }}
              />
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.78rem", lineHeight: 1.35, fontWeight: 500 }}>
                Trusted by 10k+ homes • GST Invoiced • Warranty Backed<br />
                Support:{" "}
                <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: "#cbd5e1", textDecoration: "none", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}>
                  {CONTACT.EMAIL}
                </Box>
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <Container maxWidth="lg" sx={{ py: 2.6 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.6}>
          <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.5 }}>
            © {year} Quickks Fast.Reliable.On Time. All rights reserved. Made in Pune with <Box component="span" sx={{ color: "#f87171" }}>♥</Box> for Bharat.{" "}
            <Box component="span" sx={{ display: { xs: "block", sm: "inline" }, mt: { xs: 0.5, sm: 0 } }}>
              Secure contact:{" "}
              <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: "#94a3b8", textDecoration: "none", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}>
                {CONTACT.EMAIL}
              </Box>
            </Box>
          </Typography>
          <Stack direction="row" spacing={2.2} flexWrap="wrap" useFlexGap alignItems="center">
            {supportLinks.slice(2).map((l) => (
              <Typography
                key={l.name}
                component={Link}
                to={l.path}
                sx={{ color: "#64748b", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, "&:hover": { color: "#e2e8f0" }, "&:focus-visible": { outline: "2px solid #fbbf24", borderRadius: 1 } }}
              >
                {l.name}
              </Typography>
            ))}
            <Typography
              component="span"
              onClick={() => navigate("/cookies")}
              sx={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", "&:hover": { color: "#e2e8f0" } }}
            >
              Cookies
            </Typography>
          </Stack>
        </Stack>
      </Container>

      <BackTop visible={showTop ? 1 : 0} onClick={scrollTop} aria-label="Back to top"><ArrowUp size={20} /></BackTop>
>>>>>>> 89bceac (feat: add logo, update contact links and LinkedIn URL in Footer)
    </Root>
  );
};

export default React.memo(Footer);