import React from "react";
import PropTypes from "prop-types";
import { Box, Typography, Button, Paper } from "@mui/material";
import { FaInbox } from "react-icons/fa";

const EmptyState = ({ 
  title = "No items found", 
  message = "There's nothing to display here yet.",
  actionLabel,
  onAction,
  icon
}) => {
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 6, 
        textAlign: 'center', 
        borderRadius: 4,
        border: '2px dashed #e2e8f0',
        bgcolor: 'transparent'
      }}
    >
      <Box sx={{ mb: 2, color: '#cbd5e1', fontSize: 48 }}>
        {icon || <FaInbox />}
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: '#1e293b' }}>
        {title}
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
        {message}
      </Typography>
      {actionLabel && onAction && (
        <Button
          variant="contained"
          onClick={onAction}
          sx={{ borderRadius: 3, px: 4 }}
        >
          {actionLabel}
        </Button>
      )}
    </Paper>
  );
};

EmptyState.propTypes = {
  title: PropTypes.string,
  message: PropTypes.string,
  actionLabel: PropTypes.string,
  onAction: PropTypes.func,
  icon: PropTypes.node,
};

export default EmptyState;