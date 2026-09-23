import React, { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from "lucide-react";

const ContactPage = () => {
  const [status, setStatus] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("Message Sent! We will get back to you shortly.");
    // Add your backend logic here
  };

  return (
    <div style={styles.pageContainer}>
      {/* Header Section */}
      <section style={styles.header}>
        <motion.span 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          style={styles.badge}
        >
          Contact Us
        </motion.span>
        <h1 style={styles.mainTitle}>Let’s Get Your Home <span style={{color: "#fbbf24"}}>Sorted.</span></h1>
        <p style={styles.subTitle}>Have a question or need an emergency repair? Our team is standing by.</p>
      </section>

      <div style={styles.contentGrid}>
        {/* Left: Contact Form */}
        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          style={styles.formCard}
        >
          <h2 style={styles.cardTitle}>Send a Message</h2>
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Full Name</label>
              <input type="text" placeholder="John Doe" style={styles.input} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input type="email" placeholder="john@example.com" style={styles.input} required />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>How can we help?</label>
              <textarea placeholder="Tell us about your requirement..." style={styles.textarea} required />
            </div>
            <button type="submit" style={styles.submitBtn}>
              <Send size={18} /> Send Message
            </button>
            {status && <p style={styles.statusMsg}>{status}</p>}
          </form>
        </motion.div>

        {/* Right: Contact Details */}
        <motion.div 
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          style={styles.infoColumn}
        >
          <div style={styles.infoBox}>
            <div style={styles.iconCircle}><MapPin size={24} color="#fbbf24" /></div>
            <div>
              <h3 style={styles.infoTitle}>Visit Our Office</h3>
              <p style={styles.infoDesc}>Pune, Maharashtra, India</p>
            </div>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.iconCircle}><Phone size={24} color="#fbbf24" /></div>
            <div>
              <h3 style={styles.infoTitle}>Call Support</h3>
              <p style={styles.infoDesc}>+91 9371365677</p>
            </div>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.iconCircle}><Mail size={24} color="#fbbf24" /></div>
            <div>
              <h3 style={styles.infoTitle}>Email Us</h3>
              <p style={styles.infoDesc}>support@quickks.com</p>
            </div>
          </div>

          <div style={styles.infoBox}>
            <div style={styles.iconCircle}><Clock size={24} color="#fbbf24" /></div>
            <div>
              <h3 style={styles.infoTitle}>Working Hours</h3>
              <p style={styles.infoDesc}>Mon - Sat: 9 AM to 8 PM</p>
            </div>
          </div>

          {/* Emergency Alert Box */}
          <div style={styles.emergencyBox}>
            <MessageSquare size={20} color="#000" />
            <span><strong>Emergency?</strong> Our technicians are available for critical issues 24/7.</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const styles = {
  pageContainer: { minHeight: "100vh", backgroundColor: "#f8fafc", padding: "100px 10%", fontFamily: "'Poppins', sans-serif" },
  header: { textAlign: "center", marginBottom: "60px" },
  badge: { color: "#fbbf24", fontWeight: 700, textTransform: "uppercase", fontSize: "0.85rem", letterSpacing: "2px" },
  mainTitle: { fontSize: "3rem", fontWeight: 800, color: "#0f172a", marginTop: "10px" },
  subTitle: { color: "#64748b", fontSize: "1.1rem" },
  
  contentGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "50px", maxWidth: "1200px", margin: "0 auto" },
  
  formCard: { background: "#fff", padding: "40px", borderRadius: "24px", boxShadow: "0 20px 50px rgba(0,0,0,0.05)", border: "1px solid #e2e8f0" },
  cardTitle: { fontSize: "1.5rem", fontWeight: 700, marginBottom: "30px", color: "#0f172a" },
  form: { display: "flex", flexDirection: "column", gap: "20px" },
  inputGroup: { display: "flex", flexDirection: "column", gap: "8px" },
  label: { fontSize: "0.9rem", fontWeight: 600, color: "#475569" },
  input: { padding: "12px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", fontSize: "1rem", transition: "0.3s" },
  textarea: { padding: "12px 16px", borderRadius: "12px", border: "1px solid #cbd5e1", outline: "none", fontSize: "1rem", minHeight: "120px", resize: "none" },
  submitBtn: { background: "#fbbf24", color: "#000", border: "none", padding: "15px", borderRadius: "12px", fontWeight: 800, fontSize: "1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" },
  statusMsg: { marginTop: "15px", color: "#10b981", fontWeight: 600, textAlign: "center" },

  infoColumn: { display: "flex", flexDirection: "column", gap: "30px" },
  infoBox: { display: "flex", alignItems: "center", gap: "20px" },
  iconCircle: { width: "56px", height: "56px", background: "#fff", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(0,0,0,0.05)" },
  infoTitle: { fontSize: "1rem", fontWeight: 700, color: "#0f172a", margin: 0 },
  infoDesc: { color: "#64748b", margin: "2px 0 0 0" },
  
  emergencyBox: { marginTop: "20px", background: "#fef3c7", padding: "20px", borderRadius: "16px", display: "flex", gap: "12px", alignItems: "center", color: "#92400e", fontSize: "0.9rem", border: "1px solid #fde68a" }
};

export default ContactPage;