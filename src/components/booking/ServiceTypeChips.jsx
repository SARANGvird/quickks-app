import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Chip,
  TextField,
  Popper,
  Paper,
  MenuItem,
  Typography,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
  Fade,
  Grow,
  ClickAwayListener,
  FormHelperText,
  FormLabel,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  Clear as ClearIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Category as CategoryIcon,
  ArrowDropDown as ArrowDropDownIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '../../hooks/useDebounce';
import api from '../../api/api';

// ==========================================================
// CONSTANTS
// ==========================================================
const DEFAULT_SERVICES = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "AC Repair",
  "Painter",
  "Cleaning",
  "Appliance Repair",
  "AC Installation",
  "AC Service",
  "Refrigerator Repair",
  "Washing Machine Repair",
  "Microwave Repair",
  "Geyser Repair",
  "Chimney Repair",
  "RO Water Purifier",
  "TV Repair",
  "Laptop Repair",
  "Mobile Repair",
  "Packers & Movers",
  "Local Shifting",
  "HVAC",
  "Salon",
  "Spa",
  "Fitness Trainer",
  "Yoga",
  "Massage",
  "Tutor",
  "Legal",
  "Accounting",
  "IT Support",
  "Photography",
  "Event Planning",
  "Web Design",
  "Digital Marketing",
  "Courier",
  "Rental",
  "Mason",
  "Home Decor",
  "Furniture Assembly",
  "Flooring",
  "Roofing",
  "Home Renovation",
  "Interior Design",
  "Locksmith",
  "Gardening",
  "Pest Control",
  "Water Purifier",
  "Solar Installation",
  "Pet Care",
  "Babysitting",
  "Elder Care",
  "Beauty Services"
];

// ==========================================================
// STYLES
// ==========================================================
const styles = {
  container: {
    width: '100%',
    position: 'relative'
  },
  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    alignItems: 'center',
    minHeight: '56px',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    transition: 'all 0.2s ease',
    cursor: 'text',
    '&:hover': {
      borderColor: '#cbd5e1'
    },
    '&:focus-within': {
      borderColor: '#6366f1',
      boxShadow: '0 0 0 2px rgba(99,102,241,0.2)'
    }
  },
  chip: {
    height: '32px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    '& .MuiChip-label': {
      px: 1.5
    },
    '& .MuiChip-deleteIcon': {
      fontSize: '16px'
    }
  },
  input: {
    flex: 1,
    minWidth: '120px',
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    padding: '8px 4px',
    backgroundColor: 'transparent',
    fontFamily: 'inherit',
    '&::placeholder': {
      color: '#94a3b8'
    }
  },
  suggestionsContainer: {
    maxHeight: '300px',
    overflowY: 'auto',
    marginTop: '4px'
  },
  suggestionItem: {
    px: 2,
    py: 1.5,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#f1f5f9'
    }
  },
  suggestionSelected: {
    backgroundColor: '#eef2ff'
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    py: 3
  },
  errorContainer: {
    p: 2,
    textAlign: 'center'
  },
  noResults: {
    p: 2,
    textAlign: 'center',
    color: '#64748b'
  }
};

