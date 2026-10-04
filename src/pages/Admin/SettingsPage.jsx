// src/pages/Admin/SettingsPage.jsx
// =============================================================================
// Admin -> System Settings (production version)
//
// Endpoints (relative to the axios baseURL in src/api/api.js):
//   GET  /admin/settings               load all settings
//   PUT  /admin/settings               save all settings
//   POST /admin/settings/reset         reset to defaults
//   POST /admin/settings/clear-cache   clear server cache
//   GET  /admin/settings/export        download JSON backup (blob)
//
// Security notes
//   * Secret fields (Razorpay secret, Stripe secret, test-mode key) are NEVER
//     pre-filled from the API and are only sent when the admin types a new value.
//     The backend must therefore mask/omit them in GET /admin/settings.
//   * The read-only API key is never sent back in the PUT payload.
// =============================================================================
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  FormLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import {
  Api,
  Business,
  CleaningServices,
  ContentCopy,
  Download,
  Notifications,
  Palette,
  Payment,
  RestartAlt,
  Save,
  Security,
  Settings,
  Visibility,
  VisibilityOff
} from "@mui/icons-material";
import { MotionConfig, motion } from "framer-motion";
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

// Symbols are written as unicode escapes so a wrong file encoding can never
// turn them into mojibake again.
const CURRENCIES = [
  { value: "INR", label: "Indian Rupee (₹)", symbol: "₹" },
  { value: "USD", label: "US Dollar ($)", symbol: "$" },
  { value: "EUR", label: "Euro (€)", symbol: "€" },
  { value: "GBP", label: "British Pound (£)", symbol: "£" }
];

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

// Permission name checked for editing. ADMIN / SUPER_ADMIN always pass
// (see hasPermission in AuthContext). Change if your backend uses another name.
const EDIT_PERMISSION = "MANAGE_SETTINGS";

const DEFAULT_SETTINGS = {
  general: {
    siteName: "Quickks",
    siteDescription: "Professional Service Booking Platform",
    siteLogo: null,
    favicon: null,
    maintenanceMode: false,
    maintenanceMessage:
      "We are currently undergoing maintenance. Please check back soon.",
    allowNewRegistrations: true,
    defaultBookingDuration: 60,
    timezone: "Asia/Kolkata",
    dateFormat: "dd/MM/yyyy",
    currency: "INR"
  },
  business: {
    businessName: "",
    businessEmail: "",
    businessPhone: "",
    businessAddress: "",
    gstNumber: "",
    panNumber: ""
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    adminAlertEmail: "",
    newBookingAlert: true,
    newRegistrationAlert: true,
    complaintAlert: true,
    dailyDigest: true,
    weeklyReport: true
  },
  payment: {
    razorpayKeyId: "",
    razorpayKeySecret: "",
    stripePublishableKey: "",
    stripeSecretKey: "",
    platformFeePercent: 10,
    minWithdrawalAmount: 500,
    enableTestMode: false,
    testModeKey: ""
  },
  security: {
    twoFactorAuth: false,
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
    ipWhitelist: "",
    enableAuditLog: true
  },
  api: {
    apiKey: "",
    webhookUrl: "",
    enableApiAccess: false,
    rateLimitPerMinute: 100
  },
  ui: {
    theme: "light",
    sidebarCollapsed: false,
    enableAnimations: true,
    compactView: false,
    itemsPerPage: 10
  }
};

// Order = tab index.
const TABS = [
  { section: "general", label: "General", icon: <Settings /> },
  { section: "business", label: "Business", icon: <Business /> },
  { section: "notifications", label: "Notifications", icon: <Notifications /> },
  { section: "payment", label: "Payments", icon: <Payment /> },
  { section: "security", label: "Security", icon: <Security /> },
  { section: "api", label: "API", icon: <Api /> },
  { section: "ui", label: "UI", icon: <Palette /> }
];

const SECTION_TO_TAB = TABS.reduce((acc, t, i) => {
  acc[t.section] = i;
  return acc;
}, {});

