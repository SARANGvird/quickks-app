// src/pages/Admin/ComplaintsPage.jsx
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
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Edit,
  Delete,
  Download,
  Print,
  Email,
  Phone,
  Person,
  Category,
  Warning,
  Info,
  Message,
  Send,
  Close,
  DoneAll,
  AssignmentLate,
  ReportProblem,
  ThumbUp,
  ThumbDown,
  Comment,
  Schedule
} from "@mui/icons-material";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { useAuth } from "../../contexts/AuthContext";
import { useNotifications } from "../../contexts/NotificationContext";
import api from "../../api/api";

// ==========================================================
// CONSTANTS
// ==========================================================
const COMPLAINT_STATUS = {
  PENDING: { label: "Pending", color: "warning", icon: Pending, bgColor: "#fef3c7", textColor: "#92400e" },
  IN_REVIEW: { label: "In Review", color: "info", icon: Visibility, bgColor: "#dbeafe", textColor: "#1e40af" },
  RESOLVED: { label: "Resolved", color: "success", icon: CheckCircle, bgColor: "#d1fae5", textColor: "#065f46" },
  CLOSED: { label: "Closed", color: "default", icon: DoneAll, bgColor: "#f3f4f6", textColor: "#374151" },
  ESCALATED: { label: "Escalated", color: "error", icon: AssignmentLate, bgColor: "#fee2e2", textColor: "#991b1b" }
};

const COMPLAINT_CATEGORIES = [
  "Service Quality",
  "Provider Behavior",
  "Payment Issue",
  "Booking Issue",
  "Technical Problem",
  "Other"
];

const STATUS_OPTIONS = ["PENDING", "IN_REVIEW", "RESOLVED", "CLOSED", "ESCALATED"];
const ROWS_PER_PAGE_OPTIONS = [10, 25, 50, 100];
const DEBOUNCE_DELAY = 500;

// ==========================================================
// HELPER FUNCTIONS
// ==========================================================
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
};

const getStatusChip = (status) => {
  const config = COMPLAINT_STATUS[status] || COMPLAINT_STATUS.PENDING;
  const Icon = config.icon;
  return (
    <Chip
      icon={<Icon />}
      label={config.label}
      size="small"
      sx={{
        bgcolor: config.bgColor,
        color: config.textColor,
        fontWeight: 600,
        '& .MuiChip-icon': { color: config.textColor }
      }}
    />
  );
};

