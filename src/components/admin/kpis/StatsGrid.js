import React from "react";
import { FaUsers, FaClipboardList, FaRupeeSign, FaUserTie } from "react-icons/fa";

const StatsGrid = ({ stats }) => {
  const kpis = [
    { label: "Total Users", value: stats?.totalUsers || 0, icon: <FaUsers />, color: "#6366f1" },
    { label: "Active Providers", value: stats?.activeProviders || 0, icon: <FaUserTie />, color: "#10b981" },
    { label: "Total Bookings", value: stats?.totalBookings || 0, icon: <FaClipboardList />, color: "#f59e0b" },
    { label: "Revenue", value: `₹${stats?.totalRevenue || 0}`, icon: <FaRupeeSign />, color: "#ec4899" },
  ];

  return (
    <div style={gridStyle}>
      {kpis.map((kpi, i) => (
        <div key={i} style={cardStyle}>
          <div style={{ ...iconStyle, backgroundColor: `${kpi.color}20`, color: kpi.color }}>
            {kpi.icon}
          </div>
          <div>
            <p style={labelStyle}>{kpi.label}</p>
            <h3 style={valueStyle}>{kpi.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
};

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px", marginBottom: "32px" };
const cardStyle = { background: "rgba(30, 41, 59, 0.5)", padding: "24px", borderRadius: "16px", display: "flex", alignItems: "center", gap: "20px", border: "1px solid rgba(255,255,255,0.05)" };
const iconStyle = { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" };
const labelStyle = { color: "#94a3b8", fontSize: "14px", margin: 0 };
const valueStyle = { color: "#fff", fontSize: "24px", fontWeight: "bold", margin: "4px 0 0 0" };

export default StatsGrid;