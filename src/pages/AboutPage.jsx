import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Users, Clock, Zap, Star, Award } from "lucide-react";

const AboutPage = () => {
  return (
    <div style={styles.pageContainer}>
      {/* Hero Section */}
      <section style={styles.heroSection}>
        <div style={styles.overlay} />
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          style={styles.heroContent}
        >
          <h1 style={styles.heroTitle}>Revolutionizing Home Services<span>.</span></h1>
          <p style={styles.heroSub}>At Quickks, we believe finding a trusted professional should be as fast as a click.</p>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section style={styles.statsContainer}>
        {[
          { icon: Users, label: "Happy Customers", val: "10,000+" },
          { icon: ShieldCheck, label: "Verified Pros", val: "1,500+" },
          { icon: Award, label: "Cities Covered", val: "25+" },
          { icon: Star, label: "Avg Rating", val: "4.8/5" },
        ].map((stat, i) => (
          <div key={i} style={styles.statCard}>
            <stat.icon size={32} color="#fbbf24" />
            <h2 style={styles.statVal}>{stat.val}</h2>
            <p style={styles.statLabel}>{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Our Mission Section */}
      <section style={styles.contentSection}>
        <div style={styles.grid}>
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={styles.textContent}
          >
            <span style={styles.badge}>Our Mission</span>
            <h2 style={styles.sectionTitle}>Built on Trust, Powered by Technology</h2>
            <p style={styles.description}>
              Quickks was born in **Pune, Maharashtra** with a simple goal: to eliminate the stress of home maintenance. 
              We bridge the gap between skilled electricians, appliance experts, and homeowners using a rigorous 
              verification process and real-time tracking.
            </p>
            <div style={styles.features}>
              <div style={styles.featItem}><Zap size={18} color="#fbbf24" /> <span>Express Booking</span></div>
              <div style={styles.featItem}><Clock size={18} color="#fbbf24" /> <span>24/7 Support</span></div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            style={styles.imagePlaceholder}
          >
            <img 
              src="https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80" 
              alt="Professional at work" 
              style={styles.mainImg}
            />
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  pageContainer: { fontFamily: "'Poppins', sans-serif", color: "#1e293b", background: "#fff" },
  heroSection: {
    height: "60vh", display: "flex", alignItems: "center", justifyContent: "center",
    backgroundImage: "url('https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1600&q=80')",
    backgroundSize: "cover", backgroundPosition: "center", position: "relative", textAlign: "center", padding: "0 20px"
  },
  overlay: { position: "absolute", inset: 0, background: "rgba(15, 23, 42, 0.75)" },
  heroContent: { zIndex: 2, maxWidth: "800px" },
  heroTitle: { fontSize: "3.5rem", fontWeight: 800, color: "#fff", marginBottom: "20px" },
  heroSub: { fontSize: "1.2rem", color: "#cbd5e1", lineHeight: 1.6 },
  
  statsContainer: {
    display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "30px",
    padding: "60px 10%", background: "#f8fafc", marginTop: "-60px", zIndex: 3, position: "relative"
  },
  statCard: {
    background: "#fff", padding: "30px", borderRadius: "20px", width: "220px",
    textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9"
  },
  statVal: { fontSize: "2rem", fontWeight: 800, margin: "10px 0 5px", color: "#0f172a" },
  statLabel: { color: "#64748b", fontSize: "0.9rem", fontWeight: 500 },

  contentSection: { padding: "100px 10%" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "60px", alignItems: "center" },
  badge: { color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", fontSize: "0.85rem" },
  sectionTitle: { fontSize: "2.5rem", fontWeight: 800, margin: "15px 0 25px", lineHeight: 1.2 },
  description: { fontSize: "1.1rem", color: "#475569", lineHeight: 1.8, marginBottom: "30px" },
  
  features: { display: "flex", gap: "30px" },
  featItem: { display: "flex", alignItems: "center", gap: "10px", fontWeight: 600, fontSize: "0.95rem" },
  
  imagePlaceholder: { position: "relative" },
  mainImg: { width: "100%", borderRadius: "30px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }
};

export default AboutPage;