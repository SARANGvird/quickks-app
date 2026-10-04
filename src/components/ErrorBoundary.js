// src/components/ErrorBoundary.js - v13.4 PRODUCTION FINAL - NO FRAMER BUG
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

const env = import.meta.env || {};
const IS_PRODUCTION = env.MODE === 'production';
const RELEASE = env.VITE_VERSION || '1.0.0';

const CHUNK_RELOAD_KEY = 'eb:chunk-reload-at';
const CHUNK_RELOAD_WINDOW_MS = 10000;
const REPORT_LIMIT_PER_SESSION = 10;
const REPORT_DEDUPE_WINDOW_MS = 60000;
const MAX_STACK_LENGTH = 8000;

export const ERROR_TYPES = Object.freeze({
  CHUNK: 'chunk', NETWORK: 'network', AUTH: 'auth', TIMEOUT: 'timeout',
  NOT_FOUND: 'notFound', MEMORY: 'memory', WEBSOCKET: 'websocket', UNKNOWN: 'unknown'
});

const DEFAULT_MESSAGES = {
  [ERROR_TYPES.CHUNK]: 'A new version is available. Please reload.',
  [ERROR_TYPES.NETWORK]: 'Unable to connect to server.',
  [ERROR_TYPES.AUTH]: 'Authentication error. Please login again.',
  [ERROR_TYPES.TIMEOUT]: 'Request timed out.',
  [ERROR_TYPES.NOT_FOUND]: 'Resource not found.',
  [ERROR_TYPES.MEMORY]: 'Low memory.',
  [ERROR_TYPES.WEBSOCKET]: 'Connection lost.',
  [ERROR_TYPES.UNKNOWN]: 'Unexpected error occurred.'
};

const CHUNK_PATTERN = /loading (css )?chunk [\w-]+ failed|failed to fetch dynamically imported module|importing a module script failed|error loading dynamically imported module/i;

const normalizeError = t => {
  if (t instanceof Error) return t;
  let m; try { m = typeof t === 'string'? t : JSON.stringify(t)?? String(t); } catch { m = String(t); }
  const w = new Error(m || 'Non-error thrown'); w.name = 'NonErrorThrown'; w.original = t; return w;
};
const classifyError = e => {
  if (!e) return ERROR_TYPES.UNKNOWN;
  const n = e.name || '', msg = e.message || '', c = e.code, s = e.status?? e.response?.status;
  if (n === 'ChunkLoadError' || CHUNK_PATTERN.test(msg)) return ERROR_TYPES.CHUNK;
  if (s === 401 || s === 403 || n === 'AuthError' || c === 'UNAUTHORIZED') return ERROR_TYPES.AUTH;
  if (s === 404 || c === 'NOT_FOUND') return ERROR_TYPES.NOT_FOUND;
  if (c === 'ECONNABORTED' || c === 'ETIMEDOUT' || n === 'TimeoutError') return ERROR_TYPES.TIMEOUT;
  if (n === 'NetworkError' || c === 'ERR_NETWORK') return ERROR_TYPES.NETWORK;
  if (/\b(unauthori[sz]ed|forbidden|token expired)\b/i.test(msg)) return ERROR_TYPES.AUTH;
  if (/\btimed??out\b/i.test(msg)) return ERROR_TYPES.TIMEOUT;
  if (/\b(network?error|failed to fetch)\b/i.test(msg)) return ERROR_TYPES.NETWORK;
  return ERROR_TYPES.UNKNOWN;
};
const parseComponentStack = (stack = '') => [...String(stack).matchAll(/^\s*(?:at|in)\s+([^\s(]+)/gm)].map(m => m[1]);
const getSafeUrl = () => { try { const { origin, pathname } = window.location; return `${origin}${pathname}`; } catch { return ''; } };
const generateErrorId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const truncate = (v, max = MAX_STACK_LENGTH) => typeof v === 'string' && v.length > max? `${v.slice(0, max)}…[truncated]` : v;
const haveKeysChanged = (p = [], n = []) => p.length!== n.length || p.some((k, i) =>!Object.is(k, n[i]));
const copyText = async t => {
  if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(t); return; } catch {} }
  const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
};
const tryChunkReload = () => {
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    if (Date.now() - last < CHUNK_RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now())); window.location.reload(); return true;
  } catch { return false; }
};

