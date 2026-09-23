// src/components/LoadingScreen.jsx
import React from "react";
import { Box, CircularProgress, Typography, Fade } from "@mui/material";

const LoadingScreen = ({ message = "Loading..." }) => {
  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          bgcolor: "#f8fafc",
        }}
      >
        <CircularProgress
          size={56}
          thickness={4}
          sx={{ color: "#6366f1", mb: 3 }}
        />
        <Typography variant="h6" color="text.secondary" fontWeight={500}>
          {message}
        </Typography>
      </Box>
    </Fade>
  );
};

export default LoadingScreen;