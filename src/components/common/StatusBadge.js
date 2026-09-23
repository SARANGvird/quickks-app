import React from "react";
import PropTypes from "prop-types";

const statusStyles = {
  REQUESTED: { bg: "#fef3c7", color: "#92400e", label: "Requested" },
  PENDING: { bg: "#fef3c7", color: "#92400e", label: "Pending" },
  ASSIGNED: { bg: "#dbeafe", color: "#1e40af", label: "Assigned" },
  ACCEPTED: { bg: "#dbeafe", color: "#1e40af", label: "Accepted" },
  PROVIDER_STARTED: { bg: "#ede9fe", color: "#5b21b6", label: "Traveling" },
  STARTED: { bg: "#ede9fe", color: "#5b21b6", label: "In Progress" },
  COMPLETED_BY_PROVIDER: { bg: "#d1fae5", color: "#065f46", label: "Completed" },
  COMPLETED: { bg: "#d1fae5", color: "#065f46", label: "Verified" },
  CANCELLED: { bg: "#fee2e2", color: "#991b1b", label: "Cancelled" },
  REJECTED: { bg: "#fee2e2", color: "#991b1b", label: "Rejected" },
  EXPIRED: { bg: "#f1f5f9", color: "#334155", label: "Expired" },
};

const StatusBadge = ({ status, isOverdue, showIcon = false }) => {
  const style = statusStyles[status?.toUpperCase()] || {
    bg: "#f1f5f9",
    color: "#334155",
    label: status || "Unknown",
  };

  return (
    <span
      style={{
        backgroundColor: style.bg,
        color: style.color,
        padding: "4px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        border: isOverdue ? "1px solid #ef4444" : "none",
      }}
    >
      {showIcon && <span>{isOverdue ? "⚠️" : "●"}</span>}
      {style.label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.string,
  isOverdue: PropTypes.bool,
  showIcon: PropTypes.bool,
};

export default StatusBadge;