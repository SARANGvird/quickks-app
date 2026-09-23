// src/pages/Provider/ProviderForm.jsx
// ⚡ QUICKKS FOUNDER EDITION - COMPLETE PRODUCTION-READY PROVIDER FORM v4.0

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

// --- OPENSTREET MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import api from "../../api/api";

// --- MUI COMPONENTS ---
import {
  Box,
  Typography,
  Paper,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  AlertTitle,
  CircularProgress,
  Chip,
  Stack,
  Divider,
  Card,
  CardContent,
  Avatar,
  LinearProgress,
  Snackbar,
  useMediaQuery,
  useTheme as useMuiTheme,
  Container,
  InputAdornment,
  FormHelperText,
  Fade,
  Tooltip,
  IconButton,
} from "@mui/material";

import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaMapMarkerAlt,
  FaUser,
  FaPhone,
  FaIdCard,
  FaAddressCard,
  FaTools,
  FaRupeeSign,
  FaInfoCircle,
  FaMapPin,
  FaGlobe,
  FaHome,
  FaBuilding,
  FaCity,
  FaSave,
  FaUserCheck,
  FaShieldAlt,
  FaCertificate,
  FaExclamationTriangle,
  FaBuilding as FaBusiness,
  FaSpinner,
  FaPlus,
  FaClock,
  FaExclamationCircle,
  FaSync,
} from "react-icons/fa";

// Fix for Leaflet default marker icons
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ==========================================================
// CONSTANTS - FOUNDER EDITION
// ==========================================================
const DEFAULT_CENTER = [18.5204, 73.8567];
const TOTAL_STEPS = 5;
const MAX_SKILLS = 20;
const MAX_CERTIFICATES = 10;
const API_TIMEOUT = 60000;

const SERVICE_TYPES = [
  "PLUMBER", "ELECTRICIAN", "AC_TECHNICIAN", "CARPENTER",
  "APPLIANCE_REPAIR", "PAINTER", "MECHANIC", "CLEANER",
  "GARDENER", "PEST_CONTROL", "TUTOR", "EVENT_PLANNER",
  "PHOTOGRAPHER", "VIDEOGRAPHER", "INTERIOR_DESIGNER",
  "YOGA_INSTRUCTOR", "PERSONAL_TRAINER", "CATERER", "DJ", "MAKEUP_ARTIST"
];

const SERVICE_TYPE_DISPLAY = {
  PLUMBER: "Plumber", ELECTRICIAN: "Electrician",
  AC_TECHNICIAN: "AC Technician", CARPENTER: "Carpenter",
  APPLIANCE_REPAIR: "Appliance Repair", PAINTER: "Painter",
  MECHANIC: "Mechanic", CLEANER: "Cleaner",
  GARDENER: "Gardener", PEST_CONTROL: "Pest Control",
  TUTOR: "Tutor", EVENT_PLANNER: "Event Planner",
  PHOTOGRAPHER: "Photographer", VIDEOGRAPHER: "Videographer",
  INTERIOR_DESIGNER: "Interior Designer", YOGA_INSTRUCTOR: "Yoga Instructor",
  PERSONAL_TRAINER: "Personal Trainer", CATERER: "Caterer",
  DJ: "DJ", MAKEUP_ARTIST: "Makeup Artist"
};

const PRICE_UNITS = ["PER_HOUR", "PER_JOB", "PER_DAY", "PER_SQUARE_FOOT"];
const PRICE_UNIT_DISPLAY = {
  PER_HOUR: "Per Hour",
  PER_JOB: "Per Job",
  PER_DAY: "Per Day",
  PER_SQUARE_FOOT: "Per Square Foot",
};

const EXPERIENCE_OPTIONS = [
  { value: 0, label: "Less than 1 year" },
  { value: 1, label: "1 year" },
  { value: 2, label: "2 years" },
  { value: 3, label: "3 years" },
  { value: 4, label: "4 years" },
  { value: 5, label: "5 years" },
  { value: 6, label: "6 years" },
  { value: 7, label: "7 years" },
  { value: 8, label: "8 years" },
  { value: 9, label: "9 years" },
  { value: 10, label: "10+ years" },
];

const AVAILABILITY_OPTIONS = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const STEP_LABELS = ["Basic Info", "Professional", "Location", "Address", "Review"];

// ==========================================================
// ✅ FOUNDER EDITION: INITIAL FORM STATE WITH MULTIPLE FALLBACKS
// ==========================================================
const getInitialFormState = (user) => {
  let phone = '';
  
  if (user) {
    phone = user.phone || user.mobile || user.phoneNumber || '';
  }
  
  if (!phone) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        phone = parsed.phone || parsed.mobile || '';
      }
    } catch (e) {
      console.warn('Could not parse stored user:', e);
    }
  }

  console.log('📞 [Quickks] Phone found in form init:', phone);

  return {
    fullName: user?.fullName || user?.name || '',
    phone: phone,
    email: user?.email || '',
    aadhaar: '',
    pan: '',
    businessName: '',
    serviceType: '',
    experienceYears: 0,
    basePrice: '',
    priceUnit: "PER_HOUR",
    skills: [],
    description: "",
    latitude: null,
    longitude: null,
    area: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    availableDays: [],
    availableFrom: "09:00",
    availableTo: "18:00",
    socialMedia: {
      whatsapp: "",
      instagram: "",
      facebook: "",
      twitter: "",
      linkedin: "",
    },
    certificates: [],
    documents: [],
    gst: "",
  };
};

// ==========================================================
// HELPER COMPONENTS
// ==========================================================
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, 14);
    }
  }, [center, map]);
  return null;
}

