import React, { useMemo, useState, useCallback } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, Sector } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaShieldAlt, 
  FaCheckCircle, 
  FaClock, 
  FaTimesCircle, 
  FaBan, 
  FaInfoCircle,
  FaChartPie,
  FaDownload,
  FaSync,
  FaExpand,
  FaCompress
} from "react-icons/fa";
import { saveAs } from "file-saver";

// ==========================================================
// COLOR CONFIGURATION
// ==========================================================
const STATUS_COLORS = {
  APPROVED: "#10b981",
  VERIFIED: "#10b981",
  PENDING: "#f59e0b",
  REJECTED: "#ef4444",
  SUSPENDED: "#ef4444",
  BANNED: "#ef4444",
  INACTIVE: "#6b7280",
  ON_BREAK: "#3b82f6",
  ACTIVE: "#10b981"
};

const STATUS_DISPLAY = {
  APPROVED: "Approved",
  VERIFIED: "Verified",
  PENDING: "Pending",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  BANNED: "Banned",
  INACTIVE: "Inactive",
  ON_BREAK: "On Break",
  ACTIVE: "Active"
};

const STATUS_ICONS = {
  APPROVED: FaCheckCircle,
  VERIFIED: FaCheckCircle,
  PENDING: FaClock,
  REJECTED: FaTimesCircle,
  SUSPENDED: FaBan,
  BANNED: FaBan,
  INACTIVE: FaTimesCircle,
  ON_BREAK: FaClock,
  ACTIVE: FaCheckCircle
};

// ==========================================================
// CUSTOM TOOLTIP COMPONENT
// ==========================================================
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const Icon = STATUS_ICONS[data.name] || FaInfoCircle;
    const percentage = data.percentage || ((data.value / data.total) * 100).toFixed(1);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        style={{
          background: "rgba(15, 23, 42, 0.95)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(99, 102, 241, 0.3)",
          borderRadius: "12px",
          padding: "12px 16px",
          boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2)",
          minWidth: "160px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Icon size={16} color={data.color} />
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{data.displayName || data.name}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>Count:</span>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{data.value.toLocaleString()}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px" }}>
          <span style={{ color: "#94a3b8", fontSize: "12px" }}>Percentage:</span>
          <span style={{ color: data.color, fontWeight: 600, fontSize: "14px" }}>{percentage}%</span>
        </div>
      </motion.div>
    );
  }
  return null;
};

// ==========================================================
// CUSTOM LEGEND COMPONENT
// ==========================================================
const CustomLegend = ({ data, onHover, onLeave }) => {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center", marginTop: "16px" }}>
      {data.map((entry, index) => {
        const Icon = STATUS_ICONS[entry.name] || FaInfoCircle;
        const percentage = entry.percentage || ((entry.value / entry.total) * 100).toFixed(1);
        
        return (
          <motion.div
            key={`legend-${index}`}
            onMouseEnter={() => onHover?.(index)}
            onMouseLeave={() => onLeave?.()}
            whileHover={{ scale: 1.05, y: -2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "20px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: "1px solid rgba(255,255,255,0.1)"
            }}
          >
            <Icon size={12} color={entry.color} />
            <span style={{ color: "#e2e8f0", fontSize: "12px", fontWeight: 500 }}>{entry.displayName || entry.name}</span>
            <span style={{ color: entry.color, fontSize: "12px", fontWeight: 600 }}>{entry.value}</span>
            <span style={{ color: "#64748b", fontSize: "10px" }}>({percentage}%)</span>
          </motion.div>
        );
      })}
    </div>
  );
};

