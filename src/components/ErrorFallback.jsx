// src/components/ErrorFallback.jsx
import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Paper, Alert } from "@mui/material";
import { FaExclamationTriangle, FaRedo, FaHome } from "react-icons/fa";

const ErrorFallback = ({ error, resetErrorBoundary }) => {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        p: 3,
      }}
    >
      <Paper
        sx={{
          maxWidth: 500,
          width: "100%",
          p: 4,
          textAlign: "center",
          borderRadius: 4,
        }}
      >
        <Box sx={{ mb: 3 }}>
          <FaExclamationTriangle size={48} color="#dc2626" />
        </Box>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Something went wrong
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          We apologize for the inconvenience. Please try refreshing the page.
        </Typography>
        <Alert severity="error" sx={{ mb: 3, textAlign: "left" }}>
          <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
            {error?.message || "An unexpected error occurred"}
          </Typography>
        </Alert>
        <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
          <Button
            variant="contained"
            onClick={resetErrorBoundary || handleReload}
            startIcon={<FaRedo />}
            sx={{ bgcolor: "#6366f1", "&:hover": { bgcolor: "#4f46e5" } }}
          >
            Try Again
          </Button>
          <Button
            variant="outlined"
            onClick={handleGoHome}
            startIcon={<FaHome />}
          >
            Go Home
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

ErrorFallback.propTypes = {
  error: PropTypes.object,
  resetErrorBoundary: PropTypes.func,
};

export default ErrorFallback;