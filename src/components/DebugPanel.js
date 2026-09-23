// src/components/DebugPanel.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Collapse,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  LinearProgress,
  Tooltip,
  Snackbar,
  Tabs,
  Tab,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel
} from "@mui/material";
import {
  Close as CloseIcon,
  BugReport as BugIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  ExpandMore as ExpandMoreIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Api as ApiIcon,
  Speed as SpeedIcon,
  CopyAll as CopyIcon,
  Clear as ClearIcon,
  Terminal as TerminalIcon
} from "@mui/icons-material";
import { styled, alpha } from "@mui/material/styles";
import api, { 
  isAuthenticated, 
  getCurrentUser, 
  getToken, 
  debugBookings, 
  testConnection,
  getApiBaseUrl
} from "../api/api";

// Styled Components
const DebugContainer = styled(Paper)(({ theme, isOpen }) => ({
  position: "fixed",
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  width: isOpen ? 500 : "auto",
  maxWidth: "calc(100vw - 32px)",
  maxHeight: "calc(100vh - 32px)",
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius * 2,
  boxShadow: theme.shadows[10],
  zIndex: 9999,
  transition: "all 0.3s ease",
  overflow: "hidden",
  [theme.breakpoints.down("sm")]: {
    width: isOpen ? "calc(100vw - 32px)" : "auto",
    bottom: theme.spacing(1),
    right: theme.spacing(1)
  }
}));

const Header = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: theme.spacing(1.5, 2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  cursor: "move",
  userSelect: "none"
}));

const Content = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  maxHeight: "calc(80vh - 60px)",
  overflowY: "auto",
  "&::-webkit-scrollbar": {
    width: "6px",
    height: "6px"
  },
  "&::-webkit-scrollbar-track": {
    background: theme.palette.grey[200],
    borderRadius: "3px"
  },
  "&::-webkit-scrollbar-thumb": {
    background: theme.palette.primary.light,
    borderRadius: "3px",
    "&:hover": {
      background: theme.palette.primary.main
    }
  }
}));

const StatusChip = styled(Chip)(({ theme, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case "success":
        return theme.palette.success;
      case "error":
        return theme.palette.error;
      case "warning":
        return theme.palette.warning;
      default:
        return theme.palette.info;
    }
  };

  const color = getStatusColor();
  
  return {
    backgroundColor: alpha(color.main, 0.1),
    color: color.main,
    fontWeight: 500,
    "& .MuiChip-icon": {
      color: color.main
    }
  };
});

const JsonPreview = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.grey[100],
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(1.5),
  fontFamily: "monospace",
  fontSize: "12px",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
  maxHeight: "300px",
  overflowY: "auto",
  position: "relative"
}));

