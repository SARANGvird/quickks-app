import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Container, Grid, Stack, TextField, Button, IconButton, Divider, Chip, Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Mail, Phone, MapPin, Send, ArrowUp, Shield, Truck, Clock, CheckCircle2, Star, Award, Lock, Zap, ShieldCheck, BadgeCheck } from "lucide-react";
import { FaFacebook, FaXTwitter, FaInstagram, FaLinkedin, FaYoutube, FaWhatsapp } from "react-icons/fa6";
import api from "../api/api";

const CONTACT = {
  EMAIL: "connect@quickks.in",
  PHONE_DISPLAY: "+91 93713 65677",
  PHONE_TEL: "+919371365677",
  WHATSAPP: "919371365677",
  ADDRESS: "Pune, Maharashtra, India - 411001",
};

const Root = styled(Box)({
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  position: "relative",
  marginTop: "auto",
  fontFamily: '"Inter", "Segoe UI", sans-serif',
});

const BrandTitle = styled(Typography)({
  fontWeight: 900,
  fontSize: "1.9rem",
  letterSpacing: -0.8,
  color: "#ffffff",
  lineHeight: 1,
  display: "flex",
  alignItems: "center",
  gap: 8,
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
  }
});

const NavLink = styled(Link)(({ active }) => ({
  color: active ? "#fbbf24" : "#94a3b8",
  textDecoration: "none",
  fontSize: "0.92rem",
  fontWeight: active ? 700 : 500,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "all 0.2s ease",
  "&:hover": { color: "#fbbf24", transform: "translateX(4px)" },
  "&:focus-visible": { outline: "2px solid #fbbf24", outlineOffset: 2, borderRadius: 4 },
}));

const SocialBtn = styled(IconButton)({
  width: 42,
  height: 42,
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#94a3b8",
  "&:hover": { backgroundColor: "#fbbf24", color: "#0f172a", borderColor: "#fbbf24", transform: "translateY(-3px)", boxShadow: "0 8px 16px rgba(251,191,36,0.25)" },
  transition: "all 0.22s ease",
});

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

