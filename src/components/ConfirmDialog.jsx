// src/components/ConfirmDialog.jsx
import React, { useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
  IconButton,
  Typography,
  Box,
  Divider,
  Alert,
  Fade,
  Slide,
  useMediaQuery,
  useTheme
} from "@mui/material";
import {
  Close as CloseIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Delete as DeleteIcon,
  ExitToApp as LogoutIcon,
  Save as SaveIcon
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";

// Styled Components
const StyledDialog = styled(Dialog)(({ theme, severity = "warning" }) => {
  const getSeverityColor = () => {
    switch (severity) {
      case "error":
        return theme.palette.error.main;
      case "success":
        return theme.palette.success.main;
      case "info":
        return theme.palette.info.main;
      case "warning":
      default:
        return theme.palette.warning.main;
    }
  };

  const severityColor = getSeverityColor();

  return {
    "& .MuiDialog-paper": {
      borderRadius: 16,
      maxWidth: 500,
      width: "100%",
      margin: 16,
      overflow: "hidden",
      transition: "all 0.3s ease",
      boxShadow: `0 20px 35px -8px ${alpha(severityColor, 0.3)}`
    },
    "& .MuiDialogTitle-root": {
      padding: "20px 24px 12px 24px",
      position: "relative"
    },
    "& .MuiDialogContent-root": {
      padding: "8px 24px 16px 24px"
    },
    "& .MuiDialogActions-root": {
      padding: "16px 24px 24px 24px",
      gap: 12
    }
  };
});

const IconWrapper = styled(Box)(({ theme, severity }) => {
  const getSeverityColor = () => {
    switch (severity) {
      case "error":
        return theme.palette.error.main;
      case "success":
        return theme.palette.success.main;
      case "info":
        return theme.palette.info.main;
      case "warning":
      default:
        return theme.palette.warning.main;
    }
  };

  const severityColor = getSeverityColor();

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: "50%",
    backgroundColor: alpha(severityColor, 0.1),
    color: severityColor,
    marginRight: 12,
    flexShrink: 0
  };
});

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="down" ref={ref} {...props} />;
});

// Button configurations for different action types
const actionConfigs = {
  delete: {
    confirmText: "Delete",
    cancelText: "Cancel",
    confirmColor: "error",
    icon: <DeleteIcon />,
    titlePrefix: "Delete"
  },
  logout: {
    confirmText: "Logout",
    cancelText: "Stay",
    confirmColor: "error",
    icon: <LogoutIcon />,
    titlePrefix: "Logout"
  },
  save: {
    confirmText: "Save",
    cancelText: "Cancel",
    confirmColor: "primary",
    icon: <SaveIcon />,
    titlePrefix: "Save Changes"
  },
  warning: {
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmColor: "warning",
    icon: <WarningIcon />,
    titlePrefix: "Confirm"
  },
  danger: {
    confirmText: "Confirm",
    cancelText: "Cancel",
    confirmColor: "error",
    icon: <ErrorIcon />,
    titlePrefix: "Warning"
  }
};

