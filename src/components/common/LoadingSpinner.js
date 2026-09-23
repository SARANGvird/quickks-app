import React from 'react';
import { motion } from 'framer-motion';
import PropTypes from 'prop-types';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'yellow',
  fullScreen = false,
  text = '',
  overlay = false
}) => {
  // Size mappings
  const sizeClasses = {
    small: 'w-5 h-5 border-2',
    medium: 'w-8 h-8 border-2',
    large: 'w-12 h-12 border-3',
    xl: 'w-16 h-16 border-4'
  };

  // Color mappings with proper Tailwind classes
  const colorClasses = {
    yellow: 'border-yellow-500 border-t-transparent',
    blue: 'border-blue-500 border-t-transparent',
    gray: 'border-gray-500 border-t-transparent',
    primary: 'border-primary-500 border-t-transparent',
    secondary: 'border-secondary-500 border-t-transparent',
    success: 'border-green-500 border-t-transparent',
    danger: 'border-red-500 border-t-transparent',
    warning: 'border-orange-500 border-t-transparent',
    info: 'border-blue-400 border-t-transparent',
    light: 'border-gray-200 border-t-gray-500',
    dark: 'border-gray-800 border-t-gray-300',
    white: 'border-white border-t-transparent'
  };

  // Text size mappings
  const textSizeClasses = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
    xl: 'text-lg'
  };

  // Spinner size validation
  const isValidSize = size in sizeClasses;
  const spinnerSize = isValidSize ? size : 'medium';
  
  // Color validation
  const isValidColor = color in colorClasses;
  const spinnerColor = isValidColor ? color : 'yellow';

  // Full screen loading
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75 z-50">
        <div className="flex flex-col items-center space-y-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
            className={`${sizeClasses[spinnerSize]} rounded-full ${colorClasses[spinnerColor]}`}
            role="status"
            aria-label="Loading"
          />
          {text && (
            <p className={`${textSizeClasses[spinnerSize]} text-gray-600 dark:text-gray-300`}>
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Overlay mode (semi-transparent background)
  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-50 z-40">
        <div className="flex flex-col items-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 1, 
              repeat: Infinity, 
              ease: 'linear' 
            }}
            className={`${sizeClasses[spinnerSize]} rounded-full ${colorClasses[spinnerColor]}`}
            role="status"
            aria-label="Loading"
          />
        </div>
      </div>
    );
  }

  // Regular inline spinner
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          ease: 'linear' 
        }}
        className={`${sizeClasses[spinnerSize]} rounded-full ${colorClasses[spinnerColor]}`}
        role="status"
        aria-label="Loading"
      />
      {text && (
        <p className={`${textSizeClasses[spinnerSize]} text-gray-600 dark:text-gray-300`}>
          {text}
        </p>
      )}
    </div>
  );
};

// PropTypes for type checking
LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large', 'xl']),
  color: PropTypes.oneOf([
    'yellow', 'blue', 'gray', 'primary', 'secondary', 
    'success', 'danger', 'warning', 'info', 'light', 'dark', 'white'
  ]),
  fullScreen: PropTypes.bool,
  text: PropTypes.string,
  overlay: PropTypes.bool
};

// Default props
LoadingSpinner.defaultProps = {
  size: 'medium',
  color: 'yellow',
  fullScreen: false,
  text: '',
  overlay: false
};

export default LoadingSpinner;