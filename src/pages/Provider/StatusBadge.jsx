import React from "react";

const StatusBadge = ({ status }) => {
  const cls = `status-badge badge-${status?.toLowerCase() || "default"}`;
  return <span className={cls}>{status}</span>;
};

export default StatusBadge;
