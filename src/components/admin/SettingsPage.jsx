// src/pages/admin/SettingsPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  Switch,
  TextField,
  Button,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  FormGroup,
  Slider,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Chip,
  Tooltip,
  IconButton,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  RadioGroup,
  Radio,
  FormLabel
} from "@mui/material";
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Payment as PaymentIcon,
  Email as EmailIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Close as CloseIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon
} from "@mui/icons-material";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const SETTINGS_CATEGORIES = [
  { id: "general", label: "General", icon: SettingsIcon },
  { id: "security", label: "Security", icon: SecurityIcon },
  { id: "notifications", label: "Notifications", icon: NotificationsIcon },
  { id: "payments", label: "Payments", icon: PaymentIcon },
  { id: "email", label: "Email", icon: EmailIcon },
  { id: "backup", label: "Backup & Restore", icon: BackupIcon }
];

const DEFAULT_SETTINGS = {
  // General Settings
  siteName: "Quickks",
  siteDescription: "On-demand service platform",
  maintenanceMode: false,
  allowNewRegistrations: true,
  defaultBookingDuration: 60,
  maxBookingDuration: 480,
  minBookingDuration: 15,
  
  // Security Settings
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  twoFactorAuth: false,
  passwordExpiryDays: 90,
  forceStrongPassword: true,
  ipWhitelist: [],
  
  // Notification Settings
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  adminAlertEmail: "admin@quickks.in",
  alertOnNewUser: true,
  alertOnNewBooking: true,
  alertOnNewComplaint: true,
  alertOnLowRating: true,
  
  // Payment Settings
  paymentGateway: "razorpay",
  razorpayKeyId: "",
  razorpayKeySecret: "",
  stripePublishableKey: "",
  stripeSecretKey: "",
  commissionRate: 10,
  minimumPayout: 100,
  payoutSchedule: "weekly",
  
  // Email Settings
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpUser: "",
  smtpPassword: "",
  fromEmail: "noreply@quickks.in",
  fromName: "Quickks Support",
  
  // Backup Settings
  autoBackup: true,
  backupFrequency: "daily",
  backupRetention: 30,
  backupLocation: "local"
};

