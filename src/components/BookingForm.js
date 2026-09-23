// src/components/BookingForm.js
// ================================================================
// 🚀 PRODUCTION-GRADE BOOKING FORM - v9.1 ENTERPRISE
// ================================================================
// ALL ERRORS FIXED:
// ✅ ESLint import order - All imports at top
// ✅ Removed unused imports - FaUsers, FaExclamationTriangle
// ✅ WebSocket removed - Using REST API with polling
// ✅ All useEffect dependencies fixed
// ✅ Production-ready with enterprise patterns
// ================================================================

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  useReducer,
  lazy,
  Suspense,
  memo
} from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { toast } from "react-hot-toast";

// API & Services
import api from "../api/api";

// UI Components - Leaflet
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet Marker Icons - MUST BE BEFORE OTHER IMPORTS
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Icons - Only what's used
import {
  FaMapMarkerAlt,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
  FaUserTie,
  FaTools,
  FaRupeeSign,
  FaInfoCircle,
  FaCreditCard,
  FaShieldAlt,
  FaArrowLeft,
  FaWhatsapp,
  FaStar,
  FaRegClock,
  FaMapPin,
  FaHome,
  FaSearch,
  FaCopy,
  FaCheck,
  FaWifi,
  FaSortUp,
  FaSortDown
} from "react-icons/fa";
import { MdWifiOff } from "react-icons/md";

// Lazy loaded components
const PaymentModal = lazy(() => import(
  /* webpackChunkName: "payment-modal" */
  "./payment/PaymentModal"
));

// Fix Leaflet default icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// ================================================================
// CONSTANTS & CONFIGURATION
// ================================================================

const AREA_COORDS = {
  "Kothrud": [18.5074, 73.8077],
  "Wakad": [18.5987, 73.7607],
  "Hinjewadi": [18.5913, 73.7389],
  "Koregaon Park": [18.5362, 73.8933],
  "Baner": [18.5590, 73.7787],
  "Aundh": [18.5580, 73.8075],
  "Pimpri": [18.6298, 73.7997],
  "Viman Nagar": [18.5679, 73.9144],
  "Hadapsar": [18.5073, 73.9246],
  "Magarpatta": [18.5112, 73.9274]
};

const DEFAULT_CENTER = [18.5204, 73.8567];
const BOOKING_FEE = 50;
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;
const MAX_RETRY_DELAY_MS = 10000;
const REQUEST_TIMEOUT_MS = 30000;
const MIN_BOOKING_HOURS = 2;
const MAX_BOOKING_DAYS = 30;
const MAX_PROVIDER_DISPLAY = 50;
const POLLING_INTERVAL = 30000; // 30 seconds

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

const formatCurrency = (amount) => {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `₹${amount || 0}`;
  }
};

const formatDate = (dateString) => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

const calculatePriceRange = (serviceType) => {
  if (!serviceType || typeof serviceType !== 'string') return null;
  const type = serviceType.toLowerCase();

  const ranges = [
    { keywords: ['switch', 'minor', 'repair', 'fuse', 'tap', 'leak', 'plug', 'socket'], 
      range: '₹250 - ₹500', note: 'Minor repair work' },
    { keywords: ['install', 'fan', 'light', 'geyser', 'heater', 'ac', 'fridge', 'washing'], 
      range: '₹500 - ₹1,500', note: 'Standard installation/repair' },
    { keywords: ['wiring', 'complex', 'board', 'mcb', 'pipe', 'plumbing', 'electrical'], 
      range: 'Starts at ₹1,500+', note: 'Complex work' }
  ];

  const match = ranges.find(r => r.keywords.some(k => type.includes(k)));
  return match || { range: '₹350 - ₹1,500', note: 'Price depends on actual work' };
};

const validateBookingForm = (formData) => {
  const errors = {};

  if (!formData.area) errors.area = 'Please select a service area';
  if (!formData.providerId) errors.providerId = 'Please select a professional';
  if (!formData.serviceType || formData.serviceType.trim().length < 2) {
    errors.serviceType = 'Please enter a valid service type (minimum 2 characters)';
  }
  if (!formData.address || formData.address.trim().length < 10) {
    errors.address = 'Please enter a complete address (minimum 10 characters)';
  }
  if (!formData.scheduledAt) {
    errors.scheduledAt = 'Please select a date and time';
  } else {
    const selectedDate = new Date(formData.scheduledAt);
    const now = new Date();
    const minDate = new Date(now.getTime() + MIN_BOOKING_HOURS * 60 * 60 * 1000);
    const maxDate = new Date(now.getTime() + MAX_BOOKING_DAYS * 24 * 60 * 60 * 1000);

    if (isNaN(selectedDate.getTime())) {
      errors.scheduledAt = 'Please select a valid date and time';
    } else if (selectedDate <= now) {
      errors.scheduledAt = 'Please select a future date and time';
    } else if (selectedDate < minDate) {
      errors.scheduledAt = `Please book at least ${MIN_BOOKING_HOURS} hours in advance`;
    } else if (selectedDate > maxDate) {
      errors.scheduledAt = `Cannot book more than ${MAX_BOOKING_DAYS} days in advance`;
    }
  }
  if (!formData.latitude || !formData.longitude) {
    errors.location = 'Please pin your location on the map';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
};

// ================================================================
// LOAD RAZORPAY SCRIPT
// ================================================================

let razorpayLoadPromise = null;
let razorpayLoaded = false;

const loadRazorpayScript = (retries = MAX_RETRY_ATTEMPTS) => {
  if (razorpayLoaded && window.Razorpay) return Promise.resolve(true);
  if (razorpayLoadPromise) return razorpayLoadPromise;

  razorpayLoadPromise = new Promise((resolve) => {
    if (window.Razorpay) {
      razorpayLoaded = true;
      resolve(true);
      return;
    }

    let attempt = 0;
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = attempt === 0
        ? 'https://checkout.razorpay.com/v1/checkout.js'
        : 'https://cdn.razorpay.com/static/checkout/v1/checkout.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        console.log('✅ Razorpay SDK loaded');
        razorpayLoaded = true;
        resolve(true);
      };

      script.onerror = () => {
        attempt++;
        if (attempt < retries) {
          console.warn(`⚠️ Razorpay load attempt ${attempt} failed, retrying...`);
          setTimeout(loadScript, 1000 * attempt);
        } else {
          console.error('❌ Failed to load Razorpay SDK');
          resolve(false);
        }
      };

      document.body.appendChild(script);
    };

    loadScript();
  });

  return razorpayLoadPromise;
};

// ================================================================
// MAP COMPONENTS
// ================================================================

const RecenterMap = memo(({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.flyTo(center, 15, { animate: true, duration: 1 });
    }
  }, [center, map]);
  return null;
});

RecenterMap.propTypes = { center: PropTypes.arrayOf(PropTypes.number) };
RecenterMap.displayName = 'RecenterMap';

const MapEvents = memo(({ onClick }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
});

MapEvents.propTypes = { onClick: PropTypes.func.isRequired };
MapEvents.displayName = 'MapEvents';

