import React, { useState, useEffect } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { FaHourglassHalf } from 'react-icons/fa';

const SLATimer = ({ deadline, totalDurationMinutes = 60 }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(deadline) - new Date();
      setTimeLeft(diff > 0 ? diff : 0);
    };

    calculateTime(); // Initial call
    const timer = setInterval(calculateTime, 1000);
    
    return () => clearInterval(timer);
  }, [deadline]);

  // Color Logic
  const getStatusInfo = () => {
    const minutesLeft = timeLeft / 1000 / 60;
    const ratio = minutesLeft / totalDurationMinutes;

    if (timeLeft === 0) return { color: "#ef4444", label: "OVERDUE" }; // Red
    if (ratio < 0.2) return { color: "#ef4444", label: "CRITICAL" }; // Red (<20%)
    if (ratio < 0.5) return { color: "#f59e0b", label: "WARNING" };  // Orange (<50%)
    return { color: "#10b981", label: "ON TIME" };                  // Green
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const { color, label } = getStatusInfo();

  return (
    <Tooltip title={`SLA Status: ${label}`} arrow>
      <Box sx={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: 1, 
        px: 1.5, 
        py: 0.5, 
        borderRadius: '20px', 
        bgcolor: `${color}15`, // Light version of the color for background
        border: `1px solid ${color}`,
        color: color
      }}>
        <FaHourglassHalf size={12} />
        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'monospace' }}>
          {timeLeft > 0 ? formatTime(timeLeft) : "EXPIRED"}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default SLATimer;