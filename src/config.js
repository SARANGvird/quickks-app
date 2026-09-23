// src/config.js

// 🌐 Backend API base URL
const API_BASE_URL = "http://localhost:8081/quickks"; // Spring Boot base URL

// ⚙️ Default request configuration (optional)
const REQUEST_OPTIONS = {
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 seconds
};

export { API_BASE_URL, REQUEST_OPTIONS };
