import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Box, Typography, Container, Grid, Stack, TextField, Button, IconButton, Divider, Chip } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Mail, Phone, MapPin, Send, ArrowUp, Shield, Truck, Clock, CheckCircle2, Star } from "lucide-react";
import { FaFacebook, FaXTwitter, FaInstagram, FaLinkedin, FaYoutube } from "react-icons/fa6";
import api from "../api/api";

const Root = styled(Box)({
  backgroundColor: "#0f172a",
  color: "#e2e8f0",
  position: "relative",
  marginTop: "auto",
});

const BrandTitle = styled(Typography)({
  fontWeight: 900,
  fontSize: "1.9rem",
  letterSpacing: -0.8,
  color: "#ffffff",
  lineHeight: 1,
});

const SectionTitle = styled(Typography)({
  fontWeight: 800,
  fontSize: "0.95rem",
  letterSpacing: 0.6,
  textTransform: "uppercase",
  color: "#f8fafc",
  marginBottom: "18px",
});

const NavLink = styled(Link)(({ active }) => ({
  color: active ? "#fbbf24" : "#94a3b8",
  textDecoration: "none",
  fontSize: "0.92rem",
  fontWeight: active ? 700 : 500,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  transition: "color 0.2s, transform 0.2s",
  "&:hover": { color: "#fbbf24", transform: "translateX(3px)" },
}));

const SocialBtn = styled(IconButton)({
  width: 40,
  height: 40,
  backgroundColor: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "#94a3b8",
  "&:hover": { backgroundColor: "#fbbf24", color: "#0f172a", borderColor: "#fbbf24", transform: "translateY(-2px)" },
  transition: "all 0.22s ease",
});

