// src/pages/admin/ProfilePage.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  IconButton,
  Grid,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stack,
  Chip,
  InputAdornment,
  FormHelperText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Tooltip,
  Badge
} from "@mui/material";
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Lock as LockIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Language as LanguageIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Delete as DeleteIcon,
  Verified as VerifiedIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";
import { format } from "date-fns";

// ==========================================================
// CONSTANTS
// ==========================================================
const TABS = {
  PROFILE: 0,
  SECURITY: 1,
  NOTIFICATIONS: 2,
  PREFERENCES: 3
};

const NOTIFICATION_PREFERENCES = {
  EMAIL_BOOKINGS: "email_bookings",
  EMAIL_PROMOTIONS: "email_promotions",
  SMS_ALERTS: "sms_alerts",
  PUSH_BOOKINGS: "push_bookings",
  PUSH_MARKETING: "push_marketing"
};

// ==========================================================
// PROFILE HEADER COMPONENT
// ==========================================================
const ProfileHeader = ({ user, onAvatarClick, uploading }) => (
  <Box sx={{ textAlign: "center", mb: 4 }}>
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <IconButton
          sx={{
            bgcolor: "primary.main",
            color: "white",
            "&:hover": { bgcolor: "primary.dark" },
            width: 36,
            height: 36
          }}
          onClick={onAvatarClick}
          disabled={uploading}
        >
          <PhotoCameraIcon fontSize="small" />
        </IconButton>
      }
    >
      <Avatar
        src={user?.avatar}
        sx={{
          width: 120,
          height: 120,
          bgcolor: "primary.main",
          fontSize: 48,
          mb: 2,
          border: "4px solid white",
          boxShadow: 3
        }}
      >
        {user?.name?.charAt(0) || user?.fullName?.charAt(0) || "A"}
      </Avatar>
    </Badge>
    <Typography variant="h5" gutterBottom>
      {user?.name || user?.fullName}
    </Typography>
    <Chip
      icon={user?.verified ? <VerifiedIcon /> : <WarningIcon />}
      label={user?.verified ? "Verified Account" : "Unverified Account"}
      color={user?.verified ? "success" : "warning"}
      size="small"
      sx={{ mb: 1 }}
    />
    <Typography variant="body2" color="text.secondary">
      Member since {user?.createdAt ? format(new Date(user.createdAt), "MMMM dd, yyyy") : "N/A"}
    </Typography>
  </Box>
);

// ==========================================================
// PROFILE FORM COMPONENT
// ==========================================================
const ProfileForm = ({ user, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    bio: ""
  });
  const [errors, setErrors] = useState({});
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || user.fullName || "",
        email: user.email || "",
        phone: user.phone || user.phoneNumber || "",
        address: user.address || "",
        bio: user.bio || ""
      });
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }
    
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email is invalid";
    }
    
    if (formData.phone && !/^[0-9+\-\s()]{10,15}$/.test(formData.phone)) {
      newErrors.phone = "Phone number is invalid";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field) => (event) => {
    setFormData({ ...formData, [field]: event.target.value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" });
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    await onUpdate(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || user?.phoneNumber || "",
      address: user?.address || "",
      bio: user?.bio || ""
    });
    setErrors({});
    setIsEditing(false);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h6">Profile Information</Typography>
        {!isEditing ? (
          <Button
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            variant="outlined"
          >
            Edit Profile
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              variant="outlined"
              color="error"
            >
              Cancel
            </Button>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSubmit}
              variant="contained"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </Stack>
        )}
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Full Name"
            value={formData.name}
            onChange={handleChange("name")}
            disabled={!isEditing}
            error={!!errors.name}
            helperText={errors.name}
            required
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange("email")}
            disabled={!isEditing}
            error={!!errors.email}
            helperText={errors.email}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Phone Number"
            value={formData.phone}
            onChange={handleChange("phone")}
            disabled={!isEditing}
            error={!!errors.phone}
            helperText={errors.phone}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PhoneIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="Address"
            value={formData.address}
            onChange={handleChange("address")}
            disabled={!isEditing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationIcon color="action" />
                </InputAdornment>
              )
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Bio"
            multiline
            rows={4}
            value={formData.bio}
            onChange={handleChange("bio")}
            disabled={!isEditing}
            placeholder="Tell us a little about yourself..."
          />
        </Grid>
      </Grid>
    </Box>
  );
};

