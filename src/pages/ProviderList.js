// src/pages/admin/ProviderList.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { 
  Box, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, Typography, Chip, 
  CircularProgress, Alert, IconButton, Tooltip, Avatar, Stack,
  TextField, InputAdornment, MenuItem, Select, FormControl,
  InputLabel, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Rating, Grid, Divider, Card, CardContent,
  LinearProgress, Badge, Fade, Zoom, Skeleton
} from "@mui/material";
import { 
  FaExternalLinkAlt, FaUserCheck, FaUserTimes, 
  FaSearch, FaFilter, FaSync, FaBan, FaCheckCircle,
  FaTimesCircle, FaStar, FaBriefcase, FaEnvelope,
  FaPhone, FaMapMarkerAlt, FaIdCard, FaRegClock,
  FaShieldAlt, FaExclamationTriangle, FaInfoCircle,
  FaCalendarAlt, FaDollarSign, FaCheck, FaTimes,
  FaEye, FaEdit, FaTrash, FaPlus, FaDownload,
  FaUpload, FaCog, FaBell, FaUserCog
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/api";
import Pagination from "../common/Pagination";
import { useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";

// ==========================================================
// STATISTICS CARD COMPONENT
// ==========================================================
const StatCard = ({ title, value, icon: Icon, color = "primary", trend }) => (
  <Card sx={{ bgcolor: `${color}.50`, border: `1px solid`, borderColor: `${color}.200`, height: "100%" }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="700" color={`${color}.700`}>
            {value}
          </Typography>
          {trend !== undefined && (
            <Typography variant="caption" color={trend >= 0 ? "success.main" : "error.main"}>
              {trend >= 0 ? '+' : ''}{trend}% from last month
            </Typography>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.100`, color: `${color}.700`, width: 48, height: 48 }}>
          <Icon size={24} />
        </Avatar>
      </Stack>
    </CardContent>
  </Card>
);

// ==========================================================
// PROVIDER CARD COMPONENT (for mobile view)
// ==========================================================
const ProviderCard = ({ provider, onApprove, onReject, onSuspend, onActivate, onViewDetails, onEdit }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.2 }}
  >
    <Card sx={{ mb: 2, borderRadius: 3, overflow: 'hidden' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={2} alignItems="center">
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={
                  <Box sx={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%',
                    bgcolor: provider.status === 'APPROVED' ? 'success.main' :
                            provider.status === 'PENDING' ? 'warning.main' :
                            provider.status === 'SUSPENDED' ? 'error.main' :
                            'text.disabled',
                    border: '2px solid white'
                  }} />
                }
              >
                <Avatar 
                  src={provider.profileImage}
                  sx={{ width: 48, height: 48, bgcolor: 'primary.main' }}
                >
                  {provider.fullName?.charAt(0) || provider.name?.charAt(0) || 'P'}
                </Avatar>
              </Badge>
              <Box>
                <Typography variant="subtitle1" fontWeight="700">
                  {provider.fullName || provider.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  ID: {provider.providerId || provider.id}
                </Typography>
              </Box>
            </Stack>
            <Chip
              label={provider.status || 'PENDING'}
              size="small"
              color={provider.status === 'APPROVED' ? 'success' :
                     provider.status === 'PENDING' ? 'warning' :
                     provider.status === 'SUSPENDED' ? 'error' : 'default'}
            />
          </Stack>

          <Divider />

          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Service</Typography>
              <Typography variant="body2">{provider.serviceTypeDisplay || provider.serviceType || 'N/A'}</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Experience</Typography>
              <Typography variant="body2">{provider.experienceYears || 0} years</Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Rating</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Rating value={provider.rating || 0} readOnly size="small" precision={0.5} />
                <Typography variant="caption">({provider.totalReviews || 0})</Typography>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" color="textSecondary">Jobs</Typography>
              <Typography variant="body2">{provider.completedJobsCount || 0}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">Email</Typography>
              <Typography variant="body2" noWrap>{provider.email}</Typography>
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            {provider.status === 'PENDING' && (
              <>
                <Tooltip title="Approve">
                  <IconButton size="small" color="success" onClick={() => onApprove(provider.providerId || provider.id)}>
                    <FaCheckCircle size={16} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Reject">
                  <IconButton size="small" color="error" onClick={() => onReject(provider.providerId || provider.id)}>
                    <FaTimesCircle size={16} />
                  </IconButton>
                </Tooltip>
              </>
            )}
            {provider.status === 'APPROVED' && (
              <Tooltip title="Suspend">
                <IconButton size="small" color="warning" onClick={() => onSuspend(provider.providerId || provider.id)}>
                  <FaBan size={16} />
                </IconButton>
              </Tooltip>
            )}
            {provider.status === 'SUSPENDED' && (
              <Tooltip title="Activate">
                <IconButton size="small" color="success" onClick={() => onActivate(provider.providerId || provider.id)}>
                  <FaCheckCircle size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title="View Details">
              <IconButton size="small" color="info" onClick={() => onViewDetails(provider)}>
                <FaEye size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" color="primary" onClick={() => onEdit(provider.providerId || provider.id)}>
                <FaEdit size={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  </motion.div>
);

// ==========================================================
// LOADING SKELETON
// ==========================================================
const LoadingSkeleton = () => (
  <Box sx={{ p: 3 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Box key={i} sx={{ mb: 2 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
      </Box>
    ))}
  </Box>
);

// ==========================================================
// EMPTY STATE
// ==========================================================
const EmptyState = ({ onRefresh }) => (
  <Fade in>
    <Box sx={{ py: 8, textAlign: 'center' }}>
      <Avatar sx={{ width: 80, height: 80, bgcolor: 'grey.100', mx: 'auto', mb: 2 }}>
        <FaUserTimes size={40} color="#9e9e9e" />
      </Avatar>
      <Typography variant="h6" color="textSecondary" gutterBottom>
        No Providers Found
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
        No providers match your current filters.
      </Typography>
      <Button
        variant="outlined"
        startIcon={<FaSync />}
        onClick={onRefresh}
      >
        Refresh
      </Button>
    </Box>
  </Fade>
);

// ==========================================================
// CONFIRMATION DIALOG
// ==========================================================
const ConfirmDialog = ({ open, onClose, onConfirm, title, message, confirmText = "Confirm", severity = "error", loading = false }) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {severity === 'error' ? <FaExclamationTriangle color="#ef4444" /> :
       severity === 'warning' ? <FaExclamationTriangle color="#f59e0b" /> :
       <FaInfoCircle color="#3b82f6" />}
      {title}
    </DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="textSecondary">
        {message}
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>Cancel</Button>
      <Button
        onClick={onConfirm}
        variant="contained"
        color={severity}
        disabled={loading}
        autoFocus
      >
        {loading ? <CircularProgress size={20} /> : confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

// ==========================================================
// PROVIDER DETAILS MODAL
// ==========================================================
const ProviderDetailsModal = ({ open, onClose, provider }) => {
  if (!provider) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd MMM yyyy, hh:mm a');
    } catch {
      return 'Invalid date';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar 
              src={provider.profileImage}
              sx={{ width: 56, height: 56, bgcolor: 'primary.main' }}
            >
              {provider.fullName?.charAt(0) || provider.name?.charAt(0) || 'P'}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="700">
                {provider.fullName || provider.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {provider.email} • {provider.phone || 'No phone'}
              </Typography>
            </Box>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <FaTimes />
          </IconButton>
        </Stack>
      </DialogTitle>
      
      <DialogContent dividers>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
              Basic Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Full Name</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.fullName || provider.name || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Email Address</Typography>
            <Typography variant="body2" fontWeight={500}>{provider.email}</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Phone Number</Typography>
            <Typography variant="body2" fontWeight={500}>{provider.phone || 'N/A'}</Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Location</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.area || provider.city || provider.address || 'N/A'}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
              Professional Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Service Type</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.serviceTypeDisplay || provider.serviceType || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Experience</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.experienceYears || 0} Years
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Rating & Reviews</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Rating value={provider.rating || 0} readOnly size="small" precision={0.5} />
              <Typography variant="body2" fontWeight={500}>
                ({provider.totalReviews || 0} reviews)
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Completed Jobs</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.completedJobsCount || 0}
            </Typography>
          </Grid>
          
          {provider.description && (
            <Grid item xs={12}>
              <Typography variant="caption" color="textSecondary">About / Bio</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50', mt: 0.5 }}>
                <Typography variant="body2">{provider.description}</Typography>
              </Paper>
            </Grid>
          )}

          <Grid item xs={12}>
            <Divider />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 600 }}>
              Account Information
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Status</Typography>
            <Box sx={{ mt: 0.5 }}>
              <Chip
                label={provider.status || 'PENDING'}
                color={provider.status === 'APPROVED' ? 'success' :
                       provider.status === 'PENDING' ? 'warning' :
                       provider.status === 'SUSPENDED' ? 'error' : 'default'}
                size="small"
              />
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Strikes</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.strikes || 0}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Verified</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.verified ? 'Yes' : 'No'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Available</Typography>
            <Typography variant="body2" fontWeight={500}>
              {provider.available ? 'Yes' : 'No'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Joined Date</Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDate(provider.createdAt)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="textSecondary">Last Updated</Typography>
            <Typography variant="body2" fontWeight={500}>
              {formatDate(provider.updatedAt)}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// REJECT REASON DIALOG
// ==========================================================
const RejectReasonDialog = ({ open, onClose, onConfirm, loading }) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <FaExclamationTriangle color="#ef4444" />
        Reject Provider Application
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          Please provide a reason for rejection. This will be sent to the provider.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Reason for rejection"
          fullWidth
          multiline
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter detailed reason for rejection..."
          variant="outlined"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="error"
          disabled={!reason.trim() || loading}
        >
          {loading ? <CircularProgress size={20} /> : "Reject Provider"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// MAIN PROVIDER LIST COMPONENT
// ==========================================================
const ProviderList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [providers, setProviders] = useState([]);
  const [filteredProviders, setFilteredProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Pagination
  const [pageData, setPageData] = useState({
    number: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    search: "",
    serviceType: "",
    minRating: 0
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

  // Dialog states
  const [rejectDialog, setRejectDialog] = useState({ open: false, providerId: null });
  const [suspendDialog, setSuspendDialog] = useState({ open: false, providerId: null, action: 'suspend' });
  const [detailsDialog, setDetailsDialog] = useState({ open: false, provider: null });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', onConfirm: null });

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    suspended: 0,
    rejected: 0,
    avgRating: 0
  });

  // ==========================================================
  // FETCH PROVIDERS - ✅ FIXED: Use correct endpoint
  // ==========================================================
  const fetchProviders = useCallback(async (page = pageData.number, size = pageData.size) => {
    if (!user || user.role !== 'ADMIN') {
      setError("Access denied. Admin privileges required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const params = { 
        page, 
        size,
        sort: `${sortConfig.key},${sortConfig.direction}`,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.minRating > 0 && { minRating: filters.minRating })
      };

      // ✅ FIXED: Use correct endpoint (no /api/v1 prefix since baseURL has it)
      const response = await api.get("/providers", { params });
      const payload = response.data?.data || response.data;

      const providersData = payload.content || [];
      setProviders(providersData);
      setFilteredProviders(providersData);
      
      setPageData({
        number: payload.number || 0,
        size: payload.size || 10,
        totalElements: payload.totalElements || 0,
        totalPages: payload.totalPages || 0
      });

      // Calculate stats
      setStats({
        total: payload.totalElements || 0,
        approved: providersData.filter(p => p.status === 'APPROVED').length,
        pending: providersData.filter(p => p.status === 'PENDING').length,
        suspended: providersData.filter(p => p.status === 'SUSPENDED').length,
        rejected: providersData.filter(p => p.status === 'REJECTED').length,
        avgRating: providersData.reduce((acc, p) => acc + (p.rating || 0), 0) / (providersData.length || 1)
      });

    } catch (err) {
      console.error("Error fetching providers:", err);
      setError(err.response?.data?.message || err.message || "Failed to fetch providers");
    } finally {
      setLoading(false);
    }
  }, [filters, sortConfig, pageData.number, pageData.size, user]);

  // Initial fetch
  useEffect(() => {
    fetchProviders(0, pageData.size);
  }, [fetchProviders, pageData.size]);

  // ==========================================================
  // FILTER & SORT PROVIDERS
  // ==========================================================
  useEffect(() => {
    let result = [...providers];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(p => 
        p.fullName?.toLowerCase().includes(searchLower) ||
        p.name?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower) ||
        p.phone?.includes(filters.search) ||
        p.providerId?.toString().includes(filters.search)
      );
    }

    if (filters.status) {
      result = result.filter(p => p.status === filters.status);
    }

    if (filters.minRating > 0) {
      result = result.filter(p => (p.rating || 0) >= filters.minRating);
    }

    setFilteredProviders(result);
  }, [providers, filters]);

  // ==========================================================
  // HANDLERS - ✅ FIXED: Use correct endpoints
  // ==========================================================
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    fetchProviders(0, pageData.size);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPageData(prev => ({ ...prev, number: 0 }));
  };

  const clearFilters = () => {
    setFilters({
      status: "",
      search: "",
      serviceType: "",
      minRating: 0
    });
    setPageData(prev => ({ ...prev, number: 0 }));
  };

  const handleApprove = async (providerId) => {
    setActionLoading(true);
    try {
      // ✅ FIXED: Use POST endpoint
      await api.post(`/providers/${providerId}/approve`);
      fetchProviders(pageData.number, pageData.size);
    } catch (err) {
      setConfirmDialog({
        open: true,
        title: 'Error',
        message: err.response?.data?.message || "Failed to approve provider",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason) => {
    const { providerId } = rejectDialog;
    setActionLoading(true);
    try {
      // ✅ FIXED: Use POST endpoint with reason
      await api.post(`/providers/${providerId}/reject`, { reason });
      setRejectDialog({ open: false, providerId: null });
      fetchProviders(pageData.number, pageData.size);
    } catch (err) {
      setConfirmDialog({
        open: true,
        title: 'Error',
        message: err.response?.data?.message || "Failed to reject provider",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async (providerId) => {
    setActionLoading(true);
    try {
      // ✅ FIXED: Use POST endpoint with reason
      await api.post(`/providers/${providerId}/suspend`, { reason: "Suspended by admin" });
      fetchProviders(pageData.number, pageData.size);
    } catch (err) {
      setConfirmDialog({
        open: true,
        title: 'Error',
        message: err.response?.data?.message || "Failed to suspend provider",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivate = async (providerId) => {
    setActionLoading(true);
    try {
      // ✅ FIXED: Use POST endpoint
      await api.post(`/providers/${providerId}/activate`);
      fetchProviders(pageData.number, pageData.size);
    } catch (err) {
      setConfirmDialog({
        open: true,
        title: 'Error',
        message: err.response?.data?.message || "Failed to activate provider",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/providers/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `providers_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setConfirmDialog({
        open: true,
        title: 'Error',
        message: "Failed to export providers",
        onConfirm: () => setConfirmDialog(prev => ({ ...prev, open: false }))
      });
    }
  };

  const getStatusChip = (status) => {
    const config = {
      APPROVED: { color: "success", icon: FaCheckCircle, label: "Approved" },
      PENDING: { color: "warning", icon: FaRegClock, label: "Pending" },
      SUSPENDED: { color: "error", icon: FaBan, label: "Suspended" },
      REJECTED: { color: "error", icon: FaTimesCircle, label: "Rejected" },
    };
    const s = status?.toUpperCase() || "PENDING";
    const current = config[s] || config.PENDING;
    const Icon = current.icon;
    
    return (
      <Chip 
        icon={<Icon size={12} />}
        label={current.label} 
        color={current.color} 
        size="small" 
        sx={{ fontWeight: 600 }}
      />
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box sx={{ width: "100%", minHeight: "100vh", bgcolor: "#f8fafc", p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: "#0f172a", mb: 0.5 }}>
            Provider Management
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage provider applications, verify credentials, and monitor performance
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<FaDownload />}
            onClick={handleExport}
            sx={{ borderRadius: 2 }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<FaPlus />}
            onClick={() => navigate('/dashboard/admin/providers/add')}
            sx={{ borderRadius: 2 }}
          >
            Add Provider
          </Button>
        </Stack>
      </Stack>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Total Providers" value={stats.total} icon={FaUserCog} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Approved" value={stats.approved} icon={FaCheckCircle} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Pending" value={stats.pending} icon={FaRegClock} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Suspended" value={stats.suspended} icon={FaBan} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard title="Avg Rating" value={stats.avgRating.toFixed(1)} icon={FaStar} color="info" />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Stack direction={{ xs: "column", lg: "row" }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search by name, email, or ID..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            sx={{ flex: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaSearch size={14} color="#64748b" />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150, flex: 1 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status}
              label="Status"
              onChange={(e) => handleFilterChange("status", e.target.value)}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="SUSPENDED">Suspended</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="number"
            placeholder="Min Rating"
            value={filters.minRating || ''}
            onChange={(e) => handleFilterChange("minRating", Number(e.target.value))}
            sx={{ width: 120 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <FaStar size={14} color="#64748b" />
                </InputAdornment>
              ),
              inputProps: { min: 0, max: 5, step: 0.5 }
            }}
          />

          <Tooltip title="Clear filters">
            <IconButton onClick={clearFilters} size="small" sx={{ flexShrink: 0 }}>
              <FaFilter size={16} />
            </IconButton>
          </Tooltip>

          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchProviders(pageData.number, pageData.size)} size="small" sx={{ flexShrink: 0 }}>
              <FaSync size={16} />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* Error Alert */}
      <AnimatePresence>
        {error && (
          <Fade in>
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              action={
                <Button color="inherit" size="small" onClick={() => fetchProviders()}>
                  Retry
                </Button>
              }
            >
              {error}
            </Alert>
          </Fade>
        )}
      </AnimatePresence>

      {/* Mobile View (Cards) */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <AnimatePresence>
          {loading ? (
            <LoadingSkeleton />
          ) : filteredProviders.length === 0 ? (
            <EmptyState onRefresh={() => fetchProviders()} />
          ) : (
            filteredProviders.map((provider) => (
              <ProviderCard 
                key={provider.providerId || provider.id} 
                provider={provider}
                onApprove={handleApprove}
                onReject={(id) => setRejectDialog({ open: true, providerId: id })}
                onSuspend={handleSuspend}
                onActivate={handleActivate}
                onViewDetails={(p) => setDetailsDialog({ open: true, provider: p })}
                onEdit={(id) => navigate(`/dashboard/admin/providers/edit/${id}`)}
              />
            ))
          )}
        </AnimatePresence>
      </Box>

      {/* Desktop View (Table) */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => handleSort('fullName')}>
                  Provider {sortConfig.key === 'fullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
                <TableCell sx={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => handleSort('serviceType')}>
                  Service Type {sortConfig.key === 'serviceType' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => handleSort('experienceYears')}>
                  Experience {sortConfig.key === 'experienceYears' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => handleSort('rating')}>
                  Rating {sortConfig.key === 'rating' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700, cursor: 'pointer' }} onClick={() => handleSort('status')}>
                  Status {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} sx={{ p: 0 }}>
                    <LinearProgress />
                  </TableCell>
                </TableRow>
              ) : filteredProviders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 8 }}>
                    <EmptyState onRefresh={() => fetchProviders()} />
                  </TableCell>
                </TableRow>
              ) : (
                filteredProviders.map((row) => (
                  <TableRow 
                    key={row.providerId || row.id} 
                    hover
                    sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                  >
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Badge
                          overlap="circular"
                          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                          badgeContent={
                            <Box sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%',
                              bgcolor: row.available ? 'success.main' : 'text.disabled',
                              border: '2px solid white'
                            }} />
                          }
                        >
                          <Avatar 
                            src={row.profileImage}
                            sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}
                          >
                            {row.fullName?.charAt(0) || row.name?.charAt(0) || 'P'}
                          </Avatar>
                        </Badge>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {row.fullName || row.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            ID: {row.providerId || row.id}
                          </Typography>
                        </Box>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                          <FaEnvelope size={10} color="#64748b" />
                          {row.email}
                        </Typography>
                        {row.phone && (
                          <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                            <FaPhone size={10} color="#64748b" />
                            {row.phone}
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.serviceTypeDisplay || row.serviceType}</Typography>
                      {row.verified && (
                        <Chip
                          icon={<FaShieldAlt size={10} />}
                          label="Verified"
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.65rem' }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{row.experienceYears || 0} Years</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Rating 
                          value={row.rating || 0} 
                          readOnly 
                          size="small" 
                          precision={0.5}
                        />
                        <Typography variant="caption">({row.totalReviews || 0})</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{getStatusChip(row.status)}</TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        {row.status === 'PENDING' && (
                          <>
                            <Tooltip title="Approve">
                              <IconButton size="small" color="success" onClick={() => handleApprove(row.providerId || row.id)}>
                                <FaCheckCircle size={16} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Reject">
                              <IconButton size="small" color="error" onClick={() => setRejectDialog({ open: true, providerId: row.providerId || row.id })}>
                                <FaTimesCircle size={16} />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                        {row.status === 'APPROVED' && (
                          <Tooltip title="Suspend">
                            <IconButton size="small" color="warning" onClick={() => handleSuspend(row.providerId || row.id)}>
                              <FaBan size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        {row.status === 'SUSPENDED' && (
                          <Tooltip title="Activate">
                            <IconButton size="small" color="success" onClick={() => handleActivate(row.providerId || row.id)}>
                              <FaCheckCircle size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                        <Tooltip title="View Details">
                          <IconButton size="small" color="info" onClick={() => setDetailsDialog({ open: true, provider: row })}>
                            <FaEye size={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" color="primary" onClick={() => navigate(`/dashboard/admin/providers/edit/${row.providerId || row.id}`)}>
                            <FaEdit size={16} />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination 
            page={pageData.number}
            size={pageData.size}
            totalPages={pageData.totalPages}
            totalElements={pageData.totalElements}
            onPageChange={(newPage) => {
              setPageData(prev => ({ ...prev, number: newPage }));
              fetchProviders(newPage, pageData.size);
            }}
            onSizeChange={(newSize) => {
              setPageData(prev => ({ ...prev, size: newSize, number: 0 }));
              fetchProviders(0, newSize);
            }}
          />
        </Box>
      </Box>

      {/* Dialogs */}
      <RejectReasonDialog
        open={rejectDialog.open}
        onClose={() => setRejectDialog({ open: false, providerId: null })}
        onConfirm={handleReject}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={suspendDialog.open}
        onClose={() => setSuspendDialog({ open: false, providerId: null, action: 'suspend' })}
        onConfirm={() => {
          if (suspendDialog.action === 'suspend') {
            handleSuspend(suspendDialog.providerId);
          } else {
            handleActivate(suspendDialog.providerId);
          }
          setSuspendDialog({ open: false, providerId: null, action: 'suspend' });
        }}
        title={suspendDialog.action === 'suspend' ? 'Suspend Provider' : 'Activate Provider'}
        message={suspendDialog.action === 'suspend' 
          ? 'Are you sure you want to suspend this provider? They will not be able to accept new bookings.'
          : 'Are you sure you want to activate this provider? They will be able to accept bookings again.'}
        severity={suspendDialog.action === 'suspend' ? 'warning' : 'success'}
        confirmText={suspendDialog.action === 'suspend' ? 'Suspend' : 'Activate'}
        loading={actionLoading}
      />

      <ProviderDetailsModal
        open={detailsDialog.open}
        onClose={() => {
          setDetailsDialog({ open: false, provider: null });
        }}
        provider={detailsDialog.provider}
      />

      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog(prev => ({ ...prev, open: false }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        severity="error"
      />
    </Box>
  );
};

export default ProviderList;