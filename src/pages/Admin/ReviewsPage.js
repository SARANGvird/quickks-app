// src/pages/Admin/ReviewsPage.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
  Tooltip,
  Avatar,
  Rating,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Card,
  CardContent,
  Tabs,
  Tab,
  Badge,
  LinearProgress,
  Divider
} from "@mui/material";
import {
  Search,
  FilterList,
  Refresh,
  MoreVert,
  Delete,
  Visibility,
  Star,
  StarBorder,
  ThumbUp,
  ThumbDown,
  Comment,
  Person,
  Business,
  CalendarToday,
  Download,
  Print,
  Email,
  Phone,
  Warning,
  CheckCircle,
  Close,
  Clear
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEBOUNCE_DELAY = 500;
const REVIEW_STATUS = {
  PUBLISHED: { label: "Published", color: "success" },
  HIDDEN: { label: "Hidden", color: "warning" },
  FLAGGED: { label: "Flagged", color: "error" }
};

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
};

const getRatingColor = (rating) => {
  if (rating >= 4) return "#22c55e";
  if (rating >= 3) return "#f59e0b";
  return "#ef4444";
};

// ==========================================================
// REVIEW DETAILS MODAL
// ==========================================================
const ReviewDetailsModal = ({ review, open, onClose, onDelete }) => {
  if (!review) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Review Details</Typography>
          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        <Grid container spacing={3}>
          {/* Rating Section */}
          <Grid item xs={12}>
            <Box textAlign="center" py={2}>
              <Typography variant="h2" fontWeight="bold" sx={{ color: getRatingColor(review.rating) }}>
                {review.rating}
              </Typography>
              <Rating value={review.rating} readOnly size="large" precision={0.5} />
              <Typography variant="caption" color="text.secondary">
                {review.rating} out of 5 stars
              </Typography>
            </Box>
          </Grid>

          {/* Provider Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>Provider Information</Typography>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Business fontSize="small" color="action" />
                <Typography variant="body2">{review.providerName || "N/A"}</Typography>
              </Box>
              {review.providerEmail && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2">{review.providerEmail}</Typography>
                </Box>
              )}
              {review.providerPhone && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2">{review.providerPhone}</Typography>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Customer Info */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>Customer Information</Typography>
            <Stack spacing={1}>
              <Box display="flex" alignItems="center" gap={1}>
                <Person fontSize="small" color="action" />
                <Typography variant="body2">{review.customerName || "N/A"}</Typography>
              </Box>
              {review.customerEmail && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2">{review.customerEmail}</Typography>
                </Box>
              )}
            </Stack>
          </Grid>

          {/* Review Comment */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="primary" gutterBottom>Review Comment</Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
              <Typography variant="body2">{review.comment || "No comment provided"}</Typography>
            </Paper>
          </Grid>

          {/* Metadata */}
          <Grid item xs={12}>
            <Divider />
            <Stack direction="row" spacing={2} mt={2}>
              <Box>
                <Typography variant="caption" color="text.secondary">Review ID</Typography>
                <Typography variant="body2">#{review.reviewId?.slice(-8).toUpperCase()}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Created</Typography>
                <Typography variant="body2">{formatDate(review.createdAt)}</Typography>
              </Box>
              {review.bookingId && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Booking ID</Typography>
                  <Typography variant="body2">#{review.bookingId}</Typography>
                </Box>
              )}
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() => onDelete(review.reviewId)}
          startIcon={<Delete />}
        >
          Delete Review
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ==========================================================
// STAT CARD COMPONENT
// ==========================================================
const StatCard = ({ title, value, subtitle, icon, color, trend }) => (
  <Card>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" fontWeight="bold">
            {value}
          </Typography>
          {subtitle && (
            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          )}
          {trend !== undefined && (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
              {trend >= 0 ? (
                <ThumbUp sx={{ fontSize: 12, color: "success.main" }} />
              ) : (
                <ThumbDown sx={{ fontSize: 12, color: "error.main" }} />
              )}
              <Typography variant="caption" color={trend >= 0 ? "success.main" : "error.main"}>
                {Math.abs(trend)}% from last month
              </Typography>
            </Box>
          )}
        </Box>
        <Avatar sx={{ bgcolor: `${color}.100`, color: `${color}.main` }}>
          {icon}
        </Avatar>
      </Box>
    </CardContent>
  </Card>
);

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function ReviewsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [providerFilter, setProviderFilter] = useState("");
  const [selectedReview, setSelectedReview] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    averageRating: 0,
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0,
    flagged: 0
  });

  // ==========================================================
  // DEBOUNCED SEARCH
  // ==========================================================
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ==========================================================
  // LOAD REVIEWS
  // ==========================================================
  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        search: debouncedSearchTerm || undefined,
        providerId: providerFilter || undefined,
        rating: ratingFilter !== "all" ? parseInt(ratingFilter) : undefined
      };

      const response = await api.get("/admin/reviews", { params });
      const data = response.data?.data || response.data;
      
      if (Array.isArray(data)) {
        setReviews(data);
        setTotalElements(data.length);
        setTotalPages(Math.ceil(data.length / size));
      } else if (data?.content) {
        setReviews(data.content);
        setTotalElements(data.totalElements || 0);
        setTotalPages(data.totalPages || 0);
      }
      
    } catch (error) {
      console.error("Failed to load reviews:", error);
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: error.response?.data?.message || "Failed to load reviews"
      });
    } finally {
      setLoading(false);
    }
  }, [page, size, debouncedSearchTerm, providerFilter, ratingFilter, addNotification]);

  // ==========================================================
  // LOAD STATISTICS
  // ==========================================================
  const loadStats = useCallback(async () => {
    try {
      const response = await api.get("/admin/reviews/statistics");
      const data = response.data?.data || response.data;
      
      if (data) {
        setStats({
          total: data.total || 0,
          averageRating: data.averageRating || 0,
          fiveStar: data.fiveStar || 0,
          fourStar: data.fourStar || 0,
          threeStar: data.threeStar || 0,
          twoStar: data.twoStar || 0,
          oneStar: data.oneStar || 0,
          flagged: data.flagged || 0
        });
      }
    } catch (error) {
      console.warn("Could not load review statistics:", error);
    }
  }, []);

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================
  useEffect(() => {
    loadReviews();
    loadStats();
  }, [loadReviews, loadStats]);

  // ==========================================================
  // DELETE REVIEW
  // ==========================================================
  const handleDeleteReview = async (reviewId) => {
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      
      addNotification({
        type: "success",
        title: "Review Deleted",
        message: "The review has been deleted successfully"
      });
      
      loadReviews();
      loadStats();
      
    } catch (error) {
      console.error("Failed to delete review:", error);
      addNotification({
        type: "error",
        title: "Delete Failed",
        message: error.response?.data?.message || "Failed to delete review"
      });
    } finally {
      setDeleteDialogOpen(false);
      setReviewToDelete(null);
    }
  };

  // ==========================================================
  // EXPORT REVIEWS
  // ==========================================================
  const handleExport = async (format) => {
    try {
      const params = {
        format,
        search: debouncedSearchTerm || undefined,
        rating: ratingFilter !== "all" ? ratingFilter : undefined
      };
      
      const response = await api.get("/admin/reviews/export", {
        params,
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `reviews_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: "success",
        title: "Export Successful",
        message: `Reviews exported as ${format.toUpperCase()}`
      });
    } catch (error) {
      console.error("Export failed:", error);
      addNotification({
        type: "error",
        title: "Export Failed",
        message: "Failed to export reviews"
      });
    }
  };

  // ==========================================================
  // HANDLE PAGE CHANGE
  // ==========================================================
  const handlePageChange = (event, newPage) => {
    setPage(newPage - 1);
  };

  const handleSizeChange = (event) => {
    setSize(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ==========================================================
  // CLEAR FILTERS
  // ==========================================================
  const clearFilters = () => {
    setSearchTerm("");
    setProviderFilter("");
    setRatingFilter("all");
    setPage(0);
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Review Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor and manage customer reviews across the platform
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadReviews()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={() => handleExport("csv")}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="Total Reviews" value={stats.total} icon={<Comment />} color="primary" />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard 
            title="Average Rating" 
            value={stats.averageRating.toFixed(1)} 
            icon={<Star />} 
            color="warning"
            subtitle="out of 5"
          />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="5 Star" value={stats.fiveStar} icon={<Star />} color="success" />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="4 Star" value={stats.fourStar} icon={<Star />} color="info" />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="1-3 Star" value={stats.oneStar + stats.twoStar + stats.threeStar} icon={<StarBorder />} color="warning" />
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <StatCard title="Flagged" value={stats.flagged} icon={<Warning />} color="error" />
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              placeholder="Search by customer, provider, or comment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm("")}>
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              placeholder="Filter by Provider ID"
              value={providerFilter}
              onChange={(e) => setProviderFilter(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Rating</InputLabel>
              <Select
                value={ratingFilter}
                label="Rating"
                onChange={(e) => setRatingFilter(e.target.value)}
              >
                <MenuItem value="all">All Ratings</MenuItem>
                <MenuItem value="5">5 Stars</MenuItem>
                <MenuItem value="4">4 Stars</MenuItem>
                <MenuItem value="3">3 Stars</MenuItem>
                <MenuItem value="2">2 Stars</MenuItem>
                <MenuItem value="1">1 Star</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="outlined"
              onClick={clearFilters}
              startIcon={<Clear />}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Reviews Table */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box p={4}>
            <LinearProgress />
            <Typography align="center" sx={{ mt: 2 }}>Loading reviews...</Typography>
          </Box>
        ) : reviews.length === 0 ? (
          <Box p={6} textAlign="center">
            <Star sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No reviews found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters or search criteria
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>Review ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Provider</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Comment</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.reviewId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          #{review.reviewId?.slice(-8).toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                            {review.customerName?.charAt(0) || "C"}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{review.customerName || "Anonymous"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {review.customerEmail || "No email"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{review.providerName || "N/A"}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Rating value={review.rating} readOnly size="small" />
                          <Typography variant="body2" fontWeight="bold" sx={{ color: getRatingColor(review.rating) }}>
                            {review.rating}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {review.comment?.substring(0, 80) || "No comment"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(review.createdAt)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedReview(review);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Review">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => {
                              setReviewToDelete(review.reviewId);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={totalElements}
              page={page}
              onPageChange={handlePageChange}
              rowsPerPage={size}
              onRowsPerPageChange={handleSizeChange}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            />
          </>
        )}
      </Paper>

      {/* Review Details Modal */}
      <ReviewDetailsModal
        review={selectedReview}
        open={detailsModalOpen}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedReview(null);
        }}
        onDelete={(id) => {
          setDetailsModalOpen(false);
          setReviewToDelete(id);
          setDeleteDialogOpen(true);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this review? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => handleDeleteReview(reviewToDelete)}
            variant="contained"
            color="error"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}