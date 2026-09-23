import React from "react";
import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
    <h1 className="text-5xl font-bold text-red-600 mb-4">404</h1>
    <p className="text-xl text-gray-700 mb-6">Oops! Page not found.</p>
    <Link
      to="/"
      className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
    >
      Go to Home
    </Link>
  </div>
);

export default NotFoundPage;
