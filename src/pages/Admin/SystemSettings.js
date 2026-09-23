import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Switch } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { 
  FaSave, FaUndo, FaCog, FaBell, FaGlobe, 
  FaMoneyBill, FaClock, FaUserPlus, FaShieldAlt,
  FaExclamationTriangle, FaCheckCircle, FaSpinner
} from "react-icons/fa";
import api from "../../api/api";
import { useAuth } from "../../contexts/AuthContext";

// Utility for toggle styling
const toggleClass = (enabled, activeColor) =>
  `${enabled ? activeColor : "bg-gray-600"} relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-[#141b34]`;

// ==========================================================
// INPUT COMPONENTS
// ==========================================================

const SettingsSection = ({ title, icon: Icon, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="bg-[#141b34] shadow-xl rounded-xl p-6 border border-[#1f2a48] hover:border-blue-500/30 transition-all"
  >
    <h2 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2 flex items-center gap-2">
      {Icon && <Icon className="text-blue-400" size={20} />}
      {title}
    </h2>
    {children}
  </motion.div>
);

const ToggleField = ({ label, description, enabled, onChange, color = "bg-green-600" }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-700 last:border-0">
    <div>
      <span className="font-medium">{label}</span>
      {description && (
        <p className="text-sm text-gray-400 mt-0.5">{description}</p>
      )}
    </div>
    <Switch
      checked={enabled}
      onChange={onChange}
      className={`${toggleClass(enabled, color)} relative`}
    >
      <span className="sr-only">{label}</span>
      <span
        className={`${
          enabled ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform bg-white rounded-full shadow-lg transition-transform`}
      />
    </Switch>
  </div>
);

const NumberField = ({ label, value, onChange, min = 0, max = 100, step = 1, suffix = "" }) => (
  <div className="mt-4">
    <label className="block mb-1 text-gray-300 font-medium">
      {label}
    </label>
    <div className="relative">
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-full bg-[#1a2332] text-white border border-gray-600 rounded-lg p-2 pr-12 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
          {suffix}
        </span>
      )}
    </div>
  </div>
);

