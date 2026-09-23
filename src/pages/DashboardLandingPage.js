import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const DashboardLandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    switch (user.role) {
      case "CUSTOMER":
        navigate("/dashboard/customer");
        break;
      case "PROVIDER":
        navigate("/dashboard/provider");
        break;
      case "ADMIN":
        navigate("/dashboard/admin");
        break;
      default:
        navigate("/unauthorized");
    }
  }, [user, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Redirecting to your dashboard...</h2>
      <p>Please wait...</p>
    </div>
  );
};

export default DashboardLandingPage;
