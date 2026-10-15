// 🌐 Backend API base URL - Vite + Production safe
const getApiBaseUrl = () => {
  // 1. Vercel env var - VITE_ prefix (Vite standard)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Fallback for REACT_APP_ if you set in Vercel
  if (import.meta.env.REACT_APP_API_URL) {
    return import.meta.env.REACT_APP_API_URL;
  }

  // 2. Production domain var asel tar live API
  if (typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1') {
    return "https://api.quickks.in/quickks";
  }

  // 3. Local development sathi
  return "http://localhost:8081/quickks";
};

const API_BASE_URL = getApiBaseUrl();

// ⚙ Default request configuration
const REQUEST_OPTIONS = {
  headers: {
    "Content-Type": "application/json",
  },
};

export { API_BASE_URL, REQUEST_OPTIONS };