// ================================================================
// SUB-COMPONENTS
// ================================================================

const RefundPolicyModal = memo(({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.modalTitle}>📋 Refund Policy</h3>
        <div style={styles.policySection}>
          <div style={styles.policyItem}>
            <FaCheckCircle style={{ color: '#10b981', fontSize: 20, flexShrink: 0 }} />
            <div>
              <strong>Full Refund (₹{BOOKING_FEE})</strong>
              <ul style={styles.policyList}>
                <li>You cancel before provider accepts the job</li>
                <li>Provider cancels for any reason</li>
              </ul>
            </div>
          </div>
          <div style={{ ...styles.policyItem, borderColor: '#fed7aa' }}>
            <FaExclamationCircle style={{ color: '#f97316', fontSize: 20, flexShrink: 0 }} />
            <div>
              <strong>No Refund</strong>
              <ul style={styles.policyList}>
                <li>You cancel after provider starts traveling</li>
              </ul>
            </div>
          </div>
        </div>
        <div style={styles.policyNote}>
          <FaInfoCircle style={{ flexShrink: 0 }} />
          <span>₹{BOOKING_FEE} booking fee is fully adjustable in your final bill.</span>
        </div>
        <button onClick={onClose} style={styles.modalButton}>Got it</button>
      </div>
    </div>
  );
});

RefundPolicyModal.propTypes = { isOpen: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired };
RefundPolicyModal.displayName = 'RefundPolicyModal';

const SuccessModal = memo(({ open, booking, onClose }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  if (!open || !booking) return null;

  const shareOnWhatsApp = () => {
    const message = [
      'Booking Confirmed! 🎉',
      '',
      `Booking ID: ${booking.bookingId}`,
      `Provider: ${booking.providerName}`,
      `Service: ${booking.serviceType}`,
      `Date: ${formatDate(booking.scheduledAt)}`,
      `Amount: ${formatCurrency(BOOKING_FEE)} paid`,
      '',
      `Track: ${window.location.origin}/bookings/${booking.bookingId}`
    ].join('%0A');
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const copyBookingId = async () => {
    try {
      await navigator.clipboard.writeText(booking.bookingId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <div style={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div style={styles.successIconWrapper}>
          <FaCheckCircle style={{ color: "#10b981", fontSize: 56 }} />
        </div>
        <h2 style={styles.modalTitle}>Booking Confirmed! 🎉</h2>
        <p style={styles.modalSubtitle}>{formatCurrency(BOOKING_FEE)} booking fee adjusted in final bill</p>

        <div style={styles.modalDetails}>
          <div style={styles.detailRow}>
            <strong>Booking ID:</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#4f46e5', fontWeight: 800 }}>{booking.bookingId}</span>
              <button onClick={copyBookingId} style={styles.copyBtn}>
                {copied ? <FaCheck size={12} /> : <FaCopy size={12} />}
              </button>
            </div>
          </div>
          <div style={styles.detailRow}><strong>Provider:</strong><span>{booking.providerName}</span></div>
          <div style={styles.detailRow}><strong>Service:</strong><span>{booking.serviceType}</span></div>
          <div style={styles.detailRow}><strong>Est. Price:</strong><span>{booking.estimatedPriceRange || "To be confirmed"}</span></div>
          <div style={styles.detailRow}><strong>Scheduled:</strong><span>{formatDate(booking.scheduledAt)}</span></div>
          {booking.paymentId && (
            <div style={styles.detailRow}><strong>Payment ID:</strong><span style={{ fontSize: 11 }}>{booking.paymentId}</span></div>
          )}
        </div>

        <div style={styles.modalActions}>
          <button onClick={shareOnWhatsApp} style={styles.shareBtn}><FaWhatsapp /> Share</button>
          <button onClick={onClose} style={styles.closeBtnSecondary}>New Booking</button>
          <button onClick={() => navigate(`/bookings/${booking.bookingId}`)} style={styles.viewBookingsBtn}>Track Booking</button>
        </div>
      </div>
    </div>
  );
});

SuccessModal.propTypes = {
  open: PropTypes.bool.isRequired,
  booking: PropTypes.object,
  onClose: PropTypes.func.isRequired
};
SuccessModal.displayName = 'SuccessModal';

const ProviderCard = memo(({ provider, isSelected, onSelect, isOnline }) => {
  const rating = provider.rating || 0;
  const ratingDisplay = rating > 0 ? rating.toFixed(1) : 'New';
  const name = provider.fullName || provider.name || 'Professional';
  const serviceType = provider.serviceType || 'General Service';
  const charge = provider.basePrice || 0;
  const experience = provider.experience || 0;
  const isVerified = provider.verified || false;
  const reviewsCount = provider.reviewsCount || 0;

  const isAvailable = provider.available !== false;
  const isSelectable = isAvailable;

  return (
    <div
      style={{
        ...styles.providerCard,
        ...(isSelected ? styles.providerCardSelected : {}),
        ...(!isSelectable ? styles.providerCardUnavailable : {})
      }}
      onClick={() => { if (isSelectable) onSelect(provider.id); }}
      role="button"
      tabIndex={isSelectable ? 0 : -1}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && isSelectable) {
          e.preventDefault();
          onSelect(provider.id);
        }
      }}
    >
      <div style={styles.providerAvatar}>
        <FaUserTie size={24} />
        {isSelectable && isOnline && <div style={styles.onlineIndicator} />}
        {isVerified && <FaCheckCircle style={styles.verifiedBadge} />}
      </div>
      <div style={styles.providerInfo}>
        <div style={styles.providerName}>
          {name}
          {isSelected && <FaCheckCircle style={{ color: '#10b981', fontSize: 14 }} />}
          {isVerified && <FaCheckCircle style={{ color: '#3b82f6', fontSize: 12 }} />}
        </div>
        <div style={styles.providerRating}>
          <FaStar style={{ color: '#fbbf24' }} />
          <span>{ratingDisplay}</span>
          <span style={{ color: '#94a3b8', fontSize: 11 }}>({reviewsCount} reviews)</span>
          <span style={styles.providerExperience}>{experience > 0 ? `${experience}+ yrs` : 'Experienced'}</span>
          {isSelectable && isOnline && <span style={styles.onlineStatus}>● Online</span>}
          {!isSelectable && <span style={styles.offlineStatus}>● Unavailable</span>}
        </div>
        <div style={styles.providerServiceType}><FaTools size={10} /> {serviceType}</div>
        <div style={styles.providerCharge}>Starting from {formatCurrency(charge)}</div>
        <div style={styles.providerArea}><FaMapPin size={10} /> {provider.area || 'Service Area'}</div>
      </div>
      <div style={styles.providerSelectIndicator}>
        {isSelected ? (
          <FaCheckCircle style={{ color: '#6366f1', fontSize: 20 }} />
        ) : (
          <div style={styles.selectCircle} />
        )}
      </div>
    </div>
  );
});

ProviderCard.propTypes = {
  provider: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  isOnline: PropTypes.bool
};
ProviderCard.defaultProps = { isOnline: false };
ProviderCard.displayName = 'ProviderCard';

const ConnectionStatus = memo(({ isOffline }) => {
  if (isOffline) {
    return <div style={styles.connectionStatusOffline}><MdWifiOff /> Offline</div>;
  }
  return (
    <div style={styles.connectionStatusOnline}>
      <FaWifi /> Online
    </div>
  );
});

ConnectionStatus.propTypes = { isOffline: PropTypes.bool.isRequired };
ConnectionStatus.displayName = 'ConnectionStatus';

const PriceEstimator = memo(({ serviceType }) => {
  const [estimatedRange, setEstimatedRange] = useState(null);

  useEffect(() => {
    if (serviceType && typeof serviceType === 'string') {
      setEstimatedRange(calculatePriceRange(serviceType));
    } else {
      setEstimatedRange(null);
    }
  }, [serviceType]);

  if (!estimatedRange) return null;

  return (
    <div style={styles.estimateBox}>
      <div style={styles.estimateRow}>
        <FaRupeeSign style={{ color: '#059669' }} />
        <span style={styles.estimateText}>Estimated Price: <strong>{estimatedRange.range}</strong></span>
        <span style={styles.estimateNote}>{estimatedRange.note}</span>
      </div>
      <div style={styles.estimateInfo}>
        <FaInfoCircle size={12} />
        Final price confirmed by professional on site.
      </div>
    </div>
  );
});

PriceEstimator.propTypes = { serviceType: PropTypes.string };
PriceEstimator.displayName = 'PriceEstimator';

const FeeInfoBanner = memo(({ onShowRefundPolicy }) => (
  <div style={styles.feeBanner}>
    <div style={styles.feeBannerRow}>
      <FaShieldAlt style={{ color: '#3b82f6', fontSize: 20 }} />
      <div>
        <span style={{ fontWeight: 700 }}>{formatCurrency(BOOKING_FEE)} Booking Fee</span>
        <span style={{ marginLeft: 8, color: '#4b5563' }}>(Adjustable in final bill)</span>
      </div>
      <button onClick={onShowRefundPolicy} style={styles.refundPolicyBtn}>Refund Policy</button>
    </div>
    <div style={styles.feeBannerNote}>✅ Pay {formatCurrency(BOOKING_FEE)} now. We'll deduct it from final bill.</div>
  </div>
));

FeeInfoBanner.propTypes = { onShowRefundPolicy: PropTypes.func.isRequired };
FeeInfoBanner.displayName = 'FeeInfoBanner';

// ================================================================
// REDUCER
// ================================================================

const initialState = {
  form: {
    area: "",
    providerId: "",
    serviceType: "",
    address: "",
    scheduledAt: "",
    latitude: null,
    longitude: null
  },
  providers: [],
  filteredProviders: [],
  loading: false,
  error: null,
  success: null,
  bookingInfo: null,
  paymentLoading: false,
  status: {
    providers: false,
    geo: false,
    payment: false,
    submitting: false
  },
  onlineProviders: new Set(),
  retryCount: 0
};

const bookingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_FORM': return { ...state, form: { ...state.form, ...action.payload } };
    case 'SET_PROVIDERS': return { ...state, providers: action.payload, filteredProviders: action.payload };
    case 'SET_FILTERED_PROVIDERS': return { ...state, filteredProviders: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'SET_SUCCESS': return { ...state, success: action.payload };
    case 'SET_BOOKING_INFO': return { ...state, bookingInfo: action.payload };
    case 'SET_STATUS': return { ...state, status: { ...state.status, ...action.payload } };
    case 'SET_ONLINE_PROVIDERS': return { ...state, onlineProviders: action.payload };
    case 'SET_PAYMENT_LOADING': return { ...state, paymentLoading: action.payload };
    case 'SET_RETRY_COUNT': return { ...state, retryCount: action.payload };
    case 'RESET': return { ...initialState, form: { ...initialState.form } };
    default: return state;
  }
};

