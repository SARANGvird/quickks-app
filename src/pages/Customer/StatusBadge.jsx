import React from "react";

const STATUS_MAP = {
  PENDING: { label: "Pending", className: "status-pending" },
  IN_PROGRESS: { label: "In Progress", className: "status-progress" },
  COMPLETED: { label: "Completed", className: "status-completed" },
  CANCELLED: { label: "Cancelled", className: "status-cancelled" },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_MAP[status] || {
    label: status || "Unknown",
    className: "status-default",
  };

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