// ✅ IMPROVED BADGE - Security Level Up
const TrustBadge = styled(Chip)(({ variant }) => ({
  fontWeight: 700,
  fontSize: "0.75rem",
  height: 28,
  borderRadius: 999,
  transition: "all 0.2s ease",
  cursor: "default",
  "&:hover": { transform: "translateY(-1px)", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
  ...(variant === "success" && {
    bgcolor: "rgba(16,185,129,0.12)",
    color: "#6ee7b7",
    border: "1px solid rgba(16,185,129,0.25)",
  }),
  ...(variant === "warning" && {
    bgcolor: "rgba(251,191,36,0.12)",
    color: "#fde68a",
    border: "1px solid rgba(251,191,36,0.25)",
  }),
  ...(variant === "info" && {
    bgcolor: "rgba(99,102,241,0.12)",
    color: "#a5b4fc",
    border: "1px solid rgba(99,102,241,0.25)",
  }),
  ...(variant === "neutral" && {
    bgcolor: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    border: "1px solid rgba(255,255,255,0.10)",
  }),
}));

const Footer = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showTop, setShowTop] = useState(false);

  const quickLinks = useMemo(() => [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "How It Works", path: "/how-it-works" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
    { name: "Become a Provider", path: "/become-provider" },
  ], []);

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
    { Icon: FaLinkedin, url: "https://linkedin.com/company/quickks", label: "LinkedIn" },
    { Icon: FaYoutube, url: "https://youtube.com/@quickks", label: "YouTube" },
    { Icon: FaWhatsapp, url: `https://wa.me/${CONTACT.WHATSAPP}?text=Hi%20Quickks%20Team`, label: "WhatsApp" },
  ], []);

  // ✅ GENERIC PAYMENTS - No trademark
  const payments = useMemo(() => [
    { label: "UPI", icon: "⚡" },
    { label: "Cards", icon: "💳" },
    { label: "NetBanking", icon: "🏦" },
    { label: "Wallets", icon: "📱" },
    { label: "COD", icon: "💵" },
  ], []);

  // ✅ IMPROVED BADGES - Security level up
  const trustBadges = useMemo(() => [
    { icon: <ShieldCheck size={14} />, label: "Verified Pros", variant: "success", title: "Aadhaar verified professionals" },
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
      // Security: Rate limit & sanitized
      const res = await api.post("/newsletter/subscribe", { email: cleanEmail }, { timeout: 8000 });
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setStatus({ type: "success", msg: `Subscribed! Confirmation sent to ${cleanEmail} 🎉` });
        setEmail("");
      } else {
        setStatus({ type: "error", msg: res.data?.message || "Subscription failed" });
      }
    } catch (err) {
      // Security: Don't expose internal errors
      const msg = err?.response?.status === 429 ? "Too many requests, try later" : "Unable to subscribe, try again";
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 6000);
    }
  }, [email]);

  const scrollTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  const year = new Date().getFullYear();

  return (
    <Root component="footer" role="contentinfo">
      {/* Trust Bar - Improved */}
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", bgcolor: "rgba(255,255,255,0.02)", backdropFilter: "blur(8px)" }}>
        <Container maxWidth="lg" sx={{ py: 2.4 }}>
          <Stack direction={{ xs: "column", lg: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", lg: "center" }} spacing={1.8}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
              {trustBadges.map((b) => (
                <Tooltip key={b.label} title={b.title} arrow>
                  <TrustBadge icon={b.icon} label={b.label} variant={b.variant} size="small" />
                </Tooltip>
              ))}
            </Stack>
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
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.4,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                      border: "1px solid rgba(0,0,0,0.05)",
                      transition: "all 0.2s",
                      "&:hover": { transform: "translateY(-1px)", boxShadow: "0 4px 8px rgba(0,0,0,0.15)" }
                    }}>
                      <span>{p.icon}</span> {p.label}
                    </Box>
                  </Tooltip>
                ))}
              </Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* Main Footer */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 7 } }}>
        <Grid container spacing={{ xs: 4, md: 3 }}>
          <Grid item xs={12} md={4.5}>
            <Stack spacing={2.4}>
              <Box>
                <BrandTitle>
                  <Box sx={{ width: 34, height: 34, borderRadius: 1.5, bgcolor: "#fbbf24", display: "grid", placeItems: "center", color: "#0f172a", fontSize: "1.2rem", fontWeight: 900 }}>Q</Box>
                  Quickks<span style={{ color: "#fbbf24" }}>.</span>
                </BrandTitle>
                <Typography sx={{ mt: 1.6, color: "#94a3b8", lineHeight: 1.75, fontSize: "0.95rem", maxWidth: 400 }}>
                  Quickks connects you with trusted electricians, appliance repair experts and smart home pros. Verified, on-time and warranty backed across Pune and 25+ cities. 
                  <Box component="span" sx={{ display: "block", mt: 1, color: "#cbd5e1", fontWeight: 600 }}>Need help? <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: "#fbbf24", textDecoration: "none", "&:hover": { textDecoration: "underline" } }}>{CONTACT.EMAIL}</Box></Box>
                </Typography>
              </Box>
              
              <Stack spacing={1.4}>
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: "rgba(251,191,36,0.12)", display: "grid", placeItems: "center", border: "1px solid rgba(251,191,36,0.18)" }}><Mail size={16} color="#fbbf24" /></Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, display: "block" }}>Email Support</Typography>
                    <Typography component="a" href={`mailto:${CONTACT.EMAIL}`} rel="noopener" sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}>{CONTACT.EMAIL}</Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.08)" }}><Phone size={16} color="#fbbf24" /></Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, display: "block" }}>Call Us</Typography>
                    <Typography component="a" href={`tel:${CONTACT.PHONE_TEL}`} sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontWeight: 700, fontSize: "0.95rem", "&:hover": { color: "#fbbf24" } }}>{CONTACT.PHONE_DISPLAY}</Typography>
                  </Box>
                </Stack>
                
                <Stack direction="row" spacing={1.2} alignItems="flex-start">
                  <Box sx={{ width: 38, height: 38, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,0.08)", mt: 0.2 }}><MapPin size={16} color="#fbbf24" /></Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, display: "block" }}>Headquarters</Typography>
                    <Typography sx={{ color: "#e2e8f0", fontSize: "0.92rem", lineHeight: 1.5, fontWeight: 500 }}>{CONTACT.ADDRESS}</Typography>
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
            <Box sx={{ mt: 2.2, p: 1.3, borderRadius: 1.5, bgcolor: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.15)", display: "flex", gap: 1, alignItems: "center" }}>
              <Zap size={16} color="#fbbf24" />
              <Typography variant="caption" sx={{ color: "#fde68a", fontWeight: 700, fontSize: "0.78rem" }}>Emergency? Call {CONTACT.PHONE_DISPLAY}</Typography>
            </Box>
          </Grid>

          <Grid item xs={12} md={3}>
            <SectionTitle>Stay Updated</SectionTitle>
            <Typography variant="body2" sx={{ color: "#94a3b8", lineHeight: 1.6, mb: 2, fontSize: "0.9rem" }}>
              Get offers, service tips and safety checks. No spam, unsubscribe anytime. Support: <strong style={{ color: "#e2e8f0" }}>{CONTACT.EMAIL}</strong>
            </Typography>
            <Box component="form" onSubmit={handleNewsletter} noValidate sx={{ display: "flex", gap: 1, p: 0.6, borderRadius: 999, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", "&:focus-within": { borderColor: "#fbbf24", boxShadow: "0 0 0 3px rgba(251,191,36,0.15)" }, transition: "all 0.2s" }}>
              <TextField 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="Your email address" 
                size="small" 
                type="email" 
                autoComplete="email"
                inputProps={{ maxLength: 100 }}
                aria-label="Newsletter email"
                sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 999, bgcolor: "transparent", "& fieldset": { border: "none" }, "& input": { color: "#e2e8f0", py: 1.1, fontSize: "0.9rem", "&::placeholder": { color: "#64748b" } } } }} 
              />
              <Button type="submit" disabled={loading} aria-label="Subscribe to newsletter" sx={{ minWidth: 44, width: 44, height: 44, borderRadius: "50%", bgcolor: "#fbbf24", color: "#0f172a", "&:hover": { bgcolor: "#f59e0b" }, "&.Mui-disabled": { bgcolor: "rgba(255,255,255,0.12)", color: "#64748b" } }}>
                {loading ? <Box sx={{ width: 16, height: 16, border: "2px solid #0f172a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} /> : <Send size={18} />}
              </Button>
            </Box>
            {status && (
              <Box role="alert" sx={{ mt: 1.2, px: 1.4, py: 0.9, borderRadius: 1.5, fontSize: "0.82rem", fontWeight: 600, bgcolor: status.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: status.type === "success" ? "#6ee7b7" : "#fca5a5", border: `1px solid ${status.type === "success" ? "rgba(16,185,129,0.22)" : "rgba(239,68,68,0.22)"}`, display: "flex", gap: 0.8, alignItems: "center" }}>
                {status.type === "success" ? <CheckCircle2 size={14} /> : null}{status.msg}
              </Box>
            )}
            <Stack direction="row" spacing={1} mt={2.5} alignItems="center" sx={{ p: 1.2, borderRadius: 1.2, bgcolor: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: "#fbbf24", display: "grid", placeItems: "center", fontWeight: 900, color: "#0f172a", fontSize: "0.75rem" }}>Q</Box>
              <Typography variant="caption" sx={{ color: "#94a3b8", fontSize: "0.78rem", lineHeight: 1.35, fontWeight: 500 }}>
                Trusted by 10k+ homes • GST Invoiced • Warranty Backed<br/>Support: {CONTACT.EMAIL}
              </Typography>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <Container maxWidth="lg" sx={{ py: 2.6 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.6}>
          <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.85rem", lineHeight: 1.5 }}>
            © {year} Quickks Technologies Pvt Ltd. All rights reserved. Made in Pune with <Box component="span" sx={{ color: "#f87171" }}>♥</Box> for Bharat. 
            <Box component="span" sx={{ display: { xs: "block", sm: "inline" }, mt: { xs: 0.5, sm: 0 } }}>
              Secure contact: <Box component="a" href={`mailto:${CONTACT.EMAIL}`} sx={{ color: "#94a3b8", textDecoration: "none", "&:hover": { color: "#fbbf24", textDecoration: "underline" } }}>{CONTACT.EMAIL}</Box>
            </Box>
          </Typography>
          <Stack direction="row" spacing={2.2} flexWrap="wrap" useFlexGap alignItems="center">
            {supportLinks.slice(2).map((l) => (
              <Typography key={l.name} component={Link} to={l.path} sx={{ color: "#64748b", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, "&:hover": { color: "#e2e8f0" }, "&:focus-visible": { outline: "2px solid #fbbf24", borderRadius: 1 } }}>{l.name}</Typography>
            ))}
            <Typography component="span" onClick={() => navigate("/cookies")} sx={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", "&:hover": { color: "#e2e8f0" } }}>Cookies</Typography>
          </Stack>
        </Stack>
      </Container>

      <BackTop visible={showTop ? 1 : 0} onClick={scrollTop} aria-label="Back to top"><ArrowUp size={20} /></BackTop>
    </Root>
  );
};

export default React.memo(Footer);