// ==========================================================
// SERVICE TYPE CHIPS COMPONENT
// ==========================================================
const ServiceTypeChips = ({
  value = [],
  onChange,
  services: propServices = null,
  placeholder = "Select service...",
  label = "Service Types",
  required = false,
  error = false,
  helperText = "",
  disabled = false,
  maxSelections = 10,
  allowCustom = true,
  showSuggestions = true,
  variant = "outlined",
  size = "medium",
  fullWidth = true,
  className = "",
  style = {},
  onBlur = null,
  onFocus = null,
  onAddService = null,
  onRemoveService = null,
  fetchServicesFromApi = false,
  apiEndpoint = '/api/v1/services',
  readOnly = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customError, setCustomError] = useState(null);
  const [recentlyAdded, setRecentlyAdded] = useState(null);
  const [servicesList, setServicesList] = useState(propServices || DEFAULT_SERVICES);
  const [errorState, setErrorState] = useState(null);
  
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const anchorRef = useRef(null);
  
  // Debounce input value for filtering
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Fetch services from API if enabled
  useEffect(() => {
    if (fetchServicesFromApi && apiEndpoint) {
      const fetchServices = async () => {
        setLoading(true);
        try {
          const response = await api.get(apiEndpoint);
          const data = response.data?.data || response.data;
          const services = Array.isArray(data) ? data : data?.services || DEFAULT_SERVICES;
          setServicesList(services);
        } catch (err) {
          console.error('Failed to fetch services:', err);
          setErrorState('Failed to load services. Using default list.');
          setServicesList(DEFAULT_SERVICES);
        } finally {
          setLoading(false);
        }
      };
      fetchServices();
    }
  }, [fetchServicesFromApi, apiEndpoint]);

  // Filter services based on input
  const filteredServices = useMemo(() => {
    if (!debouncedInputValue) return servicesList;
    
    const searchTerm = debouncedInputValue.toLowerCase();
    return servicesList.filter(service => 
      service.toLowerCase().includes(searchTerm) && 
      !value.includes(service)
    );
  }, [servicesList, value, debouncedInputValue]);

  // Check if input matches any existing service
  const isExactMatch = useMemo(() => {
    return servicesList.some(s => s.toLowerCase() === inputValue.toLowerCase());
  }, [servicesList, inputValue]);

  // Check if max selections reached
  const isMaxReached = value.length >= maxSelections;

  // Handle adding a service
  const addService = useCallback((service) => {
    if (readOnly) return;
    
    if (value.includes(service)) {
      setCustomError(`${service} is already added`);
      setTimeout(() => setCustomError(null), 2000);
      return;
    }
    
    if (value.length >= maxSelections) {
      setCustomError(`Maximum ${maxSelections} services allowed`);
      setTimeout(() => setCustomError(null), 2000);
      return;
    }
    
    const newValue = [...value, service];
    onChange(newValue);
    setInputValue('');
    setIsOpen(false);
    setRecentlyAdded(service);
    setTimeout(() => setRecentlyAdded(null), 1500);
    
    if (onAddService) {
      onAddService(service);
    }
  }, [value, onChange, maxSelections, onAddService, readOnly]);

  // Handle removing a service
  const removeService = useCallback((serviceToRemove) => {
    if (readOnly) return;
    
    const newValue = value.filter(s => s !== serviceToRemove);
    onChange(newValue);
    
    if (onRemoveService) {
      onRemoveService(serviceToRemove);
    }
  }, [value, onChange, onRemoveService, readOnly]);

  // Handle adding custom service
  const addCustomService = useCallback(() => {
    if (!allowCustom || readOnly) return;
    
    const trimmedValue = inputValue.trim();
    if (!trimmedValue) return;
    
    if (value.includes(trimmedValue)) {
      setCustomError(`${trimmedValue} is already added`);
      setTimeout(() => setCustomError(null), 2000);
      return;
    }
    
    if (value.length >= maxSelections) {
      setCustomError(`Maximum ${maxSelections} services allowed`);
      setTimeout(() => setCustomError(null), 2000);
      return;
    }
    
    addService(trimmedValue);
  }, [inputValue, value, addService, maxSelections, allowCustom, readOnly]);

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputValue.trim() && !readOnly) {
      e.preventDefault();
      if (isExactMatch) {
        addService(inputValue.trim());
      } else if (allowCustom) {
        addCustomService();
      }
    }
    
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
    
    if (e.key === 'ArrowDown' && isOpen) {
      e.preventDefault();
      // Focus first suggestion item
      const firstItem = document.querySelector('[data-suggestion-item]');
      if (firstItem) firstItem.focus();
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setCustomError(null);
  };

  // Handle input focus
  const handleFocus = (e) => {
    if (!readOnly) {
      setIsOpen(true);
      if (onFocus) onFocus(e);
    }
  };

  // Handle input blur
  const handleBlur = (e) => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 200);
    if (onBlur) onBlur(e);
  };

  // Clear all selections
  const clearAll = () => {
    if (readOnly) return;
    onChange([]);
    setInputValue('');
  };

  // Click outside handler
  const handleClickAway = () => {
    setIsOpen(false);
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: '#f1f5f9',
          border: 'none',
          '&:hover': {
            backgroundColor: '#e2e8f0'
          },
          '&:focus-within': {
            backgroundColor: '#e8edf5'
          }
        };
      case 'standard':
        return {
          border: 'none',
          borderBottom: '1px solid #e2e8f0',
          borderRadius: 0,
          padding: '8px 0',
          '&:focus-within': {
            borderBottomColor: '#6366f1'
          }
        };
      default:
        return {};
    }
  };

  // Get size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          minHeight: '40px',
          padding: '4px 8px',
          '& .MuiChip-root': {
            height: '28px',
            fontSize: '12px'
          }
        };
      default:
        return {
          minHeight: '56px',
          padding: '8px 12px'
        };
    }
  };

  // Get error styles
  const getErrorStyles = () => {
    if (error) {
      return {
        borderColor: '#ef4444',
        '&:focus-within': {
          borderColor: '#ef4444',
          boxShadow: '0 0 0 2px rgba(239,68,68,0.2)'
        }
      };
    }
    return {};
  };

  // Get disabled styles
  const getDisabledStyles = () => {
    if (disabled || readOnly) {
      return {
        backgroundColor: '#f8fafc',
        cursor: 'not-allowed',
        '&:hover': { borderColor: '#e2e8f0' }
      };
    }
    return {};
  };

  if (readOnly) {
    return (
      <Box sx={{ ...styles.container, ...style }} className={className}>
        {label && (
          <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
            {label}
            {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
          </FormLabel>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
          {value.length > 0 ? (
            value.map((service) => (
              <Chip
                key={service}
                label={service}
                size="small"
                variant="outlined"
                sx={styles.chip}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              No services selected
            </Typography>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={containerRef} sx={{ ...styles.container, ...style }} className={className}>
        {label && (
          <FormLabel 
            component="legend" 
            sx={{ 
              mb: 1, 
              fontWeight: 500,
              display: 'block',
              color: error ? '#ef4444' : '#0f172a'
            }}
          >
            {label}
            {required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
          </FormLabel>
        )}
        
        <Box
          ref={anchorRef}
          sx={{
            ...styles.chipContainer,
            ...getVariantStyles(),
            ...getSizeStyles(),
            ...getErrorStyles(),
            ...getDisabledStyles()
          }}
          onClick={() => !disabled && !readOnly && inputRef.current?.focus()}
        >
          <AnimatePresence>
            {value.map((service, index) => (
              <motion.div
                key={service}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
              >
                <Chip
                  label={service}
                  onDelete={() => removeService(service)}
                  deleteIcon={<CloseIcon />}
                  sx={{
                    ...styles.chip,
                    ...(recentlyAdded === service && {
                      backgroundColor: '#10b981',
                      color: '#fff',
                      '& .MuiChip-deleteIcon': { color: '#fff' }
                    })
                  }}
                  color="primary"
                  variant="outlined"
                />
              </motion.div>
            ))}
          </AnimatePresence>
          
          {!disabled && !readOnly && !isMaxReached && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onKeyPress={handleKeyPress}
              onKeyDown={handleKeyPress}
              placeholder={value.length === 0 ? placeholder : ""}
              disabled={disabled || readOnly}
              style={styles.input}
              autoComplete="off"
            />
          )}
          
          {!disabled && !readOnly && value.length > 0 && (
            <Tooltip title="Clear all">
              <IconButton size="small" onClick={clearAll} sx={{ ml: 'auto' }}>
                <ClearIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {helperText && !error && (
          <FormHelperText sx={{ mt: 0.5, color: '#64748b' }}>
            {helperText}
          </FormHelperText>
        )}
        
        {error && (
          <FormHelperText sx={{ mt: 0.5, color: '#ef4444' }}>
            {helperText || 'Please select valid service types'}
          </FormHelperText>
        )}
        
        {customError && (
          <FormHelperText sx={{ mt: 0.5, color: '#ef4444' }}>
            {customError}
          </FormHelperText>
        )}
        
        {errorState && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1, py: 0 }}>
            {errorState}
          </Alert>
        )}
        
        {isMaxReached && (
          <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1, py: 0 }}>
            Maximum {maxSelections} services reached
          </Alert>
        )}
        
        <Popper
          open={isOpen && showSuggestions && !disabled && !readOnly && !isMaxReached}
          anchorEl={anchorRef.current}
          placement="bottom-start"
          transition
          style={{ width: anchorRef.current?.clientWidth, zIndex: 1300 }}
          modifiers={[
            {
              name: 'flip',
              enabled: true,
              options: {
                altBoundary: true,
                rootBoundary: 'viewport',
                padding: 8
              }
            },
            {
              name: 'preventOverflow',
              enabled: true,
              options: {
                altAxis: true,
                boundary: 'viewport'
              }
            }
          ]}
        >
          {({ TransitionProps }) => (
            <Grow {...TransitionProps} timeout={200}>
              <Paper
                elevation={4}
                sx={{
                  mt: 1,
                  maxHeight: 300,
                  overflow: 'auto',
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {loading ? (
                  <Box sx={styles.loadingContainer}>
                    <CircularProgress size={24} />
                  </Box>
                ) : filteredServices.length === 0 ? (
                  <Box sx={styles.noResults}>
                    {inputValue.trim() ? (
                      allowCustom ? (
                        <MenuItem onClick={addCustomService} data-suggestion-item>
                          <AddIcon fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="body2">
                            Add "{inputValue.trim()}"
                          </Typography>
                        </MenuItem>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No matching services found
                        </Typography>
                      )
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Type to search services
                      </Typography>
                    )}
                  </Box>
                ) : (
                  filteredServices.map((service) => (
                    <MenuItem
                      key={service}
                      onClick={() => addService(service)}
                      sx={styles.suggestionItem}
                      data-suggestion-item
                    >
                      <Typography variant="body2">{service}</Typography>
                      <AddIcon fontSize="small" color="primary" />
                    </MenuItem>
                  ))
                )}
              </Paper>
            </Grow>
          )}
        </Popper>
        
        {/* Selected count indicator */}
        {value.length > 0 && !readOnly && (
          <Typography variant="caption" sx={{ mt: 1, color: '#64748b', display: 'block' }}>
            {value.length} of {maxSelections} selected
          </Typography>
        )}
      </Box>
    </ClickAwayListener>
  );
};

// ==========================================================
// HELPER COMPONENTS
// ==========================================================
export const ServiceTypeChipsSmall = (props) => (
  <ServiceTypeChips {...props} size="small" variant="outlined" />
);

export const ServiceTypeChipsFilled = (props) => (
  <ServiceTypeChips {...props} variant="filled" />
);

export const ServiceTypeChipsStandard = (props) => (
  <ServiceTypeChips {...props} variant="standard" />
);

export const ServiceTypeChipsReadOnly = (props) => (
  <ServiceTypeChips {...props} readOnly={true} />
);

export default ServiceTypeChips;