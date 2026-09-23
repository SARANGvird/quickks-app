// src/components/LoadingSpinner.jsx
import React, { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";

// Loading spinner variants
const SPINNER_VARIANTS = {
  circle: "circle",
  dots: "dots",
  pulse: "pulse",
  wave: "wave",
  cube: "cube",
  skeleton: "skeleton"
};

// Size configurations
const SIZES = {
  xs: { container: 24, spinner: 16, text: 12 },
  sm: { container: 32, spinner: 24, text: 14 },
  md: { container: 48, spinner: 32, text: 16 },
  lg: { container: 64, spinner: 48, text: 18 },
  xl: { container: 80, spinner: 64, text: 20 }
};

// Color configurations
const COLORS = {
  primary: "#6366f1",
  secondary: "#10b981",
  danger: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
  light: "#ffffff",
  dark: "#1f2937",
  gray: "#9ca3af"
};

/**
 * LoadingSpinner Component
 * 
 * A versatile loading spinner with multiple variants, sizes, and animations.
 * Perfect for loading states, form submissions, data fetching, and page transitions.
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Spinner variant (circle, dots, pulse, wave, cube, skeleton)
 * @param {string} props.size - Size of spinner (xs, sm, md, lg, xl)
 * @param {string} props.color - Color of spinner (primary, secondary, danger, etc.)
 * @param {string} props.text - Loading text to display
 * @param {boolean} props.fullScreen - Display as fullscreen overlay
 * @param {boolean} props.inline - Display inline without container
 * @param {string} props.className - Custom CSS class
 * @param {Object} props.style - Custom inline styles
 * @param {number} props.speed - Animation speed in ms
 * @param {boolean} props.showText - Show loading text
 * @param {string} props.textPosition - Text position (bottom, right, top, left)
 * @param {boolean} props.overlay - Show semi-transparent overlay
 * @param {number} props.opacity - Overlay opacity (0-1)
 * @param {Function} props.onComplete - Callback when animation completes
 * @param {string} props.theme - Theme (light, dark)
 * @param {boolean} props.centered - Center the spinner
 * @param {string} props.ariaLabel - Accessibility label
 */

const LoadingSpinner = ({
  variant = SPINNER_VARIANTS.circle,
  size = "md",
  color = "primary",
  text = "Loading...",
  fullScreen = false,
  inline = false,
  className = "",
  style = {},
  speed = 1000,
  showText = true,
  textPosition = "bottom",
  overlay = false,
  opacity = 0.8,
  onComplete = null,
  theme = "light",
  centered = true,
  ariaLabel = "Loading",
  backdropBlur = false
}) => {
  const [visible, setVisible] = useState(true);
  const sizeConfig = SIZES[size] || SIZES.md;
  const colorValue = COLORS[color] || color;
  
  // Handle animation completion
  useEffect(() => {
    if (onComplete) {
      const timer = setTimeout(onComplete, speed);
      return () => clearTimeout(timer);
    }
  }, [onComplete, speed]);

  // Circle Spinner
  const renderCircleSpinner = () => (
    <motion.div
      className="circle-spinner"
      style={{
        width: sizeConfig.spinner,
        height: sizeConfig.spinner,
        border: `3px solid ${colorValue}20`,
        borderTop: `3px solid ${colorValue}`,
        borderRadius: "50%",
        animation: `spin ${speed / 1000}s linear infinite`
      }}
      role="progressbar"
      aria-label={ariaLabel}
    />
  );

  // Dots Spinner
  const renderDotsSpinner = () => (
    <div className="dots-spinner" style={{ display: "flex", gap: 8 }}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="dot"
          style={{
            width: sizeConfig.spinner / 3,
            height: sizeConfig.spinner / 3,
            backgroundColor: colorValue,
            borderRadius: "50%"
          }}
          animate={{
            y: ["0%", "-50%", "0%"],
            opacity: [1, 0.5, 1]
          }}
          transition={{
            duration: speed / 1000,
            repeat: Infinity,
            delay: index * (speed / 3000)
          }}
        />
      ))}
    </div>
  );

  // Pulse Spinner
  const renderPulseSpinner = () => (
    <motion.div
      className="pulse-spinner"
      style={{
        width: sizeConfig.spinner,
        height: sizeConfig.spinner,
        backgroundColor: colorValue,
        borderRadius: "50%"
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.6, 1, 0.6]
      }}
      transition={{
        duration: speed / 1000,
        repeat: Infinity,
        ease: "easeInOut"
      }}
    />
  );

  // Wave Spinner
  const renderWaveSpinner = () => (
    <div className="wave-spinner" style={{ display: "flex", gap: 4, alignItems: "center", height: sizeConfig.spinner }}>
      {[0, 1, 2, 3, 4].map((index) => (
        <motion.div
          key={index}
          style={{
            width: sizeConfig.spinner / 6,
            height: sizeConfig.spinner,
            backgroundColor: colorValue,
            borderRadius: 4
          }}
          animate={{
            height: ["100%", "30%", "100%"]
          }}
          transition={{
            duration: speed / 1000,
            repeat: Infinity,
            delay: index * (speed / 5000)
          }}
        />
      ))}
    </div>
  );

  // Cube Spinner
  const renderCubeSpinner = () => (
    <motion.div
      className="cube-spinner"
      style={{
        width: sizeConfig.spinner,
        height: sizeConfig.spinner,
        backgroundColor: colorValue,
        transformStyle: "preserve-3d"
      }}
      animate={{
        rotateX: [0, 360, 0],
        rotateY: [0, 360, 0]
      }}
      transition={{
        duration: speed / 1000,
        repeat: Infinity,
        ease: "linear"
      }}
    />
  );

  // Skeleton Spinner
  const renderSkeletonSpinner = () => (
    <div className="skeleton-spinner" style={{ width: sizeConfig.spinner * 2 }}>
      <motion.div
        className="skeleton-line"
        style={{
          height: sizeConfig.spinner / 4,
          backgroundColor: colorValue,
          borderRadius: 4,
          marginBottom: 8
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: speed / 1000,
          repeat: Infinity
        }}
      />
      <motion.div
        className="skeleton-line"
        style={{
          height: sizeConfig.spinner / 4,
          width: "80%",
          backgroundColor: colorValue,
          borderRadius: 4
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: speed / 1000,
          repeat: Infinity,
          delay: speed / 2000
        }}
      />
    </div>
  );

  // Render spinner based on variant
  const renderSpinner = () => {
    switch (variant) {
      case SPINNER_VARIANTS.dots:
        return renderDotsSpinner();
      case SPINNER_VARIANTS.pulse:
        return renderPulseSpinner();
      case SPINNER_VARIANTS.wave:
        return renderWaveSpinner();
      case SPINNER_VARIANTS.cube:
        return renderCubeSpinner();
      case SPINNER_VARIANTS.skeleton:
        return renderSkeletonSpinner();
      default:
        return renderCircleSpinner();
    }
  };

  // Get text position styles
  const getTextPositionStyles = () => {
    switch (textPosition) {
      case "right":
        return { flexDirection: "row", gap: 12 };
      case "top":
        return { flexDirection: "column-reverse", gap: 8 };
      case "left":
        return { flexDirection: "row-reverse", gap: 12 };
      default:
        return { flexDirection: "column", gap: 12 };
    }
  };

  // Container styles
  const containerStyles = {
    display: centered ? "flex" : "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    ...getTextPositionStyles(),
    ...(inline ? { display: "inline-flex" } : {}),
    ...style
  };

  // Text styles
  const textStyles = {
    fontSize: sizeConfig.text,
    color: theme === "dark" ? "#f9fafb" : "#374151",
    fontWeight: 500,
    margin: 0
  };

  // Fullscreen overlay
  if (fullScreen) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`loading-spinner-fullscreen ${className}`}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: overlay ? `rgba(0, 0, 0, ${opacity})` : "transparent",
              backdropFilter: backdropBlur ? "blur(4px)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999
            }}
          >
            <div style={containerStyles}>
              {renderSpinner()}
              {showText && text && <p style={textStyles}>{text}</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Inline or normal spinner
  return (
    <div
      className={`loading-spinner ${className}`}
      style={containerStyles}
      role="status"
      aria-live="polite"
    >
      {renderSpinner()}
      {showText && text && <p style={textStyles}>{text}</p>}
    </div>
  );
};