// ==========================================================
// SETTINGS SECTION COMPONENT
// ==========================================================
const SettingsSection = ({ title, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
  >
    <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
      <Box display="flex" alignItems="center" gap={1} mb={3}>
        <Icon sx={{ color: "#6366f1" }} />
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Paper>
  </motion.div>
);

// ==========================================================
// MAIN SETTINGS PAGE
// ==========================================================
export default function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [showPassword, setShowPassword] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Load settings
  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/api/v1/settings");
      const data = response.data?.data || response.data;
      setSettings(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(err.response?.data?.message || "Failed to load settings");
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.put("/api/v1/settings", settings);
      setSuccess(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err.response?.data?.message || "Failed to save settings");
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const resetToDefaults = async () => {
    setConfirmDialog({ open: false, action: null });
    setSettings(DEFAULT_SETTINGS);
    toast.success("Settings reset to defaults");
  };

  // Export settings
  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `settings-backup-${new Date().toISOString().slice(0, 19)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Settings exported");
  };

  // Import settings
  const importSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        setSettings(prev => ({ ...prev, ...imported }));
        toast.success("Settings imported successfully");
      } catch (err) {
        toast.error("Invalid settings file");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  // Update setting
  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Render tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // General
        return (
          <SettingsSection title="General Settings" icon={SettingsIcon}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site Name"
                  value={settings.siteName}
                  onChange={(e) => updateSetting("siteName", e.target.value)}
                  helperText="This appears in the browser title bar"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Site Description"
                  value={settings.siteDescription}
                  onChange={(e) => updateSetting("siteDescription", e.target.value)}
                  helperText="Used for SEO and meta tags"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.maintenanceMode}
                      onChange={(e) => updateSetting("maintenanceMode", e.target.checked)}
                    />
                  }
                  label={
                    <Box>
                      <Typography>Maintenance Mode</Typography>
                      <Typography variant="caption" color="text.secondary">
                        When enabled, only admins can access the site
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.allowNewRegistrations}
                      onChange={(e) => updateSetting("allowNewRegistrations", e.target.checked)}
                    />
                  }
                  label="Allow New User Registrations"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Default Booking Duration (minutes)"
                  value={settings.defaultBookingDuration}
                  onChange={(e) => updateSetting("defaultBookingDuration", parseInt(e.target.value, 10))}
                  helperText={`Min: ${settings.minBookingDuration}, Max: ${settings.maxBookingDuration}`}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography gutterBottom>Booking Duration Range</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Minimum (minutes)"
                      value={settings.minBookingDuration}
                      onChange={(e) => updateSetting("minBookingDuration", parseInt(e.target.value, 10))}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Maximum (minutes)"
                      value={settings.maxBookingDuration}
                      onChange={(e) => updateSetting("maxBookingDuration", parseInt(e.target.value, 10))}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </SettingsSection>
        );

      case 1: // Security
        return (
          <SettingsSection title="Security Settings" icon={SecurityIcon}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Session Timeout (minutes)"
                  value={settings.sessionTimeout}
                  onChange={(e) => updateSetting("sessionTimeout", parseInt(e.target.value, 10))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Login Attempts"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => updateSetting("maxLoginAttempts", parseInt(e.target.value, 10))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.twoFactorAuth}
                      onChange={(e) => updateSetting("twoFactorAuth", e.target.checked)}
                    />
                  }
                  label="Enable Two-Factor Authentication for Admins"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.forceStrongPassword}
                      onChange={(e) => updateSetting("forceStrongPassword", e.target.checked)}
                    />
                  }
                  label="Force Strong Passwords"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Password Expiry (days)"
                  value={settings.passwordExpiryDays}
                  onChange={(e) => updateSetting("passwordExpiryDays", parseInt(e.target.value, 10))}
                />
              </Grid>
            </Grid>
          </SettingsSection>
        );

      case 2: // Notifications
        return (
          <SettingsSection title="Notification Settings" icon={NotificationsIcon}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.emailNotifications}
                      onChange={(e) => updateSetting("emailNotifications", e.target.checked)}
                    />
                  }
                  label="Email Notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.smsNotifications}
                      onChange={(e) => updateSetting("smsNotifications", e.target.checked)}
                    />
                  }
                  label="SMS Notifications"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.pushNotifications}
                      onChange={(e) => updateSetting("pushNotifications", e.target.checked)}
                    />
                  }
                  label="Push Notifications"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Admin Alert Email"
                  value={settings.adminAlertEmail}
                  onChange={(e) => updateSetting("adminAlertEmail", e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>Alert On:</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.alertOnNewUser}
                          onChange={(e) => updateSetting("alertOnNewUser", e.target.checked)}
                        />
                      }
                      label="New User Registration"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.alertOnNewBooking}
                          onChange={(e) => updateSetting("alertOnNewBooking", e.target.checked)}
                        />
                      }
                      label="New Booking"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.alertOnNewComplaint}
                          onChange={(e) => updateSetting("alertOnNewComplaint", e.target.checked)}
                        />
                      }
                      label="New Complaint"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={settings.alertOnLowRating}
                          onChange={(e) => updateSetting("alertOnLowRating", e.target.checked)}
                        />
                      }
                      label="Low Rating (Below 3★)"
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </SettingsSection>
        );

      case 3: // Payments
        return (
          <SettingsSection title="Payment Settings" icon={PaymentIcon}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Gateway</InputLabel>
                  <Select
                    value={settings.paymentGateway}
                    onChange={(e) => updateSetting("paymentGateway", e.target.value)}
                    label="Payment Gateway"
                  >
                    <MenuItem value="razorpay">Razorpay</MenuItem>
                    <MenuItem value="stripe">Stripe</MenuItem>
                    <MenuItem value="paytm">Paytm</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Commission Rate (%)"
                  type="number"
                  value={settings.commissionRate}
                  onChange={(e) => updateSetting("commissionRate", parseFloat(e.target.value))}
                  helperText="Percentage taken from each booking"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Minimum Payout (₹)"
                  type="number"
                  value={settings.minimumPayout}
                  onChange={(e) => updateSetting("minimumPayout", parseFloat(e.target.value))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Payout Schedule</InputLabel>
                  <Select
                    value={settings.payoutSchedule}
                    onChange={(e) => updateSetting("payoutSchedule", e.target.value)}
                    label="Payout Schedule"
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Bi-Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </SettingsSection>
        );

      case 4: // Email
        return (
          <SettingsSection title="Email Settings" icon={EmailIcon}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Host"
                  value={settings.smtpHost}
                  onChange={(e) => updateSetting("smtpHost", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="SMTP Port"
                  value={settings.smtpPort}
                  onChange={(e) => updateSetting("smtpPort", parseInt(e.target.value, 10))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Username"
                  value={settings.smtpUser}
                  onChange={(e) => updateSetting("smtpUser", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="SMTP Password"
                  type={showPassword ? "text" : "password"}
                  value={settings.smtpPassword}
                  onChange={(e) => updateSetting("smtpPassword", e.target.value)}
                  InputProps={{
                    endAdornment: (
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    )
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  value={settings.fromEmail}
                  onChange={(e) => updateSetting("fromEmail", e.target.value)}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="From Name"
                  value={settings.fromName}
                  onChange={(e) => updateSetting("fromName", e.target.value)}
                />
              </Grid>
            </Grid>
          </SettingsSection>
        );

      case 5: // Backup
        return (
          <SettingsSection title="Backup & Restore" icon={BackupIcon}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.autoBackup}
                      onChange={(e) => updateSetting("autoBackup", e.target.checked)}
                    />
                  }
                  label="Enable Automatic Backup"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Backup Frequency</InputLabel>
                  <Select
                    value={settings.backupFrequency}
                    onChange={(e) => updateSetting("backupFrequency", e.target.value)}
                    label="Backup Frequency"
                    disabled={!settings.autoBackup}
                  >
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Backup Retention (days)"
                  value={settings.backupRetention}
                  onChange={(e) => updateSetting("backupRetention", parseInt(e.target.value, 10))}
                  disabled={!settings.autoBackup}
                />
              </Grid>
              <Grid item xs={12}>
                <Box display="flex" gap={2}>
                  <Button
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={exportSettings}
                  >
                    Export Settings
                  </Button>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<RestoreIcon />}
                  >
                    Import Settings
                    <input
                      type="file"
                      hidden
                      accept=".json"
                      onChange={importSettings}
                    />
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => setConfirmDialog({ open: true, action: "reset" })}
                  >
                    Reset to Defaults
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </SettingsSection>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading settings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          System Settings
        </Typography>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          onClick={saveSettings}
          disabled={saving}
          sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </Box>

      {/* Alerts */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(false)}>
          Settings saved successfully!
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {SETTINGS_CATEGORIES.map((cat, idx) => (
            <Tab
              key={cat.id}
              label={cat.label}
              icon={<cat.icon />}
              iconPosition="start"
            />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ open: false, action: null })}>
        <DialogTitle>Reset Settings?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to reset all settings to default values? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, action: null })}>Cancel</Button>
          <Button onClick={resetToDefaults} color="error" variant="contained">
            Reset
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Mode Toggle */}
      <Box sx={{ mt: 3, display: "flex", justifyContent: "flex-end" }}>
        <FormControlLabel
          control={
            <Switch
              checked={previewMode}
              onChange={(e) => setPreviewMode(e.target.checked)}
            />
          }
          label="Preview Mode"
        />
      </Box>
    </Box>
  );
}