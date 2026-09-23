// src/components/rating/RatingModal.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import api from "../../api/api";
import "./RatingModal.css";

/* ================= Constants ================= */
const RATING_LABELS = {
  1: "Poor",
  2: "Fair", 
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

const RATING_EMOJIS = {
  1: "😞",
  2: "😕",
  3: "😐",
  4: "🙂",
  5: "😍"
};

const RATING_COLORS = {
  1: "#ef4444",
  2: "#f59e0b",
  3: "#fbbf24",
  4: "#10b981",
  5: "#22c55e"
};

const MAX_COMMENT_LENGTH = 500;
const AUTO_SAVE_DELAY = 1000; // 1 second
const AUTO_CLOSE_DELAY = 3000; // 3 seconds

export default function RatingModal({ 
  booking, 
  onClose, 
  onSuccess,
  enableAutoSave = true,
  enableAnalytics = true,
  showEmojis = true,
  required = false,
  theme = "light"
}) {
  // State Management
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [characterCount, setCharacterCount] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Refs
  const autoSaveTimerRef = useRef(null);
  const modalRef = useRef(null);
  const textareaRef = useRef(null);

  /* ================= Memoized Values ================= */
  const isValidRating = useMemo(() => rating >= 1 && rating <= 5, [rating]);
  const isCommentValid = useMemo(() => comment.length <= MAX_COMMENT_LENGTH, [comment]);
  const canSubmit = useMemo(() => {
    if (required && rating === 0) return false;
    return isValidRating && isCommentValid;
  }, [required, rating, isValidRating, isCommentValid]);

  const providerName = useMemo(() => {
    return booking?.providerName || booking?.provider?.name || "this provider";
  }, [booking]);

  const providerId = useMemo(() => {
    return booking?.providerId || booking?.provider?.id || null;
  }, [booking]);

  const bookingId = useMemo(() => {
    return booking?.bookingId || booking?.id || null;
  }, [booking]);

  /* ================= Helper Functions ================= */
  const trackEvent = useCallback(async (eventName, eventData = {}) => {
    if (!enableAnalytics) return;
    
    try {
      const analyticsPayload = {
        event: eventName,
        timestamp: new Date().toISOString(),
        bookingId,
        providerId,
        rating,
        ...eventData
      };
      
      // Send to analytics (non-blocking)
      if (process.env.NODE_ENV === "production") {
        await api.post("/analytics/track", analyticsPayload).catch(console.warn);
      }
      
      console.log("[Analytics]", analyticsPayload);
    } catch (error) {
      console.warn("Analytics tracking failed:", error);
    }
  }, [enableAnalytics, bookingId, providerId, rating]);

  const saveToLocalStorage = useCallback(() => {
    if (!enableAutoSave) return;
    
    const draftData = {
      rating,
      comment,
      timestamp: new Date().toISOString(),
      bookingId
    };
    
    try {
      localStorage.setItem(`rating_draft_${bookingId}`, JSON.stringify(draftData));
      setAutoSaveStatus("Draft saved");
      setTimeout(() => setAutoSaveStatus(""), 2000);
    } catch (error) {
      console.warn("Auto-save failed:", error);
    }
  }, [enableAutoSave, rating, comment, bookingId]);

  const loadFromLocalStorage = useCallback(() => {
    if (!enableAutoSave) return;
    
    try {
      const savedDraft = localStorage.getItem(`rating_draft_${bookingId}`);
      if (savedDraft) {
        const draft = JSON.parse(savedDraft);
        // Only load if draft is from the same booking and less than 24 hours old
        const draftAge = Date.now() - new Date(draft.timestamp).getTime();
        if (draftAge < 24 * 60 * 60 * 1000) {
          setRating(draft.rating || 0);
          setComment(draft.comment || "");
          setCharacterCount(draft.comment?.length || 0);
          setHasUnsavedChanges(true);
        } else {
          // Clear old draft
          localStorage.removeItem(`rating_draft_${bookingId}`);
        }
      }
    } catch (error) {
      console.warn("Failed to load saved draft:", error);
    }
  }, [enableAutoSave, bookingId]);

  const clearLocalStorage = useCallback(() => {
    if (!enableAutoSave) return;
    try {
      localStorage.removeItem(`rating_draft_${bookingId}`);
    } catch (error) {
      console.warn("Failed to clear draft:", error);
    }
  }, [enableAutoSave, bookingId]);

  const handleSuccess = useCallback(() => {
    setSuccess(true);
    trackEvent("rating_submitted", { rating, commentLength: comment.length });
    
    // Clear auto-saved draft on success
    clearLocalStorage();
    
    // Call onSuccess callback
    if (onSuccess) {
      onSuccess({ rating, comment, bookingId, providerId });
    }
    
    // Auto close after delay
    setTimeout(() => {
      onClose();
    }, AUTO_CLOSE_DELAY);
  }, [onSuccess, onClose, rating, comment, bookingId, providerId, trackEvent, clearLocalStorage]);

  /* ================= API Calls ================= */
  const submitReview = useCallback(async () => {
    // Validation
    if (!isValidRating) {
      setError("Please select a valid rating (1–5).");
      trackEvent("validation_error", { error: "invalid_rating" });
      return;
    }

    if (!bookingId) {
      setError("Booking ID is missing. Cannot submit review.");
      trackEvent("validation_error", { error: "missing_booking_id" });
      return;
    }

    if (!providerId) {
      setError("Provider ID is missing. Cannot submit review.");
      trackEvent("validation_error", { error: "missing_provider_id" });
      return;
    }

    if (!isCommentValid) {
      setError(`Comment exceeds maximum length of ${MAX_COMMENT_LENGTH} characters.`);
      trackEvent("validation_error", { error: "comment_too_long" });
      return;
    }

    try {
      setLoading(true);
      setError("");
      trackEvent("submit_started");

      // Prepare request data
      const requestData = {
        bookingId,
        providerId,
        rating,
        comment: comment.trim(),
        timestamp: new Date().toISOString(),
        metadata: {
          userAgent: navigator.userAgent,
          platform: process.env.REACT_APP_PLATFORM || "web",
          version: process.env.REACT_APP_VERSION || "1.0.0"
        }
      };

      // Submit review
      const response = await api.post("/reviews", requestData);
      
      if (response.data.success || response.status === 200 || response.status === 201) {
        handleSuccess();
      } else {
        throw new Error(response.data.message || "Failed to submit review");
      }
      
    } catch (err) {
      console.error("Review submission error:", err);
      
      const errorMessage = 
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to submit review. Please try again.";
      
      setError(errorMessage);
      trackEvent("submit_failed", { error: errorMessage });
      
      // Retry logic for network errors
      if (err.message === "Network Error" && !err.response) {
        setTimeout(() => {
          setError("Network error. Please check your connection and try again.");
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  }, [isValidRating, bookingId, providerId, rating, comment, isCommentValid, trackEvent, handleSuccess]);

  /* ================= Event Handlers ================= */
  const handleRatingClick = useCallback((starRating) => {
    if (loading) return;
    setRating(starRating);
    setError("");
    setHasUnsavedChanges(true);
    trackEvent("rating_selected", { rating: starRating });
    
    // Focus on textarea after rating selection
    if (textareaRef.current) {
      setTimeout(() => textareaRef.current.focus(), 100);
    }
  }, [loading, trackEvent]);

  const handleRatingHover = useCallback((starRating) => {
    if (loading) return;
    setHover(starRating);
  }, [loading]);

  const handleCommentChange = useCallback((e) => {
    const newComment = e.target.value;
    if (newComment.length <= MAX_COMMENT_LENGTH) {
      setComment(newComment);
      setCharacterCount(newComment.length);
      setHasUnsavedChanges(true);
      setError("");
    }
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit && !loading) {
        submitReview();
      }
    }
    
    // Close on Escape
    if (e.key === "Escape" && !loading) {
      onClose();
    }
  }, [canSubmit, loading, submitReview, onClose]);

  const handleClose = useCallback(() => {
    if (loading) return;
    
    // Warn about unsaved changes
    if (hasUnsavedChanges && (rating > 0 || comment.trim())) {
      const confirmClose = window.confirm("You have unsaved changes. Are you sure you want to close?");
      if (!confirmClose) return;
    }
    
    onClose();
  }, [loading, hasUnsavedChanges, rating, comment, onClose]);

  /* ================= Auto-save Effect ================= */
  useEffect(() => {
    if (!enableAutoSave) return;
    
    if (hasUnsavedChanges && (rating > 0 || comment.trim())) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      
      autoSaveTimerRef.current = setTimeout(() => {
        saveToLocalStorage();
      }, AUTO_SAVE_DELAY);
    }
    
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [rating, comment, hasUnsavedChanges, enableAutoSave, saveToLocalStorage]);

  /* ================= Load Saved Draft ================= */
  useEffect(() => {
    if (bookingId) {
      loadFromLocalStorage();
    }
  }, [bookingId, loadFromLocalStorage]);

  /* ================= Keyboard Event Listener ================= */
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  /* ================= Prevent Background Scroll ================= */
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  /* ================= Focus Trap ================= */
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.focus();
    }
  }, []);

  /* ================= Safety Check ================= */
  if (!booking) return null;

  /* ================= Render Functions ================= */
  const renderStars = () => (
    <div className="stars" role="group" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={`star ${(hover || rating) >= star ? "active" : ""}`}
          onClick={() => handleRatingClick(star)}
          onMouseEnter={() => handleRatingHover(star)}
          onMouseLeave={() => handleRatingHover(0)}
          style={{
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "2.5rem",
            transition: "all 0.2s ease",
            transform: (hover || rating) >= star ? "scale(1.1)" : "scale(1)",
            color: (hover || rating) >= star ? RATING_COLORS[star] : "#cbd5e1"
          }}
          role="button"
          tabIndex={loading ? -1 : 0}
          aria-label={`${star} star${star !== 1 ? "s" : ""}`}
        >
          ★
        </span>
      ))}
    </div>
  );

  const renderRatingLabel = () => {
    const currentRating = hover || rating;
    if (currentRating === 0) return null;
    
    return (
      <div 
        className="rating-label"
        style={{ 
          color: RATING_COLORS[currentRating],
          fontWeight: "bold",
          fontSize: "1rem",
          marginTop: "8px",
          animation: "fadeIn 0.3s ease"
        }}
      >
        {RATING_LABELS[currentRating]}
        {showEmojis && ` ${RATING_EMOJIS[currentRating]}`}
      </div>
    );
  };

  const renderCommentSection = () => (
    <div className="comment-section">
      <textarea
        ref={textareaRef}
        placeholder="What did you like or what could be improved? (Optional)"
        value={comment}
        onChange={handleCommentChange}
        maxLength={MAX_COMMENT_LENGTH}
        disabled={loading}
        className="rating-textarea"
        aria-label="Review comment"
        rows={4}
      />
      <div className="char-count" style={{ textAlign: "right", fontSize: "0.75rem", marginTop: "4px" }}>
        <span style={{ color: characterCount === MAX_COMMENT_LENGTH ? "#ef4444" : "#6b7280" }}>
          {characterCount}/{MAX_COMMENT_LENGTH}
        </span>
        {autoSaveStatus && (
          <span style={{ marginLeft: "8px", color: "#10b981", fontSize: "0.7rem" }}>
            {autoSaveStatus}
          </span>
        )}
      </div>
    </div>
  );

  const renderError = () => {
    if (!error) return null;
    
    return (
      <div 
        className="error-text"
        style={{
          color: "#ef4444",
          fontSize: "0.85rem",
          marginTop: "8px",
          padding: "8px",
          backgroundColor: "#fee2e2",
          borderRadius: "6px",
          animation: "shake 0.3s ease"
        }}
        role="alert"
      >
        <strong>Error:</strong> {error}
      </div>
    );
  };

  const renderSuccess = () => {
    if (!success) return null;
    
    return (
      <div 
        className="success-text"
        style={{
          color: "#22c55e",
          fontSize: "0.9rem",
          marginTop: "8px",
          padding: "8px",
          backgroundColor: "#dcfce7",
          borderRadius: "6px",
          animation: "fadeIn 0.3s ease",
          textAlign: "center"
        }}
      >
        ✓ Thank you for your feedback!
      </div>
    );
  };

  const renderButtons = () => (
    <div className="actions">
      <button
        onClick={handleClose}
        className="cancel"
        disabled={loading}
        style={{
          padding: "10px 20px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          backgroundColor: "white",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          fontWeight: "500"
        }}
      >
        {hasUnsavedChanges && (rating > 0 || comment.trim()) ? "Cancel" : "Skip for now"}
      </button>

      <button
        onClick={submitReview}
        className="submit-btn"
        disabled={loading || !canSubmit}
        style={{
          padding: "10px 20px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: !canSubmit ? "#cbd5e1" : "#6366f1",
          color: "white",
          fontWeight: "bold",
          cursor: !canSubmit || loading ? "not-allowed" : "pointer",
          transition: "all 0.2s",
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? (
          <>
            <span className="spinner" style={{
              display: "inline-block",
              width: "16px",
              height: "16px",
              border: "2px solid white",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
              marginRight: "8px"
            }} />
            Submitting...
          </>
        ) : (
          "Submit Review"
        )}
      </button>
    </div>
  );

  /* ================= Main Render ================= */
  return (
    <div 
      className="modal-overlay" 
      role="dialog" 
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          handleClose();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
        animation: "fadeIn 0.2s ease"
      }}
    >
      <div 
        ref={modalRef}
        className="modal-card"
        tabIndex={-1}
        style={{
          backgroundColor: theme === "dark" ? "#1f2937" : "white",
          padding: "24px",
          width: "90%",
          maxWidth: "400px",
          borderRadius: "12px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          animation: "slideUp 0.3s ease"
        }}
      >
        <h3 style={{ 
          margin: "0 0 8px 0", 
          fontSize: "1.25rem", 
          fontWeight: "bold",
          color: theme === "dark" ? "#f9fafb" : "#111827"
        }}>
          Rate Your Experience
        </h3>

        <p className="subtitle" style={{ 
          margin: "0 0 16px 0", 
          fontSize: "0.875rem", 
          color: theme === "dark" ? "#9ca3af" : "#6b7280" 
        }}>
          How was the service with{" "}
          <strong>{providerName}</strong>?
        </p>

        {/* Star Rating */}
        {renderStars()}
        
        {/* Rating Label */}
        {renderRatingLabel()}

        {/* Comment Section */}
        {renderCommentSection()}

        {/* Error Message */}
        {renderError()}
        
        {/* Success Message */}
        {renderSuccess()}

        {/* Buttons */}
        {renderButtons()}
      </div>

      {/* Add keyframe animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}