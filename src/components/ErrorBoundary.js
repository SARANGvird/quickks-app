// src/components/ErrorBoundary.js
import React from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Chip,
  Collapse,
  LinearProgress,
  Paper,
  Snackbar,
  Stack,
  Typography
} from '@mui/material';
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  Home as HomeIcon,
  BugReport as BugIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ReportProblem as WarningIcon,
  CloudOff as OfflineIcon,
  SystemUpdateAlt as UpdateIcon
} from '@mui/icons-material';
import { alpha, styled } from '@mui/material/styles';
import { MotionConfig, motion } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const RELEASE =
  process.env.REACT_APP_VERSION || process.env.REACT_APP_GIT_SHA || 'unknown';

const CHUNK_RELOAD_KEY = 'eb:chunk-reload-at';
const CHUNK_RELOAD_WINDOW_MS = 10000; // never auto-reload more than once per 10s
const REPORT_LIMIT_PER_SESSION = 10;
const REPORT_DEDUPE_WINDOW_MS = 60000;
const MAX_STACK_LENGTH = 8000;

export const ERROR_TYPES = Object.freeze({
  CHUNK: 'chunk',
  NETWORK: 'network',
  AUTH: 'auth',
  TIMEOUT: 'timeout',
  NOT_FOUND: 'notFound',
  MEMORY: 'memory',
  WEBSOCKET: 'websocket',
  UNKNOWN: 'unknown'
});

const DEFAULT_MESSAGES = {
  [ERROR_TYPES.CHUNK]:
    'A new version of the app is available. Please reload the page to continue.',
  [ERROR_TYPES.NETWORK]:
    'Unable to connect to the server. Please check your internet connection.',
  [ERROR_TYPES.AUTH]: 'Authentication error. Please try logging in again.',
  [ERROR_TYPES.TIMEOUT]: 'Request timed out. The server might be busy.',
  [ERROR_TYPES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_TYPES.MEMORY]:
    'The application is running low on memory. Reloading the page might help.',
  [ERROR_TYPES.WEBSOCKET]: 'Real-time connection lost. Please try again.',
  [ERROR_TYPES.UNKNOWN]: 'An unexpected error occurred.'
};

const CHUNK_PATTERN =
  /loading (css )?chunk [\w-]+ failed|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i;

/* -------------------------------------------------------------------------- */
/* Pure helpers                                                               */
/* -------------------------------------------------------------------------- */

// React lets you throw anything (string, undefined, object). Always work with an Error.
const normalizeError = thrown => {
  if (thrown instanceof Error) return thrown;
  let message;
  try {
    message =
      typeof thrown === 'string'
        ? thrown
        : JSON.stringify(thrown) ?? String(thrown);
  } catch {
    message = String(thrown);
  }
  const wrapped = new Error(message || 'Non-error value thrown');
  wrapped.name = 'NonErrorThrown';
  wrapped.original = thrown;
  return wrapped;
};

const classifyError = error => {
  if (!error) return ERROR_TYPES.UNKNOWN;

  const name = error.name || '';
  const message = error.message || '';
  const code = error.code;
  const status = error.status ?? error.response?.status;

  // Chunk check must come first: "Failed to fetch dynamically imported module"
  // would otherwise be classified as a network error.
  if (name === 'ChunkLoadError' || CHUNK_PATTERN.test(message)) {
    return ERROR_TYPES.CHUNK;
  }
  if (status === 401 || status === 403 || name === 'AuthError' || code === 'UNAUTHORIZED') {
    return ERROR_TYPES.AUTH;
  }
  if (status === 404 || code === 'NOT_FOUND') return ERROR_TYPES.NOT_FOUND;
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || name === 'TimeoutError') {
    return ERROR_TYPES.TIMEOUT;
  }
  if (name === 'NetworkError' || code === 'ERR_NETWORK') return ERROR_TYPES.NETWORK;

  if (/\b(unauthori[sz]ed|forbidden|token expired|not authenticated)\b/i.test(message)) {
    return ERROR_TYPES.AUTH;
  }
  if (/\btimed? ?out\b/i.test(message)) return ERROR_TYPES.TIMEOUT;
  if (/\b(network ?error|failed to fetch|connection (lost|refused|reset))\b/i.test(message)) {
    return ERROR_TYPES.NETWORK;
  }
  if (/\bweb ?socket\b/i.test(message)) return ERROR_TYPES.WEBSOCKET;
  if (/\b(out of memory|heap|allocation failed)\b/i.test(message)) {
    return ERROR_TYPES.MEMORY;
  }
  if (/\bnot found\b/i.test(message)) return ERROR_TYPES.NOT_FOUND;

  return ERROR_TYPES.UNKNOWN;
};

