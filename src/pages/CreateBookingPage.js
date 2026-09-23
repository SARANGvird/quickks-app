import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";

// Constants
const AREA_LIST = [
  "Kothrud",
  "Wakad", 
  "Hinjewadi",
  "Baner",
  "Aundh",
  "Pimpri",
  "Koregaon Park",
];

const BOOKING_FEE = 50;

// Initial form state
const INITIAL_FORM_STATE = {
  area: "",
  providerId: "",
  serviceType: "",
  address: "",
  scheduledAt: "",
  latitude: "",
  longitude: "",
};

const CreateBookingPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [providersLoading, setProvidersLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isRazorpayLoaded, setIsRazorpayLoaded] = useState(false);

  // Check if Razorpay is loaded
  useEffect(() => {
    const checkRazorpay = () => {
      if (window.Razorpay) {
        setIsRazorpayLoaded(true);
      } else {
        // Load Razorpay script if not available
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.async = true;
        script.onload = () => setIsRazorpayLoaded(true);
        script.onerror = () => {
          setError("Payment service is currently unavailable. Please try again later.");
        };
        document.body.appendChild(script);
      }
    };
    checkRazorpay();
  }, []);

  // Handle form input changes
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user starts typing
    if (error) setError("");
  }, [error]);

  // Load providers based on selected area
  useEffect(() => {
    const loadProviders = async () => {
      if (!form.area) {
        setProviders([]);
        return;
      }

      try {
        setProvidersLoading(true);
        setError("");

        const res = await api.get(
          `/providers/area/${encodeURIComponent(form.area)}`
        );

        // Filter only available providers and ensure data structure
        const availableProviders = (res.data?.data || res.data || [])
          .filter((p) => p.available === true)
          .map(p => ({
            id: p.id || p._id,
            fullName: p.fullName || p.name || "Unnamed Provider",
            rating: p.rating || p.averageRating || "New",
            available: p.available,
            serviceTypes: p.serviceTypes || p.services || []
          }));

        setProviders(availableProviders);
        
        // Reset provider selection if current provider not available
        if (form.providerId && !availableProviders.find(p => p.id.toString() === form.providerId.toString())) {
          setForm(prev => ({ ...prev, providerId: "" }));
        }
      } catch (err) {
        console.error("Error loading providers:", err);
        setError(
          err.response?.data?.message || 
          "No professionals available in this area."
        );
        setProviders([]);
      } finally {
        setProvidersLoading(false);
      }
    };

    loadProviders();
  }, [form.area]);

  // Validate form fields
  const validateForm = useCallback(() => {
    const errors = [];

    if (!form.area) {
      errors.push("Please select an area.");
    }

    if (!form.providerId) {
      errors.push("Please select a provider.");
    }

    if (!form.serviceType || form.serviceType.trim().length < 2) {
      errors.push("Please enter a valid service type (minimum 2 characters).");
    }

    if (!form.address || form.address.trim().length < 10) {
      errors.push("Please enter a complete address (minimum 10 characters).");
    }

    if (!form.scheduledAt) {
      errors.push("Please select a date and time.");
    } else {
      const selectedDate = new Date(form.scheduledAt);
      const now = new Date();
      
      if (selectedDate <= now) {
        errors.push("Please select a future booking date/time.");
      }

      // Check if date is too far in future (max 1 year)
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 1);
      if (selectedDate > maxDate) {
        errors.push("Booking date cannot be more than 1 year in advance.");
      }
    }

    // Validate coordinates if provided
    if (form.latitude) {
      const lat = parseFloat(form.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        errors.push("Invalid latitude value.");
      }
    }

    if (form.longitude) {
      const lng = parseFloat(form.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        errors.push("Invalid longitude value.");
      }
    }

    return errors;
  }, [form]);

  // Submit handler with payment
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent double submission
    if (loading) return;
    
    // Clear previous messages
    setError("");
    setSuccess("");

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      // Scroll to error
      const errorElement = document.querySelector('[role="alert"]');
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Check if Razorpay is loaded
    if (!isRazorpayLoaded) {
      setError("Payment system is initializing. Please try again in a moment.");
      return;
    }

    try {
      setLoading(true);

      // STEP 1: Create Razorpay Order
      const orderRes = await api.post(
        "/api/v1/payments/create-booking-fee",
        { 
          amount: BOOKING_FEE,
          currency: "INR",
          receipt: `booking_${Date.now()}`
        }
      );

      const { orderId, key, amount, currency } = orderRes.data;

      if (!orderId || !key) {
        throw new Error("Invalid payment order response");
      }

      // STEP 2: Configure Razorpay options
      const options = {
        key: key,
        amount: amount,
        currency: currency || "INR",
        name: "Quickks",
        description: `Service Booking Fee - ${form.serviceType}`,
        order_id: orderId,
        image: "/logo.png", // Add your logo path
        prefill: {
          name: "", // Can be filled from user context
          email: "", // Can be filled from user context
          contact: "", // Can be filled from user context
        },
        notes: {
          area: form.area,
          serviceType: form.serviceType,
          scheduledAt: form.scheduledAt
        },
        handler: async function (response) {
          try {
            // Validate payment response
            if (!response.razorpay_payment_id || 
                !response.razorpay_order_id || 
                !response.razorpay_signature) {
              throw new Error("Invalid payment response");
            }

            const payload = {
              providerId: Number(form.providerId),
              serviceType: form.serviceType.trim(),
              address: form.address.trim(),
              area: form.area,
              scheduledAt: new Date(form.scheduledAt).toISOString(),
              latitude: form.latitude ? parseFloat(form.latitude) : null,
              longitude: form.longitude ? parseFloat(form.longitude) : null,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              bookingFee: BOOKING_FEE,
              status: "confirmed"
            };

            // STEP 3: Confirm booking
            const bookingRes = await api.post("/api/v1/bookings/confirm", payload);
            
            if (!bookingRes.data || !bookingRes.data.bookingId) {
              throw new Error("Booking confirmation failed");
            }

            setSuccess("✅ Booking created successfully!");
            
            // Store booking ID in session for success page
            sessionStorage.setItem('lastBookingId', bookingRes.data.bookingId);

            // Navigate to success page
            setTimeout(() => {
              navigate(`/booking-success/${bookingRes.data.bookingId}`);
            }, 1500);

          } catch (err) {
            console.error("Booking confirmation error:", err);
            setError(
              err.response?.data?.message || 
              "Payment successful but booking failed. Please contact support."
            );
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            setError("Payment cancelled. Please try again if you wish to proceed.");
          },
          escape: false, // Prevent closing with escape key during payment
        },
        theme: {
          color: "#16a34a",
        },
        timeout: 300, // Time in seconds before payment expires
      };

      // STEP 4: Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      
      // Handle payment failure
      rzp.on('payment.failed', function (response) {
        console.error("Payment failed:", response.error);
        setError(
          response.error?.description || 
          "Payment failed. Please try again."
        );
        setLoading(false);
      });

      rzp.open();

    } catch (err) {
      console.error("Payment initiation error:", err);
      setError(
        err.response?.data?.message || 
        "Unable to initiate payment. Please check your connection and try again."
      );
      setLoading(false);
    }
  };

  // Reset form
  const handleReset = useCallback(() => {
    setForm(INITIAL_FORM_STATE);
    setProviders([]);
    setError("");
    setSuccess("");
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h2 style={styles.title}>📌 Create New Booking</h2>

        <p style={styles.note}>
          ₹{BOOKING_FEE} booking fee will be adjusted in final bill.
        </p>

        <form onSubmit={handleSubmit} style={styles.form} noValidate>
          {/* Area Selection */}
          <div style={styles.fieldGroup}>
            <label htmlFor="area" style={styles.label}>
              Area *
            </label>
            <select
              id="area"
              name="area"
              value={form.area}
              onChange={handleChange}
              style={styles.input}
              required
              aria-required="true"
            >
              <option value="">Select Area</option>
              {AREA_LIST.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Provider Selection */}
          <div style={styles.fieldGroup}>
            <label htmlFor="providerId" style={styles.label}>
              Provider *
            </label>
            {providersLoading ? (
              <div style={styles.loadingIndicator}>
                <span style={styles.spinner}></span>
                <span>Loading providers...</span>
              </div>
            ) : (
              <select
                id="providerId"
                name="providerId"
                value={form.providerId}
                onChange={handleChange}
                style={styles.input}
                disabled={!form.area || providers.length === 0}
                required
                aria-required="true"
              >
                <option value="">
                  {!form.area
                    ? "Please select an area first"
                    : providers.length
                    ? "Select Provider"
                    : "No Providers Available"}
                </option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ⭐ {p.rating || "New"}
                  </option>
                ))}
              </select>
            )}
            {providers.length === 0 && form.area && !providersLoading && (
              <p style={styles.hint}>No providers available in this area</p>
            )}
          </div>

          {/* Service Type */}
          <div style={styles.fieldGroup}>
            <label htmlFor="serviceType" style={styles.label}>
              Service Type *
            </label>
            <input
              id="serviceType"
              type="text"
              name="serviceType"
              placeholder="e.g., Plumbing, Electrical, Cleaning"
              value={form.serviceType}
              onChange={handleChange}
              style={styles.input}
              required
              aria-required="true"
              minLength="2"
            />
          </div>

          {/* Address */}
          <div style={styles.fieldGroup}>
            <label htmlFor="address" style={styles.label}>
              Address *
            </label>
            <textarea
              id="address"
              name="address"
              placeholder="Full Address (House/Apartment, Street, Landmark)"
              value={form.address}
              onChange={handleChange}
              style={styles.textarea}
              required
              aria-required="true"
              minLength="10"
            />
          </div>

          {/* Scheduled Date/Time */}
          <div style={styles.fieldGroup}>
            <label htmlFor="scheduledAt" style={styles.label}>
              Scheduled Date & Time *
            </label>
            <input
              id="scheduledAt"
              type="datetime-local"
              name="scheduledAt"
              value={form.scheduledAt}
              onChange={handleChange}
              style={styles.input}
              required
              aria-required="true"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Coordinates (Optional) */}
          <div style={styles.coordinatesGroup}>
            <div style={styles.fieldGroup}>
              <label htmlFor="latitude" style={styles.label}>
                Latitude (Optional)
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                name="latitude"
                placeholder="18.5204"
                value={form.latitude}
                onChange={handleChange}
                style={styles.input}
                min="-90"
                max="90"
              />
            </div>
            <div style={styles.fieldGroup}>
              <label htmlFor="longitude" style={styles.label}>
                Longitude (Optional)
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                name="longitude"
                placeholder="73.8567"
                value={form.longitude}
                onChange={handleChange}
                style={styles.input}
                min="-180"
                max="180"
              />
            </div>
          </div>

          {/* Submit Buttons */}
          <div style={styles.buttonGroup}>
            <button 
              type="submit" 
              style={styles.btn} 
              disabled={loading || !isRazorpayLoaded}
            >
              {loading ? (
                <span style={styles.loadingText}>
                  <span style={styles.spinner}></span>
                  Processing Payment...
                </span>
              ) : (
                `Pay ₹${BOOKING_FEE} & Create Booking`
              )}
            </button>
            
            <button 
              type="button"
              onClick={handleReset}
              style={styles.resetBtn}
              disabled={loading}
            >
              Reset Form
            </button>
          </div>
        </form>

        {/* Error and Success Messages */}
        {error && (
          <div role="alert" style={styles.error}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}
        
        {success && (
          <div role="status" style={styles.success}>
            <span style={styles.successIcon}>✅</span>
            {success}
          </div>
        )}

        {/* Razorpay loading status */}
        {!isRazorpayLoaded && !error && (
          <div style={styles.info}>
            <span style={styles.spinner}></span>
            Loading payment system...
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateBookingPage;

// Styles
const styles = {
  page: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    padding: "20px",
    background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    padding: "30px",
    borderRadius: "16px",
    background: "#ffffff",
    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
    maxHeight: "90vh",
    overflowY: "auto",
  },
  title: {
    textAlign: "center",
    marginBottom: "8px",
    fontSize: "24px",
    fontWeight: 800,
    color: "#1a202c",
  },
  note: {
    textAlign: "center",
    fontSize: "14px",
    marginBottom: "24px",
    color: "#4a5568",
    background: "#f7fafc",
    padding: "8px 16px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  label: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#2d3748",
  },
  input: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    transition: "all 0.2s",
    backgroundColor: "#f7fafc",
    color: "#1a202c",
  },
  textarea: {
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    fontSize: "14px",
    minHeight: "80px",
    transition: "all 0.2s",
    backgroundColor: "#f7fafc",
    color: "#1a202c",
    resize: "vertical",
  },
  coordinatesGroup: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
  },
  btn: {
    padding: "14px",
    borderRadius: "8px",
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "all 0.3s",
    minHeight: "52px",
  },
  resetBtn: {
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#f7fafc",
    color: "#4a5568",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.3s",
  },
  error: {
    marginTop: "16px",
    padding: "12px",
    background: "#fff5f5",
    border: "1px solid #feb2b2",
    borderRadius: "8px",
    color: "#c53030",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  success: {
    marginTop: "16px",
    padding: "12px",
    background: "#f0fff4",
    border: "1px solid #9ae6b4",
    borderRadius: "8px",
    color: "#276749",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  info: {
    marginTop: "12px",
    padding: "10px",
    background: "#ebf8ff",
    border: "1px solid #90cdf4",
    borderRadius: "8px",
    color: "#2c5282",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "center",
  },
  hint: {
    fontSize: "12px",
    color: "#718096",
    marginTop: "4px",
  },
  loadingIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px",
    color: "#4a5568",
  },
  loadingText: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    justifyContent: "center",
  },
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #e2e8f0",
    borderTop: "2px solid #16a34a",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  },
  errorIcon: {
    fontSize: "18px",
  },
  successIcon: {
    fontSize: "18px",
  },
};

// Add global styles for animations
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);