// ==========================================================
// ACTIVE SHAPE COMPONENT (for hover effect)
// ==========================================================
const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const Icon = STATUS_ICONS[payload.name] || FaInfoCircle;
  
  return (
    <g>
      <text x={cx} y={cy} dy={-8} textAnchor="middle" fill="#fff" fontSize={14} fontWeight="bold">
        {payload.displayName || payload.name}
      </text>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} fontSize={20} fontWeight="bold">
        {value}
      </text>
      <text x={cx} y={cy} dy={24} textAnchor="middle" fill="#94a3b8" fontSize={12}>
        ({(percent * 100).toFixed(1)}%)
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.3}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ProviderStatusPie = ({ 
  data = [], 
  title = "Provider Distribution",
  height = 350,
  innerRadius = 60,
  outerRadius = 90,
  showLegend = true,
  showTooltip = true,
  showTotal = true,
  interactive = true,
  onSliceClick = null,
  loading = false,
  compact = false,
  theme = "dark",
  className = "",
  style = {}
}) => {
  const [activeIndex, setActiveIndex] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [chartType, setChartType] = useState("pie"); // 'pie' or 'donut'

  // Process data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    
    return data.map(item => ({
      ...item,
      displayName: STATUS_DISPLAY[item.name] || item.name,
      color: STATUS_COLORS[item.name] || item.color || "#6366f1",
      percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : 0,
      total: total
    }));
  }, [data]);

  const totalCount = useMemo(() => {
    return processedData.reduce((sum, item) => sum + (item.value || 0), 0);
  }, [processedData]);

  // Handle slice click
  const handleSliceClick = (data, index) => {
    if (onSliceClick) {
      onSliceClick(data.payload, index);
    }
  };

  // Handle mouse enter for slice
  const handleMouseEnter = (data, index) => {
    if (interactive) {
      setActiveIndex(index);
    }
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  // Export chart as image
  const exportAsImage = useCallback(() => {
    const svg = document.querySelector('.recharts-wrapper svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          saveAs(blob, `provider-distribution-${Date.now()}.png`);
        });
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  }, []);

  // Get theme styles
  const getThemeStyles = () => {
    if (theme === "light") {
      return {
        container: {
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        },
        title: { color: "#0f172a" },
        total: { color: "#1e293b" },
        totalValue: { color: "#6366f1" },
        emptyText: { color: "#94a3b8" }
      };
    }
    return {
      container: {
        background: "rgba(20, 27, 52, 0.6)",
        border: "1px solid rgba(255,255,255,0.05)",
        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.2)"
      },
      title: { color: "#ffffff" },
      total: { color: "#94a3b8" },
      totalValue: { color: "#10b981" },
      emptyText: { color: "#64748b" }
    };
  };

  const themeStyles = getThemeStyles();

  const containerStyle = {
    background: themeStyles.container.background,
    backdropFilter: "blur(10px)",
    borderRadius: "16px",
    border: themeStyles.container.border,
    boxShadow: themeStyles.container.boxShadow,
    padding: compact ? "16px" : "20px",
    transition: "all 0.3s ease",
    ...style
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px",
    flexWrap: "wrap",
    gap: "12px"
  };

  const titleStyle = {
    ...themeStyles.title,
    fontSize: compact ? "16px" : "18px",
    fontWeight: 600,
    margin: 0,
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  const totalStyle = {
    ...themeStyles.total,
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "8px"
  };

  const totalValueStyle = {
    ...themeStyles.totalValue,
    fontWeight: 700,
    fontSize: "18px"
  };

  const chartContainerStyle = {
    height: expanded ? height + 100 : height,
    width: "100%",
    transition: "height 0.3s ease"
  };

  const buttonStyle = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "8px",
    padding: "6px 10px",
    cursor: "pointer",
    color: "#94a3b8",
    fontSize: "12px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    transition: "all 0.2s ease"
  };

  // Loading state
  if (loading) {
    return (
      <div style={containerStyle} className={className}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <FaChartPie size={16} />
            {title}
          </div>
        </div>
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <FaSync className="spin" size={32} style={{ color: "#6366f1" }} />
            <p style={{ color: "#64748b", marginTop: "12px" }}>Loading data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (!processedData || processedData.length === 0) {
    return (
      <div style={containerStyle} className={className}>
        <div style={headerStyle}>
          <div style={titleStyle}>
            <FaChartPie size={16} />
            {title}
          </div>
        </div>
        <div style={{ height, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center" }}>
            <FaInfoCircle size={32} style={{ color: "#64748b" }} />
            <p style={{ color: themeStyles.emptyText, marginTop: "12px" }}>No provider data available</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={containerStyle}
      className={className}
    >
      <div style={headerStyle}>
        <div style={titleStyle}>
          <FaChartPie size={16} />
          {title}
          {showTotal && (
            <span style={totalStyle}>
              Total: <span style={totalValueStyle}>{totalCount.toLocaleString()}</span>
            </span>
          )}
        </div>
        
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setChartType(chartType === "pie" ? "donut" : "pie")}
            style={buttonStyle}
            title={chartType === "pie" ? "Switch to Donut Chart" : "Switch to Pie Chart"}
          >
            {chartType === "pie" ? "🍩" : "🥧"}
          </button>
          <button
            onClick={exportAsImage}
            style={buttonStyle}
            title="Export as Image"
          >
            <FaDownload size={12} />
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            style={buttonStyle}
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <FaCompress size={12} /> : <FaExpand size={12} />}
          </button>
        </div>
      </div>

      <div style={chartContainerStyle}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={processedData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === "donut" ? innerRadius : 0}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey="value"
              onClick={handleSliceClick}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              isAnimationActive={true}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color}
                  stroke="rgba(0,0,0,0.2)"
                  strokeWidth={1}
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && (
              <Legend 
                content={<CustomLegend data={processedData} onHover={setActiveIndex} onLeave={handleMouseLeave} />}
                verticalAlign="bottom"
                height={60}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </motion.div>
  );
};

// ==========================================================
// HELPER COMPONENTS
// ==========================================================

export const CompactProviderStatusPie = (props) => (
  <ProviderStatusPie {...props} compact={true} showLegend={false} height={280} innerRadius={50} outerRadius={70} />
);

export const SimpleProviderStatusPie = (props) => (
  <ProviderStatusPie {...props} interactive={false} showLegend={true} />
);

export const LightProviderStatusPie = (props) => (
  <ProviderStatusPie {...props} theme="light" />
);

// ==========================================================
// DEFAULT EXPORT
// ==========================================================
export default ProviderStatusPie;