// Handles both formats:  "    at Name (file:1:2)"  (Chrome)  and  "    in Name (at file)"  (older React)
const parseComponentStack = (stack = '') =>
  [...String(stack).matchAll(/^\s*(?:at|in)\s+([^\s(]+)/gm)].map(match => match[1]);

// Query strings and hashes routinely contain tokens / PII, so never send them.
const getSafeUrl = () => {
  try {
    const { origin, pathname } = window.location;
    return `${origin}${pathname}`;
  } catch {
    return '';
  }
};

const generateErrorId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const truncate = (value, max = MAX_STACK_LENGTH) =>
  typeof value === 'string' && value.length > max ? `${value.slice(0, max)}…[truncated]` : value;

const haveKeysChanged = (prev = [], next = []) =>
  prev.length !== next.length || prev.some((key, index) => !Object.is(key, next[index]));

const legacyCopy = text => {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textarea);
  if (!ok) throw new Error('Copy command failed');
};

const copyText = async text => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to legacy path (insecure context / permission denied)
    }
  }
  legacyCopy(text);
};

// Guards against an infinite reload loop if the new chunk is also broken.
const tryChunkReload = () => {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < CHUNK_RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    window.location.reload();
    return true;
  } catch {
    return false;
  }
};

// Module-level so dedupe/rate limit survive boundary remounts.
const reportState = { count: 0, seen: new Map() };

const shouldReport = signature => {
  const now = Date.now();
  const last = reportState.seen.get(signature);
  if (last && now - last < REPORT_DEDUPE_WINDOW_MS) return false;
  if (reportState.count >= REPORT_LIMIT_PER_SESSION) return false;
  reportState.seen.set(signature, now);
  reportState.count += 1;
  return true;
};

const sendReport = (endpoint, payload) => {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(endpoint, blob)) return;
    }
  } catch {
    // fall back to fetch
  }
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'omit'
  }).catch(err => {
    if (!IS_PRODUCTION) console.warn('[ErrorBoundary] Failed to send report:', err);
  });
};

/* -------------------------------------------------------------------------- */
/* Styled components                                                          */
/* -------------------------------------------------------------------------- */

