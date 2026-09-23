// src/components/Provider/ProviderCard.jsx
import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Stack,
  Avatar,
  LinearProgress,
  Tooltip,
  IconButton,
  Button,
  Grid,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Skeleton,
  Badge,
  Rating
} from '@mui/material';
import {
  Star,
  LocationOn,
  Verified as VerifiedIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  Edit,
  Delete,
  Visibility,
  Email,
  Phone,
  Work,
  CalendarToday,
  MoreVert,
  CheckCircle,
  Cancel,
  Pending,
  ReportProblem,
  Speed,
  ThumbUp,
  Assignment,
  Payment,
  Schedule
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';

// ==========================================================
// CONSTANTS
// ==========================================================
const PROVIDER_STATUS = {
  PENDING: { label: 'Pending', color: 'warning', icon: Pending },
  APPROVED: { label: 'Approved', color: 'success', icon: CheckCircle },
  SUSPENDED: { label: 'Suspended', color: 'error', icon: Cancel },
  REJECTED: { label: 'Rejected', color: 'error', icon: Cancel },
  ACTIVE: { label: 'Active', color: 'success', icon: CheckCircle },
  INACTIVE: { label: 'Inactive', color: 'default', icon: BlockIcon }
};

const VERIFICATION_STATUS = {
  VERIFIED: { label: 'Verified', color: 'success', icon: VerifiedIcon },
  PENDING: { label: 'Pending Verification', color: 'warning', icon: Pending },
  REJECTED: { label: 'Verification Failed', color: 'error', icon: Cancel }
};

const STRIKE_THRESHOLDS = {
  WARNING: 1,
  DANGER: 2,
  SUSPEND: 3
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const getInitials = (name) => {
  if (!name) return 'PR';
  return name
    .split(' ')
    .map(word => word?.[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'N/A';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getAcceptanceRateColor = (rate) => {
  if (rate >= 80) return '#2e7d32';
  if (rate >= 50) return '#ed6c02';
  return '#d32f2f';
};

// ==========================================================
// PROVIDER CARD COMPONENT
// ==========================================================
const ProviderCard = ({ 
  provider, 
  onClick, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  onViewDetails,
  onSuspend,
  onActivate,
  onGiveStrike,
  showActions = false,
  variant = 'default',
  loading = false,
  compact = false
}) => {
  const navigate = useNavigate();
  let addNotification = () => {};
  
  // Safely get notifications context
  try {
    const { addNotification: notify } = useNotifications();
    addNotification = notify;
  } catch (error) {
    console.warn('NotificationContext not available');
  }
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [imageError, setImageError] = useState(false);

  // ✅ FIXED: Memoized provider data with correct field mapping
  const providerData = useMemo(() => {
    if (!provider) return null;

    // CRITICAL: Map both backend field names
    return {
      id: provider.providerId || provider.id,
      name: provider.fullName || provider.name || provider.full_name || 'Unnamed Provider',
      email: provider.email,
      phone: provider.phone || provider.phoneNumber,
      profileImage: provider.profileImage,
      rating: provider.rating ?? 0,
      totalReviews: provider.totalReviews || provider.reviewCount || 0,
      activeStrikes: provider.activeStrikes || provider.strikes || 0,
      isSuspended: provider.suspended || provider.isSuspended || false,
      jobsCompleted: provider.jobsCompleted || provider.completedJobsCount || provider.completedJobs || 0,
      acceptanceRate: provider.acceptanceRate ?? 0,
      specialties: provider.specialties || provider.skills || [],
      location: provider.location || provider.area,
      verified: provider.verified || provider.status === 'APPROVED',
      responseTime: provider.responseTime,
      joinedDate: provider.joinedDate || provider.createdAt || provider.joinedAt,
      status: provider.status,
      experienceYears: provider.experienceYears,
      basePrice: provider.basePrice,
      serviceType: provider.serviceType,
      verificationStatus: provider.verificationStatus,
      totalEarnings: provider.totalEarnings,
      completionRate: provider.completionRate,
      lastActive: provider.lastActive
    };
  }, [provider]);

  // Status configuration
  const statusConfig = useMemo(() => {
    if (!providerData) return PROVIDER_STATUS.PENDING;
    
    if (providerData.isSuspended || providerData.status === 'SUSPENDED') {
      return PROVIDER_STATUS.SUSPENDED;
    }
    if (providerData.status === 'PENDING') {
      return PROVIDER_STATUS.PENDING;
    }
    if (providerData.status === 'REJECTED') {
      return PROVIDER_STATUS.REJECTED;
    }
    if (providerData.activeStrikes >= STRIKE_THRESHOLDS.DANGER) {
      return { ...PROVIDER_STATUS.APPROVED, label: 'At Risk', color: 'warning' };
    }
    return PROVIDER_STATUS.APPROVED;
  }, [providerData]);

  const verificationConfig = useMemo(() => {
    if (!providerData) return VERIFICATION_STATUS.PENDING;
    return VERIFICATION_STATUS[providerData.verificationStatus] || VERIFICATION_STATUS.PENDING;
  }, [providerData]);

  // Strike level indicator
  const strikeLevel = useMemo(() => {
    const strikes = providerData?.activeStrikes || 0;
    if (strikes === 0) return 'none';
    if (strikes < STRIKE_THRESHOLDS.DANGER) return 'warning';
    return 'danger';
  }, [providerData]);

  // Handlers
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(providerData);
    } else if (onViewDetails) {
      onViewDetails(providerData);
    } else {
      navigate(`/admin/providers/${providerData.id}`);
    }
  }, [providerData, onClick, onViewDetails, navigate]);

  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAction = (action) => {
    setPendingAction(action);
    setConfirmDialogOpen(true);
    handleMenuClose();
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    
    try {
      switch (pendingAction) {
        case 'edit':
          if (onEdit) onEdit(providerData);
          break;
        case 'delete':
          if (onDelete) await onDelete(providerData);
          break;
        case 'suspend':
          if (onSuspend) await onSuspend(providerData);
          else if (onToggleStatus) onToggleStatus(providerData);
          break;
        case 'activate':
          if (onActivate) await onActivate(providerData);
          else if (onToggleStatus) onToggleStatus(providerData);
          break;
        case 'strike':
          if (onGiveStrike) await onGiveStrike(providerData);
          break;
        default:
          break;
      }
      addNotification({
        type: 'success',
        title: 'Action Completed',
        message: `${pendingAction} action completed successfully`
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: error.message || `Failed to ${pendingAction} provider`
      });
      console.error(`Failed to ${pendingAction}:`, error);
    } finally {
      setConfirmDialogOpen(false);
      setPendingAction(null);
    }
  };

  const renderStrikes = () => {
    const strikes = providerData?.activeStrikes || 0;
    return (
      <Tooltip title={`${strikes} Active Strike${strikes !== 1 ? 's' : ''}`}>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <Typography variant="caption" color="text.secondary">Strikes:</Typography>
          {[1, 2, 3].map((i) => (
            <Box
              key={i}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: i <= strikes ? '#ef4444' : '#e2e8f0',
                transition: 'background-color 0.2s'
              }}
            />
          ))}
        </Stack>
      </Tooltip>
    );
  };

  const renderSpecialties = () => {
    const specialties = providerData?.specialties || [];
    if (specialties.length === 0) return null;
    
    return (
      <Box mb={2}>
        <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
          Skills & Specialties:
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {specialties.slice(0, compact ? 2 : 3).map((specialty, index) => (
            <Chip
              key={index}
              label={specialty}
              size="small"
              variant="outlined"
              sx={{ mb: 0.5 }}
            />
          ))}
          {specialties.length > (compact ? 2 : 3) && (
            <Chip
              label={`+${specialties.length - (compact ? 2 : 3)}`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
      </Box>
    );
  };

  const renderKPIs = () => {
    const data = providerData;
    if (!data) return null;

    return (
      <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary" display="block">
              Jobs Completed
            </Typography>
            <Typography variant="h6" component="p" fontWeight="bold">
              {data.jobsCompleted?.toLocaleString() || 0}
            </Typography>
          </Grid>

          {data.basePrice > 0 && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Base Price
              </Typography>
              <Typography variant="h6" component="p" fontWeight="bold" color="success.main">
                {formatCurrency(data.basePrice)}
              </Typography>
            </Grid>
          )}

          {data.totalEarnings > 0 && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Total Earnings
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatCurrency(data.totalEarnings)}
              </Typography>
            </Grid>
          )}

          {data.completionRate > 0 && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Completion Rate
              </Typography>
              <Typography variant="body2" fontWeight="medium" color={data.completionRate >= 90 ? 'success.main' : 'warning.main'}>
                {data.completionRate}%
              </Typography>
            </Grid>
          )}

          {data.joinedDate && !compact && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Member Since
              </Typography>
              <Typography variant="body2">
                {format(new Date(data.joinedDate), 'MMM yyyy')}
              </Typography>
            </Grid>
          )}

          {data.lastActive && !compact && (
            <Grid item xs={6}>
              <Typography variant="caption" color="text.secondary" display="block">
                Last Active
              </Typography>
              <Typography variant="body2">
                {formatDistanceToNow(new Date(data.lastActive), { addSuffix: true })}
              </Typography>
            </Grid>
          )}

          {data.acceptanceRate > 0 && (
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Acceptance Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={data.acceptanceRate}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e2e8f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getAcceptanceRateColor(data.acceptanceRate),
                        borderRadius: 4
                      }
                    }}
                  />
                </Box>
                <Typography variant="body2" fontWeight="bold">
                  {data.acceptanceRate}%
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  const renderContactInfo = () => {
    const data = providerData;
    if (!data.email && !data.phone) return null;
    if (compact) return null;

    return (
      <Box mb={2}>
        {data.email && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <Email fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {data.email}
            </Typography>
          </Stack>
        )}
        {data.phone && (
          <Stack direction="row" spacing={1} alignItems="center">
            <Phone fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary" noWrap>
              {data.phone}
            </Typography>
          </Stack>
        )}
      </Box>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;
    if (compact) return null;

    return (
      <>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="View Details">
            <IconButton size="small" onClick={handleClick} color="primary">
              <Visibility fontSize="small" />
            </IconButton>
          </Tooltip>
          
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVert fontSize="small" />
          </IconButton>
        </Stack>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem onClick={() => handleAction('edit')}>
            <Edit fontSize="small" sx={{ mr: 1 }} /> Edit Provider
          </MenuItem>
          
          {providerData?.isSuspended ? (
            <MenuItem onClick={() => handleAction('activate')}>
              <VerifiedIcon fontSize="small" sx={{ mr: 1, color: 'success.main' }} /> Activate
            </MenuItem>
          ) : (
            <MenuItem onClick={() => handleAction('suspend')}>
              <BlockIcon fontSize="small" sx={{ mr: 1, color: 'warning.main' }} /> Suspend
            </MenuItem>
          )}
          
          {providerData?.activeStrikes < STRIKE_THRESHOLDS.DANGER && (
            <MenuItem onClick={() => handleAction('strike')}>
              <WarningIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Give Strike
            </MenuItem>
          )}
          
          <Divider />
          
          <MenuItem onClick={() => handleAction('delete')} sx={{ color: 'error.main' }}>
            <Delete fontSize="small" sx={{ mr: 1 }} /> Delete Provider
          </MenuItem>
        </Menu>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to {pendingAction} {providerData?.name}?
              {pendingAction === 'delete' && ' This action cannot be undone.'}
              {pendingAction === 'strike' && ' This will add a strike to their account.'}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmAction} color="primary" variant="contained">
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Skeleton variant="circular" width={64} height={64} />
            <Box flex={1}>
              <Skeleton variant="text" width="80%" height={32} />
              <Skeleton variant="text" width="60%" height={20} />
            </Box>
          </Stack>
          <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
          <Skeleton variant="text" width="100%" />
          <Skeleton variant="text" width="80%" />
        </CardContent>
      </Card>
    );
  }

  if (!providerData) return null;

  const StatusIcon = statusConfig.icon;
  const VerificationIcon = verificationConfig.icon;

  // ✅ Debug log - remove in production
  console.log('ProviderCard rendering:', { 
    id: providerData.id, 
    name: providerData.name,
    rawProvider: provider 
  });

  return (
    <Card
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: compact ? 'none' : 'translateY(-4px)',
          boxShadow: compact ? 2 : 6
        },
        borderLeft: `4px solid ${statusConfig.color === 'success' ? '#22c55e' : statusConfig.color === 'warning' ? '#f59e0b' : '#ef4444'}`
      }}
    >
      <CardContent sx={{ flex: 1 }}>
        {/* Status Badges */}
        <Stack direction="row" spacing={1} sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
          {strikeLevel === 'warning' && (
            <Tooltip title="Provider has active strikes">
              <Chip
                icon={<WarningIcon />}
                label={`${providerData.activeStrikes} Strike${providerData.activeStrikes !== 1 ? 's' : ''}`}
                size="small"
                color="warning"
                variant="outlined"
              />
            </Tooltip>
          )}
          {strikeLevel === 'danger' && (
            <Tooltip title="Provider is at risk of suspension">
              <Chip
                icon={<ReportProblem />}
                label="At Risk"
                size="small"
                color="error"
              />
            </Tooltip>
          )}
          <Chip
            icon={<StatusIcon fontSize="small" />}
            label={statusConfig.label}
            size="small"
            color={statusConfig.color}
          />
        </Stack>

        {/* Header Section */}
        <Stack direction="row" spacing={compact ? 1.5 : 2} alignItems="center" mb={2}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              providerData.verified && (
                <Tooltip title="Verified Provider">
                  <VerifiedIcon sx={{ fontSize: 16, color: '#22c55e', bgcolor: 'white', borderRadius: '50%' }} />
                </Tooltip>
              )
            }
          >
            <Avatar
              src={imageError ? null : providerData.profileImage}
              alt={providerData.name}
              sx={{
                width: compact ? 48 : 64,
                height: compact ? 48 : 64,
                bgcolor: '#6366f1',
                fontSize: compact ? '1rem' : '1.25rem'
              }}
              imgProps={{ onError: () => setImageError(true) }}
            >
              {getInitials(providerData.name)}
            </Avatar>
          </Badge>

          <Box flex={1}>
            {/* ✅ CRITICAL: The name display - should show "Kalyan b Borade" */}
            <Typography variant={compact ? 'subtitle1' : 'h6'} component="h3" fontWeight="bold" gutterBottom>
              {providerData.name}
            </Typography>

            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" rowGap={0.5}>
              <Rating value={providerData.rating} precision={0.1} readOnly size="small" />
              <Typography variant="caption" color="text.secondary">
                ({providerData.totalReviews} {providerData.totalReviews === 1 ? 'review' : 'reviews'})
              </Typography>
              {providerData.location && (
                <>
                  <Box component="span" sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#cbd5e1' }} />
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOn sx={{ fontSize: 12, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {providerData.location}
                    </Typography>
                  </Stack>
                </>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Provider ID */}
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          ID: {providerData.id}
        </Typography>

        {/* Service & Experience */}
        {(providerData.serviceType || providerData.experienceYears) && !compact && (
          <Stack direction="row" spacing={1} mb={2}>
            {providerData.serviceType && (
              <Chip
                label={providerData.serviceType.replace(/_/g, ' ')}
                size="small"
                icon={<Work />}
                variant="outlined"
              />
            )}
            {providerData.experienceYears > 0 && (
              <Chip
                label={`${providerData.experienceYears}+ years`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        )}

        {/* Specialties */}
        {renderSpecialties()}

        {/* Verification Status */}
        {providerData.verificationStatus && providerData.verificationStatus !== 'VERIFIED' && !compact && (
          <Box mb={2}>
            <Chip
              icon={<VerificationIcon fontSize="small" />}
              label={verificationConfig.label}
              size="small"
              color={verificationConfig.color}
              variant="outlined"
            />
          </Box>
        )}

        {/* Strikes Indicator */}
        {showActions && providerData.activeStrikes > 0 && renderStrikes()}

        {/* KPIs */}
        {renderKPIs()}

        {/* Contact Info */}
        {renderContactInfo()}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
        {renderActions()}
        {!showActions && !compact && variant === 'detailed' && (
          <Button
            fullWidth
            variant="outlined"
            onClick={handleClick}
            sx={{ mt: 1 }}
          >
            View Profile
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
ProviderCard.propTypes = {
  provider: PropTypes.shape({
    providerId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    fullName: PropTypes.string,
    full_name: PropTypes.string,
    name: PropTypes.string,
    email: PropTypes.string,
    phone: PropTypes.string,
    phoneNumber: PropTypes.string,
    profileImage: PropTypes.string,
    rating: PropTypes.number,
    totalReviews: PropTypes.number,
    reviewCount: PropTypes.number,
    activeStrikes: PropTypes.number,
    strikes: PropTypes.number,
    suspended: PropTypes.bool,
    isSuspended: PropTypes.bool,
    jobsCompleted: PropTypes.number,
    completedJobsCount: PropTypes.number,
    completedJobs: PropTypes.number,
    acceptanceRate: PropTypes.number,
    specialties: PropTypes.array,
    skills: PropTypes.array,
    location: PropTypes.string,
    area: PropTypes.string,
    verified: PropTypes.bool,
    responseTime: PropTypes.string,
    joinedDate: PropTypes.string,
    joinedAt: PropTypes.string,
    createdAt: PropTypes.string,
    status: PropTypes.string,
    experienceYears: PropTypes.number,
    basePrice: PropTypes.number,
    serviceType: PropTypes.string,
    verificationStatus: PropTypes.string,
    totalEarnings: PropTypes.number,
    completionRate: PropTypes.number,
    lastActive: PropTypes.string
  }),
  onClick: PropTypes.func,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onToggleStatus: PropTypes.func,
  onViewDetails: PropTypes.func,
  onSuspend: PropTypes.func,
  onActivate: PropTypes.func,
  onGiveStrike: PropTypes.func,
  showActions: PropTypes.bool,
  variant: PropTypes.oneOf(['default', 'compact', 'detailed']),
  loading: PropTypes.bool,
  compact: PropTypes.bool
};

ProviderCard.defaultProps = {
  showActions: false,
  variant: 'default',
  loading: false,
  compact: false
};

export default React.memo(ProviderCard);