function MapEvents({ onClick }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function ProviderForm() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const mountedRef = useRef(true);
  const mapRef = useRef(null);
  const formRef = useRef(null);
  const abortControllerRef = useRef(null);

  // ==========================================================
  // STATE
  // ==========================================================
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState(() => getInitialFormState(user));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [profileCheckDone, setProfileCheckDone] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [profileStatus, setProfileStatus] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [certificateInput, setCertificateInput] = useState("");
  const [stepErrors, setStepErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [formProgress, setFormProgress] = useState(0);
  const [fetchingUserData, setFetchingUserData] = useState(false);

  // ==========================================================
  // ✅ FOUNDER EDITION: VALIDATION FUNCTIONS
  // ==========================================================
  const validateAadhaar = useCallback((aadhaar) => /^\d{12}$/.test(aadhaar.replace(/\s/g, "")), []);
  const validatePAN = useCallback((pan) => /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan.toUpperCase()), []);
  const validatePhone = useCallback((phone) => /^[6-9]\d{9}$/.test(phone.replace(/\D/g, "")), []);
  const validateEmail = useCallback((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), []);
  const validatePincode = useCallback((pincode) => /^\d{6}$/.test(pincode), []);
  const validateGST = useCallback((gst) => {
    if (!gst) return true;
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst.toUpperCase());
  }, []);
  const validateFullName = useCallback((name) => /^[a-zA-Z\s\.\-']+$/.test(name), []);

  // ==========================================================
  // ✅ FETCH USER DATA FROM API IF MISSING
  // ==========================================================
  const fetchUserData = useCallback(async () => {
    if (!isAuthenticated || !user) return;
    
    setFetchingUserData(true);
    try {
      console.log("📞 [Quickks] Fetching user data from API...");
      const response = await api.get('/api/v1/users/me');
      const userData = response.data?.data || response.data;
      
      console.log("📞 [Quickks] User data from API:", userData);
      
      if (userData) {
        const updates = {};
        if (userData.fullName && !form.fullName) updates.fullName = userData.fullName;
        if (userData.phone && !form.phone) updates.phone = userData.phone;
        if (userData.email && !form.email) updates.email = userData.email;
        
        if (Object.keys(updates).length > 0) {
          setForm(prev => ({ ...prev, ...updates }));
          console.log("✅ [Quickks] Form updated with user data:", updates);
        }
        
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            const updatedUser = { ...parsed, ...userData };
            localStorage.setItem('user', JSON.stringify(updatedUser));
          } catch (e) {
            console.warn('Could not update stored user:', e);
          }
        }
        
        setSnackbar({
          open: true,
          message: 'User data refreshed successfully!',
          severity: 'success',
        });
      }
    } catch (error) {
      console.error('❌ [Quickks] Error fetching user data:', error);
      setSnackbar({
        open: true,
        message: 'Could not fetch user data. Please try again.',
        severity: 'error',
      });
    } finally {
      setFetchingUserData(false);
    }
  }, [isAuthenticated, user, form]);

  // ==========================================================
  // ✅ FOUNDER EDITION: STEP VALIDATION
  // ==========================================================
  const validateStep = useCallback((stepNum) => {
    if (stepNum === 0) {
      if (!form.fullName?.trim()) {
        return "Full name not found. Please refresh user data or logout and login again.";
      }
      if (!validateFullName(form.fullName)) {
        return "Full name can only contain letters, spaces, dots (.), hyphens (-), and apostrophes (').";
      }
      if (!form.phone?.trim()) {
        fetchUserData();
        return "Phone number is loading... Please wait a moment.";
      }
      if (!validatePhone(form.phone)) {
        return "Valid 10-digit phone number required (starting with 6-9).";
      }
      if (!form.email?.trim()) {
        return "Email not found. Please refresh user data or logout and login again.";
      }
      if (!validateEmail(form.email)) {
        return "Valid email address is required.";
      }
      if (!validateAadhaar(form.aadhaar)) {
        return "Valid 12-digit Aadhaar number required.";
      }
      if (!validatePAN(form.pan)) {
        return "Valid PAN card number required (e.g., ABCDE1234F).";
      }
      if (form.gst && !validateGST(form.gst)) {
        return "Invalid GST number format.";
      }
    } else if (stepNum === 1) {
      if (!form.serviceType) return "Please select a service type.";
      if (!form.experienceYears && form.experienceYears !== 0) return "Please select your experience.";
      if (!form.basePrice || parseFloat(form.basePrice) <= 0) {
        return "Please enter a valid base price greater than 0.";
      }
      if (!form.priceUnit) return "Please select a price unit.";
      if (form.skills.length === 0) return "Please add at least one skill.";
    } else if (stepNum === 2) {
      if (!form.area?.trim()) return "Please enter your service area.";
      if (!form.latitude) return "Please pin your location on the map.";
      if (!form.longitude) return "Please pin your location on the map.";
    } else if (stepNum === 3) {
      if (!form.addressLine1?.trim()) return "Please enter your address line 1.";
      if (!form.city?.trim()) return "Please enter your city.";
      if (!form.state?.trim()) return "Please enter your state.";
      if (!validatePincode(form.pincode)) return "Valid 6-digit pincode required.";
    }
    return null;
  }, [form, validatePhone, validateEmail, validateAadhaar, validatePAN, validatePincode, validateGST, validateFullName, fetchUserData]);

  // ==========================================================
  // COMPUTED VALUES
  // ==========================================================
  const formCompletion = useMemo(() => {
    let completed = 0;
    const total = 5;
    
    if (form.fullName && validatePhone(form.phone) && form.email && validateAadhaar(form.aadhaar) && validatePAN(form.pan)) completed++;
    if (form.serviceType && form.experienceYears !== undefined && form.basePrice && form.priceUnit && form.skills.length > 0) completed++;
    if (form.area && form.latitude && form.longitude) completed++;
    if (form.addressLine1 && form.city && form.state && validatePincode(form.pincode)) completed++;
    if (completed === 4) completed++;
    
    setFormProgress((completed / total) * 100);
    return (completed / total) * 100;
  }, [form, validatePhone, validateAadhaar, validatePAN, validatePincode]);

  // ==========================================================
  // EFFECTS
  // ==========================================================
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    console.log("👤 [Quickks] User object:", user);
    console.log("👤 [Quickks] Full Name:", user?.fullName);
    console.log("👤 [Quickks] Phone:", user?.phone);
    console.log("👤 [Quickks] Email:", user?.email);
    console.log("📋 [Quickks] Form initialized with:", form);
    
    if (user && !user.phone && isAuthenticated) {
      console.log("📞 [Quickks] Phone missing from user object, fetching from API...");
      fetchUserData();
    }
  }, [user, form, isAuthenticated, fetchUserData]);

  // ==========================================================
  // ROLE VALIDATION & PROFILE CHECK - FOUNDER EDITION
  // ==========================================================
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', {
        state: { from: location.pathname, role: 'provider' }
      });
      return;
    }

    const userRole = user?.role?.toUpperCase() || '';
    const allowedRoles = ['PROVIDER', 'SERVICE_PROVIDER'];
    const hasValidRole = allowedRoles.includes(userRole);

    if (!hasValidRole) {
      setIsAuthorized(false);
      setSnackbar({
        open: true,
        message: `Access Denied: You are logged in as ${user?.role || 'Unknown'}. Provider access required.`,
        severity: "error",
      });
      setError(`Access Denied: You are logged in as ${user?.role || 'Unknown'}.`);
      setRoleCheckDone(true);
      return;
    }

    setIsAuthorized(true);
    setRoleCheckDone(true);

    if (!profileCheckDone) {
      checkExistingProfile();
    }
  }, [isAuthenticated, user, navigate, location.pathname, profileCheckDone]);

  // ==========================================================
  // CHECK EXISTING PROVIDER PROFILE - FOUNDER EDITION
  // ==========================================================
  const checkExistingProfile = useCallback(async () => {
    setCheckingProfile(true);
    setProfileCheckDone(true);
    
    try {
      console.log("🔍 [Quickks] Checking for existing provider profile...");
      const response = await api.get('/api/v1/providers/me');
      
      if (response.data?.success || response.data?.data) {
        const profileData = response.data?.data || response.data;
        console.log("✅ [Quickks] Existing profile found!", profileData);
        
        const hasValidData = profileData.fullName && profileData.phone && profileData.email && profileData.serviceType;
        
        if (!hasValidData) {
          console.log("⚠️ [Quickks] Profile exists but has NULL values. Redirecting to create new profile...");
          setProfileExists(false);
          setProfileStatus(null);
          setSnackbar({
            open: true,
            message: 'Your profile is incomplete. Please fill out the form completely.',
            severity: "info",
          });
          setCheckingProfile(false);
          return false;
        }
        
        const status = profileData.status?.toUpperCase() || 'PENDING';
        setProfileExists(true);
        setProfileStatus(status);
        
        if (status === 'PENDING' || status === 'PENDING_VERIFICATION') {
          setSnackbar({
            open: true,
            message: 'Your provider profile is pending admin verification. Please wait for approval.',
            severity: "info",
          });
          setTimeout(() => navigate('/dashboard/provider'), 2000);
          return true;
        }
        
        if (status === 'APPROVED' || status === 'ACTIVE') {
          setSnackbar({
            open: true,
            message: 'Your provider profile is already verified! Redirecting to dashboard...',
            severity: "success",
          });
          setTimeout(() => navigate('/dashboard/provider'), 2000);
          return true;
        }
        
        if (status === 'REJECTED') {
          setSnackbar({
            open: true,
            message: 'Your profile was rejected. Please contact support.',
            severity: "error",
          });
          setTimeout(() => navigate('/'), 2000);
          return true;
        }
        
        setTimeout(() => navigate('/dashboard/provider'), 2000);
        return true;
      }
      
      console.log("ℹ️ [Quickks] No existing profile found. User can create one.");
      setProfileExists(false);
      setProfileStatus(null);
      return false;
      
    } catch (err) {
      console.error("❌ [Quickks] Error checking provider profile:", err);
      
      if (err.response?.status === 409) {
        console.log("⚠️ [Quickks] Profile exists (409). Checking if valid...");
        try {
          const profileRes = await api.get('/api/v1/providers/me');
          if (profileRes.data?.data) {
            const profileData = profileRes.data.data;
            if (profileData.fullName && profileData.phone) {
              setProfileExists(true);
              setSnackbar({
                open: true,
                message: 'You already have a provider profile. Redirecting to dashboard...',
                severity: "info",
              });
              setTimeout(() => navigate('/dashboard/provider'), 2000);
              return true;
            }
          }
        } catch (e) {
          console.error("Could not fetch profile:", e);
        }
        setProfileExists(false);
        return false;
      }
      
      if (err.response?.status === 404) {
        console.log("ℹ️ [Quickks] No existing profile found (404). Good to create!");
        setProfileExists(false);
        setProfileStatus(null);
        return false;
      }
      
      setSnackbar({
        open: true,
        message: 'Error checking profile status. Please refresh and try again.',
        severity: "error",
      });
      return false;
      
    } finally {
      setCheckingProfile(false);
    }
  }, [navigate]);

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleInputChange = useCallback((field, value) => {
    const protectedFields = ['fullName', 'phone', 'email'];
    if (protectedFields.includes(field)) {
      setSnackbar({
        open: true,
        message: 'This field is auto-filled from your account and cannot be changed.',
        severity: "info",
      });
      return;
    }
    
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    setStepErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleLocationUpdate = useCallback((lat, lng) => {
    setForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
    setTouchedFields((prev) => ({ ...prev, latitude: true, longitude: true }));
  }, []);

  const handleAddSkill = useCallback(() => {
    const trimmedSkill = skillInput.trim();
    if (trimmedSkill && !form.skills.includes(trimmedSkill) && form.skills.length < MAX_SKILLS) {
      setForm((prev) => ({
        ...prev,
        skills: [...prev.skills, trimmedSkill]
      }));
      setSkillInput("");
    } else if (form.skills.length >= MAX_SKILLS) {
      setSnackbar({
        open: true,
        message: `Maximum ${MAX_SKILLS} skills allowed`,
        severity: "warning",
      });
    }
  }, [skillInput, form.skills]);

  const handleRemoveSkill = useCallback((skillToRemove) => {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skillToRemove)
    }));
  }, []);

  const handleAddCertificate = useCallback(() => {
    const trimmedCert = certificateInput.trim();
    if (trimmedCert && !form.certificates.includes(trimmedCert) && form.certificates.length < MAX_CERTIFICATES) {
      setForm((prev) => ({
        ...prev,
        certificates: [...prev.certificates, trimmedCert]
      }));
      setCertificateInput("");
    } else if (form.certificates.length >= MAX_CERTIFICATES) {
      setSnackbar({
        open: true,
        message: `Maximum ${MAX_CERTIFICATES} certificates allowed`,
        severity: "warning",
      });
    }
  }, [certificateInput, form.certificates]);

  const handleRemoveCertificate = useCallback((certToRemove) => {
    setForm((prev) => ({
      ...prev,
      certificates: prev.certificates.filter(c => c !== certToRemove)
    }));
  }, []);

  const handleFieldBlur = useCallback((field) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  }, []);

  // ==========================================================
  // LOCATION HANDLERS
  // ==========================================================
  const handleUseCurrentLocation = useCallback(() => {
    setError("");
    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mountedRef.current) {
          handleLocationUpdate(pos.coords.latitude, pos.coords.longitude);
          setLoading(false);
          setSnackbar({
            open: true,
            message: "Location detected successfully! 🎯",
            severity: "success",
          });
          reverseGeocode(pos.coords.latitude, pos.coords.longitude);
        }
      },
      (err) => {
        if (mountedRef.current) {
          const errorMsg = err.code === 1
            ? "Location permission denied. Please pin manually."
            : "Failed to detect location. Please pin manually.";
          setError(errorMsg);
          setLoading(false);
          setSnackbar({
            open: true,
            message: errorMsg,
            severity: "warning",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    );
  }, [handleLocationUpdate]);

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data?.address) {
        const address = data.address;
        const area = address.suburb || address.neighbourhood || address.city_district || address.town || "";
        if (area && !form.area) {
          handleInputChange("area", area);
        }
        if (address.city || address.town || address.village) {
          handleInputChange("city", address.city || address.town || address.village);
        }
        if (address.state) {
          handleInputChange("state", address.state);
        }
        if (address.postcode) {
          handleInputChange("pincode", address.postcode);
        }
        if (address.road) {
          handleInputChange("addressLine1", address.road);
        }
      }
    } catch (error) {
      console.warn("Reverse geocoding failed:", error);
    }
  }, [form.area, handleInputChange]);

  // ==========================================================
  // NAVIGATION
  // ==========================================================
  const handleNext = useCallback(() => {
    const err = validateStep(activeStep);
    if (err) {
      setError(err);
      setStepErrors((prev) => ({ ...prev, [activeStep]: err }));
      setSnackbar({ open: true, message: err, severity: "error" });
      return;
    }
    setError("");
    setStepErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[activeStep];
      return newErrors;
    });
    setActiveStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeStep, validateStep]);

  const handleBack = useCallback(() => {
    setActiveStep((s) => Math.max(0, s - 1));
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleStepClick = useCallback((step) => {
    if (step < activeStep) {
      setActiveStep(step);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [activeStep]);

  // ==========================================================
  // ✅ FOUNDER EDITION: COMPLETE SUBMIT FUNCTION - FINAL FIXED
  // ==========================================================
  const handleSubmit = useCallback(async () => {
    // If profile already exists, redirect
    if (profileExists) {
      setSnackbar({
        open: true,
        message: 'You already have a provider profile! Redirecting...',
        severity: "info",
      });
      setTimeout(() => navigate('/dashboard/provider'), 2000);
      return;
    }

    // Validate all steps
    const errors = [];
    for (let i = 0; i < TOTAL_STEPS; i++) {
      const err = validateStep(i);
      if (err) {
        errors.push({ step: i, message: err });
        setStepErrors((prev) => ({ ...prev, [i]: err }));
      }
    }

    if (errors.length > 0) {
      setActiveStep(errors[0].step);
      setSnackbar({
        open: true,
        message: errors[0].message,
        severity: "error",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Validate user
      if (!user || !user.id) {
        throw new Error("User not authenticated. Please login again.");
      }

      console.log("👤 [Quickks] User ID:", user.id);
      console.log("👤 [Quickks] User Role:", user.role);

      // Double check if profile exists
      console.log("🔍 [Quickks] Final profile existence check...");
      try {
        const existing = await api.get('/api/v1/providers/me');
        if (existing.data?.success || existing.data?.data) {
          const profileData = existing.data?.data || existing.data;
          if (profileData.fullName && profileData.phone && profileData.email) {
            setProfileExists(true);
            setSnackbar({
              open: true,
              message: 'You already have a provider profile! Redirecting to dashboard...',
              severity: "info",
            });
            setTimeout(() => navigate('/dashboard/provider'), 2000);
            setIsSubmitting(false);
            return;
          } else {
            console.log("⚠️ [Quickks] Profile exists but has invalid data. Proceeding with creation...");
          }
        }
      } catch (err) {
        if (err.response?.status !== 404) {
          console.error("Error checking profile:", err);
          throw new Error("Could not verify profile status. Please try again.");
        }
        console.log("✅ [Quickks] No existing profile found. Proceeding with creation...");
      }

      // Sanitize all data
      const sanitizedPhone = form.phone.replace(/\D/g, "");
      const sanitizedAadhaar = form.aadhaar.replace(/\s/g, "");
      const sanitizedPan = form.pan.toUpperCase().trim();
      const sanitizedPincode = form.pincode.replace(/\D/g, "");
      const sanitizedFullName = form.fullName.trim();
      const sanitizedEmail = form.email.trim().toLowerCase();

      // Build complete payload
      const payload = {
        fullName: sanitizedFullName,
        phone: sanitizedPhone,
        email: sanitizedEmail,
        aadhaar: sanitizedAadhaar,
        pan: sanitizedPan,
        businessName: form.businessName?.trim() || sanitizedFullName,
        gst: form.gst?.trim().toUpperCase() || null,
        serviceType: form.serviceType,
        experienceYears: parseInt(form.experienceYears) || 0,
        basePrice: parseFloat(form.basePrice) || 0,
        priceUnit: form.priceUnit || "PER_HOUR",
        skills: form.skills || [],
        description: form.description?.trim() || "",
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        area: form.area?.trim() || "",
        addressLine1: form.addressLine1?.trim() || "",
        addressLine2: form.addressLine2?.trim() || "",
        city: form.city?.trim() || "",
        state: form.state?.trim() || "",
        pincode: sanitizedPincode,
        availabilityHours: JSON.stringify({
          days: form.availableDays || [],
          from: form.availableFrom || "09:00",
          to: form.availableTo || "18:00"
        }),
        socialMedia: {
          whatsapp: form.socialMedia?.whatsapp || "",
          instagram: form.socialMedia?.instagram || "",
          facebook: form.socialMedia?.facebook || "",
          twitter: form.socialMedia?.twitter || "",
          linkedin: form.socialMedia?.linkedin || ""
        },
        certificates: form.certificates || [],
        documents: form.documents || [],
        status: "PENDING",
        verified: false,
      };

      console.log("📤 [Quickks] Creating provider profile for user:", user.id);
      console.log("📤 [Quickks] Payload:", JSON.stringify(payload, null, 2));

      // Send request with timeout
      abortControllerRef.current = new AbortController();
      
      const response = await api.post("/api/v1/providers/profile", payload, {
        signal: abortControllerRef.current.signal,
        timeout: API_TIMEOUT,
      });

      // ✅ FIXED: Proper response handling
      if (response && response.data) {
        if (response.data.success === true || response.data.data) {
          setSuccessMessage("🎉 Profile submitted for verification! Redirecting...");
          setSnackbar({
            open: true,
            message: "Profile submitted for admin verification! 🎉",
            severity: "success",
          });
          setTimeout(() => navigate("/dashboard/provider"), 2000);
        } else {
          throw new Error(response.data.message || "Failed to create profile");
        }
      } else {
        throw new Error("No response from server");
      }
      
    } catch (err) {
      console.error("❌ [Quickks] Submit Error:", err);
      console.error("❌ [Quickks] Response status:", err.response?.status);
      console.error("❌ [Quickks] Response data:", err.response?.data);

      let errorMsg = "Failed to submit profile. Please try again.";

      // ✅ Handle different error types
      if (err.code === "ERR_NETWORK") {
        errorMsg = "Network error. Please check your internet connection and try again.";
      } else if (err.code === "ECONNABORTED" || err.name === "AbortError") {
        errorMsg = "Request timed out. Please try again.";
      } else if (err.response) {
        const status = err.response.status;
        const data = err.response.data;

        if (status === 409) {
          setProfileExists(true);
          errorMsg = "You already have a provider profile. Redirecting to dashboard...";
          setSnackbar({
            open: true,
            message: errorMsg,
            severity: "info",
          });
          setTimeout(() => navigate('/dashboard/provider'), 2000);
          setIsSubmitting(false);
          return;
        } else if (status === 400) {
          if (data.details) {
            if (typeof data.details === 'string') {
              errorMsg = data.details;
            } else if (Array.isArray(data.details)) {
              errorMsg = data.details.map(d => d.message || d).join(", ");
            } else if (typeof data.details === 'object') {
              const errors = Object.entries(data.details)
                .map(([field, msg]) => {
                  if (typeof msg === 'string') return `${field}: ${msg}`;
                  if (Array.isArray(msg)) return `${field}: ${msg.join(', ')}`;
                  return `${field}: Invalid value`;
                })
                .join("; ");
              errorMsg = errors || "Validation failed";
            }
          } else if (data.fieldErrors) {
            const errors = Object.entries(data.fieldErrors)
              .map(([field, msgs]) => {
                if (Array.isArray(msgs)) return `${field}: ${msgs.join(', ')}`;
                return `${field}: ${msgs}`;
              })
              .join("; ");
            errorMsg = errors || "Validation failed";
          } else if (data.message) {
            errorMsg = data.message;
          }
        } else if (status === 500) {
          errorMsg = "Server error. Please try again later.";
        } else if (status === 404) {
          errorMsg = "API endpoint not found. Please check your configuration.";
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      setError(errorMsg);
      setSnackbar({
        open: true,
        message: errorMsg,
        severity: "error",
      });
    } finally {
      if (mountedRef.current) {
        setIsSubmitting(false);
      }
      abortControllerRef.current = null;
    }
  }, [profileExists, validateStep, user, form, navigate]);

  // ==========================================================
  // LOADING STATES
  // ==========================================================
  if (checkingProfile) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc" }}>
        <Container maxWidth="sm">
          <Paper sx={{ p: 4, textAlign: "center", borderRadius: 4 }}>
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#1e293b" }}>
              Checking Your Profile Status
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Please wait while we verify your account...
            </Typography>
            <LinearProgress sx={{ mt: 3, height: 6, borderRadius: 3 }} />
          </Paper>
        </Container>
      </Box>
    );
  }

  // ==========================================================
  // ACCESS DENIED RENDER
  // ==========================================================
  if (!isAuthorized && roleCheckDone) {
    return (
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f8fafc", p: 3 }}>
        <Paper sx={{ maxWidth: 500, width: "100%", p: 4, borderRadius: 4, textAlign: "center" }}>
          <Avatar sx={{ width: 80, height: 80, bgcolor: "#fee2e2", mx: "auto", mb: 2 }}>
            <FaExclamationTriangle size={40} color="#dc2626" />
          </Avatar>
          <Typography variant="h5" fontWeight={700} color="#1e293b" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You don't have permission to access this page.
          </Typography>
          <Alert severity="error" sx={{ mb: 3, textAlign: "left", borderRadius: 2 }}>
            <AlertTitle>Role Mismatch</AlertTitle>
            <Typography variant="body2">
              <strong>Your Role:</strong> {user?.role || 'Unknown'}
            </Typography>
            <Typography variant="body2">
              <strong>Required Role:</strong> Service Provider
            </Typography>
          </Alert>
          <Stack spacing={2}>
            <Button fullWidth variant="contained" onClick={() => navigate('/')} sx={{ bgcolor: "#6366f1" }}>
              Go to Home
            </Button>
            <Button fullWidth variant="outlined" onClick={() => { logout(); navigate('/login', { state: { role: 'provider' } }); }}>
              Logout & Switch Account
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // ==========================================================
  // RENDER STEP 0 - BASIC INFORMATION WITH REFRESH BUTTON
  // ==========================================================
  const renderStep0 = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1e293b" }}>
          <FaUser style={{ marginRight: 10, color: "#6366f1" }} />
          Basic Information
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={fetchUserData}
          disabled={fetchingUserData}
          startIcon={fetchingUserData ? <CircularProgress size={16} /> : <FaSync />}
          sx={{ textTransform: 'none' }}
        >
          {fetchingUserData ? 'Loading...' : 'Refresh User Data'}
        </Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please verify your personal details. Some fields are auto-filled from your account.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Full Name"
            value={form.fullName || ""}
            disabled
            InputProps={{
              startAdornment: <InputAdornment position="start"><FaUser color="#94a3b8" /></InputAdornment>,
            }}
            helperText={!form.fullName ? "⚠️ Full name not found. Click 'Refresh User Data'." : "Auto-filled from your account. Cannot be changed."}
            error={!form.fullName}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="Phone Number"
            value={form.phone || ""}
            disabled
            InputProps={{
              startAdornment: <InputAdornment position="start"><FaPhone color="#94a3b8" /></InputAdornment>,
            }}
            helperText={!form.phone ? "⚠️ Phone number not found. Click 'Refresh User Data'." : "Auto-filled from your account. Cannot be changed."}
            error={!form.phone}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="Email Address"
            type="email"
            value={form.email || ""}
            disabled
            InputProps={{
              startAdornment: <InputAdornment position="start"><FaAddressCard color="#94a3b8" /></InputAdornment>,
            }}
            helperText={!form.email ? "⚠️ Email not found. Click 'Refresh User Data'." : "Auto-filled from your account. Cannot be changed."}
            error={!form.email}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="Aadhaar Number"
            value={form.aadhaar}
            onChange={(e) => handleInputChange("aadhaar", e.target.value.replace(/\s/g, "").slice(0, 12))}
            onBlur={() => handleFieldBlur("aadhaar")}
            placeholder="Enter 12-digit Aadhaar"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaIdCard color="#94a3b8" /></InputAdornment> }}
            helperText={touchedFields.aadhaar && !validateAadhaar(form.aadhaar) ? "Enter exactly 12 digits without spaces" : "Enter 12 digits without spaces"}
            error={touchedFields.aadhaar && !validateAadhaar(form.aadhaar)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="PAN Number"
            value={form.pan}
            onChange={(e) => handleInputChange("pan", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
            onBlur={() => handleFieldBlur("pan")}
            placeholder="Enter PAN (e.g., ABCDE1234F)"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaShieldAlt color="#94a3b8" /></InputAdornment> }}
            helperText={touchedFields.pan && !validatePAN(form.pan) ? "Format: 5 letters, 4 digits, 1 letter" : "Format: 5 letters, 4 digits, 1 letter"}
            error={touchedFields.pan && !validatePAN(form.pan)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="GST Number (Optional)"
            value={form.gst}
            onChange={(e) => handleInputChange("gst", e.target.value.toUpperCase())}
            placeholder="Enter GST (optional)"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaBuilding color="#94a3b8" /></InputAdornment> }}
            helperText={form.gst && !validateGST(form.gst) ? "Invalid GST format" : "Format: 15 characters (optional)"}
            error={!!form.gst && !validateGST(form.gst)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Business Name"
            value={form.businessName}
            onChange={(e) => handleInputChange("businessName", e.target.value)}
            placeholder="Enter your business name"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaBusiness color="#94a3b8" /></InputAdornment> }}
            helperText="If not provided, full name will be used"
          />
        </Grid>
      </Grid>
    </Box>
  );

  // ==========================================================
  // RENDER STEP 1 - PROFESSIONAL INFORMATION
  // ==========================================================
  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: "#1e293b" }}>
        <FaTools style={{ marginRight: 10, color: "#6366f1" }} />
        Professional Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Define your expertise, skills, and pricing structure
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <FormControl fullWidth required error={!form.serviceType && touchedFields.serviceType}>
            <InputLabel>Service Type</InputLabel>
            <Select
              value={form.serviceType}
              onChange={(e) => handleInputChange("serviceType", e.target.value)}
              onBlur={() => handleFieldBlur("serviceType")}
              label="Service Type"
            >
              {SERVICE_TYPES.map((type) => (
                <MenuItem key={type} value={type}>{SERVICE_TYPE_DISPLAY[type] || type}</MenuItem>
              ))}
            </Select>
            <FormHelperText>Select the primary service you offer</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Experience</InputLabel>
            <Select
              value={form.experienceYears}
              onChange={(e) => handleInputChange("experienceYears", e.target.value)}
              label="Experience"
            >
              {EXPERIENCE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </Select>
            <FormHelperText>Years of professional experience</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl fullWidth required>
            <InputLabel>Price Unit</InputLabel>
            <Select
              value={form.priceUnit}
              onChange={(e) => handleInputChange("priceUnit", e.target.value)}
              label="Price Unit"
            >
              {PRICE_UNITS.map((unit) => (
                <MenuItem key={unit} value={unit}>{PRICE_UNIT_DISPLAY[unit] || unit.replace('_', ' ')}</MenuItem>
              ))}
            </Select>
            <FormHelperText>How you charge for your service</FormHelperText>
          </FormControl>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Base Price (₹)"
            type="number"
            value={form.basePrice}
            onChange={(e) => handleInputChange("basePrice", e.target.value)}
            onBlur={() => handleFieldBlur("basePrice")}
            placeholder="Enter your base service charge"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaRupeeSign color="#94a3b8" /></InputAdornment> }}
            helperText={touchedFields.basePrice && parseFloat(form.basePrice) <= 0 ? "Must be greater than 0" : "Minimum price for your service"}
            error={touchedFields.basePrice && parseFloat(form.basePrice) <= 0}
          />
        </Grid>

        <Grid item xs={12}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Skills <Chip size="small" label={`${form.skills.length}/${MAX_SKILLS}`} color="primary" variant="outlined" />
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter a skill (e.g., Wiring)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                disabled={form.skills.length >= MAX_SKILLS}
              />
              <Button 
                variant="contained" 
                onClick={handleAddSkill} 
                sx={{ minWidth: 100 }}
                disabled={!skillInput.trim() || form.skills.length >= MAX_SKILLS}
                startIcon={<FaPlus />}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {form.skills.map((skill) => (
                <Chip
                  key={skill}
                  label={skill}
                  onDelete={() => handleRemoveSkill(skill)}
                  color="primary"
                  variant="outlined"
                  icon={<FaTools />}
                />
              ))}
              {form.skills.length === 0 && (
                <Typography variant="caption" color="text.secondary">No skills added yet</Typography>
              )}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Certificates <Chip size="small" label={`${form.certificates.length}/${MAX_CERTIFICATES}`} color="secondary" variant="outlined" />
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Enter certificate URL or name"
                value={certificateInput}
                onChange={(e) => setCertificateInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCertificate()}
                disabled={form.certificates.length >= MAX_CERTIFICATES}
              />
              <Button 
                variant="outlined" 
                onClick={handleAddCertificate} 
                sx={{ minWidth: 100 }}
                disabled={!certificateInput.trim() || form.certificates.length >= MAX_CERTIFICATES}
                startIcon={<FaPlus />}
              >
                Add
              </Button>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
              {form.certificates.map((cert) => (
                <Chip
                  key={cert}
                  label={cert}
                  onDelete={() => handleRemoveCertificate(cert)}
                  variant="outlined"
                  icon={<FaCertificate />}
                />
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Description"
            multiline
            rows={4}
            value={form.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder="Describe your expertise, experience, and services offered..."
            helperText="A detailed description helps customers understand your services better"
          />
        </Grid>
      </Grid>
    </Box>
  );

  // ==========================================================
  // RENDER STEP 2 - LOCATION
  // ==========================================================
  const renderStep2 = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: "#1e293b" }}>
        <FaMapMarkerAlt style={{ marginRight: 10, color: "#6366f1" }} />
        Service Area & Location
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Pin your exact service location on the map
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Service Area"
            value={form.area}
            onChange={(e) => handleInputChange("area", e.target.value)}
            onBlur={() => handleFieldBlur("area")}
            placeholder="e.g., Kothrud, Pune"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaCity color="#94a3b8" /></InputAdornment> }}
            helperText={touchedFields.area && !form.area ? "Please enter your service area" : "Enter the area where you provide services"}
            error={touchedFields.area && !form.area}
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              onClick={handleUseCurrentLocation}
              disabled={loading}
              startIcon={loading ? <FaSpinner className="spinning" /> : <FaGlobe />}
              sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" }, textTransform: "none" }}
            >
              {loading ? "Detecting..." : "📍 Use Current Location"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                handleLocationUpdate(DEFAULT_CENTER[0], DEFAULT_CENTER[1]);
                setSnackbar({ open: true, message: "Map centered to default location", severity: "info" });
              }}
              startIcon={<FaMapPin />}
              sx={{ textTransform: "none" }}
            >
              Reset Map View
            </Button>
          </Box>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2, bgcolor: "#f8fafc", borderRadius: 2, border: "1px solid #e2e8f0" }}>
            <Typography variant="body2" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FaInfoCircle color="#6366f1" />
              <strong>Selected Location:</strong>
              {form.latitude && form.longitude ? (
                <Chip 
                  label={`${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`} 
                  color="success" 
                  size="small" 
                  icon={<FaCheckCircle />} 
                />
              ) : (
                <Chip label="Not set" color="warning" size="small" />
              )}
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ mt: 1, borderRadius: 3, overflow: "hidden", border: "2px solid #e2e8f0", height: isMobile ? "300px" : "400px" }}>
            <MapContainer
              ref={mapRef}
              center={form.latitude ? [form.latitude, form.longitude] : DEFAULT_CENTER}
              zoom={13}
              style={{ height: "100%", width: "100%" }}
              key={form.latitude || form.longitude}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
              <MapEvents onClick={handleLocationUpdate} />
              <RecenterMap center={[form.latitude, form.longitude]} />
              {form.latitude && form.longitude && <Marker position={[form.latitude, form.longitude]} />}
            </MapContainer>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Click on the map to pin your exact service location
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );

  // ==========================================================
  // RENDER STEP 3 - ADDRESS
  // ==========================================================
  const renderStep3 = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: "#1e293b" }}>
        <FaHome style={{ marginRight: 10, color: "#6366f1" }} />
        Address Details
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Provide your complete address for verification
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Address Line 1"
            value={form.addressLine1}
            onChange={(e) => handleInputChange("addressLine1", e.target.value)}
            onBlur={() => handleFieldBlur("addressLine1")}
            placeholder="House/Flat no, Street"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaHome color="#94a3b8" /></InputAdornment> }}
            helperText={touchedFields.addressLine1 && !form.addressLine1 ? "Please enter your address" : "Your complete street address"}
            error={touchedFields.addressLine1 && !form.addressLine1}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 2 (Optional)"
            value={form.addressLine2}
            onChange={(e) => handleInputChange("addressLine2", e.target.value)}
            placeholder="Apartment, Building, Landmark"
            helperText="Additional address details"
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="City"
            value={form.city}
            onChange={(e) => handleInputChange("city", e.target.value)}
            onBlur={() => handleFieldBlur("city")}
            placeholder="Enter your city"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaBuilding color="#94a3b8" /></InputAdornment> }}
            error={touchedFields.city && !form.city}
            helperText={touchedFields.city && !form.city ? "Please enter your city" : ""}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            required
            label="State"
            value={form.state}
            onChange={(e) => handleInputChange("state", e.target.value)}
            onBlur={() => handleFieldBlur("state")}
            placeholder="Enter your state"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaGlobe color="#94a3b8" /></InputAdornment> }}
            error={touchedFields.state && !form.state}
            helperText={touchedFields.state && !form.state ? "Please enter your state" : ""}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Pincode"
            value={form.pincode}
            onChange={(e) => handleInputChange("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
            onBlur={() => handleFieldBlur("pincode")}
            placeholder="Enter 6-digit pincode"
            InputProps={{ startAdornment: <InputAdornment position="start"><FaMapPin color="#94a3b8" /></InputAdornment> }}
            helperText={touchedFields.pincode && !validatePincode(form.pincode) ? "Enter 6 digits without spaces" : "Enter 6 digits without spaces"}
            error={touchedFields.pincode && !validatePincode(form.pincode)}
          />
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}>
            <FaClock style={{ marginRight: 8, color: "#6366f1" }} />
            Availability Schedule
          </Typography>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Available Days</InputLabel>
                <Select
                  multiple
                  value={form.availableDays}
                  onChange={(e) => handleInputChange("availableDays", e.target.value)}
                  label="Available Days"
                  renderValue={(selected) => (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={value} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {AVAILABILITY_OPTIONS.map((day) => (
                    <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>
                  ))}
                </Select>
                <FormHelperText>Select days you are available for service</FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Available From"
                type="time"
                value={form.availableFrom}
                onChange={(e) => handleInputChange("availableFrom", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Available To"
                type="time"
                value={form.availableTo}
                onChange={(e) => handleInputChange("availableTo", e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Grid>
      </Grid>
    </Box>
  );

  // ==========================================================
  // RENDER STEP 4 - REVIEW & SUBMIT
  // ==========================================================
  const renderStep4 = () => (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: "#1e293b" }}>
        <FaUserCheck style={{ marginRight: 10, color: "#6366f1" }} />
        Review & Submit
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Please review your information before submitting
      </Typography>

      <Card sx={{ mb: 3, borderRadius: 3, border: "1px solid #e2e8f0" }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}>
            Personal Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Full Name</Typography>
              <Typography variant="body1" fontWeight={500}>{form.fullName || "Not provided"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Phone</Typography>
              <Typography variant="body1" fontWeight={500}>{form.phone || "Not provided"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Email</Typography>
              <Typography variant="body1" fontWeight={500}>{form.email || "Not provided"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Business Name</Typography>
              <Typography variant="body1" fontWeight={500}>{form.businessName || form.fullName}</Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}>
            Professional Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Service Type</Typography>
              <Typography variant="body1" fontWeight={500}>{SERVICE_TYPE_DISPLAY[form.serviceType] || form.serviceType || "Not selected"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Experience</Typography>
              <Typography variant="body1" fontWeight={500}>{form.experienceYears || 0} years</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Base Price</Typography>
              <Typography variant="body1" fontWeight={500}>₹{form.basePrice || 0} / {PRICE_UNIT_DISPLAY[form.priceUnit] || form.priceUnit?.replace('_', ' ') || "hour"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Skills</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                {form.skills.length > 0 ? form.skills.map((skill) => (
                  <Chip key={skill} label={skill} size="small" color="primary" variant="outlined" />
                )) : <Typography variant="body2" color="text.secondary">No skills added</Typography>}
              </Box>
            </Grid>
            {form.description && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Description</Typography>
                <Typography variant="body2">{form.description}</Typography>
              </Grid>
            )}
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}>
            Location Details
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Service Area</Typography>
              <Typography variant="body1" fontWeight={500}>{form.area || "Not provided"}</Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Location</Typography>
              <Typography variant="body1" fontWeight={500}>
                {form.latitude && form.longitude ? `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}` : "Not set"}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Address</Typography>
              <Typography variant="body1" fontWeight={500}>
                {form.addressLine1 ? `${form.addressLine1}${form.addressLine2 ? `, ${form.addressLine2}` : ''}, ${form.city}, ${form.state} - ${form.pincode}` : "Not provided"}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: "#1e293b" }}>
            Availability
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">Available Days</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}>
                {form.availableDays.length > 0 ? form.availableDays.map((day) => (
                  <Chip key={day} label={day} size="small" color="success" />
                )) : <Typography variant="body2" color="text.secondary">Not set</Typography>}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Available From</Typography>
              <Typography variant="body1" fontWeight={500}>{form.availableFrom || "Not set"}</Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Available To</Typography>
              <Typography variant="body1" fontWeight={500}>{form.availableTo || "Not set"}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}><AlertTitle>Error</AlertTitle>{error}</Alert>}
      {successMessage && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}><AlertTitle>Success</AlertTitle>{successMessage}</Alert>}
    </Box>
  );

  // ==========================================================
  // MAIN RENDER
  // ==========================================================
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        <Paper 
          ref={formRef}
          sx={{ 
            p: { xs: 2, sm: 3, md: 4 }, 
            borderRadius: 4, 
            boxShadow: "0 10px 40px rgba(0,0,0,0.06)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Background Decoration */}
          <Box
            sx={{
              position: "absolute",
              top: -100,
              right: -100,
              width: 300,
              height: 300,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(79,70,229,0.02) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* Header */}
          <Box sx={{ mb: 4, position: "relative" }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: "#1e293b", display: "flex", alignItems: "center", gap: 2 }}>
              <FaCertificate color="#6366f1" size={32} />
              Provider Onboarding
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Complete all steps to become a verified provider on Quickks
            </Typography>
          </Box>

          {/* Progress Indicator */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Progress</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {Math.round(formProgress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={formProgress} 
              sx={{ 
                height: 8, 
                borderRadius: 4, 
                bgcolor: "#e2e8f0", 
                "& .MuiLinearProgress-bar": { 
                  bgcolor: "#6366f1", 
                  borderRadius: 4,
                  transition: "transform 0.5s ease",
                } 
              }} 
            />
          </Box>

          {/* Stepper */}
          <Stepper 
            activeStep={activeStep} 
            sx={{ 
              mb: 4, 
              "& .MuiStepLabel-root": { fontSize: isMobile ? "0.75rem" : "0.875rem" },
              "& .MuiStepIcon-root.Mui-active": { color: "#6366f1" },
              "& .MuiStepIcon-root.Mui-completed": { color: "#059669" },
            }}
          >
            {STEP_LABELS.map((label, index) => (
              <Step 
                key={label} 
                onClick={() => handleStepClick(index)}
                sx={{ cursor: index < activeStep ? "pointer" : "default" }}
              >
                <StepLabel>
                  {isMobile ? "" : label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step Errors Alert */}
          {stepErrors[activeStep] && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
              <AlertTitle>Step {activeStep + 1} Validation Error</AlertTitle>
              {stepErrors[activeStep]}
            </Alert>
          )}

          {/* Step Content */}
          <Box sx={{ minHeight: 400 }}>
            <Fade in={true} key={activeStep}>
              <Box>
                {activeStep === 0 && renderStep0()}
                {activeStep === 1 && renderStep1()}
                {activeStep === 2 && renderStep2()}
                {activeStep === 3 && renderStep3()}
                {activeStep === 4 && renderStep4()}
              </Box>
            </Fade>
          </Box>

          {/* Navigation */}
          <Box sx={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            mt: 4, 
            pt: 3, 
            borderTop: "1px solid #e2e8f0",
            flexDirection: isMobile ? "column-reverse" : "row",
            gap: 2,
          }}>
            <Button 
              variant="outlined" 
              onClick={handleBack} 
              disabled={activeStep === 0} 
              startIcon={<FaArrowLeft />} 
              sx={{ 
                borderRadius: 3, 
                textTransform: "none", 
                px: 3, 
                minWidth: isMobile ? "100%" : "auto",
                borderColor: "#cbd5e1",
                color: "#475569",
                "&:hover": {
                  borderColor: "#94a3b8",
                  bgcolor: "#f1f5f9",
                }
              }}
            >
              Back
            </Button>

            {activeStep < TOTAL_STEPS - 1 ? (
              <Button 
                variant="contained" 
                onClick={handleNext} 
                endIcon={<FaArrowRight />} 
                sx={{ 
                  borderRadius: 3, 
                  textTransform: "none", 
                  bgcolor: "#6366f1", 
                  "&:hover": { bgcolor: "#4f46e5" }, 
                  px: 4, 
                  minWidth: isMobile ? "100%" : "auto",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }} 
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Next Step"}
              </Button>
            ) : (
              <Button 
                variant="contained" 
                onClick={handleSubmit} 
                disabled={isSubmitting} 
                startIcon={isSubmitting ? null : <FaSave />} 
                sx={{ 
                  borderRadius: 3, 
                  textTransform: "none", 
                  bgcolor: "#059669", 
                  "&:hover": { bgcolor: "#047857" }, 
                  px: 4, 
                  minWidth: isMobile ? "100%" : "auto",
                  boxShadow: "0 4px 14px rgba(5,150,105,0.35)",
                }}
              >
                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : "✓ Submit Profile"}
              </Button>
            )}
          </Box>

          {/* Footer */}
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              All information is encrypted and securely stored
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })} 
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert 
          severity={snackbar.severity} 
          variant="filled" 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          sx={{ borderRadius: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Global Styles */}
      <style>
        {`
          .spinning {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </Box>
  );
}