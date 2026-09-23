import React, { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";

// Constants for routes (better practice)
const ROUTES = {
  HOME: "/",
  BOOKINGS: "/bookings",
  DASHBOARD: "/dashboard"
};

export default function BookingSuccess() {
  const { bookingId } = useParams();
  const navigate = useNavigate();

  // Redirect to home if no booking ID
  useEffect(() => {
    if (!bookingId) {
      const timer = setTimeout(() => {
        navigate(ROUTES.HOME);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [bookingId, navigate]);

  // Track successful booking (analytics example)
  useEffect(() => {
    if (bookingId) {
      // Send to analytics
      try {
        // window.gtag?.('event', 'booking_success', { booking_id: bookingId });
        console.log(`✅ Booking successful: ${bookingId}`);
      } catch (error) {
        console.error("Analytics error:", error);
      }
    }
  }, [bookingId]);

  // Loading state while checking bookingId
  if (bookingId === undefined) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen bg-gray-50"
        role="status"
        aria-live="polite"
      >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-600">Verifying your booking...</p>
      </div>
    );
  }

  // Error state - no booking ID
  if (!bookingId) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen bg-yellow-50 p-4"
        role="alert"
        aria-labelledby="error-title"
      >
        <div className="max-w-md w-full text-center bg-white rounded-lg shadow-lg p-8">
          <div className="text-5xl mb-4" aria-hidden="true">
            ⚠️
          </div>
          <h1 
            id="error-title"
            className="text-3xl font-bold text-yellow-700 mb-4"
          >
            Booking Reference Missing
          </h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your booking reference. You will be redirected to the home page.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to={ROUTES.HOME}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Home
            </Link>
            <Link
              to={ROUTES.BOOKINGS}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              View All Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  return (
    <main 
      className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-4"
      role="main"
    >
      <div 
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fadeIn"
        style={{
          animation: 'fadeIn 0.5s ease-in-out'
        }}
      >
        {/* Success Icon */}
        <div 
          className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
          aria-hidden="true"
        >
          <svg 
            className="w-12 h-12 text-green-600"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Heading */}
        <h1 className="text-3xl sm:text-4xl font-bold text-green-700 mb-2">
          Payment Successful! 🎉
        </h1>
        
        <p className="text-gray-600 mb-2">
          Your booking has been confirmed.
        </p>

        {/* Booking ID with copy functionality */}
        <div className="bg-gray-50 rounded-lg p-4 my-6">
          <p className="text-sm text-gray-500 mb-1">Booking Reference</p>
          <div className="flex items-center justify-center gap-2">
            <strong 
              className="text-lg font-mono text-green-700 select-all"
              id="booking-id"
            >
              {bookingId}
            </strong>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(bookingId);
                // Could add toast notification here
                console.log('Booking ID copied:', bookingId);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Copy booking ID to clipboard"
              title="Copy booking ID"
            >
              <svg 
                className="w-5 h-5" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Email notification info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
          <p className="text-sm text-blue-700">
            📧 A confirmation email has been sent to your registered email address.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to={ROUTES.BOOKINGS}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            aria-label="View your booking history"
          >
            View My Bookings
          </Link>
          <Link
            to={ROUTES.HOME}
            className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Return Home
          </Link>
        </div>

        {/* Additional actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <Link
            to={`${ROUTES.BOOKINGS}/${bookingId}`}
            className="text-sm text-green-600 hover:text-green-700 underline"
          >
            View Booking Details →
          </Link>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

// PropTypes for type checking (optional but recommended)
BookingSuccess.propTypes = {
  // No props needed as we use URL params
};

// Default export with display name for debugging
BookingSuccess.displayName = 'BookingSuccess';