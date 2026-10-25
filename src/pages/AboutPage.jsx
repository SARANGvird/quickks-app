import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Box, Typography, Container, Grid, Paper, Stack, Button, Divider, Avatar } from "@mui/material";
import { styled } from "@mui/material/styles";
import { ShieldCheck, Users, Clock, Zap, Star, Award, CheckCircle2, MapPin, Wrench, HeartHandshake } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Root = styled(Box)({
  fontFamily: "'Inter', 'Poppins', system-ui, sans-serif",
  backgroundColor: "#ffffff",
  color: "#0f172a",
  overflowX: "hidden",
});

const Hero = styled(Box)({
  position: "relative",
  minHeight: "68vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1920&q=80')",
  backgroundSize: "cover",
  backgroundPosition: "center",
  padding: "80px 20px",
});

const Overlay = styled(Box)({
  position: "absolute",
  inset: 0,
  background: "linear-gradient(180deg, rgba(15,23,42,0.78) 0%, rgba(15,23,42,0.88) 100%)",
});

const StatCard = styled(Paper)({
  padding: "28px 22px",
  borderRadius: "20px",
  textAlign: "center",
  background: "#ffffff",
  border: "1px solid #f1f5f9",
  boxShadow: "0 12px 32px rgba(15,23,42,0.06)",
  transition: "transform 0.25s ease, box-shadow 0.25s ease",
  "&:hover": { transform: "translateY(-4px)", boxShadow: "0 18px 42px rgba(15,23,42,0.10)" },
});

const FeatureChip = styled(Box)({
  display: "inline-flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 14px",
  borderRadius: "999px",
  background: "#fef9c3",
  border: "1px solid #fde68a",
  fontWeight: 700,
  fontSize: "0.9rem",
  color: "#854d0e",
});

const ValueCard = styled(Paper)({
  padding: "28px",
  borderRadius: "20px",
  background: "#ffffff",
  border: "1px solid #f1f5f9",
  height: "100%",
});