const ErrorContainer = styled(Box, { shouldForwardProp: p => p!== 'fullPage' })(({ theme, fullPage }) => ({
  minHeight: fullPage? '100vh' : 240, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: fullPage? `linear-gradient(135deg, ${alpha(theme.palette.error.dark, 0.1)} 0%, ${alpha(theme.palette.background.default, 0.95)} 100%)` : 'transparent',
  padding: theme.spacing(fullPage? 3 : 2)
}));
const ErrorCard = styled(Paper)(({ theme }) => ({ maxWidth: 550, width: '100%', borderRadius: theme.shape.borderRadius * 2, overflow: 'hidden', boxShadow: theme.shadows[20] }));
const ErrorHeader = styled(Box)(({ theme }) => ({ background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`, padding: theme.spacing(3), textAlign: 'center', color: theme.palette.error.contrastText }));
const ErrorContent = styled(Box)(({ theme }) => ({ padding: theme.spacing(4) }));

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null, errorInfo: null, errorId: null, expanded: false, retryCount: 0, isAutoResetting: false, offlineStatus: false, copyStatus: null };
  mounted = false; autoResetTimer = null;
  static getDerivedStateFromError(thrown) { return { hasError: true, error: normalizeError(thrown), isAutoResetting: false }; }
  componentDidMount() {
    this.mounted = true;
    window.addEventListener('online', this.handleOnline); window.addEventListener('offline', this.handleOffline);
    if (typeof navigator!== 'undefined' && navigator.onLine === false) this.setState({ offlineStatus: true });
  }
  componentDidUpdate(prevProps, prevState) {
    if (this.state.hasError && prevState.hasError && haveKeysChanged(prevProps.resetKeys, this.props.resetKeys)) {
      this.resetBoundary({ countRetry: false });
    }
  }
  componentWillUnmount() {
    this.mounted = false; window.removeEventListener('online', this.handleOnline); window.removeEventListener('offline', this.handleOffline);
    if (this.autoResetTimer) clearTimeout(this.autoResetTimer);
  }
  componentDidCatch(thrown, errorInfo) {
    const error = normalizeError(thrown); const errorId = generateErrorId();
    const { onError, logToConsole, autoResetDelay, maxRetries, reloadOnChunkError } = this.props;
    const errorType = classifyError(error);
    this.setState({ errorInfo, errorId });
    if (logToConsole) console.error(`[ErrorBoundary] ${errorId}`, error);
    if (typeof onError === 'function') { try { onError(error, errorInfo, { errorId, errorType }); } catch {} }
    if (errorType === ERROR_TYPES.CHUNK && reloadOnChunkError && tryChunkReload()) return;
    if (autoResetDelay && this.state.retryCount < maxRetries && errorType!== ERROR_TYPES.CHUNK) {
      this.setState({ isAutoResetting: true });
      this.autoResetTimer = setTimeout(() => { this.resetBoundary({ countRetry: true }); }, autoResetDelay);
    }
  }
  handleOnline = () => this.setState({ offlineStatus: false });
  handleOffline = () => this.setState({ offlineStatus: true });
  handleReset = () => { if (this.state.retryCount >= this.props.maxRetries) return; this.resetBoundary({ countRetry: true }); };
  handleHardReset = () => window.location.reload();
  handleGoHome = () => window.location.assign(this.props.homePath);
  toggleExpanded = () => this.setState(p => ({ expanded:!p.expanded }));
  handleCopyError = async () => {
    const { error, errorInfo, errorId } = this.state;
    const report = { errorId, name: error?.name, message: error?.message, stack: truncate(error?.stack), componentStack: truncate(errorInfo?.componentStack), url: getSafeUrl(), release: RELEASE, time: new Date().toISOString() };
    try { await copyText(JSON.stringify(report, null, 2)); this.setState({ copyStatus: 'success' }); } catch { this.setState({ copyStatus: 'error' }); }
  };
  handleCloseSnackbar = () => this.setState({ copyStatus: null });
  resetBoundary({ countRetry }) {
    this.setState(p => ({ hasError: false, error: null, errorInfo: null, errorId: null, expanded: false, isAutoResetting: false, copyStatus: null, retryCount: countRetry? p.retryCount + 1 : 0 }));
    if (typeof this.props.onReset === 'function') this.props.onReset();
  }
  getUserFriendlyMessage(t) {
    if (this.state.offlineStatus) return 'No internet connection.';
    return this.props.customErrorMessages[t] || DEFAULT_MESSAGES[t] || DEFAULT_MESSAGES.UNKNOWN;
  }
  getErrorIcon(t) {
    const sx = { fontSize: 60 };
    if (this.state.offlineStatus || t === ERROR_TYPES.NETWORK) return <OfflineIcon sx={sx} />;
    if (t === ERROR_TYPES.CHUNK) return <UpdateIcon sx={sx} />;
    if (t === ERROR_TYPES.AUTH) return <WarningIcon sx={sx} />;
    return <ErrorIcon sx={sx} />;
  }
  getTitle(t) {
    if (this.state.offlineStatus) return 'No Internet'; if (t === ERROR_TYPES.CHUNK) return 'Update Available'; return 'Something Went Wrong';
  }
  render() {
    const { children, fallback, variant, showDetails, showReportButton, showResetButton, showHomeButton, maxRetries } = this.props;
    const { hasError, error, errorId, expanded, retryCount, isAutoResetting, offlineStatus, copyStatus } = this.state;
    if (!hasError) return children;
    if (typeof fallback === 'function') return fallback({ error, errorId, reset: this.handleReset, hardReset: this.handleHardReset, retryCount, maxRetries });
    const errorType = classifyError(error);
    const canRetry = showResetButton && retryCount < maxRetries && errorType!== ERROR_TYPES.CHUNK;
    const showReload =!canRetry;
    return (
      <ErrorContainer fullPage={variant === 'page'}>
        <ErrorCard elevation={0} role="alert">
          <ErrorHeader>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>{this.getErrorIcon(errorType)}</Box>
            <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>{this.getTitle(errorType)}</Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>{this.getUserFriendlyMessage(errorType)}</Typography>
          </ErrorHeader>
          <ErrorContent>
            {errorId && (<Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Error ID: <strong>{errorId}</strong></Typography>)}
            {showDetails && error && (
              <Box sx={{ mt: 1 }}>
                <Button onClick={this.toggleExpanded} endIcon={expanded? <ExpandLessIcon /> : <ExpandMoreIcon />} size="small">{expanded? 'Hide' : 'Show'} Details</Button>
                <Collapse in={expanded}>
                  <Box sx={{ bgcolor: theme => alpha(theme.palette.text.primary, 0.06), borderRadius: 1, p: 2, fontFamily: 'monospace', fontSize: 12, overflowX: 'auto', mt: 1 }}>
                    <Typography variant="caption" color="error" component="div"><strong>{error.name}:</strong> {error.message}</Typography>
                    {error.stack && <Typography variant="caption" component="pre" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>{error.stack.slice(0, 2000)}</Typography>}
                  </Box>
                </Collapse>
              </Box>
            )}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 3 }}>
              {canRetry && (<Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleReset} fullWidth>Try Again</Button>)}
              {showReload && (<Button variant="contained" startIcon={<RefreshIcon />} onClick={this.handleHardReset} fullWidth>Reload Page</Button>)}
              {showHomeButton && (<Button variant="outlined" startIcon={<HomeIcon />} onClick={this.handleGoHome} fullWidth>Go Home</Button>)}
            </Stack>
            {showReportButton && (<Button variant="text" startIcon={<BugIcon />} onClick={this.handleCopyError} size="small" sx={{ mt: 2, width: '100%' }}>Copy Details</Button>)}
            {isAutoResetting && <LinearProgress sx={{ mt: 2 }} />}
          </ErrorContent>
          <Snackbar open={copyStatus!== null} autoHideDuration={3000} onClose={this.handleCloseSnackbar} message={copyStatus === 'success'? 'Copied' : 'Copy failed'} />
        </ErrorCard>
      </ErrorContainer>
    );
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node, fallback: PropTypes.func, onError: PropTypes.func, onReset: PropTypes.func,
  resetKeys: PropTypes.array, variant: PropTypes.oneOf(['page', 'inline']), showDetails: PropTypes.bool,
  showReportButton: PropTypes.bool, showResetButton: PropTypes.bool, showHomeButton: PropTypes.bool,
  homePath: PropTypes.string, maxRetries: PropTypes.number, retryResetDelay: PropTypes.number,
  autoResetDelay: PropTypes.number, logToConsole: PropTypes.bool, release: PropTypes.string,
  reloadOnChunkError: PropTypes.bool, customErrorMessages: PropTypes.object
};
ErrorBoundary.defaultProps = {
  variant: 'page', showDetails:!IS_PRODUCTION, showReportButton: true, showResetButton: true, showHomeButton: true,
  homePath: '/', maxRetries: 3, retryResetDelay: 30000, autoResetDelay: null, logToConsole: true,
  release: RELEASE, reloadOnChunkError: true, customErrorMessages: {}
};
export const withErrorBoundary = (Component, props = {}) => {
  const With = p => (<ErrorBoundary {...props}><Component {...p} /></ErrorBoundary>);
  With.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;
  return With;
};
export default ErrorBoundary;