const BackTop = styled(IconButton)(({ visible }) => ({
  position: "fixed",
  right: 20,
  bottom: 20,
  width: 44,
  height: 44,
  backgroundColor: "#fbbf24",
  color: "#0f172a",
  boxShadow: "0 10px 24px rgba(251,191,36,0.35)",
  opacity: visible ? 1 : 0,
  pointerEvents: visible ? "auto" : "none",
  transform: visible ? "translateY(0)" : "translateY(12px)",
  transition: "all 0.28s ease",
  zIndex: 1200,
  "&:hover": { backgroundColor: "#f59e0b" },
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
    { Icon: FaXTwitter, url: "https://x.com/quickks", label: "X" },
    { Icon: FaInstagram, url: "https://instagram.com/quickks", label: "Instagram" },
    { Icon: FaLinkedin, url: "https://linkedin.com/company/quickks", label: "LinkedIn" },
    { Icon: FaYoutube, url: "https://youtube.com/@quickks", label: "YouTube" },
  ], []);

  const payments = useMemo(() => ["UPI", "Visa", "Mastercard", "RuPay", "NetBanking", "Wallets"], []);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNewsletter = useCallback(async (e) => {
    e.preventDefault();
    if (!email.trim()) { setStatus({ type: "error", msg: "Enter your email" }); return; }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!re.test(email)) { setStatus({ type: "error", msg: "Enter a valid email" }); return; }
    setLoading(true);
    setStatus(null);
    try {
      const res = await api.post("/newsletter/subscribe", { email: email.trim().toLowerCase() });
      if (res.data?.success || res.status === 200 || res.status === 201) {
        setStatus({ type: "success", msg: "Subscribed! Check your inbox." });
        setEmail("");
      } else {
        setStatus({ type: "error", msg: res.data?.message || "Subscription failed" });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Network error, try again";
      setStatus({ type: "error", msg });
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(null), 5000);
    }
  }, [email]);

  const scrollTop = useCallback(() => window.scrollTo({ top: 0, behavior: "smooth" }), []);

  const year = new Date().getFullYear();

  return (
    <Root component="footer">
      <Box sx={{ borderBottom: "1px solid rgba(255,255,255,0.06)", bgcolor: "rgba(255,255,255,0.02)" }}>
        <Container maxWidth="lg" sx={{ py: 2.2 }}>
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.5}>
            <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap alignItems="center">
              <Chip icon={<Shield size={14} />} label="Verified Pros" size="small" sx={{ bgcolor: "rgba(16,185,129,0.12)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.22)", fontWeight: 700 }} />
              <Chip icon={<Clock size={14} />} label="24/7 Support" size="small" sx={{ bgcolor: "rgba(251,191,36,0.12)", color: "#fde68a", border: "1px solid rgba(251,191,36,0.22)", fontWeight: 700 }} />
              <Chip icon={<Truck size={14} />} label="60 Min Arrival" size="small" sx={{ bgcolor: "rgba(99,102,241,0.12)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.22)", fontWeight: 700 }} />
              <Chip icon={<Star size={14} />} label="4.8/5 Rated" size="small" sx={{ bgcolor: "rgba(255,255,255,0.06)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)", fontWeight: 700 }} />
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              <Typography variant="caption" sx={{ color: "#94a3b8", fontWeight: 600 }}>Secure Payments:</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">{payments.map((p) => (<Box key={p} sx={{ px: 1, py: 0.3, borderRadius: 1, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", fontSize: "0.68rem", fontWeight: 800, color: "#cbd5e1" }}>{p}</Box>))}</Stack>
            </Stack>
          </Stack>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 7 } }}>
        <Grid container spacing={{ xs: 4, md: 3 }}>
          <Grid item xs={12} md={4.5}>
            <Stack spacing={2.2}>
              <Box>
                <BrandTitle>Quickks<span style={{ color: "#fbbf24" }}>.</span></BrandTitle>
                <Typography sx={{ mt: 1.4, color: "#94a3b8", lineHeight: 1.7, fontSize: "0.95rem", maxWidth: 380 }}>
                  Quickks connects you with trusted electricians, appliance repair experts and smart home pros. Verified, on-time and warranty backed across Pune and 25+ cities.
                </Typography>
              </Box>
              <Stack spacing={1.2}>
                <Stack direction="row" spacing={1.2} alignItems="center"><Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}><Mail size={16} color="#fbbf24" /></Box><Box><Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Email</Typography><Typography component="a" href="mailto:support@quickks.in" sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontWeight: 600, fontSize: "0.92rem", "&:hover": { color: "#fbbf24" } }}>support@quickks.in</Typography></Box></Stack>
                <Stack direction="row" spacing={1.2} alignItems="center"><Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}><Phone size={16} color="#fbbf24" /></Box><Box><Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Phone</Typography><Typography component="a" href="tel:+919371365677" sx={{ display: "block", color: "#e2e8f0", textDecoration: "none", fontWeight: 600, fontSize: "0.92rem" }}>+91 93713 65677</Typography></Box></Stack>
                <Stack direction="row" spacing={1.2} alignItems="flex-start"><Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center", mt: 0.2 }}><MapPin size={16} color="#fbbf24" /></Box><Box><Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.6 }}>Headquarters</Typography><Typography sx={{ color: "#e2e8f0", fontSize: "0.92rem", lineHeight: 1.5 }}>Pune, Maharashtra, India - 411001</Typography></Box></Stack>
              </Stack>
              <Stack direction="row" spacing={1} pt={1}>
                {socialLinks.map(({ Icon, url, label }) => (
                  <SocialBtn key={label} component="a" href={url} target="_blank" rel="noopener noreferrer" aria-label={label}><Icon size={18} /></SocialBtn>
                ))}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={6} md={2}>
            <SectionTitle>Quick Links</SectionTitle>
            <Stack spacing={1.1}>{quickLinks.map((l) => (<NavLink key={l.name} to={l.path} active={location.pathname === l.path ? 1 : 0}>{l.name}</NavLink>))}</Stack>
          </Grid>

          <Grid item xs={6} md={2.5}>
            <SectionTitle>Our Services</SectionTitle>
            <Stack spacing={1.1}>{serviceLinks.map((l) => (<NavLink key={l.name} to={l.path} active={location.pathname === l.path ? 1 : 0}>{l.name}</NavLink>))}</Stack>
          </Grid>

          <Grid item xs={12} md={3}>
            <SectionTitle>Stay Updated</SectionTitle>
            <Typography variant="body2" sx={{ color: "#94a3b8", lineHeight: 1.6, mb: 2 }}>Get offers, service tips and safety checks. No spam, unsubscribe anytime.</Typography>
            <Box component="form" onSubmit={handleNewsletter} sx={{ display: "flex", gap: 1, p: 0.6, borderRadius: 999, bgcolor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}>
              <TextField value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" size="small" type="email" sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 999, bgcolor: "transparent", "& fieldset": { border: "none" }, "& input": { color: "#e2e8f0", py: 1, fontSize: "0.9rem", "&::placeholder": { color: "#64748b" } } } }} />
              <Button type="submit" disabled={loading} sx={{ minWidth: 44, width: 44, height: 44, borderRadius: "50%", bgcolor: "#fbbf24", color: "#0f172a", "&:hover": { bgcolor: "#f59e0b" } }}>{loading ? <Box sx={{ width: 16, height: 16, border: "2px solid #0f172a", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite", "@keyframes spin": { to: { transform: "rotate(360deg)" } } }} /> : <Send size={18} />}</Button>
            </Box>
            {status && (<Box sx={{ mt: 1.2, px: 1.4, py: 0.8, borderRadius: 1.5, fontSize: "0.82rem", fontWeight: 600, bgcolor: status.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)", color: status.type === "success" ? "#6ee7b7" : "#fca5a5", border: `1px solid ${status.type === "success" ? "rgba(16,185,129,0.22)" : "rgba(239,68,68,0.22)"}`, display: "flex", gap: 0.8, alignItems: "center" }}>{status.type === "success" ? <CheckCircle2 size={14} /> : null}{status.msg}</Box>)}
            <Stack direction="row" spacing={1} mt={2.5} alignItems="center">
              <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: "#fff", display: "grid", placeItems: "center", fontWeight: 900, color: "#0f172a", fontSize: "0.7rem" }}>Q</Box>
              <Typography variant="caption" sx={{ color: "#64748b" }}>Trusted by 10k+ homes • GST Invoiced • Warranty Backed</Typography>
            </Stack>
          </Grid>
        </Grid>
      </Container>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.06)" }} />

      <Container maxWidth="lg" sx={{ py: 2.4 }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={1.4}>
          <Typography variant="body2" sx={{ color: "#64748b", fontSize: "0.85rem" }}>© {year} Quickks Technologies Pvt Ltd. All rights reserved. Made in Pune with <Box component="span" sx={{ color: "#f87171" }}>♥</Box> for Bharat.</Typography>
          <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
            {supportLinks.slice(2).map((l) => (<Typography key={l.name} component={Link} to={l.path} sx={{ color: "#64748b", textDecoration: "none", fontSize: "0.82rem", fontWeight: 600, "&:hover": { color: "#e2e8f0" } }}>{l.name}</Typography>))}
            <Typography component="span" onClick={() => navigate("/cookies")} sx={{ color: "#64748b", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer", "&:hover": { color: "#e2e8f0" } }}>Cookies</Typography>
          </Stack>
        </Stack>
      </Container>

      <BackTop visible={showTop ? 1 : 0} onClick={scrollTop} aria-label="Back to top"><ArrowUp size={20} /></BackTop>
    </Root>
  );
};

export default React.memo(Footer);
