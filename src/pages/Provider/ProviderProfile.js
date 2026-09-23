// src/pages/Provider/ProviderProfile.jsx
// COMPLETE PRODUCTION-LEVEL PROVIDER PROFILE - ALL ISSUES FIXED

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api/api";

// Material-UI Components
import {
  Box,
  Container,
  Paper,
  Typography,
  Avatar,
  Chip,
  Button,
  Rating,
  CircularProgress,
  Alert,
  AlertTitle,
  Grid,
  Divider,
  Card,
  CardContent,
  Stack,
  IconButton,
  Tooltip,
  Skeleton,
  Breadcrumbs,
  Link,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Snackbar,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";

import {
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaStar,
  FaClock,
  FaRupeeSign,
  FaTools,
  FaBriefcase,
  FaUser,
  FaCheckCircle,
  FaExclamationCircle,
  FaArrowLeft,
  FaCalendarAlt,
  FaWhatsapp,
  FaInfoCircle,
  FaThumbsUp,
  FaAward,
  FaCertificate,
  FaShareAlt,
  FaBookmark,
  FaRegBookmark,
  FaBuilding,
} from "react-icons/fa";

// ==========================================================
// CONSTANTS
// ==========================================================
const DEFAULT_IMAGE = "/default-provider.png";

const TabPanel = ({ children, value, index }) => (
  <Box sx={{ display: value === index ? "block" : "none", py: 2 }}>
    {children}
  </Box>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
const ProviderProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const theme = useMuiTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // State
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  // ==========================================================
  // FETCH PROVIDER DETAILS
  // ==========================================================
  const loadProvider = useCallback(async () => {
    if (!id) {
      setError("Provider ID is missing");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      // ✅ CORRECT API endpoint
      const response = await api.get(`/api/v1/providers/${id}`);
      
      // ✅ Handle both response formats
      const providerData = response.data?.data || response.data;
      
      if (!providerData || !providerData.id) {
        throw new Error("Provider not found");
      }

      // ✅ Map DTO fields to component fields
      const mappedProvider = {
        id: providerData.id,
        userId: providerData.userId,
        fullName: providerData.fullName || "Provider",
        email: providerData.email,
        phone: providerData.phone,
        businessName: providerData.businessName,
        
        // Professional info
        serviceType: providerData.serviceType || providerData.serviceTypeCode || "Service Provider",
        serviceTypeCode: providerData.serviceTypeCode,
        skills: providerData.skills || [],
        description: providerData.description || "No description provided.",
        experienceYears: providerData.experienceYears || 0,
        basePrice: providerData.basePrice || 0,
        priceUnit: providerData.priceUnit || "PER_HOUR",
        
        // Location
        area: providerData.area,
        addressLine1: providerData.addressLine1,
        addressLine2: providerData.addressLine2,
        city: providerData.city,
        state: providerData.state,
        pincode: providerData.pincode,
        latitude: providerData.latitude,
        longitude: providerData.longitude,
        
        // Status
        status: providerData.status,
        statusDisplay: providerData.statusDisplay,
        verified: providerData.verified || false,
        available: providerData.available || false,
        suspended: providerData.suspended || false,
        
        // Performance metrics
        rating: providerData.rating || 0,
        totalReviews: providerData.totalReviews || 0,
        activeJobs: providerData.activeJobs || 0,
        completedJobs: providerData.completedJobs || 0,
        cancelledJobs: providerData.cancelledJobs || 0,
        acceptanceRate: providerData.acceptanceRate || 100,
        totalEarnings: providerData.totalEarnings || 0,
        
        // Documents
        profileImage: providerData.profileImage,
        certificates: providerData.certificates || [],
        
        // Timestamps
        createdAt: providerData.joinedAt || providerData.createdAt,
        updatedAt: providerData.updatedAt,
        lastActiveAt: providerData.lastActiveAt,
        
        // Additional fields
        availabilityHours: providerData.availabilityHours,
        responseTime: providerData.averageResponseTime || "Within 1 hour",
        distanceKm: providerData.distanceKm,
      };

      setProvider(mappedProvider);
      
      // Set ratings
      setAverageRating(mappedProvider.rating || 0);
      setTotalReviews(mappedProvider.totalReviews || 0);

      // Check bookmark status
      try {
        const bookmarks = JSON.parse(localStorage.getItem("bookmarkedProviders") || "[]");
        setIsBookmarked(bookmarks.includes(id));
      } catch (e) {
        setIsBookmarked(false);
      }

      // Load reviews
      await loadReviews(id);

    } catch (err) {
      console.error("❌ Error loading provider:", err);
      
      if (err.response?.status === 404) {
        setError("Provider not found. They may have been removed or deactivated.");
      } else if (err.response?.status === 403) {
        setError("You don't have permission to view this provider's profile.");
      } else if (err.code === "ERR_NETWORK") {
        setError("Unable to connect to server. Please check your internet connection.");
      } else {
        setError(err.response?.data?.message || err.message || "Unable to load provider details.");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ==========================================================
  // LOAD REVIEWS
  // ==========================================================
  const loadReviews = useCallback(async (providerId) => {
    try {
      setLoadingReviews(true);
      const response = await api.get(`/api/v1/reviews/provider/${providerId}`);
      const reviewsData = response.data?.data || response.data || [];
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      console.error("❌ Error loading reviews:", err);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, []);

  // ==========================================================
  // EFFECTS
  // ==========================================================
  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  // ==========================================================
  // HANDLERS
  // ==========================================================
  const handleBookmark = useCallback(() => {
    try {
      const bookmarks = JSON.parse(localStorage.getItem("bookmarkedProviders") || "[]");
      let newBookmarks;
      
      if (isBookmarked) {
        newBookmarks = bookmarks.filter((b) => b !== id);
        setSnackbar({
          open: true,
          message: "Provider removed from bookmarks",
          severity: "info",
        });
      } else {
        newBookmarks = [...bookmarks, id];
        setSnackbar({
          open: true,
          message: "Provider bookmarked successfully!",
          severity: "success",
        });
      }
      
      localStorage.setItem("bookmarkedProviders", JSON.stringify(newBookmarks));
      setIsBookmarked(!isBookmarked);
    } catch (e) {
      setSnackbar({
        open: true,
        message: "Error updating bookmarks",
        severity: "error",
      });
    }
  }, [id, isBookmarked]);

  const handleBookNow = useCallback(() => {
    if (!isAuthenticated) {
      setSnackbar({
        open: true,
        message: "Please login to book this provider",
        severity: "warning",
      });
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    // Check if user is a customer
    const userRole = user?.role?.toUpperCase() || '';
    if (userRole === "PROVIDER" || userRole === "SERVICE_PROVIDER") {
      setSnackbar({
        open: true,
        message: "Providers cannot book services. Please switch to customer account.",
        severity: "warning",
      });
      return;
    }

    navigate(`/booking?providerId=${id}`, { 
      state: { providerName: provider?.fullName, providerId: id } 
    });
  }, [id, isAuthenticated, user, navigate, location.pathname, provider]);

  const handleContact = useCallback(() => {
    if (provider?.phone) {
      window.open(`tel:${provider.phone}`);
    } else {
      setSnackbar({
        open: true,
        message: "Contact number not available",
        severity: "info",
      });
    }
  }, [provider]);

  const handleWhatsApp = useCallback(() => {
    if (provider?.phone) {
      const cleanPhone = provider.phone.replace(/\D/g, "");
      window.open(`https://wa.me/${cleanPhone}`, "_blank");
    } else {
      setSnackbar({
        open: true,
        message: "WhatsApp number not available",
        severity: "info",
      });
    }
  }, [provider]);

  const handleShare = useCallback(async () => {
    const shareData = {
      title: `${provider?.fullName} - Service Provider`,
      text: `Check out ${provider?.fullName} on Quickks! ${provider?.serviceType || "Service Provider"}`,
      url: window.location.href,
    };

    try {
      if (navigator.share && !isMobile) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setSnackbar({
          open: true,
          message: "Link copied to clipboard!",
          severity: "success",
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share error:", err);
        setSnackbar({
          open: true,
          message: "Unable to share. Please copy the link manually.",
          severity: "info",
        });
      }
    }
  }, [provider, isMobile]);

  const handleCloseSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  const handleTabChange = useCallback((event, newValue) => {
    setActiveTab(newValue);
  }, []);

  // ==========================================================
  // MEMOIZED VALUES
  // ==========================================================
  const stats = useMemo(() => {
    if (!provider) return null;
    
    return {
      completedJobs: provider.completedJobs || 0,
      responseTime: provider.responseTime || "Within 1 hour",
      memberSince: provider.createdAt ? new Date(provider.createdAt).getFullYear() : "Recently",
      verified: provider.verified || false,
      available: provider.available || false,
    };
  }, [provider]);

  const displayName = useMemo(() => {
    return provider?.businessName || provider?.fullName || "Provider";
  }, [provider]);

  const displayServiceType = useMemo(() => {
    return provider?.serviceType || "Service Provider";
  }, [provider]);

  const displayLocation = useMemo(() => {
    const parts = [];
    if (provider?.city) parts.push(provider.city);
    if (provider?.state) parts.push(provider.state);
    return parts.join(", ") || "Location not specified";
  }, [provider]);

  const priceDisplay = useMemo(() => {
    if (!provider?.basePrice) return "Contact for pricing";
    const unit = provider.priceUnit?.replace('_', ' ').toLowerCase() || "hour";
    return `₹${provider.basePrice} / ${unit}`;
  }, [provider]);

  // ==========================================================
  // LOADING STATE
  // ==========================================================
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4} sx={{ textAlign: "center" }}>
              <Skeleton variant="circular" width={120} height={120} sx={{ mx: "auto" }} />
              <Skeleton variant="text" sx={{ mt: 2, mx: "auto", width: "80%" }} />
              <Skeleton variant="text" sx={{ mx: "auto", width: "60%" }} />
              <Skeleton variant="rectangular" height={100} sx={{ mt: 2, borderRadius: 2 }} />
            </Grid>
            <Grid item xs={12} md={8}>
              <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 2 }} />
            </Grid>
          </Grid>
        </Paper>
      </Container>
    );
  }

  // ==========================================================
  // ERROR STATE
  // ==========================================================
  if (error || !provider) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, borderRadius: 3 }}>
          <Alert 
            severity="error" 
            variant="filled"
            sx={{ borderRadius: 3 }}
            action={
              <Button 
                color="inherit" 
                size="small" 
                onClick={() => navigate(-1)}
                startIcon={<FaArrowLeft />}
              >
                Go Back
              </Button>
            }
          >
            <AlertTitle>Error Loading Profile</AlertTitle>
            {error || "Provider not found"}
          </Alert>
        </Paper>
      </Container>
    );
  }

  // ==========================================================
  // MAIN RENDER
  // ==========================================================
  return (
    <Box sx={{ bgcolor: "#f8fafc", minHeight: "100vh", py: { xs: 2, md: 4 } }}>
      <Container maxWidth="lg">
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link color="inherit" onClick={() => navigate("/")} sx={{ cursor: "pointer" }}>
            Home
          </Link>
          <Link color="inherit" onClick={() => navigate("/search")} sx={{ cursor: "pointer" }}>
            Providers
          </Link>
          <Typography color="text.primary">{displayName}</Typography>
        </Breadcrumbs>

        {/* Main Profile Card */}
        <Paper sx={{ borderRadius: 4, overflow: "hidden", mb: 4 }}>
          {/* Header Banner */}
          <Box
            sx={{
              height: 120,
              background: `linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)`,
              position: "relative",
            }}
          />

          {/* Profile Content */}
          <Box sx={{ p: { xs: 2, md: 4 }, pt: 0 }}>
            <Grid container spacing={3}>
              {/* Left Column - Profile Info */}
              <Grid item xs={12} md={4} sx={{ textAlign: "center" }}>
                <Box sx={{ mt: { xs: -5, md: -6 }, position: "relative" }}>
                  <Avatar
                    src={provider.profileImage || DEFAULT_IMAGE}
                    alt={displayName}
                    sx={{
                      width: { xs: 100, md: 130 },
                      height: { xs: 100, md: 130 },
                      border: "4px solid white",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      mx: "auto",
                      mb: 2,
                    }}
                  >
                    <FaUser size={40} />
                  </Avatar>

                  {/* Verified Badge */}
                  {stats?.verified && (
                    <Tooltip title="Verified Provider">
                      <Chip
                        icon={<FaCheckCircle />}
                        label="Verified"
                        color="success"
                        size="small"
                        sx={{
                          position: "absolute",
                          bottom: 10,
                          right: { xs: "calc(50% - 60px)", md: 10 },
                          fontWeight: 600,
                        }}
                      />
                    </Tooltip>
                  )}
                </Box>

                <Typography variant="h5" sx={{ fontWeight: 700, color: "#1e293b" }}>
                  {displayName}
                </Typography>

                <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                  {displayServiceType}
                </Typography>

                {/* Rating */}
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2 }}>
                  <Rating value={averageRating} readOnly precision={0.5} size="small" />
                  <Typography variant="body2" color="text.secondary">
                    ({totalReviews} reviews)
                  </Typography>
                </Box>

                {/* Availability */}
                <Chip
                  icon={stats?.available ? <FaCheckCircle /> : <FaExclamationCircle />}
                  label={stats?.available ? "Available Now" : "Not Available"}
                  color={stats?.available ? "success" : "error"}
                  variant="outlined"
                  sx={{ mb: 2 }}
                />

                {/* Price */}
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  <strong>{priceDisplay}</strong>
                </Typography>

                {/* Action Buttons */}
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleBookNow}
                    disabled={!stats?.available}
                    sx={{
                      borderRadius: 3,
                      textTransform: "none",
                      px: 3,
                    }}
                  >
                    Book Now
                  </Button>

                  <IconButton
                    onClick={handleBookmark}
                    sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}
                  >
                    {isBookmarked ? <FaBookmark color="#6366f1" /> : <FaRegBookmark />}
                  </IconButton>

                  <IconButton
                    onClick={handleShare}
                    sx={{ border: "1px solid #e2e8f0", borderRadius: 2 }}
                  >
                    <FaShareAlt />
                  </IconButton>
                </Stack>

                {/* Location */}
                <Box sx={{ mt: 2, display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
                  <FaMapMarkerAlt color="#6366f1" size={14} />
                  <Typography variant="caption" color="text.secondary">
                    {displayLocation}
                  </Typography>
                </Box>
              </Grid>

              {/* Right Column - Details */}
              <Grid item xs={12} md={8}>
                {/* Stats */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <Typography variant="h6" fontWeight={700} color="#6366f1">
                        {stats?.completedJobs || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Jobs Completed</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <Typography variant="h6" fontWeight={700} color="#6366f1">
                        {provider.experienceYears || 0} yrs
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Experience</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <Typography variant="h6" fontWeight={700} color="#6366f1">
                        {provider.acceptanceRate || 100}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Acceptance Rate</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f8fafc", border: "1px solid #e2e8f0" }}>
                      <Typography variant="h6" fontWeight={700} color="#6366f1">
                        {stats?.responseTime || "1 hr"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">Response Time</Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Tabs */}
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                  <Tab label="About" />
                  <Tab label={`Skills (${provider.skills?.length || 0})`} />
                  <Tab label={`Reviews (${totalReviews})`} />
                </Tabs>

                {/* About Tab */}
                <TabPanel value={activeTab} index={0}>
                  <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
                    {provider.description || "No description provided."}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <FaMapMarkerAlt color="#6366f1" />
                        <Typography variant="body2">
                          <strong>Location:</strong> {displayLocation}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <FaCalendarAlt color="#6366f1" />
                        <Typography variant="body2">
                          <strong>Member Since:</strong> {stats?.memberSince}
                        </Typography>
                      </Box>
                    </Grid>
                    {provider.phone && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <FaPhone color="#6366f1" />
                          <Typography variant="body2">
                            <strong>Phone:</strong> {provider.phone}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {provider.email && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <FaEnvelope color="#6366f1" />
                          <Typography variant="body2">
                            <strong>Email:</strong> {provider.email}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {provider.businessName && provider.businessName !== provider.fullName && (
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <FaBuilding color="#6366f1" />
                          <Typography variant="body2">
                            <strong>Business:</strong> {provider.businessName}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>

                  {/* Contact Buttons */}
                  <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                    <Button
                      variant="outlined"
                      startIcon={<FaPhone />}
                      onClick={handleContact}
                      sx={{ textTransform: "none", borderRadius: 2 }}
                    >
                      Call
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<FaWhatsapp />}
                      onClick={handleWhatsApp}
                      sx={{ 
                        textTransform: "none", 
                        borderRadius: 2, 
                        color: "#25D366", 
                        borderColor: "#25D366",
                        '&:hover': {
                          borderColor: "#1da851",
                          bgcolor: "rgba(37, 211, 102, 0.04)"
                        }
                      }}
                    >
                      WhatsApp
                    </Button>
                  </Stack>
                </TabPanel>

                {/* Skills Tab */}
                <TabPanel value={activeTab} index={1}>
                  {provider.skills?.length > 0 ? (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {provider.skills.map((skill, index) => (
                        <Chip
                          key={index}
                          label={skill}
                          color="primary"
                          variant="outlined"
                          icon={<FaTools />}
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography color="text.secondary">No skills listed.</Typography>
                  )}

                  {provider.certificates?.length > 0 && (
                    <>
                      <Typography variant="h6" sx={{ fontWeight: 600, mt: 3, mb: 2 }}>
                        Certificates
                      </Typography>
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {provider.certificates.map((cert, index) => (
                          <Chip
                            key={index}
                            label={cert}
                            variant="outlined"
                            icon={<FaCertificate />}
                            sx={{ m: 0.5 }}
                          />
                        ))}
                      </Box>
                    </>
                  )}
                </TabPanel>

                {/* Reviews Tab */}
                <TabPanel value={activeTab} index={2}>
                  {loadingReviews ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                      <CircularProgress />
                    </Box>
                  ) : reviews.length > 0 ? (
                    <Stack spacing={2}>
                      {reviews.map((review, index) => (
                        <Card key={index} variant="outlined">
                          <CardContent>
                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <Box>
                                <Typography variant="subtitle2" fontWeight={600}>
                                  {review.customerName || review.userName || "Anonymous"}
                                </Typography>
                                <Rating value={review.rating || 0} readOnly size="small" />
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {review.comment || review.review || "No comment provided."}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </Stack>
                  ) : (
                    <Typography color="text.secondary">No reviews yet. Be the first to review!</Typography>
                  )}
                </TabPanel>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      </Container>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={handleCloseSnackbar}
          sx={{ borderRadius: 3 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ProviderProfile;