// Keys that must never be pre-filled from the server and are sent only when typed.
const SECRET_KEYS = ["razorpayKeySecret", "stripeSecretKey", "testModeKey"];
// Keys that are display-only and never sent back.
const READ_ONLY_KEYS = ["apiKey"];

// "section.key": [min, max, integerOnly, label]
const NUMBER_RULES = {
  "general.defaultBookingDuration": [5, 1440, true, "Booking duration"],
  "payment.platformFeePercent": [0, 100, false, "Platform fee"],
  "payment.minWithdrawalAmount": [0, 10000000, true, "Minimum withdrawal"],
  "security.sessionTimeout": [1, 1440, true, "Session timeout"],
  "security.maxLoginAttempts": [1, 20, true, "Max login attempts"],
  "security.passwordExpiryDays": [0, 3650, true, "Password expiry"],
  "api.rateLimitPerMinute": [1, 100000, true, "Rate limit"]
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\-\s\d]{7,20}$/;
const GST_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/([0-9]|[12]\d|3[0-2]))?$/;
const IPV6_RE = /^[0-9a-fA-F:]+(\/\d{1,3})?$/;

const CONFIRM_COPY = {
  reset: {
    title: "Reset Settings",
    text:
      "Are you sure you want to reset all settings to default values? This action cannot be undone.",
    confirm: "Reset"
  },
  clearCache: {
    title: "Clear Cache",
    text:
      "Are you sure you want to clear the application cache? This may temporarily affect performance while the cache rebuilds.",
    confirm: "Clear Cache"
  },
  maintenance: {
    title: "Enable Maintenance Mode",
    text:
      "Maintenance mode will show the maintenance message to visitors and may block them from using the platform. Save and enable it now?",
    confirm: "Save & Enable"
  }
};

// ==========================================================
// HELPERS
// ==========================================================
const clone = (v) => JSON.parse(JSON.stringify(v));

const isCancel = (e) =>
  e?.code === "ERR_CANCELED" || e?.name === "CanceledError" || e?.name === "AbortError";

const errMessage = (e, fallback) =>
  e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;

/** Merge server data over defaults: only known keys, never null/undefined. */
const mergeSection = (defaults, incoming) => {
  const out = { ...defaults };
  if (incoming && typeof incoming === "object") {
    Object.keys(defaults).forEach((k) => {
      if (incoming[k] !== undefined && incoming[k] !== null) out[k] = incoming[k];
    });
  }
  return out;
};

/** Build state from API payload. Secrets are stripped; returns which ones are set. */
const normalizeSettings = (data) => {
  const next = clone(DEFAULT_SETTINGS);
  const secretsSet = {};
  Object.keys(next).forEach((section) => {
    next[section] = mergeSection(DEFAULT_SETTINGS[section], data?.[section]);
    SECRET_KEYS.forEach((k) => {
      if (k in next[section]) {
        if (next[section][k]) secretsSet[k] = true;
        next[section][k] = "";
      }
    });
  });
  return { settings: next, secretsSet };
};

const isValidIp = (v) => IPV4_RE.test(v) || (v.includes(":") && IPV6_RE.test(v));

