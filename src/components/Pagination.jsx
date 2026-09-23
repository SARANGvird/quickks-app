// src/components/Pagination.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import PropTypes from "prop-types";
import {
  Box,
  Button,
  Typography,
  MenuItem,
  Select,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  InputAdornment,
  Popover,
  FormControl,
  InputLabel,
  Pagination as MuiPagination,
  PaginationItem
} from "@mui/material";
import {
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaEllipsisH,
  FaSearch,
  FaFilter,
  FaDownload,
  FaPrint,
  FaEye
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

// Constants
const DEFAULT_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const STORAGE_KEY = "pagination_preferences";

/**
 * Pagination Component
 * 
 * A comprehensive pagination component with page size selector,
 * page navigation, jump to page, and total items display.
 * 
 * @param {Object} props - Component props
 * @param {number} props.page - Current page (0-indexed)
 * @param {number} props.size - Items per page
 * @param {number} props.totalItems - Total number of items
 * @param {number} props.totalPages - Total number of pages
 * @param {Function} props.onChange - Callback when page or size changes
 * @param {Array} props.sizeOptions - Available page size options
 * @param {boolean} props.showSizeSelector - Show page size selector
 * @param {boolean} props.showJumpToPage - Show jump to page input
 * @param {boolean} props.showTotalItems - Show total items count
 * @param {boolean} props.showFirstLastButtons - Show first/last page buttons
 * @param {boolean} props.showPageNumbers - Show page number buttons
 * @param {number} props.siblingCount - Number of sibling pages to show
 * @param {string} props.variant - Pagination variant (basic, advanced, compact)
 * @param {string} props.color - Primary color theme
 * @param {boolean} props.savePreferences - Save user preferences to localStorage
 * @param {Function} props.onExport - Export data callback
 * @param {Function} props.onPrint - Print data callback
 * @param {boolean} props.loading - Loading state
 * @param {string} props.className - Custom CSS class
 * @param {Object} props.sx - Custom MUI styles
 */

const Pagination = ({
  page = 0,
  size = 10,
  totalItems = 0,
  totalPages = 0,
  onChange,
  sizeOptions = DEFAULT_SIZE_OPTIONS,
  showSizeSelector = true,
  showJumpToPage = true,
  showTotalItems = true,
  showFirstLastButtons = true,
  showPageNumbers = true,
  siblingCount = 1,
  variant = "basic",
  color = "primary",
  savePreferences = true,
  onExport,
  onPrint,
  loading = false,
  className = "",
  sx = {}
}) => {
  // State
  const [currentPage, setCurrentPage] = useState(page);
  const [currentSize, setCurrentSize] = useState(size);
  const [jumpToPageAnchor, setJumpToPageAnchor] = useState(null);
  const [jumpToPageValue, setJumpToPageValue] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Validate and normalize inputs
  const validSizeOptions = useMemo(() => {
    return sizeOptions.filter(opt => typeof opt === "number" && opt > 0);
  }, [sizeOptions]);

  const normalizedSize = useMemo(() => {
    return validSizeOptions.includes(currentSize) ? currentSize : validSizeOptions[1] || 10;
  }, [currentSize, validSizeOptions]);

  const normalizedTotalPages = useMemo(() => {
    if (totalPages > 0) return totalPages;
    if (totalItems > 0) return Math.ceil(totalItems / normalizedSize);
    return 1;
  }, [totalPages, totalItems, normalizedSize]);

  const normalizedCurrentPage = useMemo(() => {
    if (currentPage < 0) return 0;
    if (currentPage >= normalizedTotalPages) return Math.max(0, normalizedTotalPages - 1);
    return currentPage;
  }, [currentPage, normalizedTotalPages]);

  // Load saved preferences
  useEffect(() => {
    if (savePreferences) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const preferences = JSON.parse(saved);
          if (preferences.size && validSizeOptions.includes(preferences.size)) {
            setCurrentSize(preferences.size);
          }
        } catch (error) {
          console.error("Failed to load pagination preferences:", error);
        }
      }
    }
  }, [savePreferences, validSizeOptions]);

  // Save preferences
  useEffect(() => {
    if (savePreferences && normalizedSize) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ size: normalizedSize }));
    }
  }, [normalizedSize, savePreferences]);

  // Sync with parent page prop
  useEffect(() => {
    if (page !== currentPage) {
      setCurrentPage(page);
    }
  }, [page, currentPage]);

  // Handle page change
  const handlePageChange = useCallback((newPage) => {
    if (newPage >= 0 && newPage < normalizedTotalPages && newPage !== currentPage) {
      setCurrentPage(newPage);
      onChange?.(newPage, normalizedSize);
    }
  }, [normalizedTotalPages, currentPage, normalizedSize, onChange]);

  // Handle size change
  const handleSizeChange = useCallback((event) => {
    const newSize = parseInt(event.target.value, 10);
    if (newSize !== currentSize) {
      setCurrentSize(newSize);
      setCurrentPage(0);
      onChange?.(0, newSize);
    }
  }, [currentSize, onChange]);

  // Handle first page
  const handleFirstPage = useCallback(() => {
    handlePageChange(0);
  }, [handlePageChange]);

  // Handle last page
  const handleLastPage = useCallback(() => {
    handlePageChange(normalizedTotalPages - 1);
  }, [handlePageChange, normalizedTotalPages]);

  // Handle jump to page
  const handleJumpToPageOpen = (event) => {
    setJumpToPageAnchor(event.currentTarget);
  };

  const handleJumpToPageClose = () => {
    setJumpToPageAnchor(null);
    setJumpToPageValue("");
  };

  const handleJumpToPageSubmit = () => {
    const pageNum = parseInt(jumpToPageValue, 10) - 1;
    if (!isNaN(pageNum) && pageNum >= 0 && pageNum < normalizedTotalPages) {
      handlePageChange(pageNum);
    }
    handleJumpToPageClose();
  };

  // Generate page numbers to display
  const getPageNumbers = useCallback(() => {
    if (!showPageNumbers) return [];

    const totalPageNumbers = siblingCount * 2 + 3;
    const startPage = Math.max(0, normalizedCurrentPage - siblingCount);
    const endPage = Math.min(normalizedTotalPages - 1, normalizedCurrentPage + siblingCount);

    let pages = [];
    
    if (normalizedTotalPages <= totalPageNumbers) {
      pages = Array.from({ length: normalizedTotalPages }, (_, i) => i);
    } else {
      const leftSiblingIndex = Math.max(startPage, 0);
      const rightSiblingIndex = Math.min(endPage, normalizedTotalPages - 1);
      const showLeftDots = leftSiblingIndex > 1;
      const showRightDots = rightSiblingIndex < normalizedTotalPages - 2;

      if (!showLeftDots && showRightDots) {
        const leftItemCount = 3;
        pages = Array.from({ length: leftItemCount }, (_, i) => i);
        pages.push("...");
        pages.push(normalizedTotalPages - 1);
      } else if (showLeftDots && !showRightDots) {
        const rightItemCount = 3;
        pages.push(0);
        pages.push("...");
        pages.push(...Array.from({ length: rightItemCount }, (_, i) => normalizedTotalPages - rightItemCount + i));
      } else if (showLeftDots && showRightDots) {
        pages.push(0);
        pages.push("...");
        pages.push(...Array.from({ length: rightSiblingIndex - leftSiblingIndex + 1 }, (_, i) => leftSiblingIndex + i));
        pages.push("...");
        pages.push(normalizedTotalPages - 1);
      }
    }
    
    return pages;
  }, [normalizedCurrentPage, normalizedTotalPages, siblingCount, showPageNumbers]);

  const pageNumbers = getPageNumbers();

  // Render basic variant (simple prev/next)
  const renderBasicVariant = () => (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="center"
      className={`pagination-basic ${className}`}
      sx={sx}
    >
      <Tooltip title="Previous Page">
        <span>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FaChevronLeft />}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 0 || loading}
            sx={styles.button}
          >
            Prev
          </Button>
        </span>
      </Tooltip>

      <Typography variant="body2" sx={styles.pageInfo}>
        Page {currentPage + 1} of {normalizedTotalPages}
      </Typography>

      <Tooltip title="Next Page">
        <span>
          <Button
            variant="outlined"
            size="small"
            endIcon={<FaChevronRight />}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= normalizedTotalPages - 1 || loading}
            sx={styles.button}
          >
            Next
          </Button>
        </span>
      </Tooltip>

      {showSizeSelector && renderSizeSelector()}
    </Stack>
  );

  // Render advanced variant (with page numbers)
  const renderAdvancedVariant = () => (
    <Box className={`pagination-advanced ${className}`} sx={styles.advancedContainer}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
      >
        {/* Left section - Items info */}
        {showTotalItems && totalItems > 0 && (
          <Typography variant="body2" sx={styles.itemsInfo}>
            Showing {currentPage * normalizedSize + 1} to{" "}
            {Math.min((currentPage + 1) * normalizedSize, totalItems)} of {totalItems} entries
          </Typography>
        )}

        {/* Right section - Pagination controls */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={styles.controls}>
          {/* First page button */}
          {showFirstLastButtons && (
            <Tooltip title="First Page">
              <span>
                <IconButton
                  onClick={handleFirstPage}
                  disabled={currentPage <= 0 || loading}
                  size="small"
                  sx={styles.iconButton}
                >
                  <FaAngleDoubleLeft size={14} />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Previous button */}
          <Tooltip title="Previous Page">
            <span>
              <IconButton
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 0 || loading}
                size="small"
                sx={styles.iconButton}
              >
                <FaChevronLeft size={14} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Page numbers */}
          {showPageNumbers && (
            <Stack direction="row" spacing={0.5}>
              {pageNumbers.map((pageNum, index) => (
                <React.Fragment key={index}>
                  {pageNum === "..." ? (
                    <Tooltip title="More pages">
                      <Box sx={styles.dots}>
                        <FaEllipsisH size={12} />
                      </Box>
                    </Tooltip>
                  ) : (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant={currentPage === pageNum ? "contained" : "outlined"}
                        size="small"
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        sx={{
                          ...styles.pageButton,
                          ...(currentPage === pageNum ? styles.activePageButton : {}),
                          minWidth: "36px",
                          height: "36px",
                          p: 0
                        }}
                      >
                        {pageNum + 1}
                      </Button>
                    </motion.div>
                  )}
                </React.Fragment>
              ))}
            </Stack>
          )}

          {/* Next button */}
          <Tooltip title="Next Page">
            <span>
              <IconButton
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= normalizedTotalPages - 1 || loading}
                size="small"
                sx={styles.iconButton}
              >
                <FaChevronRight size={14} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Last page button */}
          {showFirstLastButtons && (
            <Tooltip title="Last Page">
              <span>
                <IconButton
                  onClick={handleLastPage}
                  disabled={currentPage >= normalizedTotalPages - 1 || loading}
                  size="small"
                  sx={styles.iconButton}
                >
                  <FaAngleDoubleRight size={14} />
                </IconButton>
              </span>
            </Tooltip>
          )}

          {/* Jump to page */}
          {showJumpToPage && (
            <>
              <Button
                variant="outlined"
                size="small"
                onClick={handleJumpToPageOpen}
                disabled={loading}
                sx={styles.jumpButton}
              >
                Jump to
              </Button>
              <Popover
                open={Boolean(jumpToPageAnchor)}
                anchorEl={jumpToPageAnchor}
                onClose={handleJumpToPageClose}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                transformOrigin={{ vertical: "top", horizontal: "center" }}
              >
                <Box sx={styles.jumpPopover}>
                  <TextField
                    autoFocus
                    size="small"
                    type="number"
                    placeholder={`1-${normalizedTotalPages}`}
                    value={jumpToPageValue}
                    onChange={(e) => setJumpToPageValue(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleJumpToPageSubmit()}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleJumpToPageSubmit}>
                            <FaSearch size={14} />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />
                </Box>
              </Popover>
            </>
          )}

          {/* Size selector */}
          {showSizeSelector && renderSizeSelector()}
        </Stack>
      </Stack>
    </Box>
  );

  // Render compact variant
  const renderCompactVariant = () => (
    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="center"
      className={`pagination-compact ${className}`}
      sx={sx}
    >
      <Tooltip title="Previous">
        <span>
          <IconButton
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage <= 0 || loading}
            size="small"
            sx={styles.iconButton}
          >
            <FaChevronLeft size={12} />
          </IconButton>
        </span>
      </Tooltip>
      
      <Typography variant="caption" sx={styles.compactInfo}>
        {currentPage + 1}/{normalizedTotalPages}
      </Typography>
      
      <Tooltip title="Next">
        <span>
          <IconButton
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= normalizedTotalPages - 1 || loading}
            size="small"
            sx={styles.iconButton}
          >
            <FaChevronRight size={12} />
          </IconButton>
        </span>
      </Tooltip>
      
      {showSizeSelector && renderSizeSelector()}
    </Stack>
  );

  // Render size selector
  const renderSizeSelector = () => (
    <Box sx={styles.sizeSelector}>
      <Typography variant="caption" sx={styles.sizeLabel}>
        Rows:
      </Typography>
      <Select
        value={normalizedSize}
        size="small"
        onChange={handleSizeChange}
        disabled={loading}
        sx={styles.sizeSelect}
        MenuProps={{
          PaperProps: {
            sx: styles.sizeMenu
          }
        }}
      >
        {validSizeOptions.map((option) => (
          <MenuItem key={option} value={option} sx={styles.sizeMenuItem}>
            {option}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );

  // Render action buttons (export/print)
  const renderActionButtons = () => {
    if (!onExport && !onPrint) return null;
    
    return (
      <Stack direction="row" spacing={1}>
        {onExport && (
          <Tooltip title="Export data">
            <IconButton onClick={onExport} size="small" sx={styles.actionButton}>
              <FaDownload size={14} />
            </IconButton>
          </Tooltip>
        )}
        {onPrint && (
          <Tooltip title="Print">
            <IconButton onClick={onPrint} size="small" sx={styles.actionButton}>
              <FaPrint size={14} />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    );
  };

  // Loading state
  if (loading) {
    return (
      <Box sx={styles.loadingContainer}>
        <div className="pagination-skeleton" style={styles.skeleton} />
      </Box>
    );
  }

  // If no items, don't render
  if (totalItems === 0 && normalizedTotalPages <= 1) {
    return null;
  }

  // Select variant
  const renderPagination = () => {
    switch (variant) {
      case "advanced":
        return renderAdvancedVariant();
      case "compact":
        return renderCompactVariant();
      default:
        return renderBasicVariant();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Box sx={styles.mainContainer}>
          {renderActionButtons()}
          {renderPagination()}
        </Box>
      </motion.div>
    </AnimatePresence>
  );
};

// PropTypes
Pagination.propTypes = {
  page: PropTypes.number,
  size: PropTypes.number,
  totalItems: PropTypes.number,
  totalPages: PropTypes.number,
  onChange: PropTypes.func.isRequired,
  sizeOptions: PropTypes.arrayOf(PropTypes.number),
  showSizeSelector: PropTypes.bool,
  showJumpToPage: PropTypes.bool,
  showTotalItems: PropTypes.bool,
  showFirstLastButtons: PropTypes.bool,
  showPageNumbers: PropTypes.bool,
  siblingCount: PropTypes.number,
  variant: PropTypes.oneOf(["basic", "advanced", "compact"]),
  color: PropTypes.string,
  savePreferences: PropTypes.bool,
  onExport: PropTypes.func,
  onPrint: PropTypes.func,
  loading: PropTypes.bool,
  className: PropTypes.string,
  sx: PropTypes.object
};

// Default props
Pagination.defaultProps = {
  page: 0,
  size: 10,
  totalItems: 0,
  totalPages: 0,
  sizeOptions: DEFAULT_SIZE_OPTIONS,
  showSizeSelector: true,
  showJumpToPage: true,
  showTotalItems: true,
  showFirstLastButtons: true,
  showPageNumbers: true,
  siblingCount: 1,
  variant: "basic",
  color: "primary",
  savePreferences: true,
  onExport: null,
  onPrint: null,
  loading: false,
  className: "",
  sx: {}
};

// Styles
const styles = {
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    mt: 4,
    mb: 2
  },
  button: {
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 700,
    fontSize: "13px",
    borderColor: "#e2e8f0",
    "&:hover": {
      borderColor: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.05)"
    }
  },
  pageInfo: {
    fontWeight: 800,
    color: "#64748b",
    minWidth: "100px",
    textAlign: "center"
  },
  advancedContainer: {
    p: 2,
    bgcolor: "white",
    borderRadius: "12px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    width: "100%"
  },
  itemsInfo: {
    color: "#64748b",
    fontSize: "13px"
  },
  controls: {
    gap: 1
  },
  iconButton: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    "&:hover": {
      borderColor: "#fbbf24",
      color: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.05)"
    },
    "&.Mui-disabled": {
      borderColor: "#e2e8f0",
      color: "#cbd5e1"
    }
  },
  pageButton: {
    borderRadius: "8px",
    textTransform: "none",
    fontWeight: 600,
    fontSize: "13px",
    minWidth: "36px",
    height: "36px",
    p: 0,
    borderColor: "#e2e8f0",
    color: "#64748b",
    "&:hover": {
      borderColor: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.05)"
    }
  },
  activePageButton: {
    backgroundColor: "#fbbf24",
    borderColor: "#fbbf24",
    color: "#0f172a",
    "&:hover": {
      backgroundColor: "#f59e0b",
      borderColor: "#f59e0b"
    }
  },
  dots: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "36px",
    color: "#94a3b8"
  },
  jumpButton: {
    borderRadius: "8px",
    textTransform: "none",
    fontSize: "12px",
    borderColor: "#e2e8f0",
    color: "#64748b",
    "&:hover": {
      borderColor: "#fbbf24",
      color: "#fbbf24"
    }
  },
  jumpPopover: {
    p: 2,
    width: "200px"
  },
  sizeSelector: {
    display: "flex",
    alignItems: "center",
    gap: 1
  },
  sizeLabel: {
    fontWeight: 700,
    color: "#94a3b8",
    fontSize: "12px"
  },
  sizeSelect: {
    borderRadius: "8px",
    height: "32px",
    fontSize: "12px",
    fontWeight: 700,
    "& .MuiSelect-select": {
      py: 0.5,
      display: "flex",
      alignItems: "center"
    }
  },
  sizeMenu: {
    borderRadius: "8px",
    mt: 1
  },
  sizeMenuItem: {
    fontSize: "12px",
    fontWeight: 700
  },
  actionButton: {
    width: "32px",
    height: "32px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    "&:hover": {
      borderColor: "#fbbf24",
      color: "#fbbf24",
      backgroundColor: "rgba(251, 191, 36, 0.05)"
    }
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    p: 2
  },
  skeleton: {
    width: "300px",
    height: "40px",
    backgroundColor: "#e2e8f0",
    borderRadius: "8px",
    animation: "pulse 1.5s ease-in-out infinite"
  },
  compactInfo: {
    fontWeight: 700,
    color: "#64748b",
    minWidth: "40px",
    textAlign: "center"
  }
};

// Add keyframe animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;
document.head.appendChild(styleSheet);

export default React.memo(Pagination);