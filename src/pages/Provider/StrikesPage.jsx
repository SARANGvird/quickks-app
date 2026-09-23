import React, { useEffect, useState } from "react";
import api from "../../api/api";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaGavel, FaExclamationTriangle, FaSearch, FaChevronRight } from "react-icons/fa";

// Match your AdminDashboard Theme
const theme = {
  background: "linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1629 100%)",
  card: "rgba(20, 27, 52, 0.95)",
  text: { primary: "#ffffff", secondary: "#a0aec0" }
};

const StrikeTrackerPage = () => {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadStrikeData();
  }, []);

  const loadStrikeData = async () => {
    try {
      const { data } = await api.get("/api/admin/providers/strikes");
      setProviders(data || []);
    } catch (err) {
      console.error("Failed to load strike data", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProviders = providers.filter(p => 
    p.providerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={loaderStyle}>Loading Safety Metrics...</div>;

  return (
    <div style={containerStyle}>
      <header style={{ marginBottom: 30 }}>
        <h1 style={{ color: theme.text.primary, fontSize: "2rem", margin: 0 }}>Strike Tracker</h1>
        <p style={{ color: theme.text.secondary }}>Marketplace Trust & Safety Monitoring</p>
      </header>

      {/* Search Bar */}
      <div style={searchContainer}>
        <FaSearch color={theme.text.secondary} />
        <input 
          style={inputStyle} 
          placeholder="Search provider name..." 
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={gridStyle}>
        {filteredProviders.map((p) => (
          <motion.div 
            key={p.providerId} 
            whileHover={{ y: -5 }} 
            style={cardStyle}
          >
            <div style={cardHeader}>
              <h3 style={{ margin: 0, color: "#fff" }}>{p.providerName}</h3>
              <span style={statusBadge(p.status)}>{p.status}</span>
            </div>

            <p style={{ color: theme.text.secondary, fontSize: "0.9rem" }}>City: {p.city}</p>
            
            <div style={strikeSection}>
              <div style={strikeDots}>
                {[...Array(p.maxStrikes)].map((_, i) => (
                  <div 
                    key={i} 
                    style={dotStyle(i < p.activeStrikes)}
                  />
                ))}
              </div>
              <span style={{ color: p.activeStrikes >= 2 ? "#ef4444" : "#fff", fontWeight: "bold" }}>
                {p.activeStrikes} / {p.maxStrikes} Strikes
              </span>
            </div>

            {p.activeStrikes === 2 && (
              <div style={alertBox}>
                <FaExclamationTriangle /> High Risk: Final Warning
              </div>
            )}

            <button 
              onClick={() => navigate(`/admin/providers/${p.providerId}/trust`)}
              style={actionBtn}
            >
              View Trust Profile <FaChevronRight size={12} />
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ------------------- STYLES -------------------
const containerStyle = { minHeight: "100vh", padding: "40px", background: theme.background };
const loaderStyle = { color: "#fff", textAlign: "center", paddingTop: "100px", fontSize: "1.2rem" };
const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "20px" };
const searchContainer = { display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.05)", padding: "12px 20px", borderRadius: "12px", marginBottom: "30px", border: "1px solid rgba(255,255,255,0.1)" };
const inputStyle = { background: "none", border: "none", color: "#fff", outline: "none", width: "100%", fontSize: "1rem" };
const cardStyle = { background: theme.card, borderRadius: "20px", padding: "24px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: "15px" };
const cardHeader = { display: "flex", justifyContent: "space-between", alignItems: "center" };
const strikeSection = { display: "flex", alignItems: "center", gap: "15px", padding: "15px 0", borderTop: "1px solid rgba(255,255,255,0.05)" };
const strikeDots = { display: "flex", gap: "8px" };
const actionBtn = { marginTop: "10px", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontWeight: "600" };
const alertBox = { display: "flex", alignItems: "center", gap: "10px", background: "rgba(239, 68, 68, 0.15)", color: "#ef4444", padding: "10px", borderRadius: "8px", fontSize: "0.85rem", fontWeight: "bold" };

const statusBadge = (status) => ({
  padding: "4px 10px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold",
  background: status === "SUSPENDED" ? "#ef444420" : "#38ef7d20",
  color: status === "SUSPENDED" ? "#ef4444" : "#38ef7d"
});

const dotStyle = (active) => ({
  width: "12px", height: "12px", borderRadius: "50%",
  background: active ? "#ef4444" : "rgba(255,255,255,0.1)",
  boxShadow: active ? "0 0 8px #ef4444" : "none"
});

export default StrikeTrackerPage;