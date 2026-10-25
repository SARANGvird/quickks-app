mport React from "react";
import { Box, Typography } from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";

const spin = keyframes`0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }`;

const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
  minHeight: "200px",
});

const LoadingSpinner = ({ size = 40, message = "Loading...", fullScreen = false }) => {
  return (
    <Root sx={{ height: fullScreen ? "100vh" : "auto", bgcolor: fullScreen ? "#f8fafc" : "transparent" }}>
      <Box sx={{ width: size, height: size, border: "3px solid #e2e8f0", borderTopColor: "#6366f1", borderRadius: "50%", animation: `${spin} 0.8s linear infinite` }} />
      {message && <Typography sx={{ mt: 2, color: "#64748b", fontSize: "0.9rem", fontWeight: 500 }}>{message}</Typography>}
    </Root>
  );
};

export default React.memo(LoadingSpinner);