const ErrorContainer = styled(Box, {
  shouldForwardProp: prop => prop !== 'fullPage'
})(({ theme, fullPage }) => ({
  minHeight: fullPage ? '100vh' : 240,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: fullPage
    ? `linear-gradient(135deg, ${alpha(theme.palette.error.dark, 0.1)} 0%, ${alpha(
        theme.palette.background.default,
        0.95
      )} 100%)`
    : 'transparent',
  padding: theme.spacing(fullPage ? 3 : 2),
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
  boxShadow: theme.shadows[20]
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

// motion(Component) is deprecated in framer-motion v11+, motion.create replaces it.
const AnimatedIcon = (motion.create || motion)(Box);

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

class ErrorBoundary extends React.Component {
  state = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
    expanded: false,
    retryCount: 0,
    isAutoResetting: false,
    offlineStatus: false, // real value is read in componentDidMount (SSR safe)
    copyStatus: null // null | 'success' | 'error'
  };

  mounted = false;
  autoResetTimer = null;
  stableTimer = null;

  static getDerivedStateFromError(thrown) {
    return { hasError: true, error: normalizeError(thrown), isAutoResetting: false };
  }

  componentDidMount() {
    this.mounted = true;
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setState({ offlineStatus: true });
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Only react to resetKeys when the error was ALREADY showing before this update,
    // otherwise an error caused by the key change itself would be reset immediately.
    if (
      this.state.hasError &&
      prevState.hasError &&
      haveKeysChanged(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.resetBoundary({ countRetry: false, reason: 'keys' });
    }
  }

  componentWillUnmount() {
    this.mounted = false;
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.clearTimers();
  }

  componentDidCatch(thrown, errorInfo) {
    const error = normalizeError(thrown);
    const errorId = generateErrorId();
    const { onError, logToConsole, autoResetDelay, maxRetries, reloadOnChunkError } = this.props;
    const errorType = classifyError(error);

    this.clearTimers();
    this.setState({ errorInfo, errorId });

    if (logToConsole) {
      // Logged as strings so nothing gets collapsed/truncated in the console.
      console.error(
        `[ErrorBoundary] ${errorId} ${error.name}: ${JSON.stringify(error.message)} (type=${errorType})`
      );
      console.error(error.stack);
      console.error(`Component stack:${errorInfo?.componentStack || ' (unavailable)'}`);
    }

    if (typeof onError === 'function') {
      try {
        onError(error, errorInfo, { errorId, errorType });
      } catch (handlerError) {
        console.error('[ErrorBoundary] onError handler threw:', handlerError);
      }
    }

    this.reportError(error, errorInfo, errorId, errorType);

    // After a deploy, old tabs request chunk hashes that no longer exist.
    // A single guarded reload is the standard fix.
    if (errorType === ERROR_TYPES.CHUNK && reloadOnChunkError && tryChunkReload()) {
      return;
    }

    if (autoResetDelay && this.state.retryCount < maxRetries && errorType !== ERROR_TYPES.CHUNK) {
      this.setState({ isAutoResetting: true });
      this.autoResetTimer = setTimeout(() => {
        this.autoResetTimer = null;
        this.resetBoundary({ countRetry: true, reason: 'auto' });
      }, autoResetDelay);
    }
  }

  /* ----------------------------- event handlers ---------------------------- */

  handleOnline = () => this.setState({ offlineStatus: false });
  handleOffline = () => this.setState({ offlineStatus: true });

  handleReset = () => {
    if (this.state.retryCount >= this.props.maxRetries) return;
    this.resetBoundary({ countRetry: true, reason: 'manual' });
  };

  handleHardReset = () => window.location.reload();

  handleGoHome = () => {
    window.location.assign(this.props.homePath);
  };

  toggleExpanded = () => this.setState(prev => ({ expanded: !prev.expanded }));

  handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    const text = JSON.stringify(this.buildReport(error, errorInfo, errorId), null, 2);
    let copyStatus = 'success';
    try {
      await copyText(text);
    } catch {
      copyStatus = 'error';
    }
    if (this.mounted) this.setState({ copyStatus });
  };

  handleCloseSnackbar = () => this.setState({ copyStatus: null });

  /* -------------------------------- internals ------------------------------ */

  clearTimers() {
    if (this.autoResetTimer) {
      clearTimeout(this.autoResetTimer);
      this.autoResetTimer = null;
    }
    if (this.stableTimer) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
  }

  // countRetry=true  -> user/auto retry, counts toward maxRetries
  // countRetry=false -> a resetKeys change (e.g. route navigation), starts fresh
  resetBoundary({ countRetry, reason }) {
    this.clearTimers();

    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      expanded: false,
      isAutoResetting: false,
      copyStatus: null,
      retryCount: countRetry ? prev.retryCount + 1 : 0
    }));

    // If the children stay healthy for a while, forgive previous retries so that
    // unrelated errors hours apart don't permanently disable "Try Again".
    if (countRetry) {
      this.stableTimer = setTimeout(() => {
        this.stableTimer = null;
        if (this.mounted) this.setState({ retryCount: 0 });
      }, this.props.retryResetDelay);
    }

    if (typeof this.props.onReset === 'function') {
      this.props.onReset(reason);
    }
  }

  buildReport(error, errorInfo, errorId) {
    const safeError = error || normalizeError(undefined);
    return {
      errorId,
      name: safeError.name,
      message: safeError.message,
      type: classifyError(safeError),
      stack: truncate(safeError.stack),
      componentStack: truncate(errorInfo?.componentStack),
      components: parseComponentStack(errorInfo?.componentStack).slice(0, 15),
      url: getSafeUrl(),
      release: this.props.release,
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      retryCount: this.state.retryCount,
      online: typeof navigator !== 'undefined' ? navigator.onLine : null
    };
  }

  reportError(error, errorInfo, errorId) {
    const { logToService, serviceEndpoint } = this.props;
    if (!logToService || !serviceEndpoint) return;

    const signature = `${error.name}|${error.message}|${parseComponentStack(errorInfo?.componentStack)[0] || ''}`;
    if (!shouldReport(signature)) return;

    try {
      sendReport(serviceEndpoint, this.buildReport(error, errorInfo, errorId));
    } catch (err) {
      if (!IS_PRODUCTION) console.warn('[ErrorBoundary] Report failed:', err);
    }
  }

  getUserFriendlyMessage(errorType) {
    const { customErrorMessages } = this.props;
    if (this.state.offlineStatus) {
      return 'No internet connection. Please check your network and try again.';
    }
    return (
      customErrorMessages[errorType] ||
      DEFAULT_MESSAGES[errorType] ||
      DEFAULT_MESSAGES[ERROR_TYPES.UNKNOWN]
    );
  }

  getErrorIcon(errorType) {
    const iconSx = { fontSize: 60 };
    if (this.state.offlineStatus || errorType === ERROR_TYPES.NETWORK) {
      return <OfflineIcon sx={iconSx} />;
    }
    if (errorType === ERROR_TYPES.CHUNK) return <UpdateIcon sx={iconSx} />;
    if (errorType === ERROR_TYPES.AUTH) return <WarningIcon sx={iconSx} />;
    return <ErrorIcon sx={iconSx} />;
  }

  getTitle(errorType) {
    if (this.state.offlineStatus) return 'No Internet Connection';
    if (errorType === ERROR_TYPES.CHUNK) return 'Update Available';
    return 'Something Went Wrong';
  }

  /* --------------------------------- render -------------------------------- */

  render() {
    const {
      children,
      fallback,
      variant,
      showDetails,
      showReportButton,
      showResetButton,
      showHomeButton,
      maxRetries
    } = this.props;
    const { hasError, error, errorInfo, errorId, expanded, retryCount, isAutoResetting, offlineStatus, copyStatus } =
      this.state;

    if (!hasError) return children;

    if (typeof fallback === 'function') {
      return fallback({
        error,
        errorInfo,
        errorId,
        reset: this.handleReset,
        hardReset: this.handleHardReset,
        retryCount,
        maxRetries
      });
    }

    const errorType = classifyError(error);
    const retriesExhausted = retryCount >= maxRetries;
    const canRetry = showResetButton && !retriesExhausted && errorType !== ERROR_TYPES.CHUNK;
    const showReload = !canRetry; // exhausted retries, chunk error, or retry button hidden
    const displayMessage = error?.message || '(no message)';

    return (
      <MotionConfig reducedMotion="user">
        <ErrorContainer fullPage={variant === 'page'}>
          <ErrorCard elevation={0} role="alert" aria-live="assertive">
            <ErrorHeader>
              <AnimatedIcon
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 0.5 }}
                aria-hidden="true"
              >
                {this.getErrorIcon(errorType)}
              </AnimatedIcon>
              <Typography variant="h5" component="h1" sx={{ mt: 2, fontWeight: 600 }}>
                {this.getTitle(errorType)}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                {this.getUserFriendlyMessage(errorType)}
              </Typography>
            </ErrorHeader>

            <ErrorContent>
              {isAutoResetting && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <AlertTitle>Retrying automatically…</AlertTitle>
                  We will try to recover in a moment.
                </Alert>
              )}

              {!isAutoResetting && retryCount > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <AlertTitle>
                    Retry attempt {Math.min(retryCount, maxRetries)} of {maxRetries}
                  </AlertTitle>
                  {retriesExhausted
                    ? 'Multiple attempts failed. Please reload the page.'
                    : 'The problem is still there. You can try again.'}
                </Alert>
              )}

              {offlineStatus && (
                <Alert severity="info" icon={<OfflineIcon />} sx={{ mb: 2 }}>
                  <AlertTitle>You&apos;re Offline</AlertTitle>
                  Please check your internet connection and try again.
                </Alert>
              )}

              {errorId && (
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  Error ID: <strong>{errorId}</strong> (share this with support)
                </Typography>
              )}

              {showDetails && error && (
                <Box sx={{ mt: 1 }}>
                  <Button
                    onClick={this.toggleExpanded}
                    endIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    size="small"
                    sx={{ mb: 1 }}
                    aria-expanded={expanded}
                  >
                    {expanded ? 'Hide' : 'Show'} Technical Details
                  </Button>

                  <Collapse in={expanded}>
                    <Box
                      sx={{
                        bgcolor: theme => alpha(theme.palette.text.primary, 0.06),
                        borderRadius: 1,
                        p: 2,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        overflowX: 'auto'
                      }}
                    >
                      <Typography variant="caption" color="error" component="div">
                        <strong>{error.name}:</strong> {displayMessage}
                      </Typography>
                      {error.stack && (
                        <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                          <strong>Stack Trace:</strong>
                          {'\n'}
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
                          label={`Error Type: ${errorType}`}
                          color={errorType === ERROR_TYPES.NETWORK ? 'warning' : 'error'}
                        />
                        <Chip size="small" label={`Retry: ${retryCount}/${maxRetries}`} />
                        <Chip size="small" label={`Release: ${this.props.release}`} />
                        {offlineStatus && <Chip size="small" label="Offline Mode" color="warning" />}
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
                {canRetry && (
                  <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleReset} fullWidth>
                    Try Again
                  </Button>
                )}

                {showReload && (
                  <Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleHardReset} fullWidth>
                    Reload Page
                  </Button>
                )}

                {showHomeButton && (
                  <Button variant="outlined" startIcon={<HomeIcon />} onClick={this.handleGoHome} fullWidth>
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

              {isAutoResetting && <LinearProgress sx={{ mt: 2 }} />}
            </ErrorContent>

            <Snackbar
              open={copyStatus !== null}
              autoHideDuration={3000}
              onClose={this.handleCloseSnackbar}
              message={
                copyStatus === 'success'
                  ? 'Error details copied to clipboard'
                  : 'Could not copy. Please select the text manually.'
              }
            />
          </ErrorCard>
        </ErrorContainer>
      </MotionConfig>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
  /** ({ error, errorInfo, errorId, reset, hardReset, retryCount, maxRetries }) => node */
  fallback: PropTypes.func,
  /** (error, errorInfo, { errorId, errorType }) => void. Plug Sentry/Datadog here. */
  onError: PropTypes.func,
  /** (reason: 'manual' | 'auto' | 'keys') => void */
  onReset: PropTypes.func,
  /** When any value changes while an error is showing, the boundary resets (e.g. [location.pathname]). */
  resetKeys: PropTypes.array,
  /** 'page' fills the viewport, 'inline' wraps a single widget. */
  variant: PropTypes.oneOf(['page', 'inline']),
  showDetails: PropTypes.bool,
  showReportButton: PropTypes.bool,
  showResetButton: PropTypes.bool,
  showHomeButton: PropTypes.bool,
  homePath: PropTypes.string,
  maxRetries: PropTypes.number,
  /** ms of healthy rendering after a retry before retryCount is forgiven. */
  retryResetDelay: PropTypes.number,
  autoResetDelay: PropTypes.number,
  logToConsole: PropTypes.bool,
  logToService: PropTypes.bool,
  serviceEndpoint: PropTypes.string,
  release: PropTypes.string,
  reloadOnChunkError: PropTypes.bool,
  customErrorMessages: PropTypes.object
};

ErrorBoundary.defaultProps = {
  variant: 'page',
  showDetails: !IS_PRODUCTION, // never show stack traces to end users in production
  showReportButton: true,
  showResetButton: true,
  showHomeButton: true,
  homePath: '/',
  maxRetries: 3,
  retryResetDelay: 30000,
  autoResetDelay: null,
  logToConsole: true,
  logToService: false,
  serviceEndpoint: null,
  release: RELEASE,
  reloadOnChunkError: true,
  customErrorMessages: {}
};

/* -------------------------------------------------------------------------- */
/* HOC                                                                        */
/* -------------------------------------------------------------------------- */

export const withErrorBoundary = (Component, errorBoundaryProps = {}) => {
  const WithErrorBoundary = props => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  WithErrorBoundary.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return WithErrorBoundary;
};

export default ErrorBoundary;