// ==========================================================
// COMPLAINT DETAILS MODAL
// ==========================================================
const ComplaintDetailsModal = ({ complaint, onClose, onResolve, onUpdateStatus }) => {
  const [resolutionMessage, setResolutionMessage] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);

  if (!complaint) return null;

  const handleResolve = () => {
    if (!resolutionMessage.trim()) {
      alert("Please enter a resolution message");
      return;
    }
    onResolve(complaint.complaintId, resolutionMessage);
    setShowResolveDialog(false);
    setResolutionMessage("");
  };

  return (
    <>
      <Dialog open={true} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Complaint Details</Typography>
            <IconButton onClick={onClose}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Header Info */}
            <Grid item xs={12}>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Complaint ID</Typography>
                  <Typography variant="body1" fontWeight="bold">#{complaint.complaintId?.slice(-8).toUpperCase()}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Status</Typography>
                  <Box mt={1}>{getStatusChip(complaint.status)}</Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Created</Typography>
                  <Typography variant="body2">{formatDate(complaint.createdAt)}</Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            {/* Customer Info */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Customer Information</Typography>
              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="body2">{complaint.userName || "N/A"}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Email fontSize="small" color="action" />
                  <Typography variant="body2">{complaint.userEmail || "N/A"}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2">{complaint.userPhone || "N/A"}</Typography>
                </Box>
              </Stack>
            </Grid>

            {/* Provider Info (if applicable) */}
            {complaint.providerName && (
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Provider Information</Typography>
                <Stack spacing={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Person fontSize="small" color="action" />
                    <Typography variant="body2">{complaint.providerName}</Typography>
                  </Box>
                  {complaint.providerEmail && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <Email fontSize="small" color="action" />
                      <Typography variant="body2">{complaint.providerEmail}</Typography>
                    </Box>
                  )}
                </Stack>
              </Grid>
            )}

            {/* Complaint Details */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="primary" gutterBottom>Complaint Details</Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50" }}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Category</Typography>
                    <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                      <Category fontSize="small" color="action" />
                      <Typography variant="body2">{complaint.category || "General"}</Typography>
                    </Box>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Description</Typography>
                    <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: "pre-wrap" }}>
                      {complaint.description || "No description provided"}
                    </Typography>
                  </Box>
                  {complaint.bookingId && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">Related Booking</Typography>
                      <Typography variant="body2">#{complaint.bookingId}</Typography>
                    </Box>
                  )}
                </Stack>
              </Paper>
            </Grid>

            {/* Resolution Details */}
            {complaint.resolutionMessage && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" color="primary" gutterBottom>Resolution</Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: "#d1fae5" }}>
                  <Typography variant="body2">{complaint.resolutionMessage}</Typography>
                  {complaint.resolvedAt && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Resolved on: {formatDate(complaint.resolvedAt)}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
          {complaint.status !== "RESOLVED" && complaint.status !== "CLOSED" && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => setShowResolveDialog(true)}
              startIcon={<CheckCircle />}
            >
              Resolve Complaint
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onClose={() => setShowResolveDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resolve Complaint</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Resolution Message"
            multiline
            rows={4}
            fullWidth
            value={resolutionMessage}
            onChange={(e) => setResolutionMessage(e.target.value)}
            placeholder="Please provide details about how this complaint was resolved..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowResolveDialog(false)}>Cancel</Button>
          <Button onClick={handleResolve} variant="contained" color="success">
            Mark as Resolved
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export default function ComplaintsPage() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  // ==========================================================
  // STATE MANAGEMENT
  // ==========================================================
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [status, setStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  const [complaintsPage, setComplaintsPage] = useState({
    content: [],
    totalPages: 0,
    totalElements: 0,
    number: 0,
    size: 10
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setPage(0);
    }, DEBOUNCE_DELAY);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ==========================================================
  // LOAD COMPLAINTS
  // ==========================================================
  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        size,
        status: status || undefined,
        search: debouncedSearchTerm || undefined
      };
      
      const response = await api.get("/admin/complaints", { params });
      
      setComplaintsPage({
        content: response.data?.content || response.data || [],
        totalPages: response.data?.totalPages || 0,
        totalElements: response.data?.totalElements || 0,
        number: response.data?.number || page,
        size: response.data?.size || size
      });
    } catch (error) {
      console.error("Failed to load complaints:", error);
      addNotification({
        type: "error",
        title: "Loading Failed",
        message: error.response?.data?.message || "Failed to load complaints"
      });
    } finally {
      setLoading(false);
    }
  }, [page, size, status, debouncedSearchTerm, addNotification]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  // ==========================================================
  // RESOLVE COMPLAINT
  // ==========================================================
  const resolveComplaint = async (complaintId, resolutionMessage) => {
    setUpdating(true);
    try {
      await api.post(`/admin/complaints/${complaintId}/resolve`, null, {
        params: { resolutionMessage }
      });
      
      addNotification({
        type: "success",
        title: "Complaint Resolved",
        message: "The complaint has been marked as resolved"
      });
      
      loadComplaints();
      setDetailsModalOpen(false);
      setSelectedComplaint(null);
    } catch (error) {
      console.error("Failed to resolve complaint:", error);
      addNotification({
        type: "error",
        title: "Resolution Failed",
        message: error.response?.data?.message || "Failed to resolve complaint"
      });
    } finally {
      setUpdating(false);
    }
  };

  // ==========================================================
  // UPDATE STATUS
  // ==========================================================
  const updateStatus = async (complaintId, newStatus) => {
    setUpdating(true);
    try {
      await api.put(`/admin/complaints/${complaintId}/status`, null, {
        params: { status: newStatus }
      });
      
      addNotification({
        type: "success",
        title: "Status Updated",
        message: `Complaint status changed to ${COMPLAINT_STATUS[newStatus]?.label || newStatus}`
      });
      
      loadComplaints();
      setActionMenuAnchor(null);
    } catch (error) {
      console.error("Failed to update status:", error);
      addNotification({
        type: "error",
        title: "Update Failed",
        message: error.response?.data?.message || "Failed to update complaint status"
      });
    } finally {
      setUpdating(false);
    }
  };

  // ==========================================================
  // EXPORT COMPLAINTS
  // ==========================================================
  const handleExport = async () => {
    try {
      const response = await api.get("/admin/complaints/export", {
        params: { status: status || undefined, search: debouncedSearchTerm || undefined },
        responseType: "blob"
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `complaints_${format(new Date(), "yyyy-MM-dd")}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      addNotification({
        type: "success",
        title: "Export Successful",
        message: "Complaints exported successfully"
      });
    } catch (error) {
      console.error("Export failed:", error);
      addNotification({
        type: "error",
        title: "Export Failed",
        message: "Failed to export complaints"
      });
    }
  };

  // ==========================================================
  // STATISTICS
  // ==========================================================
  const stats = useMemo(() => {
    const content = complaintsPage?.content || [];
    const total = content.length;
    const pending = content.filter(c => c.status === "PENDING").length;
    const inReview = content.filter(c => c.status === "IN_REVIEW").length;
    const resolved = content.filter(c => c.status === "RESOLVED").length;
    const escalated = content.filter(c => c.status === "ESCALATED").length;
    
    return { total, pending, inReview, resolved, escalated };
  }, [complaintsPage?.content]);

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Complaints Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage and resolve customer complaints
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => loadComplaints()}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExport}
          >
            Export
          </Button>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Total Complaints</Typography>
              <Typography variant="h4" fontWeight="bold">{stats.total}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderTop: `3px solid ${COMPLAINT_STATUS.PENDING.color}` }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Pending</Typography>
              <Typography variant="h4" fontWeight="bold" color="warning.main">{stats.pending}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderTop: `3px solid ${COMPLAINT_STATUS.RESOLVED.color}` }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Resolved</Typography>
              <Typography variant="h4" fontWeight="bold" color="success.main">{stats.resolved}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Card sx={{ borderTop: `3px solid ${COMPLAINT_STATUS.ESCALATED.color}` }}>
            <CardContent>
              <Typography variant="caption" color="text.secondary">Escalated</Typography>
              <Typography variant="h4" fontWeight="bold" color="error.main">{stats.escalated}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <TextField
            placeholder="Search by ID, customer, provider..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              )
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
              label="Status"
            >
              <MenuItem value="">All Status</MenuItem>
              {STATUS_OPTIONS.map(s => (
                <MenuItem key={s} value={s}>{COMPLAINT_STATUS[s]?.label || s}</MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {
              setStatus("");
              setSearchTerm("");
              setPage(0);
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </Paper>

      {/* Complaints Table */}
      <Paper sx={{ borderRadius: 2, overflow: "hidden" }}>
        {loading ? (
          <Box p={4}>
            <LinearProgress />
            <Typography align="center" sx={{ mt: 2 }}>Loading complaints...</Typography>
          </Box>
        ) : complaintsPage.content.length === 0 ? (
          <Box p={4} textAlign="center">
            <ReportProblem sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
            <Typography color="text.secondary">No complaints found</Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell>ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {complaintsPage.content.map((complaint) => (
                    <TableRow key={complaint.complaintId} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          #{complaint.complaintId?.slice(-8).toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main" }}>
                            {complaint.userName?.charAt(0) || "U"}
                          </Avatar>
                          <Box>
                            <Typography variant="body2">{complaint.userName || "N/A"}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {complaint.userEmail || "No email"}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={complaint.category || "General"}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ maxWidth: 250, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {complaint.description?.substring(0, 60) || "No description"}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(complaint.status)}</TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(complaint.createdAt)}</Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedComplaint(complaint);
                              setDetailsModalOpen(true);
                            }}
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>
                        
                        {complaint.status !== "RESOLVED" && complaint.status !== "CLOSED" && (
                          <>
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                setSelectedComplaintId(complaint.complaintId);
                                setActionMenuAnchor(e.currentTarget);
                              }}
                            >
                              <MoreVert />
                            </IconButton>
                            <Menu
                              anchorEl={actionMenuAnchor}
                              open={actionMenuAnchor && selectedComplaintId === complaint.complaintId}
                              onClose={() => setActionMenuAnchor(null)}
                            >
                              <MenuItem onClick={() => updateStatus(complaint.complaintId, "IN_REVIEW")}>
                                <Visibility fontSize="small" sx={{ mr: 1 }} /> Mark In Review
                              </MenuItem>
                              <MenuItem onClick={() => {
                                setSelectedComplaint(complaint);
                                setDetailsModalOpen(true);
                              }}>
                                <Message fontSize="small" sx={{ mr: 1 }} /> Resolve
                              </MenuItem>
                              <MenuItem onClick={() => updateStatus(complaint.complaintId, "ESCALATED")}>
                                <AssignmentLate fontSize="small" sx={{ mr: 1 }} /> Escalate
                              </MenuItem>
                            </Menu>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            <TablePagination
              component="div"
              count={complaintsPage.totalElements}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={size}
              onRowsPerPageChange={(e) => {
                setSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            />
          </>
        )}
      </Paper>

      {/* Complaint Details Modal */}
      <AnimatePresence>
        {detailsModalOpen && selectedComplaint && (
          <ComplaintDetailsModal
            complaint={selectedComplaint}
            onClose={() => {
              setDetailsModalOpen(false);
              setSelectedComplaint(null);
            }}
            onResolve={resolveComplaint}
            onUpdateStatus={updateStatus}
          />
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      {updating && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
}