// ==========================================================
// SECURITY SETTINGS COMPONENT
// ==========================================================
const SecuritySettings = ({ onChangePassword, onEnable2FA, onToggle2FA, user }) => {
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validatePasswords = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = "Current password is required";
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = "New password is required";
    } else if (passwordData.newPassword.length < 8) {
      errors.newPassword = "Password must be at least 8 characters";
    }
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswords()) return;
    
    setSubmitting(true);
    await onChangePassword(passwordData);
    setSubmitting(false);
    setPasswordDialog(false);
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Security Settings
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" fontWeight="500">
                    Change Password
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Update your password to keep your account secure
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  startIcon={<LockIcon />}
                  onClick={() => setPasswordDialog(true)}
                >
                  Change Password
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" fontWeight="500">
                    Two-Factor Authentication
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Add an extra layer of security to your account
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={user?.twoFactorEnabled || false}
                      onChange={(e) => onToggle2FA(e.target.checked)}
                    />
                  }
                  label={user?.twoFactorEnabled ? "Enabled" : "Disabled"}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle1" fontWeight="500">
                    Active Sessions
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Manage your active sessions across devices
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<SecurityIcon />}
                >
                  Manage Sessions
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialog} onClose={() => setPasswordDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
              error={!!passwordErrors.currentPassword}
              helperText={passwordErrors.currentPassword}
            />
            <TextField
              fullWidth
              type="password"
              label="New Password"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              error={!!passwordErrors.newPassword}
              helperText={passwordErrors.newPassword || "Minimum 8 characters"}
            />
            <TextField
              fullWidth
              type="password"
              label="Confirm New Password"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
              error={!!passwordErrors.confirmPassword}
              helperText={passwordErrors.confirmPassword}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordChange} variant="contained" disabled={submitting}>
            {submitting ? "Updating..." : "Update Password"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// ==========================================================
// NOTIFICATION PREFERENCES COMPONENT
// ==========================================================
const NotificationPreferences = ({ preferences, onUpdate }) => {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleToggle = (key) => (event) => {
    const newPrefs = { ...localPrefs, [key]: event.target.checked };
    setLocalPrefs(newPrefs);
    onUpdate(newPrefs);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Notification Preferences
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localPrefs?.email_bookings || false}
                      onChange={handleToggle(NOTIFICATION_PREFERENCES.EMAIL_BOOKINGS)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Email - Booking Updates</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive email notifications about your bookings
                      </Typography>
                    </Box>
                  }
                />
                
                <Divider />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={localPrefs?.email_promotions || false}
                      onChange={handleToggle(NOTIFICATION_PREFERENCES.EMAIL_PROMOTIONS)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Email - Promotions & Offers</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive marketing emails about special offers
                      </Typography>
                    </Box>
                  }
                />
                
                <Divider />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={localPrefs?.sms_alerts || false}
                      onChange={handleToggle(NOTIFICATION_PREFERENCES.SMS_ALERTS)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">SMS Alerts</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Get important updates via text message
                      </Typography>
                    </Box>
                  }
                />
                
                <Divider />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={localPrefs?.push_bookings || false}
                      onChange={handleToggle(NOTIFICATION_PREFERENCES.PUSH_BOOKINGS)}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body1">Push - Booking Updates</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Receive push notifications for booking status changes
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==========================================================
// PREFERENCES COMPONENT
// ==========================================================
const Preferences = ({ preferences, onUpdate }) => {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleChange = (key) => (event) => {
    const newPrefs = { ...localPrefs, [key]: event.target.checked };
    setLocalPrefs(newPrefs);
    onUpdate(newPrefs);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        App Preferences
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localPrefs?.darkMode || false}
                      onChange={handleChange("darkMode")}
                    />
                  }
                  label={
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {localPrefs?.darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                        <Typography variant="body1">Dark Mode</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Switch between light and dark theme
                      </Typography>
                    </Box>
                  }
                />
                
                <Divider />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={localPrefs?.language !== "en"}
                      onChange={handleChange("language")}
                    />
                  }
                  label={
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LanguageIcon />
                        <Typography variant="body1">Language Preferences</Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        Use system language settings
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// ==========================================================
// MAIN PROFILE PAGE COMPONENT
// ==========================================================
const ProfilePage = () => {
  const { user, updateUser, logout, refreshUser } = useAuth();
  const { addNotification } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [preferences, setPreferences] = useState({
    darkMode: false,
    language: "en",
    email_bookings: true,
    email_promotions: false,
    sms_alerts: true,
    push_bookings: true
  });

  // Load preferences from localStorage
  useEffect(() => {
    const savedPrefs = localStorage.getItem("userPreferences");
    if (savedPrefs) {
      setPreferences(JSON.parse(savedPrefs));
    }
  }, []);

  // Handle profile update
  const handleProfileUpdate = async (formData) => {
    setLoading(true);
    try {
      await updateUser(formData);
      setSnackbar({
        open: true,
        message: "Profile updated successfully!",
        severity: "success"
      });
      addNotification?.({
        type: "success",
        title: "Profile Updated",
        message: "Your profile information has been updated"
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to update profile",
        severity: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setSnackbar({
        open: true,
        message: "Please upload an image file",
        severity: "error"
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setSnackbar({
        open: true,
        message: "Image must be less than 2MB",
        severity: "error"
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const response = await api.post("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      await refreshUser();
      setSnackbar({
        open: true,
        message: "Avatar updated successfully!",
        severity: "success"
      });
    } catch (error) {
      console.error("Failed to upload avatar:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to upload avatar",
        severity: "error"
      });
    } finally {
      setUploading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async (passwordData) => {
    try {
      await api.post("/auth/change-password", passwordData);
      setSnackbar({
        open: true,
        message: "Password changed successfully!",
        severity: "success"
      });
      addNotification?.({
        type: "success",
        title: "Password Changed",
        message: "Your password has been updated"
      });
    } catch (error) {
      console.error("Failed to change password:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to change password",
        severity: "error"
      });
      throw error;
    }
  };

  // Handle 2FA toggle
  const handleToggle2FA = async (enabled) => {
    try {
      await api.post("/auth/two-factor/toggle", { enabled });
      await refreshUser();
      setSnackbar({
        open: true,
        message: `2FA ${enabled ? "enabled" : "disabled"} successfully`,
        severity: "success"
      });
    } catch (error) {
      console.error("Failed to toggle 2FA:", error);
      setSnackbar({
        open: true,
        message: error.response?.data?.message || "Failed to update 2FA settings",
        severity: "error"
      });
    }
  };

  // Handle preferences update
  const handlePreferencesUpdate = (newPrefs) => {
    setPreferences(newPrefs);
    localStorage.setItem("userPreferences", JSON.stringify(newPrefs));
    
    // Apply dark mode
    if (newPrefs.darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
    
    setSnackbar({
      open: true,
      message: "Preferences updated successfully!",
      severity: "success"
    });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: "hidden" }}>
        {/* Header Section */}
        <Box sx={{ p: 4, bgcolor: "primary.main", color: "white" }}>
          <Typography variant="h4" gutterBottom>
            Profile Settings
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            Manage your account settings and preferences
          </Typography>
        </Box>

        {/* Profile Header with Avatar */}
        <Box sx={{ p: 4 }}>
          <ProfileHeader 
            user={user} 
            onAvatarClick={() => document.getElementById("avatar-upload").click()}
            uploading={uploading}
          />
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleAvatarUpload}
          />

          {/* Tabs */}
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Profile" />
            <Tab label="Security" />
            <Tab label="Notifications" />
            <Tab label="Preferences" />
          </Tabs>

          {/* Tab Panels */}
          <Box sx={{ mt: 3 }}>
            {activeTab === TABS.PROFILE && (
              <ProfileForm user={user} onUpdate={handleProfileUpdate} loading={loading} />
            )}
            
            {activeTab === TABS.SECURITY && (
              <SecuritySettings 
                onChangePassword={handlePasswordChange}
                onToggle2FA={handleToggle2FA}
                user={user}
              />
            )}
            
            {activeTab === TABS.NOTIFICATIONS && (
              <NotificationPreferences 
                preferences={preferences}
                onUpdate={handlePreferencesUpdate}
              />
            )}
            
            {activeTab === TABS.PREFERENCES && (
              <Preferences 
                preferences={preferences}
                onUpdate={handlePreferencesUpdate}
              />
            )}
          </Box>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ProfilePage;