// PropTypes
LoadingSpinner.propTypes = {
  variant: PropTypes.oneOf(Object.values(SPINNER_VARIANTS)),
  size: PropTypes.oneOf(Object.keys(SIZES)),
  color: PropTypes.oneOfType([
    PropTypes.oneOf(Object.keys(COLORS)),
    PropTypes.string
  ]),
  text: PropTypes.string,
  fullScreen: PropTypes.bool,
  inline: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object,
  speed: PropTypes.number,
  showText: PropTypes.bool,
  textPosition: PropTypes.oneOf(["bottom", "right", "top", "left"]),
  overlay: PropTypes.bool,
  opacity: PropTypes.number,
  onComplete: PropTypes.func,
  theme: PropTypes.oneOf(["light", "dark"]),
  centered: PropTypes.bool,
  ariaLabel: PropTypes.string,
  backdropBlur: PropTypes.bool
};

// Default props
LoadingSpinner.defaultProps = {
  variant: "circle",
  size: "md",
  color: "primary",
  text: "Loading...",
  fullScreen: false,
  inline: false,
  className: "",
  style: {},
  speed: 1000,
  showText: true,
  textPosition: "bottom",
  overlay: false,
  opacity: 0.8,
  onComplete: null,
  theme: "light",
  centered: true,
  ariaLabel: "Loading",
  backdropBlur: false
};

// Add CSS animations
const styles = document.createElement("style");
styles.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.6;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }
  
  @keyframes wave {
    0%, 100% {
      transform: scaleY(1);
    }
    50% {
      transform: scaleY(0.5);
    }
  }
  
  .loading-spinner,
  .loading-spinner-fullscreen {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .circle-spinner,
    .dot,
    .pulse-spinner,
    .wave-spinner div,
    .cube-spinner,
    .skeleton-line {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
`;
document.head.appendChild(styles);

// Export with React.memo for performance
export default React.memo(LoadingSpinner);

// Also export as named export
export { LoadingSpinner, SPINNER_VARIANTS, SIZES, COLORS };