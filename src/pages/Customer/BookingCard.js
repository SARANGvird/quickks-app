import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";

import {
  Card, CardContent, Typography, Chip, Stack, Box, Button, Avatar, LinearProgress, Grid, Tooltip, IconButton, Paper, Collapse, Divider, Rating, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert, Snackbar, Menu, MenuItem, ListItemIcon, ListItemText, Skeleton
} from "@mui/material";

import {
  FaMapMarkerAlt, FaUser, FaCheckCircle, FaClock, FaPhone, FaEnvelope, FaRupeeSign, FaComments, FaExternalLinkAlt, FaCheck, FaEye, FaExclamationTriangle, FaIdCard, FaTools, FaStar, FaHourglassHalf, FaSpinner, FaTimesCircle, FaBan, FaCalendarAlt, FaWhatsapp, FaInfoCircle, FaMotorcycle, FaWrench, FaBox, FaCreditCard, FaMobile, FaGooglePay, FaApplePay, FaQrcode, FaCopy, FaShare, FaEllipsisV
} from "react-icons/fa";
import { SiPhonepe, SiPaytm, SiGooglepay, SiRazorpay } from "react-icons/si";

const theme = {
  primary: "#6366f1", primaryLight: "#818cf8", primaryDark: "#4f46e5", success: "#10b981", successLight: "#34d399", successDark: "#059669", warning: "#f59e0b", warningLight: "#fbbf24", warningDark: "#d97706", danger: "#ef4444", dangerLight: "#f87171", dangerDark: "#dc2626", info: "#3b82f6", infoLight: "#60a5fa", infoDark: "#2563eb", purple: "#8b5cf6", purpleLight: "#a78bfa", purpleDark: "#7c3aed", dark: "#1e293b", lightGray: "#e2e8f0", background: "#f8fafc", white: "#ffffff", textPrimary: "#0f172a", textSecondary: "#475569", textMuted: "#64748b", border: "#e2e8f0"
};

const STATUS_CONFIG = {
  "REQUESTED": { color: theme.warning, label: "New Request", icon: FaSpinner, progress: 10, description: "Waiting for provider response", actions: ['cancel'] },
  "PENDING": { color: theme.warning, label: "Pending", icon: FaHourglassHalf, progress: 20, description: "Processing your request", actions: ['cancel'] },
  "PAYMENT_PENDING": { color: theme.warning, label: "Payment Required", icon: FaClock, progress: 15, description: "Complete payment to confirm booking", actions: ['pay', 'cancel'] },
  "PAYMENT_PROCESSING": { color: theme.info, label: "Processing Payment", icon: FaSpinner, progress: 25, description: "Your payment is being processed", actions: [] },
  "PAYMENT_COMPLETED": { color: theme.success, label: "Payment Completed", icon: FaCheckCircle, progress: 30, description: "Finding a provider for you", actions: [] },
  "PAYMENT_FAILED": { color: theme.danger, label: "Payment Failed", icon: FaExclamationTriangle, progress: 15, description: "Payment failed. Please try again.", actions: ['pay', 'cancel'] },
  "ASSIGNED": { color: theme.primary, label: "Provider Assigned", icon: FaUser, progress: 40, description: "Provider has been assigned", actions: ['chat'] },
  "ACCEPTED": { color: theme.success, label: "Accepted", icon: FaCheckCircle, progress: 50, description: "Provider accepted the booking", actions: ['chat'] },
  "PROVIDER_STARTED": { color: theme.purple, label: "Provider En Route", icon: FaMotorcycle, progress: 60, description: "Provider is on the way", actions: ['chat', 'track'] },
  "STARTED": { color: theme.info, label: "In Progress", icon: FaWrench, progress: 75, description: "Service in progress", actions: ['chat', 'track'] },
  "COMPLETED_BY_PROVIDER": { color: theme.success, label: "Completed", icon: FaCheckCircle, progress: 90, description: "Provider marked as complete", actions: ['confirm', 'chat'] },
  "COMPLETED": { color: theme.success, label: "Verified", icon: FaCheckCircle, progress: 100, description: "Service completed successfully", actions: ['review'] },
  "CANCELLED": { color: theme.danger, label: "Cancelled", icon: FaTimesCircle, progress: 0, description: "Booking was cancelled", actions: ['rebook'] },
  "REJECTED": { color: theme.danger, label: "Rejected", icon: FaBan, progress: 0, description: "Provider rejected the request", actions: ['rebook'] },
  "EXPIRED": { color: theme.dark, label: "Expired", icon: FaClock, progress: 0, description: "Booking request expired", actions: ['rebook'] },
  "PROVIDER_PENDING": { color: theme.warning, label: "New Request", icon: FaSpinner, description: "New booking request", actions: ['accept', 'reject'] },
  "PROVIDER_ACCEPTED": { color: theme.success, label: "Accepted", icon: FaCheckCircle, description: "You accepted this booking", actions: ['start'] },
  "PROVIDER_REJECTED": { color: theme.danger, label: "Rejected", icon: FaBan, description: "You rejected this booking", actions: [] },
  "PROVIDER_STARTED_ACTIVE": { color: theme.purple, label: "Started", icon: FaWrench, description: "Service in progress", actions: ['complete'] },
  "PROVIDER_COMPLETED": { color: theme.success, label: "Completed", icon: FaCheckCircle, description: "Service completed", actions: [] }
};

const getStatusMeta = (status, role = 'customer') => {
  const s = status?.toUpperCase();
  if (role === 'provider') {
    const providerStatusMap = {
      'REQUESTED': 'PROVIDER_PENDING', 'PENDING': 'PROVIDER_PENDING', 'PAYMENT_PENDING': 'PROVIDER_PENDING', 'PAYMENT_COMPLETED': 'PROVIDER_PENDING', 'ASSIGNED': 'PROVIDER_PENDING', 'ACCEPTED': 'PROVIDER_ACCEPTED', 'REJECTED': 'PROVIDER_REJECTED', 'STARTED': 'PROVIDER_STARTED_ACTIVE', 'PROVIDER_STARTED': 'PROVIDER_STARTED_ACTIVE', 'COMPLETED_BY_PROVIDER': 'PROVIDER_COMPLETED', 'COMPLETED': 'PROVIDER_COMPLETED'
    };
    const mappedStatus = providerStatusMap[s] || s;
    return STATUS_CONFIG[mappedStatus] || STATUS_CONFIG['PROVIDER_PENDING'];
  }
  return STATUS_CONFIG[s] || STATUS_CONFIG['REQUESTED'];
};

const formatDateTime = (dateString) => {
  if (!dateString) return "Not scheduled";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  } catch (e) { return dateString; }
};
const formatCurrency = (amount) => {
  if (!amount && amount!== 0) return "â‚¹0";
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0, }).format(amount);
};
const getTimeRemaining = (scheduledAt) => {
  if (!scheduledAt) return null;
  const now = new Date(); const scheduled = new Date(scheduledAt); const diff = scheduled - now;
  if (diff < 0) return "Past due"; if (diff < 3600000) return `${Math.round(diff / 60000)} minutes`; if (diff < 86400000) return `${Math.round(diff / 3600000)} hours`; return `${Math.round(diff / 86400000)} days`;
};
const getPaymentMethodIcon = (method) => {
  switch(method?.toLowerCase()) { case 'upi': return FaMobile; case 'card': return FaCreditCard; case 'googlepay': return FaGooglePay; case 'phonepe': return SiPhonepe; case 'paytm': return SiPaytm; case 'razorpay': return SiRazorpay; default: return FaCreditCard; }
};