const SelectField = ({ label, value, onChange, options }) => (
  <div className="mt-4">
    <label className="block mb-1 text-gray-300 font-medium">
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-[#1a2332] text-white border border-gray-600 rounded-lg p-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
    >
      {options.map(({ value: optValue, label: optLabel }) => (
        <option key={optValue} value={optValue}>
          {optLabel}
        </option>
      ))}
    </select>
  </div>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================

const SystemSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    // System Settings
    maintenanceMode: false,
    allowNewRegistrations: true,
    requireEmailVerification: true,
    requirePhoneVerification: false,
    
    // Booking Settings
    defaultBookingDuration: 60,
    maxBookingsPerDay: 10,
    minAdvanceBookingHours: 2,
    maxAdvanceBookingDays: 30,
    allowCancellation: true,
    cancellationDeadlineHours: 24,
    
    // Provider Settings
    minProviderExperience: 0,
    autoApprovalThreshold: 5,
    requireBackgroundCheck: true,
    maxStrikesBeforeSuspension: 3,
    
    // Commission & Payments
    platformCommission: 10,
    providerPayoutDelayDays: 7,
    minimumPayoutAmount: 500,
    defaultCurrency: "INR",
    
    // Notification Settings
    emailNotificationsEnabled: true,
    smsNotificationsEnabled: true,
    pushNotificationsEnabled: false,
    
    // Regional Settings
    defaultTimezone: "Asia/Kolkata",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "12h",
    
    // Security Settings
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    twoFactorAuthRequired: false,
    passwordExpiryDays: 90,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // ==========================================================
  // FETCH SETTINGS FROM BACKEND
  // ==========================================================
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get("/api/v1/admin/settings");
      const data = response.data?.data || response.data;
      
      setSettings(prev => ({ ...prev, ...data }));
      setUnsavedChanges(false);
      
      toast.success("Settings loaded successfully", {
        icon: <FaCheckCircle className="text-green-500" />,
        duration: 3000
      });
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError(err.response?.data?.message || "Failed to load settings");
      toast.error("Unable to load settings. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ==========================================================
  // SAVE SETTINGS
  // ==========================================================
  const handleSave = async () => {
    // Validate settings before saving
    if (settings.platformCommission < 0 || settings.platformCommission > 100) {
      toast.error("Platform commission must be between 0 and 100");
      return;
    }

    if (settings.defaultBookingDuration < 15) {
      toast.error("Default booking duration must be at least 15 minutes");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await api.put("/api/v1/admin/settings", settings);
      setUnsavedChanges(false);
      
      toast.success("Settings saved successfully", {
        icon: <FaCheckCircle className="text-green-500" />,
        duration: 5000
      });

      // Log audit trail
      console.log(`Settings updated by admin: ${user?.email}`);
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError(err.response?.data?.message || "Failed to save settings");
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (unsavedChanges) {
      if (window.confirm("You have unsaved changes. Are you sure you want to reset?")) {
        fetchSettings();
      }
    } else {
      fetchSettings();
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setUnsavedChanges(true);
  };

  // ==========================================================
  // MEMOIZED OPTIONS
  // ==========================================================
  const currencyOptions = useMemo(() => [
    { value: "INR", label: "Indian Rupee (₹)" },
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" },
    { value: "AED", label: "UAE Dirham (د.إ)" },
    { value: "SAR", label: "Saudi Riyal (﷼)" },
  ], []);

  const timezoneOptions = useMemo(() => [
    { value: "Asia/Kolkata", label: "India - Mumbai (IST)" },
    { value: "Asia/Dubai", label: "UAE - Dubai (GST)" },
    { value: "Asia/Riyadh", label: "Saudi Arabia - Riyadh (AST)" },
    { value: "Asia/Karachi", label: "Pakistan - Karachi (PKT)" },
    { value: "Asia/Dhaka", label: "Bangladesh - Dhaka (BST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Europe/London", label: "United Kingdom - London (GMT)" },
    { value: "America/New_York", label: "USA - New York (EST)" },
  ], []);

  const dateFormatOptions = useMemo(() => [
    { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
    { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
    { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  ], []);

  const timeFormatOptions = useMemo(() => [
    { value: "12h", label: "12-hour (AM/PM)" },
    { value: "24h", label: "24-hour" },
  ], []);

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] p-8 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center h-96">
            <FaSpinner className="text-4xl text-blue-500 animate-spin mb-4" />
            <p className="text-gray-400">Loading system settings...</p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0e27] to-[#1a1f3a] p-8 text-white">
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1a2332',
            color: '#fff',
            border: '1px solid #2d3748',
          },
          success: {
            icon: <FaCheckCircle className="text-green-500" />,
          },
          error: {
            icon: <FaExclamationTriangle className="text-red-500" />,
          },
        }}
      />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <FaCog className="text-blue-400" />
                System Settings
              </h1>
              <p className="text-gray-400 mt-2">
                Configure global platform settings and preferences
              </p>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${unsavedChanges ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
              <span className="text-sm text-gray-400">
                {unsavedChanges ? 'Unsaved changes' : 'All saved'}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 bg-red-500/10 border border-red-500/50 rounded-lg p-4 flex items-center gap-3"
              >
                <FaExclamationTriangle className="text-red-500 flex-shrink-0" />
                <p className="text-red-500">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Settings */}
          <SettingsSection title="System Settings" icon={FaCog}>
            <ToggleField
              label="Maintenance Mode"
              description="Enable maintenance mode - only admins can access"
              enabled={settings.maintenanceMode}
              onChange={(val) => handleChange("maintenanceMode", val)}
              color="bg-red-600"
            />
            
            <ToggleField
              label="Allow New Registrations"
              description="Allow new users to register"
              enabled={settings.allowNewRegistrations}
              onChange={(val) => handleChange("allowNewRegistrations", val)}
            />
            
            <ToggleField
              label="Require Email Verification"
              description="Users must verify email before accessing platform"
              enabled={settings.requireEmailVerification}
              onChange={(val) => handleChange("requireEmailVerification", val)}
            />
            
            <ToggleField
              label="Require Phone Verification"
              description="Users must verify phone number"
              enabled={settings.requirePhoneVerification}
              onChange={(val) => handleChange("requirePhoneVerification", val)}
            />

            <SelectField
              label="Default Timezone"
              value={settings.defaultTimezone}
              onChange={(val) => handleChange("defaultTimezone", val)}
              options={timezoneOptions}
            />
          </SettingsSection>

          {/* Booking Settings */}
          <SettingsSection title="Booking Settings" icon={FaClock}>
            <NumberField
              label="Default Booking Duration"
              value={settings.defaultBookingDuration}
              onChange={(val) => handleChange("defaultBookingDuration", val)}
              min={15}
              max={480}
              step={15}
              suffix="min"
            />
            
            <NumberField
              label="Max Bookings Per Day"
              value={settings.maxBookingsPerDay}
              onChange={(val) => handleChange("maxBookingsPerDay", val)}
              min={1}
              max={50}
            />
            
            <NumberField
              label="Minimum Advance Booking"
              value={settings.minAdvanceBookingHours}
              onChange={(val) => handleChange("minAdvanceBookingHours", val)}
              min={0}
              max={72}
              suffix="hours"
            />
            
            <NumberField
              label="Maximum Advance Booking"
              value={settings.maxAdvanceBookingDays}
              onChange={(val) => handleChange("maxAdvanceBookingDays", val)}
              min={1}
              max={90}
              suffix="days"
            />
            
            <ToggleField
              label="Allow Cancellation"
              description="Allow users to cancel bookings"
              enabled={settings.allowCancellation}
              onChange={(val) => handleChange("allowCancellation", val)}
            />
            
            <NumberField
              label="Cancellation Deadline"
              value={settings.cancellationDeadlineHours}
              onChange={(val) => handleChange("cancellationDeadlineHours", val)}
              min={0}
              max={72}
              suffix="hours before"
            />
          </SettingsSection>

          {/* Provider Settings */}
          <SettingsSection title="Provider Settings" icon={FaUserPlus}>
            <NumberField
              label="Minimum Provider Experience"
              value={settings.minProviderExperience}
              onChange={(val) => handleChange("minProviderExperience", val)}
              min={0}
              max={20}
              suffix="years"
            />
            
            <NumberField
              label="Auto-Approval Threshold"
              value={settings.autoApprovalThreshold}
              onChange={(val) => handleChange("autoApprovalThreshold", val)}
              min={0}
              max={20}
              description="Number of completed jobs for auto-approval"
            />
            
            <ToggleField
              label="Require Background Check"
              description="Providers must pass background check"
              enabled={settings.requireBackgroundCheck}
              onChange={(val) => handleChange("requireBackgroundCheck", val)}
            />
            
            <NumberField
              label="Max Strikes Before Suspension"
              value={settings.maxStrikesBeforeSuspension}
              onChange={(val) => handleChange("maxStrikesBeforeSuspension", val)}
              min={1}
              max={10}
            />
          </SettingsSection>

          {/* Commission & Payments */}
          <SettingsSection title="Commission & Payments" icon={FaMoneyBill}>
            <NumberField
              label="Platform Commission"
              value={settings.platformCommission}
              onChange={(val) => handleChange("platformCommission", val)}
              min={0}
              max={100}
              step={0.5}
              suffix="%"
            />
            
            <NumberField
              label="Provider Payout Delay"
              value={settings.providerPayoutDelayDays}
              onChange={(val) => handleChange("providerPayoutDelayDays", val)}
              min={0}
              max={30}
              suffix="days"
            />
            
            <NumberField
              label="Minimum Payout Amount"
              value={settings.minimumPayoutAmount}
              onChange={(val) => handleChange("minimumPayoutAmount", val)}
              min={100}
              max={10000}
              step={100}
              suffix={settings.defaultCurrency}
            />
            
            <SelectField
              label="Default Currency"
              value={settings.defaultCurrency}
              onChange={(val) => handleChange("defaultCurrency", val)}
              options={currencyOptions}
            />
          </SettingsSection>

          {/* Notification Settings */}
          <SettingsSection title="Notification Settings" icon={FaBell}>
            <ToggleField
              label="Email Notifications"
              description="Send notifications via email"
              enabled={settings.emailNotificationsEnabled}
              onChange={(val) => handleChange("emailNotificationsEnabled", val)}
            />
            
            <ToggleField
              label="SMS Notifications"
              description="Send notifications via SMS"
              enabled={settings.smsNotificationsEnabled}
              onChange={(val) => handleChange("smsNotificationsEnabled", val)}
            />
            
            <ToggleField
              label="Push Notifications"
              description="Send push notifications to mobile apps"
              enabled={settings.pushNotificationsEnabled}
              onChange={(val) => handleChange("pushNotificationsEnabled", val)}
            />
          </SettingsSection>

          {/* Security Settings */}
          <SettingsSection title="Security Settings" icon={FaShieldAlt}>
            <NumberField
              label="Session Timeout"
              value={settings.sessionTimeoutMinutes}
              onChange={(val) => handleChange("sessionTimeoutMinutes", val)}
              min={5}
              max={480}
              suffix="minutes"
            />
            
            <NumberField
              label="Max Login Attempts"
              value={settings.maxLoginAttempts}
              onChange={(val) => handleChange("maxLoginAttempts", val)}
              min={3}
              max={20}
            />
            
            <NumberField
              label="Password Expiry"
              value={settings.passwordExpiryDays}
              onChange={(val) => handleChange("passwordExpiryDays", val)}
              min={30}
              max={365}
              suffix="days"
            />
            
            <ToggleField
              label="Require Two-Factor Auth"
              description="Force 2FA for all users"
              enabled={settings.twoFactorAuthRequired}
              onChange={(val) => handleChange("twoFactorAuthRequired", val)}
            />
          </SettingsSection>

          {/* Regional Settings */}
          <SettingsSection title="Regional Settings" icon={FaGlobe}>
            <SelectField
              label="Date Format"
              value={settings.dateFormat}
              onChange={(val) => handleChange("dateFormat", val)}
              options={dateFormatOptions}
            />
            
            <SelectField
              label="Time Format"
              value={settings.timeFormat}
              onChange={(val) => handleChange("timeFormat", val)}
              options={timeFormatOptions}
            />
          </SettingsSection>
        </div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end gap-4 mt-8 sticky bottom-4"
        >
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 
                       transition-colors font-medium flex items-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaUndo size={14} />
            Reset
          </button>
          
          <button
            disabled={saving || !unsavedChanges}
            onClick={handleSave}
            className={`px-8 py-2 rounded-lg font-semibold flex items-center gap-2
                       transition-all transform hover:scale-105
                       ${saving || !unsavedChanges
                ? "bg-blue-400 cursor-not-allowed opacity-50"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
              }`}
          >
            {saving ? (
              <>
                <FaSpinner className="animate-spin" size={14} />
                Saving...
              </>
            ) : (
              <>
                <FaSave size={14} />
                Save Changes
              </>
            )}
          </button>
        </motion.div>

        {/* Last Updated Info */}
        <p className="text-center text-gray-500 text-sm mt-4">
          Last updated by {user?.email || 'admin'} • Changes are applied immediately
        </p>
      </div>
    </div>
  );
};

export default SystemSettings;