const DebugPanel = ({ 
  onClose, 
  defaultOpen = false,
  position = "bottom-right",
  showToggle = true,
  autoRefresh = false,
  refreshInterval = 5000,
  maxLogEntries = 100,
  enableLogging = true
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [activeTab, setActiveTab] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);
  const [logs, setLogs] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    auth: true,
    connection: true,
    bookings: true,
    debug: true,
    localStorage: false,
    session: false
  });
  
  const refreshTimerRef = useRef(null);
  const containerRef = useRef(null);
  const dragStartPos = useRef(null);
  const dragStartOffset = useRef(null);

  // Add log entry
  const addLog = useCallback((level, message, data = null) => {
    if (!enableLogging) return;
    
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      level, // 'info', 'success', 'warning', 'error'
      message,
      data
    };
    
    setLogs(prev => [newLog, ...prev].slice(0, maxLogEntries));
  }, [enableLogging, maxLogEntries]);

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog("info", "Logs cleared");
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSnackbar({ open: true, message: "Copied to clipboard!", severity: "success" });
    }).catch(() => {
      setSnackbar({ open: true, message: "Failed to copy", severity: "error" });
    });
  };

  // Run debug tests
  const runDebug = useCallback(async () => {
    setLoading(true);
    setError(null);
    addLog("info", "Starting debug tests...");
    
    const info = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeEnv: process.env.NODE_ENV,
        apiUrl: getApiBaseUrl?.() || process.env.REACT_APP_API_URL,
        appVersion: process.env.REACT_APP_VERSION || "1.0.0",
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`
      },
      authentication: {
        isAuthenticated: isAuthenticated(),
        hasToken: !!getToken(),
        tokenPreview: getToken() ? getToken().substring(0, 30) + "..." : "No token",
        tokenExpiry: getToken() ? "Not implemented" : "N/A",
        currentUser: getCurrentUser()
      },
      localStorage: {
        auth: localStorage.getItem("auth"),
        token: localStorage.getItem("token"),
        user: localStorage.getItem("user"),
        hasAuth: !!localStorage.getItem("auth"),
        hasToken: !!localStorage.getItem("token"),
        hasUser: !!localStorage.getItem("user")
      },
      sessionStorage: {
        items: Object.keys(sessionStorage).reduce((acc, key) => {
          acc[key] = sessionStorage.getItem(key);
          return acc;
        }, {})
      },
      tests: {}
    };

    // Test 1: API Connection
    addLog("info", "Testing API connection...");
    try {
      const connectionOk = await testConnection();
      info.tests.connection = { 
        success: connectionOk,
        timestamp: new Date().toISOString(),
        responseTime: null // Could add timing
      };
      addLog(connectionOk ? "success" : "error", 
        `API connection: ${connectionOk ? "OK" : "Failed"}`);
    } catch (e) {
      info.tests.connection = { 
        success: false, 
        error: e.message,
        stack: e.stack
      };
      addLog("error", `API connection failed: ${e.message}`);
    }

    // Test 2: My Bookings
    addLog("info", "Fetching user bookings...");
    try {
      const response = await api.get("/api/bookings/my-bookings");
      info.tests.myBookings = {
        success: true,
        count: response.data?.length || 0,
        data: response.data,
        timestamp: new Date().toISOString()
      };
      addLog("success", `Found ${info.tests.myBookings.count} bookings`);
    } catch (e) {
      info.tests.myBookings = {
        success: false,
        error: e.message || e.error,
        details: e,
        status: e.response?.status,
        statusText: e.response?.statusText
      };
      addLog("error", `Failed to fetch bookings: ${e.message}`);
    }

    // Test 3: Debug Endpoint
    addLog("info", "Fetching debug info...");
    try {
      const debugData = await debugBookings();
      info.tests.debug = {
        success: true,
        data: debugData,
        timestamp: new Date().toISOString()
      };
      addLog("success", "Debug endpoint OK");
    } catch (e) {
      info.tests.debug = {
        success: false,
        error: e.message || e.error,
        status: e.response?.status
      };
      addLog("error", `Debug endpoint failed: ${e.message}`);
    }

    // Test 4: Performance Metrics
    info.tests.performance = {
      memory: performance.memory ? {
        usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1048576),
        totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1048576),
        jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      } : null,
      navigation: performance.getEntriesByType("navigation")[0],
      timing: performance.timing ? {
        pageLoad: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
      } : null
    };

    setDebugInfo(info);
    setLoading(false);
    addLog("success", "Debug tests completed");
  }, [addLog]);

  // Auto refresh
  useEffect(() => {
    if (autoRefreshEnabled && isOpen) {
      refreshTimerRef.current = setInterval(() => {
        runDebug();
      }, refreshInterval);
    }
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefreshEnabled, refreshInterval, isOpen, runDebug]);

  // Initial run
  useEffect(() => {
    if (isOpen) {
      runDebug();
    }
  }, [isOpen, runDebug]);

  // Drag functionality
  const handleMouseDown = (e) => {
    if (e.target.closest(".no-drag")) return;
    
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    dragStartOffset.current = {
      right: parseInt(containerRef.current?.style.right) || 16,
      bottom: parseInt(containerRef.current?.style.bottom) || 16
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseMove = (e) => {
    if (!dragStartPos.current || !containerRef.current) return;
    
    const deltaX = dragStartPos.current.x - e.clientX;
    const deltaY = dragStartPos.current.y - e.clientY;
    
    const newRight = Math.max(0, Math.min(100, dragStartOffset.current.right + deltaX));
    const newBottom = Math.max(0, Math.min(100, dragStartOffset.current.bottom + deltaY));
    
    containerRef.current.style.right = `${newRight}px`;
    containerRef.current.style.bottom = `${newBottom}px`;
  };

  const handleMouseUp = () => {
    dragStartPos.current = null;
    dragStartOffset.current = null;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Export debug data
  const exportDebugData = () => {
    if (!debugInfo) return;
    
    const dataStr = JSON.stringify(debugInfo, null, 2);
    const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `debug-data-${new Date().toISOString()}.json`;
    
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
    
    addLog("success", "Debug data exported");
  };

  // Tab panel component
  const TabPanel = ({ children, value, index }) => (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );

  // Render status indicator
  const renderStatusIndicator = (success) => {
    if (success === undefined) return null;
    return success ? (
      <SuccessIcon sx={{ fontSize: 16, color: "success.main" }} />
    ) : (
      <ErrorIcon sx={{ fontSize: 16, color: "error.main" }} />
    );
  };

  if (!isOpen) {
    return (
      <DebugContainer isOpen={false}>
        <Tooltip title="Open Debug Panel">
          <IconButton 
            onClick={() => setIsOpen(true)}
            sx={{ 
              m: 1,
              backgroundColor: "primary.main",
              color: "white",
              "&:hover": {
                backgroundColor: "primary.dark"
              }
            }}
          >
            <BugIcon />
          </IconButton>
        </Tooltip>
      </DebugContainer>
    );
  }

  return (
    <>
      <DebugContainer 
        ref={containerRef}
        isOpen={true}
        style={{ position: "fixed", right: 16, bottom: 16 }}
      >
        <Header onMouseDown={handleMouseDown}>
          <Box display="flex" alignItems="center" gap={1}>
            <BugIcon fontSize="small" />
            <Typography variant="subtitle2" fontWeight={600}>
              Debug Panel
            </Typography>
            {loading && <LinearProgress sx={{ width: 60, ml: 1 }} />}
          </Box>
          <Box display="flex" alignItems="center" gap={0.5}>
            <Tooltip title="Export Data">
              <IconButton 
                size="small" 
                onClick={exportDebugData}
                disabled={!debugInfo}
                sx={{ color: "white" }}
                className="no-drag"
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear Logs">
              <IconButton 
                size="small" 
                onClick={clearLogs}
                sx={{ color: "white" }}
                className="no-drag"
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Close">
              <IconButton 
                size="small" 
                onClick={() => setIsOpen(false)}
                sx={{ color: "white" }}
                className="no-drag"
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Header>

        <Content>
          <Tabs 
            value={activeTab} 
            onChange={(e, v) => setActiveTab(v)}
            sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Tests" />
            <Tab label="Logs" />
            <Tab label="Environment" />
            <Tab label="Storage" />
          </Tabs>

          {/* Tests Tab */}
          <TabPanel value={activeTab} index={0}>
            <Box display="flex" gap={1} mb={2}>
              <Button
                variant="contained"
                onClick={runDebug}
                disabled={loading}
                startIcon={loading ? <RefreshIcon /> : <BugIcon />}
                fullWidth
              >
                {loading ? "Running Tests..." : "Run Debug Tests"}
              </Button>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {error}
              </Alert>
            )}

            {debugInfo && (
              <>
                {/* Authentication Section */}
                <Accordion 
                  expanded={expandedSections.auth}
                  onChange={() => toggleSection("auth")}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <SecurityIcon fontSize="small" />
                      <Typography fontWeight={500}>Authentication</Typography>
                      {renderStatusIndicator(debugInfo.authentication.isAuthenticated)}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense>
                      <ListItem>
                        <ListItemText 
                          primary="Status"
                          secondary={debugInfo.authentication.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="User ID"
                          secondary={debugInfo.authentication.currentUser?.userId || "None"}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="User Name"
                          secondary={debugInfo.authentication.currentUser?.name || "None"}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText 
                          primary="Token Preview"
                          secondary={debugInfo.authentication.tokenPreview}
                          secondaryTypographyProps={{ style: { fontSize: 11, fontFamily: "monospace" } }}
                        />
                      </ListItem>
                    </List>
                  </AccordionDetails>
                </Accordion>

                {/* Connection Test Section */}
                <Accordion 
                  expanded={expandedSections.connection}
                  onChange={() => toggleSection("connection")}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <ApiIcon fontSize="small" />
                      <Typography fontWeight={500}>API Connection</Typography>
                      {renderStatusIndicator(debugInfo.tests.connection?.success)}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {debugInfo.tests.connection?.success ? (
                      <Alert severity="success" icon={<SuccessIcon />}>
                        API connection successful
                      </Alert>
                    ) : (
                      <Alert severity="error" icon={<ErrorIcon />}>
                        Connection failed: {debugInfo.tests.connection?.error}
                      </Alert>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      API URL: {debugInfo.environment?.apiUrl}
                    </Typography>
                  </AccordionDetails>
                </Accordion>

                {/* Bookings Section */}
                <Accordion 
                  expanded={expandedSections.bookings}
                  onChange={() => toggleSection("bookings")}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <StorageIcon fontSize="small" />
                      <Typography fontWeight={500}>Bookings</Typography>
                      {renderStatusIndicator(debugInfo.tests.myBookings?.success)}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    {debugInfo.tests.myBookings?.success ? (
                      <>
                        <Alert severity="success" sx={{ mb: 2 }}>
                          Found {debugInfo.tests.myBookings.count} bookings
                        </Alert>
                        {debugInfo.tests.myBookings.count > 0 && (
                          <Box>
                            <Typography variant="body2" fontWeight={500} gutterBottom>
                              Recent Bookings:
                            </Typography>
                            <JsonPreview>
                              {JSON.stringify(debugInfo.tests.myBookings.data?.slice(0, 5), null, 2)}
                            </JsonPreview>
                          </Box>
                        )}
                      </>
                    ) : (
                      <Alert severity="error">
                        Failed to fetch bookings: {debugInfo.tests.myBookings?.error}
                      </Alert>
                    )}
                  </AccordionDetails>
                </Accordion>

                {/* Advanced Section */}
                <FormControlLabel
                  control={
                    <Switch 
                      checked={showAdvanced} 
                      onChange={(e) => setShowAdvanced(e.target.checked)}
                    />
                  }
                  label="Show Advanced Details"
                  sx={{ mt: 1, mb: 1 }}
                />

                {showAdvanced && (
                  <Accordion expanded={true}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography fontWeight={500}>Advanced Debug Info</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <JsonPreview>
                        {JSON.stringify(debugInfo.tests.debug?.data, null, 2)}
                      </JsonPreview>
                    </AccordionDetails>
                  </Accordion>
                )}
              </>
            )}
          </TabPanel>

          {/* Logs Tab */}
          <TabPanel value={activeTab} index={1}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="text.secondary">
                {logs.length} entries
              </Typography>
              <Tooltip title="Clear Logs">
                <IconButton size="small" onClick={clearLogs}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            
            {logs.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No logs yet. Run tests to see output.
              </Typography>
            ) : (
              logs.map(log => (
                <Box 
                  key={log.id} 
                  sx={{ 
                    mb: 1, 
                    p: 1, 
                    borderRadius: 1,
                    backgroundColor: alpha(
                      log.level === "error" ? "#f44336" :
                      log.level === "warning" ? "#ff9800" :
                      log.level === "success" ? "#4caf50" : "#2196f3",
                      0.05
                    ),
                    borderLeft: 3,
                    borderColor: log.level === "error" ? "#f44336" :
                                 log.level === "warning" ? "#ff9800" :
                                 log.level === "success" ? "#4caf50" : "#2196f3"
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {log.message}
                  </Typography>
                  {log.data && (
                    <JsonPreview sx={{ mt: 1, fontSize: 10 }}>
                      {JSON.stringify(log.data, null, 2)}
                    </JsonPreview>
                  )}
                </Box>
              ))
            )}
          </TabPanel>

          {/* Environment Tab */}
          <TabPanel value={activeTab} index={2}>
            {debugInfo && (
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="Environment"
                    secondary={debugInfo.environment?.nodeEnv || "N/A"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="API URL"
                    secondary={debugInfo.environment?.apiUrl || "N/A"}
                    secondaryTypographyProps={{ style: { fontSize: 11 } }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="App Version"
                    secondary={debugInfo.environment?.appVersion || "N/A"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Browser"
                    secondary={debugInfo.environment?.userAgent?.split(" ").slice(-2).join(" ") || "N/A"}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="Screen Size"
                    secondary={debugInfo.environment?.screenSize || "N/A"}
                  />
                </ListItem>
                <Divider sx={{ my: 1 }} />
                <ListItem>
                  <ListItemText 
                    primary="Memory Usage"
                    secondary={debugInfo.tests.performance?.memory ? 
                      `${debugInfo.tests.performance.memory.usedJSHeapSize}MB / ${debugInfo.tests.performance.memory.totalJSHeapSize}MB` : 
                      "Not available"}
                  />
                </ListItem>
              </List>
            )}
          </TabPanel>

          {/* Storage Tab */}
          <TabPanel value={activeTab} index={3}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={500}>Local Storage</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {debugInfo?.localStorage && (
                  <JsonPreview>
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(debugInfo.localStorage)
                          .filter(([key]) => key !== "token" && key !== "auth")
                      ), 
                      null, 2
                    )}
                  </JsonPreview>
                )}
              </AccordionDetails>
            </Accordion>
            
            <Accordion defaultExpanded sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={500}>Session Storage</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {debugInfo?.sessionStorage && (
                  <JsonPreview>
                    {JSON.stringify(debugInfo.sessionStorage, null, 2)}
                  </JsonPreview>
                )}
              </AccordionDetails>
            </Accordion>
          </TabPanel>
        </Content>

        {/* Footer with Auto-refresh toggle */}
        <Box sx={{ p: 1.5, borderTop: 1, borderColor: "divider", display: "flex", justifyContent: "space-between" }}>
          <FormControlLabel
            control={
              <Switch 
                size="small"
                checked={autoRefreshEnabled} 
                onChange={(e) => setAutoRefreshEnabled(e.target.checked)}
              />
            }
            label="Auto-refresh"
          />
          <Typography variant="caption" color="text.secondary">
            {debugInfo?.timestamp && `Last run: ${new Date(debugInfo.timestamp).toLocaleTimeString()}`}
          </Typography>
        </Box>
      </DebugContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

DebugPanel.propTypes = {
  onClose: PropTypes.func,
  defaultOpen: PropTypes.bool,
  position: PropTypes.oneOf(["bottom-right", "bottom-left", "top-right", "top-left"]),
  showToggle: PropTypes.bool,
  autoRefresh: PropTypes.bool,
  refreshInterval: PropTypes.number,
  maxLogEntries: PropTypes.number,
  enableLogging: PropTypes.bool
};

DebugPanel.defaultProps = {
  defaultOpen: false,
  position: "bottom-right",
  showToggle: true,
  autoRefresh: false,
  refreshInterval: 5000,
  maxLogEntries: 100,
  enableLogging: true
};

export default React.memo(DebugPanel);