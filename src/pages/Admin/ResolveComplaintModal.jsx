// src/components/Admin/ResolveComplaintModal.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  Stack,
  Alert,
  Chip,
  Typography,
  Box,
  Divider,
  CircularProgress,
  Rating,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper
} from "@mui/material";
import {
  Warning,
  CheckCircle,
  Cancel,
  Info,
  Description,
  Send,
  Save,
  Delete,
  History,
  Flag,
  Gavel,
  AssignmentLate,
  ThumbUp,
  ThumbDown,
  Close,
  FileCopy,
  Refresh
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const COMPLAINT_CATEGORIES = {
  LATE_ARRIVAL: {
    label: "Late Arrival",
    icon: History,
    color: "warning",
    template: "Provider warned regarding punctuality as per marketplace policy. Please ensure timely arrival for all scheduled appointments."
  },
  NO_SHOW: {
    label: "No Show",
    icon: Cancel,
    color: "error",
    template: "Provider issued a warning for no-show. Future incidents may result in suspension or account action."
  },
  UNPROFESSIONAL_BEHAVIOR: {
    label: "Unprofessional Behavior",
    icon: Flag,
    color: "error",
    template: "Provider warned regarding professional conduct standards. All interactions must maintain professionalism."
  },
  OVERCHARGING: {
    label: "Overcharging",
    icon: Gavel,
    color: "warning",
    template: "Provider instructed to strictly follow approved pricing guidelines. Any future violations will result in stricter action."
  },
  POOR_WORKMANSHIP: {
    label: "Poor Workmanship",
    icon: AssignmentLate,
    color: "warning",
    template: "Provider advised to improve service quality. Customer satisfaction is our top priority."
  },
  SAFETY_CONCERN: {
    label: "Safety Concern",
    icon: Warning,
    color: "error",
    template: "Provider reminded of safety protocols and standards. Safety violations will not be tolerated."
  },
  OTHER: {
    label: "Other",
    icon: Info,
    color: "info",
    template: "Complaint reviewed and resolved as per marketplace guidelines."
  }
};

const STRIKE_THRESHOLDS = {
  WARNING: 1,
  DANGER: 2,
  SUSPEND: 3
};

// ==========================================================
// RESOLUTION TEMPLATES
// ==========================================================
const RESOLUTION_TEMPLATES = {
  APOLOGY: "Provider has apologized and acknowledged the issue. Customer has accepted the apology.",
  REFUND: "Full/Partial refund issued to customer as compensation. Provider has agreed to the resolution.",
  REASSIGNMENT: "Service reassigned to alternative provider. Customer confirmed satisfaction.",
  TRAINING: "Provider enrolled in mandatory training program regarding service quality standards.",
  WARNING: "Official warning issued to provider. This incident has been documented in their record.",
  SUSPENSION: "Provider suspended for [X] days pending review of service quality improvements.",
  TERMINATION: "Provider removed from platform effective immediately due to policy violation."
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const getStrikeWarning = (activeStrikes, willAddStrike) => {
  if (!willAddStrike) return null;
  
  const newStrikeCount = activeStrikes + 1;
  
  if (newStrikeCount >= STRIKE_THRESHOLDS.SUSPEND) {
    return {
      severity: "error",
      title: "Automatic Suspension",
      message: "Issuing this strike will result in automatic provider suspension. This action cannot be undone without admin review."
    };
  }
  
  if (newStrikeCount >= STRIKE_THRESHOLDS.DANGER) {
    return {
      severity: "warning",
      title: "At Risk of Suspension",
      message: "This strike puts the provider at risk of suspension. One more strike will result in automatic suspension."
    };
  }
  
  if (newStrikeCount >= STRIKE_THRESHOLDS.WARNING) {
    return {
      severity: "info",
      title: "Strike Issued",
      message: "Provider now has active strike(s). Additional violations may lead to suspension."
    };
  }
  
  return null;
};

// ==========================================================
// TEMPLATE SELECTOR COMPONENT
// ==========================================================
const TemplateSelector = ({ onSelectTemplate }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  
  return (
    <>
      <Tooltip title="Use Template">
        <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}>
          <FileCopy fontSize="small" />
        </IconButton>
      </Tooltip>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {Object.entries(RESOLUTION_TEMPLATES).map(([key, template]) => (
          <MenuItem
            key={key}
            onClick={() => {
              onSelectTemplate(template);
              setAnchorEl(null);
            }}
          >
            <ListItemIcon>
              <Description fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={key.charAt(0) + key.slice(1).toLowerCase()} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ResolveComplaintModal = ({ 
  open, 
  onClose, 
  complaint, 
  onResolved,
  onError 
}) => {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [issueStrike, setIssueStrike] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [sendNotification, setSendNotification] = useState(true);
  const [notifyCustomer, setNotifyCustomer] = useState(true);
  const [notifyProvider, setNotifyProvider] = useState(true);
  
  // ==========================================================
  // MEMOIZED VALUES
  // ==========================================================
  const categoryConfig = useMemo(() => {
    if (!complaint?.category) return COMPLAINT_CATEGORIES.OTHER;
    return COMPLAINT_CATEGORIES[complaint.category] || COMPLAINT_CATEGORIES.OTHER;
  }, [complaint?.category]);
  
  const CategoryIcon = categoryConfig.icon;
  
  const strikeWarning = useMemo(() => {
    return getStrikeWarning(complaint?.activeStrikes || 0, issueStrike);
  }, [complaint?.activeStrikes, issueStrike]);
  
  const canIssueStrike = useMemo(() => {
    if (!complaint) return false;
    return complaint.strikeEligible && hasPermission?.('manage_strikes');
  }, [complaint, hasPermission]);
  
  const finalResolutionMessage = useMemo(() => {
    let message = resolutionMessage;
    
    if (additionalNotes) {
      message += `\n\nAdditional Notes: ${additionalNotes}`;
    }
    
    if (issueStrike) {
      message += `\n\n⚠️ Official strike issued. Provider now has ${(complaint?.activeStrikes || 0) + 1} active strike(s).`;
    }
    
    return message;
  }, [resolutionMessage, additionalNotes, issueStrike, complaint?.activeStrikes]);

  // ==========================================================
  // PREFILL RESOLUTION MESSAGE
  // ==========================================================
  useEffect(() => {
    if (!complaint) return;
    
    // Use category template
    setResolutionMessage(categoryConfig.template);
    
    // Reset states
    setIssueStrike(false);
    setError(null);
    setAdditionalNotes("");
    setSendNotification(true);
    setNotifyCustomer(true);
    setNotifyProvider(true);
    setShowPreview(false);
    
  }, [complaint, categoryConfig]);

  // ==========================================================
  // HANDLE RESOLUTION
  // ==========================================================
  const handleResolve = async () => {
    if (!resolutionMessage.trim()) {
      setError("Resolution message is required.");
      return;
    }
    
    if (resolutionMessage.length < 20) {
      setError("Please provide a more detailed resolution message (minimum 20 characters).");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const payload = {
        complaintId: complaint.complaintId,
        resolutionMessage: finalResolutionMessage,
        issueStrike,
        sendNotification,
        notifyCustomer,
        notifyProvider,
        additionalNotes: additionalNotes || undefined,
        resolvedBy: user?.id,
        resolvedByName: user?.name,
        resolutionDate: new Date().toISOString()
      };
      
      const response = await api.post(`/admin/complaints/${complaint.complaintId}/resolve`, payload);
      
      addNotification({
        type: "success",
        title: "Complaint Resolved",
        message: `Complaint #${complaint.complaintId?.slice(-8)} has been resolved successfully.`,
        duration: 5000
      });
      
      if (onResolved) {
        onResolved(response.data);
      }
      
      onClose();
      
    } catch (err) {
      console.error("Resolution failed:", err);
      const errorMessage = err.response?.data?.message || "Failed to resolve complaint. Please try again.";
      setError(errorMessage);
      if (onError) onError(errorMessage);
      
      addNotification({
        type: "error",
        title: "Resolution Failed",
        message: errorMessage,
        duration: 6000
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // USE TEMPLATE
  // ==========================================================
  const useTemplate = useCallback((template) => {
    setResolutionMessage(template);
  }, []);

  // ==========================================================
  // RESET FORM
  // ==========================================================
  const handleReset = () => {
    setResolutionMessage(categoryConfig.template);
    setIssueStrike(false);
    setAdditionalNotes("");
    setError(null);
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  if (!complaint) return null;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      TransitionComponent={motion.div}
      TransitionProps={{
        exit: { opacity: 0, scale: 0.9 },
        enter: { opacity: 1, scale: 1 }
      }}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Resolve Complaint
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Provider: {complaint.providerName}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <AnimatePresence mode="wait">
          <motion.div
            key={showPreview ? "preview" : "form"}
            initial={{ opacity: 0, x: showPreview ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: showPreview ? -20 : 20 }}
            transition={{ duration: 0.2 }}
          >
            {showPreview ? (
              // Preview Mode
              <Stack spacing={2}>
                <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                  Resolution Preview
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                  <Typography variant="body2" style={{ whiteSpace: "pre-wrap" }}>
                    {finalResolutionMessage}
                  </Typography>
                </Paper>
                
                {issueStrike && (
                  <Alert severity="warning" icon={<Warning />}>
                    <Typography variant="body2">
                      A strike will be added to the provider's record.
                    </Typography>
                  </Alert>
                )}
                
                <Box display="flex" justifyContent="flex-end">
                  <Button onClick={() => setShowPreview(false)}>
                    Back to Edit
                  </Button>
                </Box>
              </Stack>
            ) : (
              // Form Mode
              <Stack spacing={3}>
                {/* Complaint Category */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Category
                  </Typography>
                  <Chip
                    icon={<CategoryIcon />}
                    label={categoryConfig.label}
                    color={categoryConfig.color}
                    variant="outlined"
                  />
                </Box>

                {/* Complaint Details */}
                {complaint.description && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Complaint Details
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                      <Typography variant="body2">
                        {complaint.description}
                      </Typography>
                    </Paper>
                  </Box>
                )}

                {/* Strike Warning */}
                {complaint.strikeEligible && (
                  <Alert severity="warning" icon={<Warning />}>
                    <Typography variant="body2">
                      This complaint is <strong>strike-eligible</strong>.
                      <br />
                      Current Active Strikes: <strong>{complaint.activeStrikes}</strong>
                    </Typography>
                  </Alert>
                )}

                {/* Strike Warning Details */}
                {strikeWarning && (
                  <Alert severity={strikeWarning.severity} icon={<Warning />}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {strikeWarning.title}
                    </Typography>
                    <Typography variant="body2">
                      {strikeWarning.message}
                    </Typography>
                  </Alert>
                )}

                {/* Resolution Message */}
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2">
                      Resolution Message <span style={{ color: "red" }}>*</span>
                    </Typography>
                    <TemplateSelector onSelectTemplate={useTemplate} />
                  </Box>
                  <TextField
                    multiline
                    minRows={4}
                    maxRows={8}
                    value={resolutionMessage}
                    onChange={(e) => setResolutionMessage(e.target.value)}
                    placeholder="Describe how this complaint was resolved..."
                    fullWidth
                    error={!resolutionMessage.trim() && error}
                    helperText={!resolutionMessage.trim() && error ? "Resolution message is required" : `${resolutionMessage.length}/500 characters`}
                    inputProps={{ maxLength: 500 }}
                  />
                </Box>

                {/* Additional Notes */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Internal Notes (Optional)
                  </Typography>
                  <TextField
                    multiline
                    minRows={2}
                    maxRows={4}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="Add internal notes for admin reference..."
                    fullWidth
                  />
                </Box>

                {/* Strike Option */}
                {canIssueStrike && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={issueStrike}
                        onChange={(e) => setIssueStrike(e.target.checked)}
                        color="warning"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">
                          Issue Official Strike to Provider
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          This will add a strike to the provider's record and may affect their standing.
                        </Typography>
                      </Box>
                    }
                  />
                )}

                {/* Notification Settings */}
                <Divider />
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Notification Settings
                  </Typography>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={sendNotification}
                        onChange={(e) => setSendNotification(e.target.checked)}
                      />
                    }
                    label="Send resolution notification"
                  />
                  
                  {sendNotification && (
                    <Box sx={{ ml: 4, mt: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={notifyCustomer}
                            onChange={(e) => setNotifyCustomer(e.target.checked)}
                          />
                        }
                        label="Notify customer"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={notifyProvider}
                            onChange={(e) => setNotifyProvider(e.target.checked)}
                          />
                        }
                        label="Notify provider"
                      />
                    </Box>
                  )}
                </Box>

                {/* Error Display */}
                {error && (
                  <Alert severity="error" onClose={() => setError(null)}>
                    {error}
                  </Alert>
                )}

                {/* Action Buttons */}
                <Box display="flex" justifyContent="flex-end" gap={2}>
                  <Button onClick={handleReset} size="small" startIcon={<Refresh />}>
                    Reset
                  </Button>
                  <Button onClick={() => setShowPreview(true)} variant="outlined">
                    Preview
                  </Button>
                </Box>
              </Stack>
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        {!showPreview && (
          <Button
            variant="contained"
            color={issueStrike ? "warning" : "primary"}
            onClick={handleResolve}
            disabled={loading || !resolutionMessage.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : issueStrike ? <Warning /> : <CheckCircle />}
          >
            {loading ? "Processing..." : issueStrike ? "Resolve & Issue Strike" : "Resolve Complaint"}
          </Button>
        )}
        {showPreview && (
          <Button
            variant="contained"
            color={issueStrike ? "warning" : "primary"}
            onClick={handleResolve}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <Send />}
          >
            {loading ? "Processing..." : "Confirm Resolution"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// PROP TYPES
// ==========================================================
ResolveComplaintModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  complaint: PropTypes.shape({
    complaintId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    providerName: PropTypes.string,
    category: PropTypes.string,
    description: PropTypes.string,
    strikeEligible: PropTypes.bool,
    activeStrikes: PropTypes.number,
    customerName: PropTypes.string,
    createdAt: PropTypes.string
  }),
  onResolved: PropTypes.func,
  onError: PropTypes.func
};

ResolveComplaintModal.defaultProps = {
  complaint: null,
  onResolved: null,
  onError: null
};

export default React.memo(ResolveComplaintModal);