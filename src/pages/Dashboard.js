import React from "react";
import { useNavigate } from "react-router-dom";
import { User, ClipboardList, Wrench, LogOut, Zap } from "lucide-react";

export default function DashboardPage() {
  const navigate = useNavigate();

  // You can replace this later with dynamic user data (from backend / context)
  const user = { name: "Sarang", role: "Customer" };

  const handleLogout = () => {
    // Clear session or token here
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Navbar */}
      <header className="flex items-center justify-between px-10 py-5 bg-white shadow-md">
        <div
          className="flex items-center space-x-2 cursor-pointer"
          onClick={() => navigate("/dashboard")}
        >
          <Zap className="text-blue-600 w-7 h-7" />
          <h1 className="text-2xl font-bold text-gray-800">Quickks</h1>
        </div>

        <div className="flex items-center space-x-6">
          <span className="text-gray-700 font-medium">
            Hi, {user.name}! 👋
          </span>
          <button
            onClick={handleLogout}
            className="text-red-600 hover:text-red-700 flex items-center"
          >
            <LogOut className="w-5 h-5 mr-1" /> Logout
          </button>
        </div>
      </header>

      {/* Dashboard Content */}
      <main className="flex-1 px-10 py-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">
          Welcome back, {user.name}
        </h2>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Book a Service */}
          <div
            className="bg-white shadow-sm hover:shadow-md p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition"
            onClick={() => navigate("/book-service")}
          >
            <Wrench className="w-12 h-12 text-blue-600 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Book a Service</h3>
            <p className="text-gray-600">
              Need an electrician, plumber, or cleaner? Book instantly.
            </p>
          </div>

          {/* My Bookings */}
          <div
            className="bg-white shadow-sm hover:shadow-md p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition"
            onClick={() => navigate("/my-bookings")}
          >
            <ClipboardList className="w-12 h-12 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">My Bookings</h3>
            <p className="text-gray-600">
              Track your active and completed service requests.
            </p>
          </div>

          {/* Profile */}
          <div
            className="bg-white shadow-sm hover:shadow-md p-8 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition"
            onClick={() => navigate("/profile")}
          >
            <User className="w-12 h-12 text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">My Profile</h3>
            <p className="text-gray-600">
              View and update your contact information and preferences.
            </p>
          </div>
        </div>

        {/* Optional stats section */}
        <section className="mt-16 bg-blue-50 rounded-2xl p-10 text-center">
          <h4 className="text-2xl font-semibold text-gray-800 mb-4">
            Your Quickks Summary
          </h4>
          <div className="flex flex-col md:flex-row justify-center gap-10 text-gray-700">
            <div>
              <p className="text-4xl font-bold text-blue-600">12</p>
              <p className="text-gray-600">Total Bookings</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-green-500">8</p>
              <p className="text-gray-600">Completed</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-yellow-500">4</p>
              <p className="text-gray-600">Pending</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 py-6 text-center text-gray-600 text-sm">
        © {new Date().getFullYear()} Quickks. All rights reserved.
      </footer>
    </div>
  );
}