const validateSettings = (s) => {
  const e = {};

  if (!String(s.general.siteName).trim()) e["general.siteName"] = "Site name is required";
  if (s.general.maintenanceMode && !String(s.general.maintenanceMessage).trim()) {
    e["general.maintenanceMessage"] = "Maintenance message is required";
  }

  Object.entries(NUMBER_RULES).forEach(([path, [min, max, int, label]]) => {
    const [section, key] = path.split(".");
    const v = s[section][key];
    if (v === "" || v === null || Number.isNaN(Number(v))) {
      e[path] = `${label} is required`;
    } else if (Number(v) < min || Number(v) > max) {
      e[path] = `${label} must be between ${min} and ${max}`;
    } else if (int && !Number.isInteger(Number(v))) {
      e[path] = `${label} must be a whole number`;
    }
  });

  const email = (path, v) => {
    if (v && !EMAIL_RE.test(String(v).trim())) e[path] = "Enter a valid email address";
  };
  email("business.businessEmail", s.business.businessEmail);
  email("notifications.adminAlertEmail", s.notifications.adminAlertEmail);

  if (s.business.businessPhone && !PHONE_RE.test(String(s.business.businessPhone).trim())) {
    e["business.businessPhone"] = "Enter a valid phone number";
  }
  if (s.business.gstNumber && !GST_RE.test(String(s.business.gstNumber).trim().toUpperCase())) {
    e["business.gstNumber"] = "Enter a valid 15-character GSTIN";
  }
  if (s.business.panNumber && !PAN_RE.test(String(s.business.panNumber).trim().toUpperCase())) {
    e["business.panNumber"] = "Enter a valid 10-character PAN (e.g. ABCDE1234F)";
  }

  const webhook = String(s.api.webhookUrl || "").trim();
  if (webhook) {
    try {
      const u = new URL(webhook);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error("protocol");
    } catch {
      e["api.webhookUrl"] = "Enter a valid URL (https://...)";
    }
  }

  const badIp = String(s.security.ipWhitelist || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .find((l) => !isValidIp(l));
  if (badIp) e["security.ipWhitelist"] = `Invalid IP address: ${badIp}`;

  return e;
};

/** Convert state to the PUT payload (trim, drop empty secrets & read-only keys). */
const buildPayload = (s) => {
  const payload = {};
  Object.entries(s).forEach(([section, values]) => {
    payload[section] = {};
    Object.entries(values).forEach(([k, v]) => {
      if (READ_ONLY_KEYS.includes(k)) return;
      if (SECRET_KEYS.includes(k) && !v) return;
      payload[section][k] = typeof v === "string" ? v.trim() : v;
    });
    // business identifiers are stored upper-case
    if (section === "business") {
      ["gstNumber", "panNumber"].forEach((k) => {
        if (payload.business[k]) payload.business[k] = payload.business[k].toUpperCase();
      });
    }
  });
  return payload;
};

// ==========================================================
// SMALL COMPONENTS
// ==========================================================
const SettingsSection = ({ title, icon, children }) => (
  <Card variant="outlined" sx={{ mb: 3 }}>
    <CardContent>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        {icon}
        <Typography variant="h6" fontWeight="bold" component="h2">
          {title}
        </Typography>
      </Box>
      <Divider sx={{ mb: 3 }} />
      {children}
    </CardContent>
  </Card>
);

/** Password-style input with show/hide toggle. Never pre-filled. */
const SecretField = ({ label, value, onChange, isSet, error, helperText, ...rest }) => {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      fullWidth
      label={label}
      type={visible ? "text" : "password"}
      value={value}
      onChange={onChange}
      autoComplete="new-password"
      placeholder={isSet ? "Configured — leave blank to keep current value" : "Not set"}
      error={!!error}
      helperText={error || helperText || (isSet ? "A value is already saved on the server." : " ")}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              aria-label={visible ? `Hide ${label}` : `Show ${label}`}
              onClick={() => setVisible((v) => !v)}
            >
              {visible ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        )
      }}
      {...rest}
    />
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function SettingsPage() {
  const { user, hasPermission } = useAuth();
  const { addNotification } = useNotifications();

  // Keep the latest notifier in a ref so loadSettings stays stable even when the
  // context returns a new function each render (e.g. outside the provider).
  const notifyRef = useRef(addNotification);
  useEffect(() => {
    notifyRef.current = addNotification;
  }, [addNotification]);
  const notify = useCallback((type, title, message) => {
    try {
      notifyRef.current?.({ type, title, message });
    } catch (e) {
      // notifications must never break the page
      console.warn("notify failed", e);
    }
  }, []);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canEdit = useMemo(() => {
    if (user?.role === "SUPER_ADMIN") return true;
    return typeof hasPermission === "function" ? !!hasPermission(EDIT_PERMISSION) : true;
  }, [user, hasPermission]);

  // ---------------------------------------------------------
  // STATE
  // ---------------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null });
  const [dialogBusy, setDialogBusy] = useState(false);

  const [settings, setSettings] = useState(() => clone(DEFAULT_SETTINGS));
  const [secretsSet, setSecretsSet] = useState({});
  const [errors, setErrors] = useState({});
  const [savedSnapshot, setSavedSnapshot] = useState(() => JSON.stringify(DEFAULT_SETTINGS));
  const savedRef = useRef(clone(DEFAULT_SETTINGS));

  const dirty = useMemo(() => JSON.stringify(settings) !== savedSnapshot, [settings, savedSnapshot]);

  // ---------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------
  const loadSettings = useCallback(async (signal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await api.get("/admin/settings", { signal });
      const data = response.data?.data || response.data;
      const { settings: next, secretsSet: set } = normalizeSettings(data);
      if (signal?.aborted || !mountedRef.current) return;
      savedRef.current = clone(next);
      setSettings(next);
      setSecretsSet(set);
      setSavedSnapshot(JSON.stringify(next));
      setErrors({});
    } catch (error) {
      if (isCancel(error) || signal?.aborted || !mountedRef.current) return;
      console.error("Failed to load settings:", error);
      const message = errMessage(error, "Failed to load settings");
      setLoadError(message);
      notify("error", "Loading Failed", message);
    } finally {
      if (!signal?.aborted && mountedRef.current) setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const controller = new AbortController();
    loadSettings(controller.signal);
    return () => controller.abort();
  }, [loadSettings]);

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // ---------------------------------------------------------
  // FIELD HELPERS
  // ---------------------------------------------------------
  const setField = useCallback((section, key, value) => {
    setSettings((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
    setErrors((prev) => {
      const path = `${section}.${key}`;
      if (!prev[path]) return prev;
      const next = { ...prev };
      delete next[path];
      return next;
    });
  }, []);

  const disabled = !canEdit || saving;

  const textField = (section, key, label, extra = {}) => (
    <TextField
      fullWidth
      label={label}
      value={settings[section][key] ?? ""}
      onChange={(e) => setField(section, key, e.target.value)}
      error={!!errors[`${section}.${key}`]}
      helperText={errors[`${section}.${key}`] || extra.helperText}
      disabled={disabled}
      {...extra}
    />
  );

  const numberField = (section, key, label, extra = {}) => {
    const [min, max] = NUMBER_RULES[`${section}.${key}`] || [];
    return (
      <TextField
        fullWidth
        type="number"
        label={label}
        value={settings[section][key] ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          const n = raw === "" ? "" : Number(raw);
          setField(section, key, Number.isNaN(n) ? "" : n);
        }}
        error={!!errors[`${section}.${key}`]}
        helperText={errors[`${section}.${key}`] || extra.helperText}
        disabled={disabled}
        inputProps={{ min, max, inputMode: "numeric" }}
        {...extra}
      />
    );
  };

  const selectField = (section, key, label, options) => (
    <FormControl fullWidth disabled={disabled} error={!!errors[`${section}.${key}`]}>
      <InputLabel id={`${section}-${key}-label`}>{label}</InputLabel>
      <Select
        labelId={`${section}-${key}-label`}
        value={settings[section][key]}
        label={label}
        onChange={(e) => setField(section, key, e.target.value)}
      >
        {options.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </Select>
      {errors[`${section}.${key}`] && (
        <FormHelperText>{errors[`${section}.${key}`]}</FormHelperText>
      )}
    </FormControl>
  );

  const switchField = (section, key, label) => (
    <FormControlLabel
      control={
        <Switch
          checked={!!settings[section][key]}
          onChange={(e) => setField(section, key, e.target.checked)}
          disabled={disabled}
        />
      }
      label={label}
    />
  );

  // ---------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------
  const closeDialog = () => setConfirmDialog({ open: false, action: null });

  const doSave = async () => {
    setSaving(true);
    try {
      await api.put("/admin/settings", buildPayload(settings));
      if (!mountedRef.current) return;

      // Remember which secrets are now stored, then clear the typed values.
      const nowSet = { ...secretsSet };
      SECRET_KEYS.forEach((k) => {
        Object.values(settings).forEach((sec) => {
          if (k in sec && sec[k]) nowSet[k] = true;
        });
      });
      const cleaned = clone(settings);
      Object.keys(cleaned).forEach((section) =>
        SECRET_KEYS.forEach((k) => {
          if (k in cleaned[section]) cleaned[section][k] = "";
        })
      );
      savedRef.current = clone(cleaned);
      setSecretsSet(nowSet);
      setSettings(cleaned);
      setSavedSnapshot(JSON.stringify(cleaned));
      notify("success", "Settings Saved", "All settings have been saved successfully");
    } catch (error) {
      console.error("Failed to save settings:", error);
      notify("error", "Save Failed", errMessage(error, "Failed to save settings"));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleSave = () => {
    if (!canEdit || loadError) return;
    const found = validateSettings(settings);
    setErrors(found);
    const firstPath = Object.keys(found)[0];
    if (firstPath) {
      setActiveTab(SECTION_TO_TAB[firstPath.split(".")[0]] ?? 0);
      notify("error", "Check Your Input", "Please fix the highlighted fields before saving.");
      return;
    }
    // Turning maintenance mode on affects every visitor – ask first.
    if (settings.general.maintenanceMode && !savedRef.current.general.maintenanceMode) {
      setConfirmDialog({ open: true, action: "maintenance" });
      return;
    }
    doSave();
  };

  const handleReset = async () => {
    try {
      await api.post("/admin/settings/reset");
      await loadSettings();
      notify("success", "Settings Reset", "All settings have been reset to default values");
    } catch (error) {
      notify("error", "Reset Failed", errMessage(error, "Failed to reset settings"));
    }
  };

  const handleClearCache = async () => {
    try {
      await api.post("/admin/settings/clear-cache");
      notify("success", "Cache Cleared", "Application cache has been cleared successfully");
    } catch (error) {
      notify("error", "Clear Cache Failed", errMessage(error, "Failed to clear cache"));
    }
  };

  const handleConfirm = async () => {
    const { action } = confirmDialog;
    setDialogBusy(true);
    try {
      if (action === "reset") await handleReset();
      else if (action === "clearCache") await handleClearCache();
      else if (action === "maintenance") await doSave();
    } finally {
      if (mountedRef.current) {
        setDialogBusy(false);
        closeDialog();
      }
    }
  };

  const handleExport = async () => {
    setExporting(true);
    let url;
    try {
      const response = await api.get("/admin/settings/export", { responseType: "blob" });
      url = window.URL.createObjectURL(new Blob([response.data], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `settings_backup_${new Date().toISOString().split("T")[0]}.json`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify("success", "Export Successful", "Settings have been exported successfully");
    } catch (error) {
      notify("error", "Export Failed", errMessage(error, "Failed to export settings"));
    } finally {
      if (url) window.URL.revokeObjectURL(url);
      if (mountedRef.current) setExporting(false);
    }
  };

  const handleCopyApiKey = async () => {
    const key = settings.api.apiKey;
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      notify("success", "Copied", "API key copied to clipboard");
    } catch {
      notify("error", "Copy Failed", "Could not access the clipboard");
    }
  };

  // ---------------------------------------------------------
  // TAB PANELS
  // ---------------------------------------------------------
  const renderGeneral = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>{textField("general", "siteName", "Site Name", { required: true })}</Grid>
      <Grid item xs={12} md={6}>{textField("general", "siteDescription", "Site Description")}</Grid>
      <Grid item xs={12} md={6}>{selectField("general", "timezone", "Timezone", TIMEZONES)}</Grid>
      <Grid item xs={12} md={6}>{selectField("general", "dateFormat", "Date Format", DATE_FORMATS)}</Grid>
      <Grid item xs={12} md={6}>{selectField("general", "currency", "Currency", CURRENCIES)}</Grid>
      <Grid item xs={12} md={6}>
        {numberField("general", "defaultBookingDuration", "Default Booking Duration (minutes)", {
          InputProps: { endAdornment: <InputAdornment position="end">min</InputAdornment> }
        })}
      </Grid>
      <Grid item xs={12}>
        <FormGroup>
          {switchField("general", "maintenanceMode", "Maintenance Mode")}
          {settings.general.maintenanceMode &&
            textField("general", "maintenanceMessage", "Maintenance Message", {
              multiline: true,
              rows: 2,
              sx: { mt: 1, ml: { xs: 0, sm: 4 }, width: { sm: "calc(100% - 32px)" } }
            })}
          {switchField("general", "allowNewRegistrations", "Allow New Registrations")}
        </FormGroup>
      </Grid>
    </Grid>
  );

  const renderBusiness = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>{textField("business", "businessName", "Business Name")}</Grid>
      <Grid item xs={12} md={6}>
        {textField("business", "businessEmail", "Business Email", { type: "email" })}
      </Grid>
      <Grid item xs={12} md={6}>
        {textField("business", "businessPhone", "Business Phone", { type: "tel" })}
      </Grid>
      <Grid item xs={12} md={6}>
        {textField("business", "gstNumber", "GST Number", {
          inputProps: { maxLength: 15, style: { textTransform: "uppercase" } }
        })}
      </Grid>
      <Grid item xs={12} md={6}>
        {textField("business", "panNumber", "PAN Number", {
          inputProps: { maxLength: 10, style: { textTransform: "uppercase" } }
        })}
      </Grid>
      <Grid item xs={12}>
        {textField("business", "businessAddress", "Business Address", { multiline: true, rows: 3 })}
      </Grid>
    </Grid>
  );

  const renderNotifications = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormGroup>
          {switchField("notifications", "emailNotifications", "Enable Email Notifications")}
          {switchField("notifications", "smsNotifications", "Enable SMS Notifications")}
          {switchField("notifications", "pushNotifications", "Enable Push Notifications")}
        </FormGroup>
      </Grid>
      <Grid item xs={12}>
        {textField("notifications", "adminAlertEmail", "Admin Alert Email", { type: "email" })}
      </Grid>
      <Grid item xs={12}>
        <Typography variant="subtitle2" gutterBottom>
          Alert Settings
        </Typography>
        <FormGroup>
          {switchField("notifications", "newBookingAlert", "New Booking Alerts")}
          {switchField("notifications", "newRegistrationAlert", "New Registration Alerts")}
          {switchField("notifications", "complaintAlert", "Complaint Alerts")}
          {switchField("notifications", "dailyDigest", "Daily Digest")}
          {switchField("notifications", "weeklyReport", "Weekly Report")}
        </FormGroup>
      </Grid>
    </Grid>
  );

  const secretProps = (key, label) => ({
    label,
    value: settings.payment[key],
    onChange: (e) => setField("payment", key, e.target.value),
    isSet: !!secretsSet[key],
    error: errors[`payment.${key}`],
    disabled
  });

  const renderPayments = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Secret keys are write-only: they are never shown here after saving. Leave a secret
          field blank to keep the value already stored on the server.
        </Alert>
      </Grid>
      <Grid item xs={12} md={6}>{textField("payment", "razorpayKeyId", "Razorpay Key ID")}</Grid>
      <Grid item xs={12} md={6}>
        <SecretField {...secretProps("razorpayKeySecret", "Razorpay Key Secret")} />
      </Grid>
      <Grid item xs={12} md={6}>
        {textField("payment", "stripePublishableKey", "Stripe Publishable Key")}
      </Grid>
      <Grid item xs={12} md={6}>
        <SecretField {...secretProps("stripeSecretKey", "Stripe Secret Key")} />
      </Grid>
      <Grid item xs={12} md={6}>
        {numberField("payment", "platformFeePercent", "Platform Fee (%)", {
          inputProps: { min: 0, max: 100, step: "0.1", inputMode: "decimal" },
          InputProps: { endAdornment: <InputAdornment position="end">%</InputAdornment> }
        })}
      </Grid>
      <Grid item xs={12} md={6}>
        {numberField("payment", "minWithdrawalAmount", "Minimum Withdrawal Amount", {
          InputProps: {
            startAdornment: (
              <InputAdornment position="start">
                {CURRENCIES.find((c) => c.value === settings.general.currency)?.symbol || "₹"}
              </InputAdornment>
            )
          }
        })}
      </Grid>
      <Grid item xs={12}>
        {switchField("payment", "enableTestMode", "Enable Test Mode")}
        {settings.payment.enableTestMode && (
          <Box sx={{ mt: 2 }}>
            <SecretField {...secretProps("testModeKey", "Test Mode Key")} />
          </Box>
        )}
      </Grid>
    </Grid>
  );

  const renderSecurity = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        {numberField("security", "sessionTimeout", "Session Timeout (minutes)")}
      </Grid>
      <Grid item xs={12} md={6}>
        {numberField("security", "maxLoginAttempts", "Max Login Attempts")}
      </Grid>
      <Grid item xs={12} md={6}>
        {numberField("security", "passwordExpiryDays", "Password Expiry (days)", {
          helperText: errors["security.passwordExpiryDays"] || "Use 0 for passwords that never expire"
        })}
      </Grid>
      <Grid item xs={12}>
        {textField("security", "ipWhitelist", "IP Whitelist (one per line)", {
          multiline: true,
          rows: 3,
          helperText: errors["security.ipWhitelist"] || "Enter IPv4/IPv6 addresses or CIDR ranges, one per line"
        })}
      </Grid>
      <Grid item xs={12}>
        <FormGroup>
          {switchField("security", "twoFactorAuth", "Enable Two-Factor Authentication")}
          {switchField("security", "enableAuditLog", "Enable Audit Log")}
        </FormGroup>
      </Grid>
    </Grid>
  );

  const renderApi = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>{switchField("api", "enableApiAccess", "Enable API Access")}</Grid>
      <Grid item xs={12} md={6}>
        <TextField
          fullWidth
          label="API Key"
          value={settings.api.apiKey ?? ""}
          helperText="Read-only. Generated by the server."
          InputProps={{
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title="Copy API key">
                  <span>
                    <IconButton
                      edge="end"
                      aria-label="Copy API key"
                      onClick={handleCopyApiKey}
                      disabled={!settings.api.apiKey}
                    >
                      <ContentCopy />
                    </IconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            )
          }}
        />
      </Grid>
      <Grid item xs={12} md={6}>
        {numberField("api", "rateLimitPerMinute", "Rate Limit (requests per minute)")}
      </Grid>
      <Grid item xs={12}>
        {textField("api", "webhookUrl", "Webhook URL", {
          placeholder: "https://your-server.com/webhook",
          type: "url"
        })}
      </Grid>
    </Grid>
  );

  const renderUI = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <FormControl component="fieldset" disabled={disabled}>
          <FormLabel component="legend">Theme</FormLabel>
          <RadioGroup
            row
            value={settings.ui.theme}
            onChange={(e) => setField("ui", "theme", e.target.value)}
          >
            {THEMES.map((theme) => (
              <FormControlLabel
                key={theme.value}
                value={theme.value}
                control={<Radio />}
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      component="span"
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        bgcolor: theme.color,
                        border: "1px solid",
                        borderColor: "divider"
                      }}
                    />
                    {theme.label}
                  </Box>
                }
              />
            ))}
          </RadioGroup>
        </FormControl>
      </Grid>
      <Grid item xs={12} md={6}>
        {selectField(
          "ui",
          "itemsPerPage",
          "Items Per Page",
          ITEMS_PER_PAGE_OPTIONS.map((n) => ({ value: n, label: String(n) }))
        )}
      </Grid>
      <Grid item xs={12}>
        <FormGroup>
          {switchField("ui", "sidebarCollapsed", "Collapse Sidebar by Default")}
          {switchField("ui", "enableAnimations", "Enable Animations")}
          {switchField("ui", "compactView", "Compact View")}
        </FormGroup>
      </Grid>
    </Grid>
  );

  const PANELS = [
    renderGeneral,
    renderBusiness,
    renderNotifications,
    renderPayments,
    renderSecurity,
    renderApi,
    renderUI
  ];

  const tabHasError = (section) =>
    Object.keys(errors).some((path) => path.startsWith(`${section}.`));

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="60vh"
        role="status"
        aria-live="polite"
      >
        <CircularProgress aria-label="Loading settings" />
      </Box>
    );
  }

  const dialogCopy = confirmDialog.action ? CONFIRM_COPY[confirmDialog.action] : null;
  const activeTabMeta = TABS[activeTab] || TABS[0];

  return (
    <MotionConfig reducedMotion={settings.ui.enableAnimations ? "user" : "always"}>
      <Box sx={{ p: { xs: 2, md: 4 } }}>
        {/* Header */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          mb={3}
        >
          <Box>
            <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
              System Settings
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Configure and manage system-wide settings
            </Typography>
          </Box>

          <Box display="flex" gap={1} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={18} /> : <Download />}
              onClick={handleExport}
              disabled={exporting || !!loadError}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<CleaningServices />}
              onClick={() => setConfirmDialog({ open: true, action: "clearCache" })}
              disabled={!canEdit}
            >
              Clear Cache
            </Button>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<RestartAlt />}
              onClick={() => setConfirmDialog({ open: true, action: "reset" })}
              disabled={!canEdit}
            >
              Reset
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <Save />}
              onClick={handleSave}
              disabled={saving || !canEdit || !!loadError || !dirty}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>
        </Box>

        {!canEdit && (
          <Alert severity="info" sx={{ mb: 3 }}>
            You have read-only access to these settings.
          </Alert>
        )}

        {loadError && (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => loadSettings()}>
                Retry
              </Button>
            }
          >
            Could not load settings ({loadError}). Saving is disabled so defaults cannot overwrite
            your real configuration.
          </Alert>
        )}

        {dirty && !loadError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            You have unsaved changes.
          </Alert>
        )}

        {/* Tabs */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            aria-label="Settings sections"
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            {TABS.map((t, i) => (
              <Tab
                key={t.section}
                id={`settings-tab-${i}`}
                aria-controls={`settings-panel-${i}`}
                label={t.label}
                icon={
                  <Badge color="error" variant="dot" invisible={!tabHasError(t.section)}>
                    {t.icon}
                  </Badge>
                }
              />
            ))}
          </Tabs>
        </Paper>

        {/* Tab content */}
        <Box
          role="tabpanel"
          id={`settings-panel-${activeTab}`}
          aria-labelledby={`settings-tab-${activeTab}`}
        >
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SettingsSection title={`${activeTabMeta.label} Settings`} icon={activeTabMeta.icon}>
              {PANELS[activeTab]()}
            </SettingsSection>
          </motion.div>
        </Box>

        {/* Confirmation dialog */}
        <Dialog
          open={confirmDialog.open}
          onClose={dialogBusy ? undefined : closeDialog}
          aria-labelledby="settings-confirm-title"
        >
          <DialogTitle id="settings-confirm-title">{dialogCopy?.title}</DialogTitle>
          <DialogContent>
            <DialogContentText>{dialogCopy?.text}</DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDialog} disabled={dialogBusy}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color="warning"
              disabled={dialogBusy}
              startIcon={dialogBusy ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {dialogCopy?.confirm || "Confirm"}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </MotionConfig>
  );
}