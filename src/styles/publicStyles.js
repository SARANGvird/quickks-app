const styles = {
  page: {
    backgroundImage:
      "url('https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=1600&q=80')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    minHeight: "100vh",
    color: "#fff",
    position: "relative",
    fontFamily: "Poppins, sans-serif",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
  },

  navbar: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "1.5rem 4rem",
  },

  logo: {
    fontSize: "1.8rem",
    fontWeight: 700,
  },

  loginBtn: {
    background: "transparent",
    border: "2px solid #fff",
    color: "#fff",
    padding: "10px 22px",
    borderRadius: "30px",
    marginRight: "12px",
    cursor: "pointer",
    fontWeight: 500,
  },

  registerBtn: {
    background: "#fbbf24",
    border: "none",
    color: "#000",
    padding: "10px 24px",
    borderRadius: "30px",
    cursor: "pointer",
    fontWeight: 600,
  },

  hero: {
    position: "relative",
    zIndex: 2,
    height: "80vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    padding: "0 2rem",
  },

  heroTitle: {
    fontSize: "3rem",
    fontWeight: 700,
    marginBottom: "1rem",
    maxWidth: "800px",
  },

  heroSubtitle: {
    fontSize: "1.25rem",
    maxWidth: "650px",
    marginBottom: "2rem",
    color: "#e5e7eb",
  },

  primaryCta: {
    background: "#fbbf24",
    color: "#000",
    padding: "14px 36px",
    border: "none",
    borderRadius: "40px",
    fontSize: "1.1rem",
    fontWeight: 600,
    cursor: "pointer",
  },

  serviceSection: {
    position: "relative",
    zIndex: 2,
    background: "#fff",
    color: "#111",
    padding: "80px 20px",
    textAlign: "center",
  },

  sectionTitle: {
    fontSize: "2.4rem",
    fontWeight: 700,
    marginBottom: "0.5rem",
  },

  sectionSubtitle: {
    fontSize: "1.1rem",
    color: "#555",
    marginBottom: "3rem",
  },

  card: {
    maxWidth: "420px",
    margin: "0 auto",
    background: "#f9fafb",
    padding: "2.5rem",
    borderRadius: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
  },

  cardTitle: {
    fontSize: "1.6rem",
    fontWeight: 600,
    margin: "1rem 0 0.5rem",
  },

  cardDesc: {
    fontSize: "1rem",
    color: "#555",
    marginBottom: "1.5rem",
  },

  secondaryCta: {
    background: "#fbbf24",
    color: "#000",
    padding: "10px 26px",
    border: "none",
    borderRadius: "30px",
    cursor: "pointer",
    fontWeight: 600,
  },
};