// ================================================================
// MAIN COMPONENT
// ================================================================

const BookingForm = () => {
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(bookingReducer, initialState);
  const [searchTerm, setSearchTerm] = useState("");
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [showRefundPolicy, setShowRefundPolicy] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [user, setUser] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [sortBy, setSortBy] = useState('rating');
  const [sortOrder, setSortOrder] = useState('desc');
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingBookingId, setPendingBookingId] = useState(null);
  const [bookingPayload, setBookingPayload] = useState(null);

  const providersCache = useRef(new Map());
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const paymentRetryTimeoutRef = useRef(null);
  const razorpayRef = useRef(null);
  const areaTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);

  // ================================================================
  // FETCH PROVIDERS
  // ================================================================

  const fetchProvidersByArea = useCallback(async (area, serviceType = '') => {
    if (!area || typeof area !== 'string') {
      dispatch({ type: 'SET_PROVIDERS', payload: [] });
      return;
    }

    if (AREA_COORDS[area]) {
      setMapCenter(AREA_COORDS[area]);
    }

    setLoadingProviders(true);
    dispatch({ type: 'SET_STATUS', payload: { providers: true } });
    dispatch({ type: 'SET_ERROR', payload: null });

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      let url = `/api/v1/providers/area/${encodeURIComponent(area)}`;
      if (serviceType && serviceType.trim()) {
        url += `?serviceType=${encodeURIComponent(serviceType.trim())}`;
      }

      console.log(`📍 Fetching providers from: ${url}`);

      const response = await api.get(url, {
        signal: abortControllerRef.current.signal,
        timeout: REQUEST_TIMEOUT_MS
      });

      if (!isMountedRef.current) return;

      let providersList = [];
      if (response.data?.data) {
        providersList = response.data.data;
      } else if (response.data) {
        providersList = response.data;
      }
      if (providersList?.content) {
        providersList = providersList.content;
      }
      providersList = Array.isArray(providersList) ? providersList : [];

      const filteredProviders = providersList.filter(p => {
        const isAvailable = p.available !== false;
        const isApproved = p.status === 'APPROVED' || p.status === 'approved' || !p.status;
        return isAvailable && isApproved;
      });

      console.log(`✅ Found ${filteredProviders.length} providers in ${area}`);

      const cacheKey = `${area}_${serviceType}`;
      providersCache.current.set(cacheKey, { data: filteredProviders, timestamp: Date.now() });

      dispatch({ type: 'SET_PROVIDERS', payload: filteredProviders });

      if (filteredProviders.length === 0) {
        dispatch({
          type: 'SET_ERROR',
          payload: `No professionals available in ${area}${serviceType ? ` for ${serviceType}` : ''}`
        });
      }

    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.error("❌ Error loading providers:", err);

      if (isMountedRef.current) {
        dispatch({ type: 'SET_PROVIDERS', payload: [] });
        let errorMsg = `Unable to load providers in ${area}. Please try again.`;
        if (err.response?.data?.message) errorMsg = err.response.data.message;
        else if (err.code === 'ECONNABORTED') errorMsg = 'Request timed out. Please check your connection.';
        else if (err.message) errorMsg = err.message;
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingProviders(false);
        dispatch({ type: 'SET_STATUS', payload: { providers: false } });
      }
    }
  }, []);

  // ================================================================
  // POLLING FOR PROVIDER STATUS (Replaces WebSocket)
  // ================================================================

  const pollProviderStatus = useCallback(async () => {
    if (!state.form.area) return;

    try {
      const response = await api.get('/api/v1/providers/status', {
        timeout: 10000,
        params: { area: state.form.area }
      });

      if (!isMountedRef.current) return;

      const onlineIds = new Set();
      const providers = response.data?.data || response.data || [];
      
      if (Array.isArray(providers)) {
        providers.forEach(p => {
          if (p.isOnline || p.status === 'ONLINE') {
            onlineIds.add(String(p.id));
          }
        });
      }

      dispatch({ type: 'SET_ONLINE_PROVIDERS', payload: onlineIds });

    } catch (error) {
      // Silent fail for polling - don't show errors to user
      console.debug('Provider status poll failed:', error.message);
    }
  }, [state.form.area]);

  // ================================================================
  // EFFECTS
  // ================================================================

  // Mount/Unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) abortControllerRef.current.abort();
      if (paymentRetryTimeoutRef.current) clearTimeout(paymentRetryTimeoutRef.current);
      if (razorpayRef.current) { try { razorpayRef.current.close(); } catch (e) {} }
      if (areaTimeoutRef.current) clearTimeout(areaTimeoutRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  // Online/Offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Back online! Refreshing providers...");
      if (state.form.area) {
        fetchProvidersByArea(state.form.area, state.form.serviceType);
      }
    };
    const handleOffline = () => {
      setIsOffline(true);
      toast.error("You are offline. Please check your connection.");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [state.form.area, state.form.serviceType, fetchProvidersByArea]);

  // Load user
  useEffect(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }, []);

  // Load Razorpay
  useEffect(() => {
    loadRazorpayScript().then(loaded => {
      if (isMountedRef.current) setRazorpayLoaded(loaded);
    });
  }, []);

  // Handle area change - Debounced fetch
  useEffect(() => {
    if (areaTimeoutRef.current) clearTimeout(areaTimeoutRef.current);
    
    if (state.form.area) {
      areaTimeoutRef.current = setTimeout(() => {
        fetchProvidersByArea(state.form.area, state.form.serviceType);
      }, 500);
    } else {
      dispatch({ type: 'SET_PROVIDERS', payload: [] });
    }
    
    return () => { if (areaTimeoutRef.current) clearTimeout(areaTimeoutRef.current); };
  }, [state.form.area, state.form.serviceType, fetchProvidersByArea]);

  // Start polling when area is selected
  useEffect(() => {
    if (state.form.area && !isOffline) {
      pollProviderStatus();
      
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = setInterval(pollProviderStatus, POLLING_INTERVAL);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [state.form.area, isOffline, pollProviderStatus]);

  // Handle location updates
  const handleLocationUpdate = useCallback((lat, lng) => {
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      dispatch({ type: 'SET_FORM', payload: { latitude: lat, longitude: lng } });
    }
  }, []);

  // Detect user location
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      dispatch({ type: 'SET_ERROR', payload: "Geolocation not supported by your browser" });
      return;
    }

    dispatch({ type: 'SET_STATUS', payload: { geo: true } });

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (isMountedRef.current) {
          const { latitude, longitude } = pos.coords;
          handleLocationUpdate(latitude, longitude);
          setMapCenter([latitude, longitude]);
          dispatch({ type: 'SET_STATUS', payload: { geo: false } });
          dispatch({ type: 'SET_ERROR', payload: null });
          toast.success("Location detected successfully!");
        }
      },
      (err) => {
        if (isMountedRef.current) {
          console.error('Geolocation error:', err);
          dispatch({
            type: 'SET_ERROR',
            payload: err.code === 1 ? "GPS Access Denied. Please pick location on map." : "Unable to detect location."
          });
          dispatch({ type: 'SET_STATUS', payload: { geo: false } });
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [handleLocationUpdate]);

  // Filter and sort providers
  useEffect(() => {
    let filtered = [...state.providers];
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => {
        const name = (p.fullName || p.name || '').toLowerCase();
        const service = (p.serviceType || '').toLowerCase();
        return name.includes(term) || service.includes(term);
      });
    }

    filtered.sort((a, b) => {
      let valueA, valueB;
      switch (sortBy) {
        case 'rating': valueA = a.rating || 0; valueB = b.rating || 0; break;
        case 'price': valueA = a.basePrice || 0; valueB = b.basePrice || 0; break;
        default: valueA = a.rating || 0; valueB = b.rating || 0;
      }
      return sortOrder === 'desc' ? valueB - valueA : valueA - valueB;
    });

    if (filtered.length > MAX_PROVIDER_DISPLAY) {
      filtered = filtered.slice(0, MAX_PROVIDER_DISPLAY);
    }

    dispatch({ type: 'SET_FILTERED_PROVIDERS', payload: filtered });
  }, [searchTerm, state.providers, sortBy, sortOrder]);

  // ================================================================
  // PAYMENT FUNCTIONS
  // ================================================================

  const createBooking = useCallback(async (payload) => {
    try {
      console.log('📝 Creating booking...');
      const response = await api.post("/api/v1/bookings", payload, {
        timeout: REQUEST_TIMEOUT_MS
      });
      console.log("✅ Booking created:", response.data);
      return response.data?.data || response.data;
    } catch (err) {
      console.error("❌ Failed to create booking:", err);
      let errorMessage = "Failed to create booking";
      if (err.response?.data?.message) errorMessage = err.response.data.message;
      else if (err.message) errorMessage = err.message;
      throw new Error(errorMessage);
    }
  }, []);

  const verifyPayment = useCallback(async (paymentResponse, bookingId) => {
    try {
      dispatch({ type: 'SET_STATUS', payload: { loading: true } });

      const verificationData = {
        razorpayPaymentId: paymentResponse.razorpay_payment_id,
        razorpayOrderId: paymentResponse.razorpay_order_id,
        razorpaySignature: paymentResponse.razorpay_signature,
        bookingId: bookingId
      };

      console.log("🔐 Verifying payment:", verificationData);

      const verifyRes = await api.post("/api/v1/payments/verify", verificationData, {
        timeout: REQUEST_TIMEOUT_MS
      });

      console.log("✅ Verification response:", verifyRes.data);

      const isVerified = verifyRes.data?.status === "SUCCESS" ||
        verifyRes.data?.verified === true ||
        verifyRes.data?.success === true;

      if (isVerified) {
        const bookingRes = await api.get(`/api/v1/bookings/${bookingId}`, {
          timeout: REQUEST_TIMEOUT_MS
        });

        const bookingData = bookingRes.data?.data || bookingRes.data;

        let selectedProv = state.providers.find(p => Number(p.id) === Number(state.form.providerId));
        const priceRange = calculatePriceRange(state.form.serviceType);

        const bookingInfo = {
          ...bookingData,
          bookingId: bookingData.bookingId || bookingData.id || bookingId,
          providerName: selectedProv?.fullName || selectedProv?.name || "Professional",
          serviceType: state.form.serviceType,
          scheduledAt: state.form.scheduledAt,
          paymentId: paymentResponse.razorpay_payment_id,
          estimatedPriceRange: priceRange?.range || "To be confirmed"
        };

        dispatch({ type: 'SET_BOOKING_INFO', payload: bookingInfo });
        dispatch({ type: 'SET_SUCCESS', payload: "Booking confirmed! ₹50 fee adjusted in final bill." });

        dispatch({
          type: 'SET_FORM',
          payload: { area: "", providerId: "", serviceType: "", address: "", scheduledAt: "", latitude: null, longitude: null }
        });
        setSearchTerm("");
        setShowPaymentModal(false);

        return true;
      } else {
        throw new Error(verifyRes.data?.message || "Payment verification failed");
      }

    } catch (err) {
      console.error("❌ Verification failed:", err);

      if (state.retryCount < MAX_RETRY_ATTEMPTS) {
        const delay = Math.min(RETRY_DELAY_MS * Math.pow(2, state.retryCount), MAX_RETRY_DELAY_MS);
        console.log(`⏳ Retrying verification in ${delay}ms (attempt ${state.retryCount + 1})`);

        paymentRetryTimeoutRef.current = setTimeout(() => {
          dispatch({ type: 'SET_RETRY_COUNT', payload: state.retryCount + 1 });
          verifyPayment(paymentResponse, bookingId);
        }, delay);

        return false;
      } else {
        const errorMsg = err.message || "Payment verification failed after multiple attempts";
        dispatch({ type: 'SET_ERROR', payload: errorMsg });
        toast.error(errorMsg);
        setShowPaymentModal(false);
        return false;
      }
    } finally {
      if (isMountedRef.current) {
        dispatch({ type: 'SET_STATUS', payload: { loading: false, payment: false } });
        dispatch({ type: 'SET_PAYMENT_LOADING', payload: false });
      }
    }
  }, [state.form, state.providers, state.retryCount]);

  const initiatePayment = useCallback(async (bookingId, payload) => {
    try {
      dispatch({ type: 'SET_STATUS', payload: { payment: true } });
      dispatch({ type: 'SET_PAYMENT_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });

      let currentUser = user;
      if (!currentUser) {
        try {
          const userData = localStorage.getItem('user');
          if (userData) currentUser = JSON.parse(userData);
        } catch (error) {
          console.error('Error loading user:', error);
        }
      }

      if (!currentUser) {
        throw new Error('Please login to continue with payment');
      }

      const paymentRequest = {
        bookingId: bookingId,
        amount: BOOKING_FEE,
        currency: "INR",
        customerId: currentUser.id || currentUser.userId,
        customerName: currentUser.fullName || currentUser.name || "Customer",
        customerEmail: currentUser.email || "",
        customerPhone: currentUser.mobile || currentUser.phone || "",
        description: `Booking Fee for ${state.form.serviceType || 'Service'}`,
        metadata: {
          bookingId: bookingId,
          area: state.form.area,
          providerId: state.form.providerId,
          serviceType: state.form.serviceType,
          scheduledAt: state.form.scheduledAt
        }
      };

      console.log("💰 Initiating payment...");

      const response = await api.post("/api/v1/payments/initiate", paymentRequest, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });

      console.log("✅ Payment order response:", response.data);

      if (!response.data) throw new Error('Empty response from payment service');

      const order = response.data;
      const orderId = order.razorpayOrderId || order.orderId || order.id;
      const amount = order.amount || order.amount;
      const currency = order.currency || 'INR';
      const key = order.key || order.razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_SPP4ufDhAiF2wQ';

      if (!orderId) throw new Error('Invalid payment order response: Missing order ID');

      if (typeof window.Razorpay === 'undefined') {
        const loaded = await loadRazorpayScript();
        if (!loaded) throw new Error('Razorpay SDK not loaded. Please refresh the page.');
      }

      const options = {
        key: key,
        amount: amount,
        currency: currency,
        name: "Quickks",
        description: `Booking Fee - ${state.form.serviceType || 'Service'}`,
        order_id: orderId,
        prefill: {
          name: currentUser.fullName || currentUser.name || "Customer",
          email: currentUser.email || "",
          contact: currentUser.mobile || currentUser.phone || ""
        },
        notes: {
          bookingId: bookingId,
          area: state.form.area || '',
          providerId: state.form.providerId || '',
          serviceType: state.form.serviceType || ''
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: () => {
            dispatch({ type: 'SET_STATUS', payload: { payment: false } });
            dispatch({ type: 'SET_PAYMENT_LOADING', payload: false });
            setShowPaymentModal(false);
            dispatch({ type: 'SET_ERROR', payload: "Payment cancelled. Please try again." });
            toast.error("Payment cancelled");
          }
        },
        handler: async (paymentResponse) => {
          console.log("✅ Payment successful:", paymentResponse);
          const verified = await verifyPayment(paymentResponse, bookingId);
          if (!verified) {
            dispatch({ type: 'SET_ERROR', payload: "Payment verification failed. Please contact support." });
            toast.error("Payment verification failed");
          } else {
            toast.success("Payment confirmed! Booking created.");
          }
        }
      };

      razorpayRef.current = new window.Razorpay(options);

      razorpayRef.current.on('payment.failed', function (response) {
        console.error('Payment failed:', response.error);
        dispatch({ type: 'SET_STATUS', payload: { payment: false } });
        dispatch({ type: 'SET_PAYMENT_LOADING', payload: false });
        setShowPaymentModal(false);
        dispatch({ type: 'SET_ERROR', payload: response.error?.description || "Payment failed. Please try again." });
        toast.error(response.error?.description || "Payment failed");
      });

      razorpayRef.current.open();
      return true;

    } catch (err) {
      console.error("❌ Payment initiation failed:", err);
      dispatch({ type: 'SET_STATUS', payload: { payment: false } });
      dispatch({ type: 'SET_PAYMENT_LOADING', payload: false });
      setShowPaymentModal(false);

      let errorMessage = "Payment failed. Please try again.";
      if (err.response) {
        const status = err.response.status;
        const data = err.response.data;
        if (status === 400) {
          errorMessage = data?.message || data?.error || "Invalid payment request.";
        } else if (status === 401) {
          errorMessage = "Please login to continue with payment.";
        } else if (status === 403) {
          errorMessage = "You are not authorized to make this payment.";
        } else if (status >= 500) {
          errorMessage = "Server error. Please try again later.";
        }
      } else if (err.request) {
        errorMessage = "No response from payment server. Please check your connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(errorMessage);
      throw new Error(errorMessage);
    }
  }, [state.form, user, verifyPayment]);

  // ================================================================
  // FORM HANDLING
  // ================================================================

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (state.status.submitting || state.status.payment) return;

    const validation = validateBookingForm(state.form);
    if (!validation.isValid) {
      const firstError = Object.values(validation.errors)[0];
      dispatch({ type: 'SET_ERROR', payload: firstError });
      toast.error(firstError);
      const firstField = Object.keys(validation.errors)[0];
      const element = document.querySelector(`[name="${firstField}"]`);
      if (element) { element.focus(); element.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }

    if (isOffline) {
      const errorMsg = "You are offline. Please check your connection.";
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      return;
    }

    if (!razorpayLoaded) {
      const errorMsg = "Payment system is initializing. Please wait a moment.";
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      return;
    }

    let currentUser = user;
    if (!currentUser) {
      try {
        const userData = localStorage.getItem('user');
        if (userData) currentUser = JSON.parse(userData);
      } catch (error) { console.error('Error loading user:', error); }
    }

    if (!currentUser) {
      const errorMsg = "Please login to continue with booking.";
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      navigate('/login');
      return;
    }

    if (!state.form.providerId) {
      const errorMsg = "Please select a professional.";
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
      return;
    }

    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_STATUS', payload: { submitting: true, loading: true } });

    try {
      let selectedProv = state.providers.find(p => Number(p.id) === Number(state.form.providerId));
      if (!selectedProv) {
        const cached = providersCache.current.get(state.form.providerId);
        if (cached?.data?.[0]) selectedProv = cached.data[0];
      }
      if (!selectedProv) throw new Error("Selected provider not available");

      const selectedDate = new Date(state.form.scheduledAt);
      if (isNaN(selectedDate.getTime())) throw new Error("Invalid date selected");

      const payload = {
        providerId: Number(state.form.providerId),
        serviceType: state.form.serviceType.trim(),
        address: state.form.address.trim(),
        area: state.form.area,
        scheduledAt: selectedDate.toISOString(),
        latitude: parseFloat(state.form.latitude),
        longitude: parseFloat(state.form.longitude),
        serviceCharge: selectedProv.serviceCharge || selectedProv.basePrice || 0,
        description: `Booking for ${state.form.serviceType.trim()} in ${state.form.area}`
      };

      console.log("📝 Creating booking...", payload);

      const booking = await createBooking(payload);
      console.log("✅ Booking created:", booking);

      const bookingId = booking.bookingId || booking.id;
      if (!bookingId) throw new Error("No booking ID received from server");

      setPendingBookingId(bookingId);
      setBookingPayload(payload);
      setShowPaymentModal(true);

    } catch (err) {
      console.error("❌ Error:", err);
      const errorMsg = err.message || "Failed to create booking";
      dispatch({ type: 'SET_ERROR', payload: errorMsg });
      toast.error(errorMsg);
    } finally {
      if (isMountedRef.current) {
        dispatch({ type: 'SET_STATUS', payload: { submitting: false, loading: false } });
      }
    }
  }, [state.form, state.providers, state.status.submitting, state.status.payment,
      createBooking, razorpayLoaded, isOffline, user, navigate]);

  const handlePaymentConfirm = useCallback(async () => {
    if (pendingBookingId && bookingPayload) {
      await initiatePayment(pendingBookingId, bookingPayload);
    }
  }, [pendingBookingId, bookingPayload, initiatePayment]);

  // ================================================================
  // MEMOIZED VALUES
  // ================================================================

  const isFormValid = useMemo(() => {
    const validation = validateBookingForm(state.form);
    return validation.isValid && razorpayLoaded && !isOffline && state.form.providerId;
  }, [state.form, razorpayLoaded, isOffline]);

  const areaOptions = useMemo(() => Object.keys(AREA_COORDS), []);
  const selectedProvider = useMemo(() => {
    return state.providers.find(p => String(p.id) === String(state.form.providerId));
  }, [state.providers, state.form.providerId]);

  // ================================================================
  // RENDER
  // ================================================================

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton} type="button">
          <FaArrowLeft />
        </button>
        <h2 style={styles.title}>Book a Professional</h2>
        <ConnectionStatus isOffline={isOffline} />
      </div>

      {/* Offline Banner */}
      {isOffline && (
        <div style={styles.offlineBanner} role="alert">
          <FaExclamationCircle style={{ color: '#f59e0b' }} />
          <span>You are offline. Please check your connection.</span>
        </div>
      )}

      {/* Error/Success Banners */}
      {state.error && (
        <div style={styles.errorBanner} role="alert">
          <FaExclamationCircle style={{ color: '#ef4444' }} />
          <span>{state.error}</span>
          <button onClick={() => dispatch({ type: 'SET_ERROR', payload: null })} style={styles.errorClose}>×</button>
        </div>
      )}

      {state.success && (
        <div style={styles.successBanner} role="alert">
          <FaCheckCircle style={{ color: '#10b981' }} />
          <span>{state.success}</span>
          <button onClick={() => dispatch({ type: 'SET_SUCCESS', payload: null })} style={styles.errorClose}>×</button>
        </div>
      )}

      {/* Modals */}
      <RefundPolicyModal isOpen={showRefundPolicy} onClose={() => setShowRefundPolicy(false)} />

      <SuccessModal
        open={!!state.bookingInfo}
        booking={state.bookingInfo}
        onClose={() => {
          dispatch({ type: 'SET_BOOKING_INFO', payload: null });
          setTimeout(() => navigate('/bookings'), 300);
        }}
      />

      <Suspense fallback={<div style={styles.modalLoading}>Loading payment...</div>}>
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setPendingBookingId(null);
            setBookingPayload(null);
            dispatch({ type: 'SET_PAYMENT_LOADING', payload: false });
          }}
          onConfirm={handlePaymentConfirm}
          amount={BOOKING_FEE}
          isLoading={state.paymentLoading || state.status.payment}
          serviceType={state.form.serviceType}
          providerName={selectedProvider?.fullName || selectedProvider?.name || ''}
          area={state.form.area}
        />
      </Suspense>

      {/* Main Form */}
      <div style={styles.scrollContainer}>
        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          <FeeInfoBanner onShowRefundPolicy={() => setShowRefundPolicy(true)} />
          <PriceEstimator serviceType={state.form.serviceType} />

          {/* Area and Service Type */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="area"><FaMapPin /> Service Area *</label>
              <select
                id="area"
                name="area"
                value={state.form.area}
                onChange={(e) => {
                  const selectedArea = e.target.value;
                  dispatch({ type: 'SET_FORM', payload: { area: selectedArea, providerId: "" } });
                  dispatch({ type: 'SET_PROVIDERS', payload: [] });
                  dispatch({ type: 'SET_ERROR', payload: null });
                }}
                style={styles.input}
                required
              >
                <option value="">Select Area</option>
                {areaOptions.map((a) => (
                  <option key={`area-${a}`} value={a}>{a}</option>
                ))}
              </select>
              {state.form.area && (
                <div style={styles.areaInfo}><FaInfoCircle size={12} /> Showing professionals in {state.form.area}</div>
              )}
            </div>

            <div style={styles.field}>
              <label style={styles.label} htmlFor="serviceType"><FaTools /> Service Type *</label>
              <div style={styles.iconInputWrapper}>
                <FaTools style={styles.innerIcon} />
                <input
                  id="serviceType"
                  name="serviceType"
                  value={state.form.serviceType}
                  onChange={(e) => {
                    const value = e.target.value;
                    dispatch({ type: 'SET_FORM', payload: { serviceType: value, providerId: "" } });
                    dispatch({ type: 'SET_PROVIDERS', payload: [] });
                  }}
                  style={styles.inputWithIcon}
                  placeholder="e.g., Fan Repair, Wiring"
                  required
                  minLength={2}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div style={styles.field}>
            <label style={styles.label} htmlFor="address"><FaHome /> Full Address *</label>
            <textarea
              id="address"
              name="address"
              rows="2"
              value={state.form.address}
              onChange={(e) => dispatch({ type: 'SET_FORM', payload: { address: e.target.value } })}
              style={styles.textarea}
              placeholder="House No, Building Name, Landmark..."
              required
              minLength={10}
            />
          </div>

          {/* Date/Time and Provider Selection */}
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label} htmlFor="scheduledAt"><FaRegClock /> Date & Time *</label>
              <input
                id="scheduledAt"
                name="scheduledAt"
                type="datetime-local"
                value={state.form.scheduledAt}
                onChange={(e) => dispatch({ type: 'SET_FORM', payload: { scheduledAt: e.target.value } })}
                min={new Date(Date.now() + MIN_BOOKING_HOURS * 60 * 60 * 1000).toISOString().slice(0, 16)}
                max={new Date(Date.now() + MAX_BOOKING_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)}
                style={styles.input}
                required
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}><FaUserTie /> Select Professional *</label>
              {loadingProviders || state.status.providers ? (
                <div style={styles.loaderBox}>
                  <FaSpinner className="spin" /> Loading experts...
                </div>
              ) : (
                <div style={styles.providersList}>
                  {state.providers.length > 0 && (
                    <div style={styles.filterBar}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <FaSearch style={styles.searchIcon} />
                        <input
                          placeholder="Search providers..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          style={styles.searchInput}
                        />
                      </div>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={styles.filterSelect}>
                        <option value="rating">Rating</option>
                        <option value="price">Price</option>
                      </select>
                      <button onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')} style={styles.sortBtn}>
                        {sortOrder === 'desc' ? <FaSortDown /> : <FaSortUp />}
                      </button>
                    </div>
                  )}

                  {state.filteredProviders.length === 0 ? (
                    <div style={styles.noProviders}>
                      {state.form.area ? (
                        <>
                          <p>No experts available in {state.form.area}</p>
                          {state.form.serviceType && <p style={{ fontSize: 12, color: '#94a3b8' }}>for {state.form.serviceType}</p>}
                        </>
                      ) : (
                        <p>Select an area first to see professionals</p>
                      )}
                    </div>
                  ) : (
                    state.filteredProviders.map(provider => (
                      <ProviderCard
                        key={provider.id}
                        provider={provider}
                        isSelected={state.form.providerId === String(provider.id)}
                        onSelect={(id) => {
                          dispatch({ type: 'SET_FORM', payload: { providerId: id } });
                          toast.success(`Selected ${provider.fullName || provider.name}`);
                        }}
                        isOnline={state.onlineProviders.has(String(provider.id))}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Map */}
          <div style={styles.field}>
            <div style={styles.mapLabelRow}>
              <label style={styles.label}><FaMapMarkerAlt /> Pin Your Location {state.form.latitude ? '📍' : '*'}</label>
              <button type="button" onClick={detectLocation} disabled={state.status.geo} style={styles.locBtn}>
                {state.status.geo ? <FaSpinner className="spin" /> : <FaMapMarkerAlt />} Use My Location
              </button>
            </div>
            <div style={styles.mapWrapper}>
              <MapContainer center={mapCenter} zoom={14} style={styles.map} scrollWheelZoom={false}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEvents onClick={handleLocationUpdate} />
                <RecenterMap center={mapCenter} />
                {state.form.latitude && state.form.longitude && (
                  <Marker position={[state.form.latitude, state.form.longitude]} />
                )}
              </MapContainer>
            </div>
            {state.form.latitude && state.form.longitude && (
              <div style={styles.coordsInfo}>Location pinned ✓</div>
            )}
          </div>

          {/* Payment Summary */}
          {isFormValid && selectedProvider && (
            <div style={styles.paymentSummary}>
              <div style={styles.paymentRow}>
                <span>Booking Fee (adjustable):</span>
                <span style={styles.paymentAmount}>{formatCurrency(BOOKING_FEE)}</span>
              </div>
              <div style={styles.paymentNote}>
                <FaCreditCard /> Pay {formatCurrency(BOOKING_FEE)} now. We'll deduct it from final bill.
              </div>
              <div style={styles.selectedProviderInfo}>
                <FaUserTie /> Selected: {selectedProvider.fullName || selectedProvider.name}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={state.status.submitting || state.status.payment || !isFormValid}
            style={{
              ...styles.submitBtn,
              opacity: (state.status.submitting || state.status.payment || !isFormValid) ? 0.7 : 1
            }}
          >
            {state.status.submitting || state.status.payment ? (
              <><FaSpinner className="spin" /> {state.status.payment ? "Processing Payment..." : "Creating Booking..."}</>
            ) : (
              <><FaCreditCard /> Pay {formatCurrency(BOOKING_FEE)} & Confirm</>
            )}
          </button>

          <div style={styles.termsText}>
            By confirming, you agree to our refund policy. {formatCurrency(BOOKING_FEE)} booking fee adjusted in final bill.
          </div>
        </form>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .leaflet-container { height: 200px !important; }
          .row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

BookingForm.displayName = 'BookingForm';
BookingForm.propTypes = {};

// ================================================================
// STYLES
// ================================================================

const styles = {
  page: {
    maxWidth: 900,
    margin: "20px auto",
    background: "#fff",
    padding: 24,
    borderRadius: 24,
    boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
    height: "90vh",
    maxHeight: "calc(100vh - 40px)"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexShrink: 0
  },
  backButton: {
    background: '#f1f5f9',
    border: 'none',
    width: 36,
    height: 36,
    borderRadius: 10,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16
  },
  title: {
    fontSize: 20,
    fontWeight: 800,
    margin: 0,
    color: '#0f172a'
  },
  scrollContainer: {
    overflowY: "auto",
    flex: 1,
    paddingRight: 4
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 16
  },
  row: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    color: '#334155'
  },
  input: {
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 14,
    background: '#f8fafc',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box'
  },
  textarea: {
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "11px 14px",
    fontSize: 14,
    minHeight: 70,
    background: '#f8fafc',
    outline: 'none',
    resize: 'vertical',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  },
  iconInputWrapper: {
    position: 'relative',
    width: '100%'
  },
  innerIcon: {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af'
  },
  inputWithIcon: {
    width: '100%',
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "11px 14px 11px 42px",
    fontSize: 14,
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box'
  },
  mapWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    border: '2px solid #e2e8f0',
    height: 260,
    position: 'relative',
    background: '#f1f5f9'
  },
  map: {
    width: "100%",
    height: "100%"
  },
  mapLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  locBtn: {
    background: "#ecfdf5",
    color: "#059669",
    padding: "6px 10px",
    border: "1px solid #10b981",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  submitBtn: {
    background: "linear-gradient(135deg, #6366f1, #a855f7)",
    color: "#fff",
    padding: 14,
    borderRadius: 14,
    border: "none",
    fontWeight: 800,
    fontSize: 15,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    flexShrink: 0,
    cursor: 'pointer'
  },
  loaderBox: {
    padding: 12,
    background: '#f3f4f6',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 13,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    color: '#64748b'
  },
  providersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 300,
    overflowY: 'auto',
    padding: 2
  },
  filterBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 4
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
    fontSize: 14
  },
  searchInput: {
    width: '100%',
    padding: '9px 12px 9px 32px',
    border: '2px solid #e2e8f0',
    borderRadius: 10,
    fontSize: 13,
    background: '#f8fafc',
    outline: 'none',
    boxSizing: 'border-box'
  },
  filterSelect: {
    padding: '9px 12px',
    borderRadius: 10,
    border: '2px solid #e2e8f0',
    fontSize: 12,
    background: '#fff',
    cursor: 'pointer'
  },
  sortBtn: {
    padding: '9px 12px',
    borderRadius: 10,
    border: '2px solid #e2e8f0',
    background: '#fff',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  noProviders: {
    padding: 20,
    textAlign: 'center',
    color: '#94a3b8',
    background: '#f8fafc',
    borderRadius: 12,
    fontSize: 13
  },
  providerCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    border: '2px solid #e2e8f0',
    borderRadius: 12,
    cursor: 'pointer',
    background: '#fff',
    transition: 'all 0.2s'
  },
  providerCardSelected: {
    borderColor: '#6366f1',
    background: '#eef2ff'
  },
  providerCardUnavailable: {
    opacity: 0.6,
    cursor: 'not-allowed',
    background: '#f3f4f6'
  },
  providerAvatar: {
    width: 42,
    height: 42,
    borderRadius: '50%',
    background: '#eef2ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: '#10b981',
    border: '2px solid #fff'
  },
  verifiedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    color: '#3b82f6',
    fontSize: 14,
    background: '#fff',
    borderRadius: '50%'
  },
  onlineStatus: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 6
  },
  offlineStatus: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: 700,
    marginLeft: 6
  },
  providerInfo: {
    flex: 1,
    minWidth: 0
  },
  providerName: {
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    color: '#0f172a'
  },
  providerRating: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11,
    color: '#64748b'
  },
  providerExperience: {
    marginLeft: 8,
    color: '#94a3b8'
  },
  providerServiceType: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: 600
  },
  providerCharge: {
    fontSize: 12,
    fontWeight: 800,
    color: '#059669'
  },
  providerArea: {
    fontSize: 10,
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  providerSelectIndicator: {
    flexShrink: 0,
    marginLeft: 'auto'
  },
  selectCircle: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: '2px solid #d1d5db'
  },
  areaInfo: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  coordsInfo: {
    marginTop: 8,
    fontSize: 12,
    color: '#10b981',
    textAlign: 'center'
  },
  offlineBanner: {
    background: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    color: '#92400e',
    fontSize: 13
  },
  errorBanner: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    color: '#991b1b',
    fontSize: 13
  },
  successBanner: {
    background: '#ecfdf5',
    border: '1px solid #bbf7d0',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    color: '#065f46',
    fontSize: 13
  },
  errorClose: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    fontSize: 18,
    cursor: 'pointer',
    color: 'inherit'
  },
  connectionStatusOnline: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#10b981',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    background: '#ecfdf5'
  },
  connectionStatusOffline: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 11,
    color: '#ef4444',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: 20,
    background: '#fee2e2'
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 20
  },
  modalBox: {
    background: "#fff",
    padding: 28,
    borderRadius: 20,
    maxWidth: 420,
    width: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 700,
    marginBottom: 16,
    textAlign: 'center',
    color: '#0f172a'
  },
  modalSubtitle: {
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 20
  },
  modalLoading: {
    padding: 40,
    textAlign: 'center',
    color: '#6b7280'
  },
  policySection: {
    marginBottom: 16
  },
  policyItem: {
    display: 'flex',
    gap: 12,
    padding: 12,
    background: '#f0f9ff',
    borderRadius: 12,
    border: '1px solid #bae6fd',
    marginBottom: 12
  },
  policyList: {
    margin: '6px 0 0 18px',
    fontSize: 13,
    color: '#374151'
  },
  policyNote: {
    background: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    fontSize: 13,
    color: '#4b5563',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20
  },
  modalButton: {
    width: '100%',
    padding: '12px',
    background: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14
  },
  modalDetails: {
    textAlign: "left",
    background: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    margin: '14px 0'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
    fontSize: 13,
    gap: 12
  },
  copyBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: 4,
    borderRadius: 4
  },
  successIconWrapper: {
    background: '#f0fdf4',
    width: 80,
    height: 80,
    borderRadius: 40,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 20px'
  },
  modalActions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: 20
  },
  shareBtn: {
    background: "#25D366",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  closeBtnSecondary: {
    background: "#f1f5f9",
    color: "#475569",
    padding: "10px 20px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 600
  },
  viewBookingsBtn: {
    background: "#10b981",
    color: "#fff",
    padding: "10px 24px",
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontWeight: 600
  },
  feeBanner: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 12,
    padding: "10px 14px",
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  },
  feeBannerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap'
  },
  refundPolicyBtn: {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: '#3b82f6',
    textDecoration: 'underline',
    cursor: 'pointer',
    fontSize: 12
  },
  feeBannerNote: {
    fontSize: 12,
    color: '#1e40af'
  },
  estimateBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 12,
    padding: "10px 14px"
  },
  estimateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  estimateText: {
    fontSize: 13,
    color: "#166534",
    fontWeight: 500
  },
  estimateNote: {
    fontSize: 11,
    color: "#6b7280",
    marginLeft: 'auto'
  },
  estimateInfo: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 6,
    display: 'flex',
    alignItems: 'center',
    gap: 4
  },
  paymentSummary: {
    background: "#f8fafc",
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "14px 16px"
  },
  paymentRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontWeight: 500,
    fontSize: 15
  },
  paymentAmount: {
    fontSize: 18,
    fontWeight: 800,
    color: "#059669"
  },
  paymentNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 8,
    display: "flex",
    alignItems: "center",
    borderTop: "1px dashed #cbd5e1",
    paddingTop: 8,
    gap: 6
  },
  selectedProviderInfo: {
    fontSize: 13,
    color: '#059669',
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: 8
  },
  termsText: {
    fontSize: 11,
    color: "#94a3b8",
    textAlign: "center"
  }
};

export default BookingForm;