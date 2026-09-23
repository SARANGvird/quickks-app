import React from "react";
import {
  FaUsers,
  FaUserCheck,
  FaClipboardList,
  FaDollarSign,
} from "react-icons/fa";

import StatCard from "./StatCard";

const StatsGrid = ({ stats }) => {
  /**
   * Expected stats shape from backend / socket:
   *
   * {
   *   totalUsers,
   *   totalProviders,
   *   totalBookings,
   *   totalRevenue,
   *
   *   usersDelta7d,
   *   usersDelta30d,
   *   providersDelta7d,
   *   providersDelta30d,
   *   bookingsDelta7d,
   *   bookingsDelta30d,
   *   revenueDelta7d,
   *   revenueDelta30d
   * }
   */

  const cards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: FaUsers,
      delta7d: stats.usersDelta7d ?? 0,
      delta30d: stats.usersDelta30d ?? 0,
    },
    {
      title: "Providers",
      value: stats.totalProviders,
      icon: FaUserCheck,
      delta7d: stats.providersDelta7d ?? 0,
      delta30d: stats.providersDelta30d ?? 0,
    },
    {
      title: "Bookings",
      value: stats.totalBookings,
      icon: FaClipboardList,
      delta7d: stats.bookingsDelta7d ?? 0,
      delta30d: stats.bookingsDelta30d ?? 0,
    },
    {
      title: "Revenue",
      value: stats.totalRevenue,
      icon: FaDollarSign,
      delta7d: stats.revenueDelta7d ?? 0,
      delta30d: stats.revenueDelta30d ?? 0,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: 18,
        marginBottom: 32,
      }}
    >
      {cards.map((card, index) => (
        <StatCard key={index} {...card} />
      ))}
    </div>
  );
};

export default StatsGrid;
