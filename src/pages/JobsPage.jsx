import React, { useEffect, useState } from "react";
import api from "../api/api";

const JobsPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch assigned jobs for provider
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await api.get("/provider/jobs"); // backend endpoint
        setJobs(res.data || []);
      } catch (err) {
        console.error("Failed to fetch jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const updateStatus = async (jobId, newStatus) => {
    try {
      const res = await api.patch(`/provider/jobs/${jobId}`, { status: newStatus });
      setJobs((prev) =>
        prev.map((job) => (job.id === jobId ? { ...job, status: res.data.status } : job))
      );
    } catch (err) {
      console.error("Failed to update job status:", err);
      alert("Failed to update status");
    }
  };

  if (loading) return <p className="p-4">Loading jobs...</p>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-semibold mb-4">My Assigned Jobs</h2>

      {jobs.length === 0 ? (
        <p className="text-gray-600">No jobs assigned yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow rounded-lg p-4">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-100 text-left">
                <th className="p-3">Job ID</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Service Type</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{job.id}</td>
                  <td className="p-3">{job.customerName}</td>
                  <td className="p-3">{job.serviceType}</td>
                  <td className="p-3">
                    {new Date(job.jobDate).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs ${
                        job.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : job.status === "IN_PROGRESS"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    {job.status !== "COMPLETED" && (
                      <>
                        {job.status === "PENDING" && (
                          <button
                            className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                            onClick={() => updateStatus(job.id, "IN_PROGRESS")}
                          >
                            Start
                          </button>
                        )}
                        {job.status === "IN_PROGRESS" && (
                          <button
                            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                            onClick={() => updateStatus(job.id, "COMPLETED")}
                          >
                            Complete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default JobsPage;