const ConfirmDialog = ({
  // Core props
  open = false,
  title,
  message,
  onConfirm,
  onCancel,
  
  // Appearance props
  severity = "warning", // 'warning', 'error', 'success', 'info'
  confirmText,
  cancelText,
  confirmColor,
  cancelColor = "inherit",
  confirmVariant = "contained",
  cancelVariant = "outlined",
  icon,
  maxWidth = "xs",
  fullWidth = true,
  fullScreen = false,
  
  // Behavior props
  loading = false,
  disabled = false,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  autoFocusConfirm = true,
  autoFocusCancel = false,
  
  // Additional content
  additionalContent,
  details,
  footer,
  
  // Callbacks
  onOpen,
  onClose,
  onExited,
  
  // Styling
  className,
  titleClassName,
  contentClassName,
  actionsClassName,
  
  // Accessibility
  ariaLabel,
  ariaDescription,
  
  // Testing
  "data-testid": dataTestId
}) => {
  const theme = useTheme();
  const fullScreenMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const confirmButtonRef = useRef(null);
  const cancelButtonRef = useRef(null);

  // Get action config based on severity
  const actionConfig = actionConfigs[severity] || actionConfigs.warning;
  
  // Final button texts and colors
  const finalConfirmText = confirmText || actionConfig.confirmText;
  const finalCancelText = cancelText || actionConfig.cancelText;
  const finalConfirmColor = confirmColor || actionConfig.confirmColor;
  const finalIcon = icon || actionConfig.icon;
  const finalTitlePrefix = title ? "" : actionConfig.titlePrefix;

  // Handle confirm action
  const handleConfirm = useCallback(async () => {
    if (loading || disabled) return;
    
    try {
      if (onConfirm) {
        await onConfirm();
      }
    } catch (error) {
      console.error("Confirm dialog error:", error);
    }
  }, [onConfirm, loading, disabled]);

  // Handle cancel action
  const handleCancel = useCallback(() => {
    if (loading || disabled) return;
    onCancel?.();
  }, [onCancel, loading, disabled]);

  // Handle close events
  const handleClose = (event, reason) => {
    if (!closeOnBackdropClick && reason === "backdropClick") return;
    if (!closeOnEscape && reason === "escapeKeyDown") return;
    if (loading) return;
    onCancel?.();
  };

  // Handle dialog enter
  const handleEnter = () => {
    onOpen?.();
    
    // Auto focus on confirm button
    if (autoFocusConfirm && confirmButtonRef.current) {
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
    } else if (autoFocusCancel && cancelButtonRef.current) {
      setTimeout(() => {
        cancelButtonRef.current?.focus();
      }, 100);
    }
  };

  // Handle dialog exit
  const handleExited = () => {
    onExited?.();
  };

  // Keyboard event handlers
  useEffect(() => {
    if (!open) return;
    
    const handleKeyDown = (e) => {
      // Prevent default behavior for Enter key when not on form elements
      if (e.key === "Enter" && !loading && !disabled) {
        const activeElement = document.activeElement;
        const isInputOrButton = activeElement?.tagName === "INPUT" || 
                                activeElement?.tagName === "BUTTON" ||
                                activeElement?.tagName === "TEXTAREA";
        
        if (!isInputOrButton && autoFocusConfirm) {
          handleConfirm();
        }
      }
      
      // Escape key handling
      if (e.key === "Escape" && closeOnEscape && !loading) {
        handleCancel();
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, disabled, autoFocusConfirm, closeOnEscape, handleConfirm, handleCancel]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Get severity color for icon
  const getSeverityIcon = () => {
    switch (severity) {
      case "error":
        return <ErrorIcon sx={{ fontSize: 28 }} />;
      case "success":
        return <SuccessIcon sx={{ fontSize: 28 }} />;
      case "info":
        return <InfoIcon sx={{ fontSize: 28 }} />;
      case "warning":
      default:
        return <WarningIcon sx={{ fontSize: 28 }} />;
    }
  };

  return (
    <StyledDialog
      open={open}
      onClose={handleClose}
      TransitionComponent={Transition}
      TransitionProps={{
        onEnter: handleEnter,
        onExited: handleExited
      }}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      fullScreen={fullScreen || fullScreenMobile}
      disableEscapeKeyDown={!closeOnEscape}
      className={className}
      severity={severity}
      data-testid={dataTestId || "confirm-dialog"}
      aria-labelledby={ariaLabel || "confirm-dialog-title"}
      aria-describedby={ariaDescription || "confirm-dialog-description"}
    >
      {/* Close button */}
      <IconButton
        aria-label="close"
        onClick={handleCancel}
        disabled={loading}
        sx={{
          position: "absolute",
          right: 12,
          top: 12,
          color: theme => theme.palette.grey[500],
          zIndex: 1,
          "&:hover": {
            backgroundColor: alpha(theme.palette.grey[500], 0.1)
          }
        }}
      >
        <CloseIcon />
      </IconButton>

      <DialogTitle id="confirm-dialog-title" className={titleClassName}>
        <Box display="flex" alignItems="center" pr={4}>
          {finalIcon && (
            <IconWrapper severity={severity}>
              {finalIcon}
            </IconWrapper>
          )}
          <Typography variant="h6" component="span" fontWeight={600}>
            {title || `${finalTitlePrefix} Confirmation`}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent className={contentClassName}>
        <DialogContentText 
          id="confirm-dialog-description"
          component="div"
          sx={{ mt: 2 }}
        >
          {message && (
            <Typography 
              variant="body1" 
              color="text.primary"
              sx={{ mb: details ? 2 : 0 }}
            >
              {message}
            </Typography>
          )}
          
          {/* Additional details */}
          {details && (
            <Alert 
              severity={severity} 
              variant="outlined"
              sx={{ 
                mt: 2, 
                mb: 2,
                "& .MuiAlert-message": {
                  width: "100%"
                }
              }}
            >
              {typeof details === "string" ? details : (
                <Box component="div">
                  {Object.entries(details).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {key}
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Alert>
          )}
          
          {/* Additional custom content */}
          {additionalContent && (
            <Box sx={{ mt: 2 }}>
              {additionalContent}
            </Box>
          )}
        </DialogContentText>
      </DialogContent>

      <Divider />

      <DialogActions className={actionsClassName}>
        <Button
          ref={cancelButtonRef}
          variant={cancelVariant}
          onClick={handleCancel}
          disabled={loading || disabled}
          color={cancelColor}
          sx={{ minWidth: 100 }}
        >
          {finalCancelText}
        </Button>
        
        <Button
          ref={confirmButtonRef}
          variant={confirmVariant}
          onClick={handleConfirm}
          disabled={loading || disabled}
          color={finalConfirmColor}
          startIcon={loading ? <CircularProgress size={20} /> : null}
          sx={{ 
            minWidth: 100,
            position: "relative"
          }}
        >
          {loading ? "Processing..." : finalConfirmText}
        </Button>
      </DialogActions>
      
      {/* Custom footer */}
      {footer && (
        <Box sx={{ px: 3, pb: 2 }}>
          {footer}
        </Box>
      )}
    </StyledDialog>
  );
};

// PropTypes for better documentation
ConfirmDialog.propTypes = {
  // Core props
  open: PropTypes.bool,
  title: PropTypes.string,
  message: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  
  // Appearance props
  severity: PropTypes.oneOf(["warning", "error", "success", "info"]),
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  confirmColor: PropTypes.oneOf(["primary", "secondary", "error", "info", "success", "warning", "inherit"]),
  cancelColor: PropTypes.oneOf(["primary", "secondary", "error", "info", "success", "warning", "inherit"]),
  confirmVariant: PropTypes.oneOf(["text", "outlined", "contained"]),
  cancelVariant: PropTypes.oneOf(["text", "outlined", "contained"]),
  icon: PropTypes.node,
  maxWidth: PropTypes.oneOf(["xs", "sm", "md", "lg", "xl", false]),
  fullWidth: PropTypes.bool,
  fullScreen: PropTypes.bool,
  
  // Behavior props
  loading: PropTypes.bool,
  disabled: PropTypes.bool,
  closeOnBackdropClick: PropTypes.bool,
  closeOnEscape: PropTypes.bool,
  autoFocusConfirm: PropTypes.bool,
  autoFocusCancel: PropTypes.bool,
  
  // Additional content
  additionalContent: PropTypes.node,
  details: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
  footer: PropTypes.node,
  
  // Callbacks
  onOpen: PropTypes.func,
  onClose: PropTypes.func,
  onExited: PropTypes.func,
  
  // Styling
  className: PropTypes.string,
  titleClassName: PropTypes.string,
  contentClassName: PropTypes.string,
  actionsClassName: PropTypes.string,
  
  // Accessibility
  ariaLabel: PropTypes.string,
  ariaDescription: PropTypes.string,
  
  // Testing
  "data-testid": PropTypes.string
};

// Default props
ConfirmDialog.defaultProps = {
  open: false,
  severity: "warning",
  confirmVariant: "contained",
  cancelVariant: "outlined",
  cancelColor: "inherit",
  maxWidth: "xs",
  fullWidth: true,
  fullScreen: false,
  closeOnBackdropClick: true,
  closeOnEscape: true,
  autoFocusConfirm: true,
  autoFocusCancel: false,
  loading: false,
  disabled: false
};

// Export with memo for performance optimization
export default React.memo(ConfirmDialog);