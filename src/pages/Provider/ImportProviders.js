import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../api/api";

const ImportProviders = () => {
  const { user } = useAuth();
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    if (!file) {
      setMessage("❌ Please select a file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setMessage("");

    try {
      const response = await api.post("/providers/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Ensure message is a string
      const successMsg =
        typeof response.data === "string"
          ? response.data
          : "✅ Providers imported successfully!";
      setMessage(successMsg);
      setFile(null);
    } catch (error) {
      console.error("Import error:", error);

      // Safely extract error message
      const errorMsg =
        error.response?.data && typeof error.response.data === "string"
          ? error.response.data
          : error.message || "❌ Failed to import providers. Try again.";

      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "ADMIN") {
    return <p className="p-4 text-red-600">Access denied. Admin only.</p>;
  }

  // Always convert message to string for startsWith check
  const displayMessage = typeof message === "string" ? message : JSON.stringify(message);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">📦 Import Providers</h1>
        <p className="text-gray-600 mb-6">
          Upload an Excel file (.xlsx) to add multiple providers at once.
        </p>

        <form onSubmit={handleUpload} className="flex flex-col gap-4">
          <input
            type="file"
            accept=".xlsx"
            onChange={handleFileChange}
            className="border p-2 rounded"
          />

          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white font-medium transition ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {displayMessage && (
          <p
            className={`mt-4 p-2 rounded ${
              displayMessage.startsWith("❌")
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {displayMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default ImportProviders;
