// src/components/common/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="text-center max-w-md">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Oops!</h1>
            <p className="text-gray-600 mb-6">
              Something went wrong. Our team has been notified.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-yellow-500 text-gray-900 rounded-xl font-semibold hover:bg-yellow-400 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;