// src/components/ErrorBoundary.js
import React from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  AlertTitle,
  Collapse,
  IconButton,
  Divider,
  Chip,
  LinearProgress
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ReportProblem as WarningIcon,
  CloudOff as OfflineIcon
} from '@mui/icons-material';
import { styled, alpha } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

// Styled Components
const ErrorContainer = styled(Box)(({ theme }) => ({
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${alpha(theme.palette.error.dark, 0.1)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)`,
  padding: theme.spacing(3),
  position: 'relative',
  overflow: 'hidden'
}));

const ErrorCard = styled(Paper)(({ theme }) => ({
  maxWidth: 550,
  width: '100%',
  borderRadius: theme.shape.borderRadius * 2,
  overflow: 'hidden',
  position: 'relative',
  zIndex: 1,
  boxShadow: theme.shadows[20],
  transition: 'all 0.3s ease'
}));

const ErrorHeader = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
  padding: theme.spacing(3),
  textAlign: 'center',
  color: theme.palette.error.contrastText
}));

const ErrorContent = styled(Box)(({ theme }) => ({
  padding: theme.spacing(4)
}));

const AnimatedIcon = motion(Box);

// Error Types
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTH: 'auth',
  TIMEOUT: 'timeout',
  NOT_FOUND: 'notFound',
  MEMORY: 'memory',
  WEBSOCKET: 'websocket',
  UNKNOWN: 'unknown'
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      retryCount: 0,
      isAutoResetting: false,
      offlineStatus: !navigator.onLine,
      componentStack: []
    };
    
    // Bind methods
    this.handleReset = this.handleReset.bind(this);
    this.handleHardReset = this.handleHardReset.bind(this);
    this.handleGoHome = this.handleGoHome.bind(this);
    this.handleCopyError = this.handleCopyError.bind(this);
    this.toggleExpanded = this.toggleExpanded.bind(this);
    this.logErrorToService = this.logErrorToService.bind(this);
  }

  // Static lifecycle method to catch errors
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidMount() {
    // Monitor online/offline status
    this.handleOnline = () => this.setState({ offlineStatus: false });
    this.handleOffline = () => this.setState({ offlineStatus: true });
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    
    // Auto-reset after delay if configured
    const { autoResetDelay } = this.props;
    if (autoResetDelay && this.state.hasError) {
      this.autoResetTimer = setTimeout(() => {
        this.handleReset();
      }, autoResetDelay);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Check if reset keys have changed
    const { resetKeys } = this.props;
    if (resetKeys && prevProps.resetKeys !== resetKeys && this.state.hasError) {
      const hasChanged = resetKeys.some((key, index) => key !== prevProps.resetKeys?.[index]);
      if (hasChanged) {
        this.handleReset();
      }
    }
  }

  componentWillUnmount() {
    // Cleanup event listeners
    if (this.handleOnline) {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
    }
  }

  componentDidCatch(error, errorInfo) {
    const { onError, logToConsole = true } = this.props;
    
    // Update state with error info
    this.setState({ errorInfo });
    
    // Extract component stack
    const stack = errorInfo?.componentStack || '';
    const componentNames = stack.match(/in\s+(\w+)/g) || [];
    this.setState({ componentStack: componentNames.map(s => s.replace('in ', '')) });
    
    // Log to console
    if (logToConsole) {
      console.group('🚨 React Error Boundary Caught an Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Component Stack:', componentNames);
      console.groupEnd();
    }
    
    // Call custom error handler
    if (onError) {
      onError(error, errorInfo);
    }
    
    // Log to external service
    this.logErrorToService(error, errorInfo);
  }

  // Get error type classification
  getErrorType() {
    const { error } = this.state;
    if (!error) return ERROR_TYPES.UNKNOWN;
    
    const message = error.message?.toLowerCase() || '';
    
    if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
      return ERROR_TYPES.NETWORK;
    }
    if (message.includes('auth') || message.includes('token') || message.includes('permission')) {
      return ERROR_TYPES.AUTH;
    }
    if (message.includes('timeout')) {
      return ERROR_TYPES.TIMEOUT;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_TYPES.NOT_FOUND;
    }
    if (message.includes('memory') || message.includes('heap')) {
      return ERROR_TYPES.MEMORY;
    }
    if (message.includes('websocket') || message.includes('socket')) {
      return ERROR_TYPES.WEBSOCKET;
    }
    
    return ERROR_TYPES.UNKNOWN;
  }

  // Get user-friendly error message
  getUserFriendlyMessage() {
    const { customErrorMessages = {} } = this.props;
    const { offlineStatus } = this.state;
    const errorType = this.getErrorType();
    
    const defaultMessages = {
      [ERROR_TYPES.NETWORK]: 'Unable to connect to the server. Please check your internet connection.',
      [ERROR_TYPES.AUTH]: 'Authentication error. Please try logging in again.',
      [ERROR_TYPES.TIMEOUT]: 'Request timed out. The server might be busy.',
      [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
      [ERROR_TYPES.MEMORY]: 'The application is running low on memory. Refreshing might help.',
      [ERROR_TYPES.WEBSOCKET]: 'Real-time connection lost. Attempting to reconnect...',
      [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred.'
    };
    
    if (offlineStatus) {
      return 'No internet connection. Please check your network and try again.';
    }
    
    return customErrorMessages[errorType] || defaultMessages[errorType] || defaultMessages[ERROR_TYPES.UNKNOWN];
  }

  // Get appropriate icon for error type
  getErrorIcon() {
    const { offlineStatus } = this.state;
    const errorType = this.getErrorType();
    
    if (offlineStatus) return <OfflineIcon sx={{ fontSize: 60 }} />;
    
    switch (errorType) {
      case ERROR_TYPES.NETWORK:
        return <OfflineIcon sx={{ fontSize: 60 }} />;
      case ERROR_TYPES.AUTH:
        return <WarningIcon sx={{ fontSize: 60 }} />;
      case ERROR_TYPES.MEMORY:
        return <ErrorIcon sx={{ fontSize: 60 }} />;
      default:
        return <ErrorIcon sx={{ fontSize: 60 }} />;
    }
  }

  // Log error to service
  async logErrorToService(error, errorInfo) {
    const { logToService = false, serviceEndpoint = null } = this.props;
    const { retryCount, offlineStatus } = this.state;
    
    if (!logToService || !serviceEndpoint) return;
    
    try {
      const errorReport = {
        message: error?.message || 'Unknown error',
        stack: error?.stack,
        componentStack: errorInfo?.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        retryCount,
        offline: offlineStatus
      };
      
      await fetch(serviceEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
        keepalive: true
      });
    } catch (err) {
      console.error('Failed to log error to service:', err);
    }
  }

  // Reset error boundary state
  handleReset() {
    const { maxRetries = 3, onReset } = this.props;
    const { retryCount } = this.state;
    
    if (retryCount >= maxRetries) {
      // Too many retries, suggest full page reload
      if (window.confirm('The application has encountered multiple errors. Would you like to reload the page?')) {
        window.location.reload();
      }
      return;
    }
    
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      expanded: false,
      isAutoResetting: false,
      retryCount: prev.retryCount + 1
    }));
    
    if (onReset) {
      onReset();
    }
  }

  // Full page reload
  handleHardReset() {
    window.location.reload();
  }

  // Navigate home
  handleGoHome() {
    window.location.href = '/';
  }

  // Copy error details to clipboard
  handleCopyError() {
    const { error, errorInfo } = this.state;
    const errorDetails = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    navigator.clipboard.writeText(JSON.stringify(errorDetails, null, 2));
    // You can add a toast notification here
  }

  // Toggle expanded details
  toggleExpanded() {
    this.setState(prev => ({ expanded: !prev.expanded }));
  }

  render() {
    const {
      children,
      fallback,
      showDetails = true,
      showReportButton = true,
      maxRetries = 3,
      showResetButton = true,
      showHomeButton = true,
      autoResetDelay = null
    } = this.props;
    
    const {
      hasError,
      error,
      errorInfo,
      expanded,
      retryCount,
      isAutoResetting,
      offlineStatus
    } = this.state;

    // Custom fallback if provided
    if (hasError && fallback) {
      return fallback({ 
        error, 
        errorInfo, 
        reset: this.handleReset,
        hardReset: this.handleHardReset,
        retryCount,
        maxRetries
      });
    }

    if (!hasError) {
      return children;
    }

    // Render error UI
    return (
      <ErrorContainer>
        <ErrorCard elevation={0}>
          <ErrorHeader>
            <AnimatedIcon
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', duration: 0.5 }}
            >
              {this.getErrorIcon()}
            </AnimatedIcon>
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>
              {offlineStatus ? 'No Internet Connection' : 'Something Went Wrong'}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {this.getUserFriendlyMessage()}
            </Typography>
          </ErrorHeader>

          <ErrorContent>
            {retryCount > 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <AlertTitle>Retry Attempt {retryCount} of {maxRetries}</AlertTitle>
                {retryCount >= maxRetries ? (
                  'Multiple attempts failed. Please try reloading the page.'
                ) : (
                  `Auto-retrying... (${retryCount}/${maxRetries})`
                )}
              </Alert>
            )}

            {offlineStatus && (
              <Alert severity="info" icon={<OfflineIcon />} sx={{ mb: 2 }}>
                <AlertTitle>You're Offline</AlertTitle>
                Please check your internet connection and try again.
              </Alert>
            )}

            {showDetails && error && (
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={this.toggleExpanded}
                  endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  size="small"
                  sx={{ mb: 1 }}
                >
                  {expanded ? 'Hide' : 'Show'} Technical Details
                </Button>
                
                <Collapse in={expanded}>
                  <Box
                    sx={{
                      bgcolor: alpha('#000', 0.05),
                      borderRadius: 1,
                      p: 2,
                      fontFamily: 'monospace',
                      fontSize: 12,
                      overflowX: 'auto'
                    }}
                  >
                    <Typography variant="caption" color="error" component="div">
                      <strong>Error:</strong> {error.message}
                    </Typography>
                    {error.stack && (
                      <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        <strong>Stack Trace:</strong>
                        {error.stack}
                      </Typography>
                    )}
                    {errorInfo?.componentStack && (
                      <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                        <strong>Component Stack:</strong>
                        {errorInfo.componentStack}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip 
                        size="small" 
                        label={`Error Type: ${this.getErrorType()}`}
                        color={this.getErrorType() === ERROR_TYPES.NETWORK ? 'warning' : 'error'}
                      />
                      <Chip 
                        size="small" 
                        label={`Retry: ${retryCount}/${maxRetries}`}
                      />
                      {offlineStatus && (
                        <Chip 
                          size="small" 
                          label="Offline Mode"
                          color="warning"
                        />
                      )}
                    </Box>
                  </Box>
                </Collapse>
              </Box>
            )}

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              {showResetButton && (
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon />}
                  onClick={this.handleReset}
                  fullWidth
                  disabled={retryCount >= maxRetries}
                  sx={{
                    bgcolor: 'primary.main',
                    '&:hover': { bgcolor: 'primary.dark' }
                  }}
                >
                  {retryCount >= maxRetries ? 'Retry Failed' : 'Try Again'}
                </Button>
              )}
              
              {showHomeButton && (
                <Button
                  variant="outlined"
                  startIcon={<HomeIcon />}
                  onClick={this.handleGoHome}
                  fullWidth
                >
                  Go Home
                </Button>
              )}
            </Stack>

            {showReportButton && (
              <Button
                variant="text"
                startIcon={<BugIcon />}
                onClick={this.handleCopyError}
                size="small"
                sx={{ mt: 2, width: '100%' }}
              >
                Copy Error Details
              </Button>
            )}

            {autoResetDelay && isAutoResetting && (
              <LinearProgress sx={{ mt: 2 }} />
            )}
          </ErrorContent>
        </ErrorCard>
      </ErrorContainer>
    );
  }
}

// PropTypes
ErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.func,
  onError: PropTypes.func,
  onReset: PropTypes.func,
  resetKeys: PropTypes.array,
  showDetails: PropTypes.bool,
  showReportButton: PropTypes.bool,
  maxRetries: PropTypes.number,
  logToConsole: PropTypes.bool,
  logToService: PropTypes.bool,
  serviceEndpoint: PropTypes.string,
  showResetButton: PropTypes.bool,
  showHomeButton: PropTypes.bool,
  autoResetDelay: PropTypes.number,
  customErrorMessages: PropTypes.object
};

// Default props
ErrorBoundary.defaultProps = {
  showDetails: true,
  showReportButton: true,
  maxRetries: 3,
  logToConsole: true,
  logToService: false,
  showResetButton: true,
  showHomeButton: true,
  autoResetDelay: null,
  customErrorMessages: {}
};

// HOC to wrap components with error boundary
export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  return function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};

export default ErrorBoundary;