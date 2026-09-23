// src/components/Provider/ProviderTrustProfile.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  LinearProgress,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
  Divider,
  Avatar,
  Rating,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineDot,
  TimelineConnector,
  TimelineContent,
  TimelineOppositeContent
} from '@mui/material';
import {
  ShieldAlert,
  Star,
  History,
  AlertTriangle,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Info,
  FileText,
  CalendarToday,
  Person,
  Business,
  Email,
  Phone,
  LocationOn,
  Warning,
  Verified,
  Cancel,
  Refresh,
  Download
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import api from '../../api/api';

// ==========================================================
// CONSTANTS
// ==========================================================
const STRIKE_LEVELS = {
  0: { label: 'Excellent Standing', color: 'success', icon: Verified, description: 'No active strikes. Provider is in good standing.' },
  1: { label: 'Warning', color: 'warning', icon: AlertTriangle, description: '1 active strike. Provider is being monitored.' },
  2: { label: 'At Risk', color: 'warning', icon: AlertTriangle, description: '2 active strikes. Provider is at risk of suspension.' },
  3: { label: 'Suspended', color: 'error', icon: Cancel, description: '3+ active strikes. Provider has been suspended.' }
};

const STATUS_CONFIG = {
  APPROVED: { label: 'Active', color: 'success', icon: Verified },
  PENDING: { label: 'Pending', color: 'warning', icon: History },
  SUSPENDED: { label: 'Suspended', color: 'error', icon: Cancel },
  REJECTED: { label: 'Rejected', color: 'error', icon: Cancel }
};

const TRUST_LEVELS = {
  HIGH: { label: 'High Trust', color: 'success', minRating: 4.5, maxStrikes: 0 },
  GOOD: { label: 'Good Standing', color: 'info', minRating: 4.0, maxStrikes: 0 },
  FAIR: { label: 'Fair Standing', color: 'warning', minRating: 3.5, maxStrikes: 1 },
  LOW: { label: 'Low Trust', color: 'error', minRating: 0, maxStrikes: 2 },
  CRITICAL: { label: 'Critical', color: 'error', minRating: 0, maxStrikes: 3 }
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return format(date, 'MMM dd, yyyy');
};

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
};

const getTrustLevel = (rating, strikeCount) => {
  if (rating >= TRUST_LEVELS.HIGH.minRating && strikeCount <= TRUST_LEVELS.HIGH.maxStrikes) return TRUST_LEVELS.HIGH;
  if (rating >= TRUST_LEVELS.GOOD.minRating && strikeCount <= TRUST_LEVELS.GOOD.maxStrikes) return TRUST_LEVELS.GOOD;
  if (rating >= TRUST_LEVELS.FAIR.minRating && strikeCount <= TRUST_LEVELS.FAIR.maxStrikes) return TRUST_LEVELS.FAIR;
  if (strikeCount >= TRUST_LEVELS.CRITICAL.maxStrikes) return TRUST_LEVELS.CRITICAL;
  return TRUST_LEVELS.LOW;
};

// ==========================================================
// STRIKE INDICATOR COMPONENT
// ==========================================================
const StrikeIndicator = ({ strikeCount, maxStrikes = 3 }) => {
  const level = STRIKE_LEVELS[Math.min(strikeCount, maxStrikes)] || STRIKE_LEVELS[0];
  const Icon = level.icon;
  
  return (
    <Tooltip title={level.description}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Icon sx={{ color: `${level.color}.main` }} />
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {[...Array(maxStrikes)].map((_, i) => (
            <Box
              key={i}
              sx={{
                width: 32,
                height: 8,
                borderRadius: 4,
                backgroundColor: i < strikeCount ? 'error.main' : 'grey.300',
                transition: 'background-color 0.3s'
              }}
            />
          ))}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {strikeCount}/{maxStrikes} strikes
        </Typography>
      </Box>
    </Tooltip>
  );
};

// ==========================================================
// METRIC CARD COMPONENT
// ==========================================================
const MetricCard = ({ title, value, subtitle, icon, color, trend }) => (
  <Paper sx={{ p: 2, height: '100%', bgcolor: `${color}.50` }}>
    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        {trend !== undefined && (
          <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
            {trend >= 0 ? (
              <ThumbsUp sx={{ fontSize: 12, color: 'success.main' }} />
            ) : (
              <ThumbsDown sx={{ fontSize: 12, color: 'error.main' }} />
            )}
            <Typography variant="caption" color={trend >= 0 ? 'success.main' : 'error.main'}>
              {Math.abs(trend)}% from last month
            </Typography>
          </Box>
        )}
      </Box>
      <Avatar sx={{ bgcolor: `${color}.100`, color: `${color}.main` }}>
        {icon}
      </Avatar>
    </Box>
  </Paper>
);

MetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  subtitle: PropTypes.string,
  icon: PropTypes.node.isRequired,
  color: PropTypes.string,
  trend: PropTypes.number
};

// ==========================================================
// AUDIT LOG ITEM COMPONENT
// ==========================================================
const AuditLogItem = ({ complaint }) => (
  <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 0 } }}>
    <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
      <Box>
        <Box display="flex" alignItems="center" gap={1} mb={0.5}>
          <Chip
            label={complaint.category}
            size="small"
            color="primary"
            variant="outlined"
          />
          {complaint.isStrike && (
            <Chip
              label="Strike Issued"
              size="small"
              color="error"
              icon={<Warning sx={{ fontSize: 12 }} />}
            />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary">
          {complaint.description}
        </Typography>
        {complaint.resolutionMessage && (
          <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
            Resolution: {complaint.resolutionMessage}
          </Typography>
        )}
      </Box>
      <Box textAlign="right">
        <Typography variant="caption" color="text.secondary">
          {formatRelativeTime(complaint.resolvedDate || complaint.createdAt)}
        </Typography>
      </Box>
    </Box>
  </Box>
);

AuditLogItem.propTypes = {
  complaint: PropTypes.shape({
    category: PropTypes.string,
    isStrike: PropTypes.bool,
    description: PropTypes.string,
    resolutionMessage: PropTypes.string,
    resolvedDate: PropTypes.string,
    createdAt: PropTypes.string
  }).isRequired
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ProviderTrustProfile = ({ providerId, onRefresh, showActions = true }) => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);

  // ==========================================================
  // FETCH TRUST DATA
  // ==========================================================
  const fetchTrustData = useCallback(async (showRefreshMessage = false) => {
    if (!providerId) {
      setError('Provider ID is required');
      setLoading(false);
      return;
    }

    setError(null);
    
    try {
      const response = await api.get(`/admin/providers/${providerId}/trust-profile`);
      const data = response.data?.data || response.data;
      setProfile(data);
      
      if (showRefreshMessage) {
        addNotification({
          type: 'success',
          title: 'Refreshed',
          message: 'Trust profile updated successfully'
        });
      }
    } catch (err) {
      console.error('Failed to load trust profile:', err);
      setError(err.response?.data?.message || 'Failed to load trust profile');
      addNotification({
        type: 'error',
        title: 'Loading Failed',
        message: err.response?.data?.message || 'Could not load provider trust profile'
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [providerId, addNotification]);

  useEffect(() => {
    fetchTrustData();
  }, [fetchTrustData]);

  // ==========================================================
  // DERIVED VALUES
  // ==========================================================
  const trustLevel = useMemo(() => {
    if (!profile) return TRUST_LEVELS.GOOD;
    return getTrustLevel(profile.rating || 0, profile.strikeCount || 0);
  }, [profile]);

  const strikeLevel = useMemo(() => {
    const count = profile?.strikeCount || 0;
    return STRIKE_LEVELS[Math.min(count, 3)] || STRIKE_LEVELS[0];
  }, [profile?.strikeCount]);

  const statusConfig = useMemo(() => {
    return STATUS_CONFIG[profile?.status] || STATUS_CONFIG.PENDING;
  }, [profile?.status]);

  const StatusIcon = statusConfig.icon;
  const TrustIcon = trustLevel.icon;

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrustData(true);
    if (onRefresh) onRefresh();
  };

  const handleExportReport = async () => {
    try {
      const response = await api.get(`/admin/providers/${providerId}/trust-report`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `trust_report_${providerId}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: 'success',
        title: 'Report Downloaded',
        message: 'Trust report has been downloaded successfully'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Download Failed',
        message: 'Failed to generate trust report'
      });
    }
  };

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (loading) {
    return (
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h6">Trust Profile</Typography>
          <LinearProgress sx={{ flex: 1, ml: 2 }} />
        </Box>
        <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography color="text.secondary">Loading trust metrics...</Typography>
        </Box>
      </Paper>
    );
  }

  // ==========================================================
  // ERROR STATE
  // ==========================================================
  if (error) {
    return (
      <Paper sx={{ p: 3 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={handleRefresh}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    );
  }

  // ==========================================================
  // NO DATA STATE
  // ==========================================================
  if (!profile) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <ShieldAlert sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom>No Trust Data Available</Typography>
        <Typography variant="body2" color="text.secondary">
          Unable to load trust profile for this provider.
        </Typography>
      </Paper>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================
  return (
    <Paper sx={{ overflow: 'hidden' }}>
      {/* Header Section */}
      <Box sx={{ 
        p: 3, 
        bgcolor: `${trustLevel.color}.50`,
        borderBottom: 1,
        borderColor: 'divider'
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <TrustIcon sx={{ color: `${trustLevel.color}.main`, fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Provider Trust Profile
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Trust Score: {trustLevel.label}
              </Typography>
            </Box>
          </Box>
          
          {showActions && (
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={handleRefresh} disabled={refreshing} size="small">
                  <Refresh />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download Report">
                <IconButton onClick={handleExportReport} size="small">
                  <Download />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </Box>

      {/* Trust Score Summary */}
      <Box sx={{ p: 3, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <StrikeIndicator strikeCount={profile.strikeCount || 0} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {strikeLevel.description}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" gap={2}>
              <Rating value={profile.rating || 0} precision={0.1} readOnly />
              <Typography variant="body2" fontWeight="bold">
                {profile.rating?.toFixed(1)} ({profile.totalReviews || 0} reviews)
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box display="flex" alignItems="center" gap={1}>
              <StatusIcon sx={{ color: `${statusConfig.color}.main` }} />
              <Typography variant="body2">
                Status: <strong>{statusConfig.label}</strong>
              </Typography>
              <Chip
                label={`Joined ${formatDate(profile.joinedAt)}`}
                size="small"
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Metrics Grid */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Completion Rate"
              value={`${profile.completionRate || 0}%`}
              icon={<CheckCircle />}
              color="success"
              trend={profile.completionRateTrend}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Response Time"
              value={profile.responseTime || 'N/A'}
              icon={<History />}
              color="info"
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Total Earnings"
              value={`₹${(profile.totalEarnings || 0).toLocaleString()}`}
              icon={<Business />}
              color="warning"
              trend={profile.earningsTrend}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <MetricCard
              title="Active Bookings"
              value={profile.activeBookings || 0}
              icon={<CalendarToday />}
              color="primary"
            />
          </Grid>
        </Grid>
      </Box>

      {/* Complaints & Audit Log */}
      <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            Recent Audit Log
          </Typography>
          {profile.recentComplaints?.length > 5 && (
            <Button size="small" onClick={() => setShowFullHistory(!showFullHistory)}>
              {showFullHistory ? 'Show Less' : 'View Full History'}
            </Button>
          )}
        </Box>
        
        <Collapse in={true}>
          {(showFullHistory ? profile.recentComplaints : profile.recentComplaints?.slice(0, 5))?.map((complaint, index) => (
            <AuditLogItem key={complaint.id || index} complaint={complaint} />
          ))}
        </Collapse>
        
        {(!profile.recentComplaints || profile.recentComplaints.length === 0) && (
          <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
            No recent complaints or audit records
          </Typography>
        )}
      </Box>

      {/* Trust Timeline */}
      {profile.trustHistory && profile.trustHistory.length > 0 && (
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Trust Score Timeline
          </Typography>
          <Timeline position="alternate">
            {profile.trustHistory.slice(0, 5).map((event, index) => (
              <TimelineItem key={index}>
                <TimelineOppositeContent color="text.secondary">
                  {formatDate(event.date)}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot color={event.type === 'positive' ? 'success' : event.type === 'warning' ? 'warning' : 'error'}>
                    {event.type === 'positive' ? <ThumbsUp fontSize="small" /> : <AlertTriangle fontSize="small" />}
                  </TimelineDot>
                  {index < profile.trustHistory.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent>
                  <Typography variant="body2" fontWeight="bold">
                    {event.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {event.description}
                  </Typography>
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Box>
      )}

      {/* Action Buttons for Admin */}
      {showActions && hasPermission?.('manage_providers') && (
        <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {profile.strikeCount < 3 && (
            <Button
              variant="outlined"
              color="warning"
              startIcon={<AlertTriangle />}
              onClick={() => {/* Handle strike issuance */}}
            >
              Issue Strike
            </Button>
          )}
          {profile.status === 'SUSPENDED' ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<Verified />}
              onClick={() => {/* Handle reactivation */}}
            >
              Reactivate Provider
            </Button>
          ) : (
            <Button
              variant="contained"
              color="error"
              startIcon={<Cancel />}
              onClick={() => {/* Handle suspension */}}
            >
              Suspend Provider
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
ProviderTrustProfile.propTypes = {
  providerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  onRefresh: PropTypes.func,
  showActions: PropTypes.bool
};

ProviderTrustProfile.defaultProps = {
  showActions: true,
  onRefresh: null
};

export default React.memo(ProviderTrustProfile);