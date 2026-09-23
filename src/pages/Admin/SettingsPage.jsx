// src/pages/Admin/SettingsPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Grid,
  Switch,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  FormControlLabel,
  FormGroup,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Select,
  MenuItem,
  InputAdornment,
  Slider,
  Tab,
  Tabs,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from "@mui/material";
import {
  Settings,
  Security,
  Notifications,
  Payment,
  Email,
  Database,
  Backup,
  Palette,
  Language,
  Save,
  Refresh,
  RestartAlt,
  Warning,
  CheckCircle,
  Cancel,
  Visibility,
  VisibilityOff,
  Delete,
  Add,
  Remove,
  ExpandMore,
  AdminPanelSettings,
  Api,
  Storage,
  Webhook,
  CloudUpload,
  Download,
  Print
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const THEMES = [
  { value: "light", label: "Light", color: "#f8fafc" },
  { value: "dark", label: "Dark", color: "#0f172a" },
  { value: "system", label: "System Default", color: "#6366f1" }
];

const TIMEZONES = [
  { value: "Asia/Kolkata", label: "IST (India Standard Time)" },
  { value: "UTC", label: "UTC" },
  { value: "America/New_York", label: "EST (Eastern Time)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Asia/Dubai", label: "GST (Dubai)" }
];

const DATE_FORMATS = [
  { value: "MM/dd/yyyy", label: "MM/DD/YYYY" },
  { value: "dd/MM/yyyy", label: "DD/MM/YYYY" },
  { value: "yyyy-MM-dd", label: "YYYY-MM-DD" }
];

const CURRENCIES = [
  { value: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "GBP", label: "British Pound (£)", symbol: "£" }
];

// ==========================================================
// SETTINGS SECTION COMPONENT
// ==========================================================
const SettingsSection = ({ title, icon, children }) => (
  <Card sx={{ mb: 3 }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {icon}
        <Typography variant="h6" fontWeight="bold">
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 2 }} />
      {children}
    </CardContent>
  </Card>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function SettingsPage() {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "Quickks",
    siteDescription: "Professional Service Booking Platform",
    siteLogo: null,
    favicon: null,
    maintenanceMode: false,
    maintenanceMessage: "We are currently undergoing maintenance. Please check back soon.",
    allowNewRegistrations: true,
    defaultBookingDuration: 60,
    timezone: "Asia/Kolkata",
    dateFormat: "dd/MM/yyyy",
    currency: "INR"
  });
  
  // Business Settings
  const [businessSettings, setBusinessSettings] = useState({
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    gstNumber: "",
    panNumber: ""
  });
  
  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    adminAlertEmail: "",
    newBookingAlert: true,
    newRegistrationAlert: true,
    complaintAlert: true,
    dailyDigest: true,
    weeklyReport: true
  });
  
  // Payment Settings
  const [paymentSettings, setPaymentSettings] = useState({
    razorpayKeyId: "",
    razorpayKeySecret: "",
    stripePublishableKey: "",
    stripeSecretKey: "",
    platformFeePercent: 10,
    minWithdrawalAmount: 500,
    enableTestMode: false,
    testModeKey: ""
  });
  
  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
    ipWhitelist: "",
    enableAuditLog: true
  });
  
  // API Settings
  const [apiSettings, setApiSettings] = useState({
    apiKey: "",
    webhookUrl: "",
    enableApiAccess: false,
    rateLimitPerMinute: 100
  });
  
  // UI Settings
  const [uiSettings, setUiSettings] = useState({
    theme: "light",
    sidebarCollapsed: false,
    enableAnimations: true,
    compactView: false,
    itemsPerPage: 10
  });

  // ==========================================================
  // LOAD SETTINGS
  // ==========================================================
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/settings");
      const data = response.data?.data || response.data;
      
      if (data) {
        setGeneralSettings(prev => ({ ...prev, ...data.general }));
        setBusinessSettings(prev => ({ ...prev, ...data.business }));
        setNotificationSettings(prev => ({ ...prev, ...data.notifications }));
        setPaymentSettings(prev => ({ ...prev, ...data.payment }));
        setSecuritySettings(prev => ({ ...prev, ...data.security }));
        setApiSettings(prev => ({ ...prev, ...data.api }));
        setUiSettings(prev => ({ ...prev, ...data.ui }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: error.response?.data?.message || "Failed to load settings"
      });
    } finally {
      setLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ==========================================================
  // SAVE SETTINGS
  // ==========================================================
  const saveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        general: generalSettings,
        business: businessSettings,
        notifications: notificationSettings,
        payment: paymentSettings,
        security: securitySettings,
        api: apiSettings,
        ui: uiSettings
      };
      
      await api.put("/admin/settings", payload);
      
      addNotification({
        type: "success",
        title: "Settings Saved",
        message: "All settings have been saved successfully"
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      addNotification({
        type: "error",
        title: "Save Failed",
        message: error.response?.data?.message || "Failed to save settings"
      });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // HANDLE RESET
  // ==========================================================
  const handleReset = async () => {
    try {
      await api.post("/admin/settings/reset");
      await loadSettings();
      addNotification({
        type: "success",
        title: "Settings Reset",
        message: "All settings have been reset to default values"
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Reset Failed",
        message: error.response?.data?.message || "Failed to reset settings"
      });
    }
    setConfirmDialog({ open: false, action: null });
  };

  // ==========================================================
  // HANDLE CLEAR CACHE
  // ==========================================================
  const handleClearCache = async () => {
    try {
      await api.post("/admin/settings/clear-cache");
      addNotification({
        type: "success",
        title: "Cache Cleared",
        message: "Application cache has been cleared successfully"
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Clear Cache Failed",
        message: error.response?.data?.message || "Failed to clear cache"
      });
    }
    setConfirmDialog({ open: false, action: null });
  };

  // ==========================================================
  // HANDLE EXPORT
  // ==========================================================
  const handleExport = async () => {
    try {
      const response = await api.get("/admin/settings/export", {
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `settings_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: "success",
        title: "Export Successful",
        message: "Settings have been exported successfully"
      });
    } catch (error) {
      addNotification({
        type: "error",
        title: "Export Failed",
        message: error.response?.data?.message || "Failed to export settings"
      });
    }
  };

  // ==========================================================
  // RENDER TABS
  // ==========================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return renderGeneralSettings();
      case 1:
        return renderBusinessSettings();
      case 2:
        return renderNotificationSettings();
      case 3:
        return renderPaymentSettings();
      case 4:
        return renderSecuritySettings();
      case 5:
        return renderApiSettings();
      case 6:
        return renderUISettings();
      default:
        return null;
    }
  };

  const renderGeneralSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Site Name"
          value={generalSettings.siteName}
          onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Site Description"
          value={generalSettings.siteDescription}
          onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Timezone</InputLabel>
          <Select
            value={generalSettings.timezone}
            label="Timezone"
            onChange={(e) => setGeneralSettings({ ...generalSettings, timezone: e.target.value })}
          >
            {TIMEZONES.map(tz => (
              <MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Date Format</InputLabel>
          <Select
            value={generalSettings.dateFormat}
            label="Date Format"
            onChange={(e) => setGeneralSettings({ ...generalSettings, dateFormat: e.target.value })}
          >
            {DATE_FORMATS.map(df => (
              <MenuItem key={df.value} value={df.value}>{df.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Currency</InputLabel>
          <Select
            value={generalSettings.currency}
            label="Currency"
            onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
          >
            {CURRENCIES.map(curr => (
              <MenuItem key={curr.value} value={curr.value}>{curr.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Default Booking Duration (minutes)"
          value={generalSettings.defaultBookingDuration}
          onChange={(e) => setGeneralSettings({ ...generalSettings, defaultBookingDuration: parseInt(e.target.value) })}
          margin="normal"
          InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={generalSettings.maintenanceMode}
                onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMode: e.target.checked })}
              />
            }
            label="Maintenance Mode"
          />
          {generalSettings.maintenanceMode && (
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Maintenance Message"
              value={generalSettings.maintenanceMessage}
              onChange={(e) => setGeneralSettings({ ...generalSettings, maintenanceMessage: e.target.value })}
              sx={{ mt: 1, ml: 4 }}
            />
          )}
          <FormControlLabel
            control={
              <Switch
                checked={generalSettings.allowNewRegistrations}
                onChange={(e) => setGeneralSettings({ ...generalSettings, allowNewRegistrations: e.target.checked })}
              />
            }
            label="Allow New Registrations"
          />
        </FormGroup>
      </Grid>
    </Grid>
  );

  const renderBusinessSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Business Name"
          value={businessSettings.businessName}
          onChange={(e) => setBusinessSettings({ ...businessSettings, businessName: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Business Email"
          type="email"
          value={businessSettings.businessEmail}
          onChange={(e) => setBusinessSettings({ ...businessSettings, businessEmail: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Business Phone"
          value={businessSettings.businessPhone}
          onChange={(e) => setBusinessSettings({ ...businessSettings, businessPhone: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="GST Number"
          value={businessSettings.gstNumber}
          onChange={(e) => setBusinessSettings({ ...businessSettings, gstNumber: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="Business Address"
          value={businessSettings.businessAddress}
          onChange={(e) => setBusinessSettings({ ...businessSettings, businessAddress: e.target.value })}
          margin="normal"
        />
      </Grid>
    </Grid>
  );

  const renderNotificationSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.emailNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, emailNotifications: e.target.checked })}
              />
            }
            label="Enable Email Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.smsNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, smsNotifications: e.target.checked })}
              />
            }
            label="Enable SMS Notifications"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.pushNotifications}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, pushNotifications: e.target.checked })}
              />
            }
            label="Enable Push Notifications"
          />
        </FormGroup>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Admin Alert Email"
          type="email"
          value={notificationSettings.adminAlertEmail}
          onChange={(e) => setNotificationSettings({ ...notificationSettings, adminAlertEmail: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>Alert Settings</Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.newBookingAlert}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, newBookingAlert: e.target.checked })}
              />
            }
            label="New Booking Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.newRegistrationAlert}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, newRegistrationAlert: e.target.checked })}
              />
            }
            label="New Registration Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.complaintAlert}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, complaintAlert: e.target.checked })}
              />
            }
            label="Complaint Alerts"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.dailyDigest}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, dailyDigest: e.target.checked })}
              />
            }
            label="Daily Digest"
          />
          <FormControlLabel
            control={
              <Switch
                checked={notificationSettings.weeklyReport}
                onChange={(e) => setNotificationSettings({ ...notificationSettings, weeklyReport: e.target.checked })}
              />
            }
            label="Weekly Report"
          />
        </FormGroup>
      </Grid>
    </Grid>
  );

  const renderPaymentSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Razorpay Key ID"
          value={paymentSettings.razorpayKeyId}
          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeyId: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="Razorpay Key Secret"
          type="password"
          value={paymentSettings.razorpayKeySecret}
          onChange={(e) => setPaymentSettings({ ...paymentSettings, razorpayKeySecret: e.target.value })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Platform Fee (%)"
          value={paymentSettings.platformFeePercent}
          onChange={(e) => setPaymentSettings({ ...paymentSettings, platformFeePercent: parseFloat(e.target.value) })}
          margin="normal"
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Minimum Withdrawal Amount"
          value={paymentSettings.minWithdrawalAmount}
          onChange={(e) => setPaymentSettings({ ...paymentSettings, minWithdrawalAmount: parseInt(e.target.value) })}
          margin="normal"
          InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={paymentSettings.enableTestMode}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, enableTestMode: e.target.checked })}
            />
          }
          label="Enable Test Mode"
        />
        {paymentSettings.enableTestMode && (
          <TextField
            fullWidth
            label="Test Mode Key"
            value={paymentSettings.testModeKey}
            onChange={(e) => setPaymentSettings({ ...paymentSettings, testModeKey: e.target.value })}
            sx={{ mt: 2 }}
          />
        )}
      </Grid>
    </Grid>
  );

  const renderSecuritySettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Session Timeout (minutes)"
          value={securitySettings.sessionTimeout}
          onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Max Login Attempts"
          value={securitySettings.maxLoginAttempts}
          onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Password Expiry (days)"
          value={securitySettings.passwordExpiryDays}
          onChange={(e) => setSecuritySettings({ ...securitySettings, passwordExpiryDays: parseInt(e.target.value) })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          rows={3}
          label="IP Whitelist (one per line)"
          value={securitySettings.ipWhitelist}
          onChange={(e) => setSecuritySettings({ ...securitySettings, ipWhitelist: e.target.value })}
          margin="normal"
          helperText="Enter IP addresses, one per line"
        />
      </Grid>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={securitySettings.twoFactorAuth}
              onChange={(e) => setSecuritySettings({ ...securitySettings, twoFactorAuth: e.target.checked })}
            />
          }
          label="Enable Two-Factor Authentication"
        />
        <FormControlLabel
          control={
            <Switch
              checked={securitySettings.enableAuditLog}
              onChange={(e) => setSecuritySettings({ ...securitySettings, enableAuditLog: e.target.checked })}
            />
          }
          label="Enable Audit Log"
        />
      </Grid>
    </Grid>
  );

  const renderApiSettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControlLabel
          control={
            <Switch
              checked={apiSettings.enableApiAccess}
              onChange={(e) => setApiSettings({ ...apiSettings, enableApiAccess: e.target.checked })}
            />
          }
          label="Enable API Access"
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="API Key"
          value={apiSettings.apiKey}
          onChange={(e) => setApiSettings({ ...apiSettings, apiKey: e.target.value })}
          margin="normal"
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={() => {/* Regenerate API key */}}>
                  <Refresh />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          type="number"
          label="Rate Limit (requests per minute)"
          value={apiSettings.rateLimitPerMinute}
          onChange={(e) => setApiSettings({ ...apiSettings, rateLimitPerMinute: parseInt(e.target.value) })}
          margin="normal"
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          label="Webhook URL"
          value={apiSettings.webhookUrl}
          onChange={(e) => setApiSettings({ ...apiSettings, webhookUrl: e.target.value })}
          margin="normal"
          placeholder="https://your-server.com/webhook"
        />
      </Grid>
    </Grid>
  );

  const renderUISettings = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControl component="fieldset">
          <FormLabel component="legend">Theme</FormLabel>
          <RadioGroup
            row
            value={uiSettings.theme}
            onChange={(e) => setUiSettings({ ...uiSettings, theme: e.target.value })}
          >
            {THEMES.map(theme => (
              <FormControlLabel key={theme.value} value={theme.value} control={<Radio />} label={theme.label} />
            ))}
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth margin="normal">
          <InputLabel>Items Per Page</InputLabel>
          <Select
            value={uiSettings.itemsPerPage}
            label="Items Per Page"
            onChange={(e) => setUiSettings({ ...uiSettings, itemsPerPage: e.target.value })}
          >
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={25}>25</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid item xs={12}>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={uiSettings.enableAnimations}
                onChange={(e) => setUiSettings({ ...uiSettings, enableAnimations: e.target.checked })}
              />
            }
            label="Enable Animations"
          />
          <FormControlLabel
            control={
              <Switch
                checked={uiSettings.compactView}
                onChange={(e) => setUiSettings({ ...uiSettings, compactView: e.target.checked })}
              />
            }
            label="Compact View"
          />
        </FormGroup>
      </Grid>
    </Grid>
  );

  // ==========================================================
  // MAIN RENDER
  // ==========================================================
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            System Settings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure and manage system-wide settings
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<RestartAlt />}
            onClick={() => setConfirmDialog({ open: true, action: "reset" })}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <Save />}
            onClick={saveSettings}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </Box>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab icon={<Settings />} label="General" />
          <Tab icon={<Business />} label="Business" />
          <Tab icon={<Notifications />} label="Notifications" />
          <Tab icon={<Payment />} label="Payments" />
          <Tab icon={<Security />} label="Security" />
          <Tab icon={<Api />} label="API" />
          <Tab icon={<Palette />} label="UI" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <Paper sx={{ p: 3 }}>
        {renderTabContent()}
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>
          {confirmDialog.action === "reset" && "Reset Settings"}
          {confirmDialog.action === "clearCache" && "Clear Cache"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmDialog.action === "reset" && "Are you sure you want to reset all settings to default values? This action cannot be undone."}
            {confirmDialog.action === "clearCache" && "Are you sure you want to clear the application cache? This may temporarily affect performance while cache rebuilds."}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>Cancel</Button>
          <Button
            onClick={confirmDialog.action === "reset" ? handleReset : handleClearCache}
            variant="contained"
            color="warning"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}