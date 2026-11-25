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