const AboutPage = () => {
  const navigate = useNavigate();

  const stats = useMemo(() => [
    { icon: Users, label: "Happy Customers", value: "10,000+", sub: "Across Maharashtra" },
    { icon: ShieldCheck, label: "Verified Pros", value: "1,500+", sub: "Background checked" },
    { icon: Award, label: "Cities Covered", value: "25+", sub: "And expanding fast" },
    { icon: Star, label: "Avg Rating", value: "4.8/5", sub: "30k+ reviews" },
  ], []);

  const values = useMemo(() => [
    { icon: ShieldCheck, title: "Trust First", desc: "Every pro passes ID, skill and police verification. We show what we check, not just a badge." },
    { icon: Clock, title: "On-Time, Every Time", desc: "Real-time tracking, slot-based arrival and auto-compensation if we are late." },
    { icon: Wrench, title: "Fixed Price Promise", desc: "Upfront estimates, no hidden visit charges. Pay after work, with warranty on service." },
    { icon: HeartHandshake, title: "Support That Stays", desc: "24/7 human support, 7-day rework window and instant refunds if not satisfied." },
  ], []);

  const process = useMemo(() => [
    { step: "01", title: "Book in 60 seconds", desc: "Choose service, slot and address. No calls needed." },
    { step: "02", title: "Verified pro assigned", desc: "Nearest verified expert with live tracking." },
    { step: "03", title: "Work + Warranty", desc: "Digital invoice, photos of work and service warranty." },
  ], []);

  return (
    <Root>
      <Hero>
        <Overlay />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <Stack spacing={2.2} alignItems="center" textAlign="center">
              <Box sx={{ px: 1.6, py: 0.6, borderRadius: 999, bgcolor: "rgba(251,191,36,0.14)", border: "1px solid rgba(251,191,36,0.35)", color: "#fde68a", fontWeight: 700, fontSize: "0.78rem", letterSpacing: 0.8, textTransform: "uppercase" }}>Born in Pune • Built for Bharat</Box>
              <Typography sx={{ fontSize: { xs: "2.4rem", md: "3.6rem" }, fontWeight: 900, lineHeight: 1.05, color: "#ffffff", letterSpacing: -1.2, maxWidth: 820 }}>Revolutionizing Home Services<span style={{ color: "#fbbf24" }}>.</span></Typography>
              <Typography sx={{ fontSize: { xs: "1.05rem", md: "1.18rem" }, color: "#cbd5e1", lineHeight: 1.7, maxWidth: 680, fontWeight: 400 }}>At Quickks, finding a trusted professional is as fast as a click. We combine rigorous verification, real-time ops and fixed pricing to make home service stress-free.</Typography>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.4} mt={1}>
                <Button onClick={() => navigate("/services")} variant="contained" sx={{ bgcolor: "#fbbf24", color: "#0f172a", fontWeight: 800, borderRadius: 999, px: 3.2, py: 1.2, textTransform: "none", "&:hover": { bgcolor: "#f59e0b" } }}>Explore Services</Button>
                <Button onClick={() => navigate("/contact")} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.35)", borderRadius: 999, px: 3.2, py: 1.2, textTransform: "none", fontWeight: 700, "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.06)" } }}>Contact Team</Button>
              </Stack>
              <Stack direction="row" spacing={1.2} alignItems="center" mt={1} sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                <MapPin size={14} /> Pune, Maharashtra • Serving 25+ cities
              </Stack>
            </Stack>
          </motion.div>
        </Container>
      </Hero>

      <Container maxWidth="lg" sx={{ mt: { xs: -5, md: -7 }, position: "relative", zIndex: 3 }}>
        <Grid container spacing={2.2}>
          {stats.map((s, i) => (
            <Grid key={s.label} item xs={12} sm={6} md={3}>
              <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                <StatCard>
                  <Box sx={{ width: 48, height: 48, borderRadius: "14px", bgcolor: "#fef9c3", display: "grid", placeItems: "center", mx: "auto", mb: 1.6 }}><s.icon size={22} color="#ca8a04" /></Box>
                  <Typography sx={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>{s.value}</Typography>
                  <Typography sx={{ fontWeight: 700, mt: 0.6 }}>{s.label}</Typography>
                  <Typography variant="caption" sx={{ color: "#64748b" }}>{s.sub}</Typography>
                </StatCard>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={{ xs: 4, md: 7 }} alignItems="center">
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, x: -24 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
              <Box sx={{ display: "inline-flex", px: 1.4, py: 0.5, borderRadius: 999, bgcolor: "#fef9c3", color: "#854d0e", fontWeight: 800, fontSize: "0.75rem", letterSpacing: 0.8, textTransform: "uppercase" }}>Our Mission</Box>
              <Typography sx={{ fontSize: { xs: "2rem", md: "2.6rem" }, fontWeight: 900, lineHeight: 1.15, mt: 1.6, letterSpacing: -0.6 }}>Built on Trust, Powered by Technology</Typography>
              <Typography sx={{ mt: 2.2, fontSize: "1.06rem", lineHeight: 1.85, color: "#475569" }}>
                Quickks started in Pune with one simple observation: home service should not be a gamble. We bridge skilled electricians, plumbers, appliance experts and homeowners through verified onboarding, live ops and fixed-price billing. Every booking includes digital invoice, work photos and warranty.
              </Typography>
              <Stack direction="row" spacing={1.2} flexWrap="wrap" useFlexGap mt={3}>
                <FeatureChip><Zap size={16} /> Express Booking</FeatureChip>
                <FeatureChip><Clock size={16} /> 24/7 Human Support</FeatureChip>
                <FeatureChip><CheckCircle2 size={16} /> 7-Day Service Warranty</FeatureChip>
              </Stack>
              <Divider sx={{ my: 3.5 }} />
              <Grid container spacing={2}>
                {process.map((p) => (
                  <Grid key={p.step} item xs={12} sm={4}>
                    <Typography sx={{ fontWeight: 900, color: "#fbbf24", fontSize: "0.9rem" }}>{p.step}</Typography>
                    <Typography sx={{ fontWeight: 800, mt: 0.5 }}>{p.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#64748b", mt: 0.4, lineHeight: 1.5 }}>{p.desc}</Typography>
                  </Grid>
                ))}
              </Grid>
            </motion.div>
          </Grid>
          <Grid item xs={12} md={6}>
            <motion.div initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.55 }}>
              <Box sx={{ position: "relative", borderRadius: "28px", overflow: "hidden", boxShadow: "0 24px 64px rgba(15,23,42,0.18)" }}>
                <Box component="img" src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80" alt="Verified professional at work" sx={{ width: "100%", height: { xs: 360, md: 520 }, objectFit: "cover", display: "block" }} />
                <Box sx={{ position: "absolute", bottom: 16, left: 16, right: 16, p: 2, borderRadius: "18px", bgcolor: "rgba(255,255,255,0.92)", backdropFilter: "blur(10px)", display: "flex", gap: 1.6, alignItems: "center", border: "1px solid rgba(255,255,255,0.6)" }}>
                  <Avatar sx={{ bgcolor: "#0f172a", width: 44, height: 44 }}><ShieldCheck size={22} /></Avatar>
                  <Box>
                    <Typography fontWeight={900} lineHeight={1.1}>Verified Pros Only</Typography>
                    <Typography variant="caption" sx={{ color: "#475569" }}>ID • Skill Test • Police Verification • Live Tracking</Typography>
                  </Box>
                </Box>
              </Box>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      <Box sx={{ bgcolor: "#f8fafc", py: { xs: 7, md: 10 }, borderTop: "1px solid #f1f5f9", borderBottom: "1px solid #f1f5f9" }}>
        <Container maxWidth="lg">
          <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={1.5} mb={4}>
            <Box>
              <Typography sx={{ fontWeight: 800, letterSpacing: 0.8, fontSize: "0.78rem", textTransform: "uppercase", color: "#ca8a04" }}>Why Quickks</Typography>
              <Typography sx={{ fontSize: { xs: "1.9rem", md: "2.2rem" }, fontWeight: 900, letterSpacing: -0.5 }}>What we promise, how we deliver</Typography>
            </Box>
            <Typography sx={{ color: "#64748b", maxWidth: 420, lineHeight: 1.6 }}>We optimize for trust, not just speed. Each layer is built to reduce uncertainty for customers and pros.</Typography>
          </Stack>
          <Grid container spacing={2.2}>
            {values.map((v, i) => (
              <Grid key={v.title} item xs={12} sm={6} md={3}>
                <motion.div initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                  <ValueCard>
                    <Box sx={{ width: 44, height: 44, borderRadius: 12, bgcolor: "#f8fafc", border: "1px solid #f1f5f9", display: "grid", placeItems: "center", mb: 2 }}><v.icon size={20} color="#0f172a" /></Box>
                    <Typography fontWeight={900}>{v.title}</Typography>
                    <Typography variant="body2" sx={{ color: "#475569", mt: 1, lineHeight: 1.7 }}>{v.desc}</Typography>
                  </ValueCard>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 9 } }}>
        <Paper sx={{ p: { xs: 3, md: 5 }, borderRadius: "28px", background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "#fff", position: "relative", overflow: "hidden" }}>
          <Box sx={{ position: "absolute", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 70%)", top: -120, right: -80 }} />
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography sx={{ fontSize: { xs: "1.8rem", md: "2.2rem" }, fontWeight: 900, lineHeight: 1.15 }}>Home service should be simple, safe and on time.</Typography>
              <Typography sx={{ mt: 1.4, color: "#cbd5e1", lineHeight: 1.7, maxWidth: 620 }}>Quickks is live in Pune and expanding to 25+ cities. Book a verified pro in 60 seconds and track everything till warranty.</Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Stack direction={{ xs: "column", sm: "row", md: "column" }} spacing={1.2} justifyContent="flex-end">
                <Button onClick={() => navigate("/services")} sx={{ bgcolor: "#fbbf24", color: "#0f172a", fontWeight: 900, borderRadius: 999, py: 1.3, textTransform: "none", "&:hover": { bgcolor: "#f59e0b" } }}>Book a Service</Button>
                <Button onClick={() => navigate("/become-provider")} variant="outlined" sx={{ color: "#fff", borderColor: "rgba(255,255,255,0.3)", borderRadius: 999, py: 1.3, textTransform: "none", fontWeight: 700 }}>Become a Pro</Button>
              </Stack>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Root>
  );
};

export default React.memo(AboutPage);
