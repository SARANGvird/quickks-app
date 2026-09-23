// src/contexts/ThemeContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

export const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

export const COLOR_SCHEMES = {
  DEFAULT: 'default',
  BLUE: 'blue',
  GREEN: 'green',
  PURPLE: 'purple',
  ORANGE: 'orange',
  RED: 'red'
};

export const FONT_OPTIONS = {
  DEFAULT: 'default',
  LARGE: 'large',
  EXTRA_LARGE: 'extra-large',
  COMPACT: 'compact'
};

export const SPACING_OPTIONS = {
  DEFAULT: 'default',
  COMFORTABLE: 'comfortable',
  COMPACT: 'compact'
};

export const RADIUS_OPTIONS = {
  DEFAULT: 'default',
  ROUNDED: 'rounded',
  SQUARE: 'square',
  PILL: 'pill'
};

const COLOR_PALETTES = {
  [COLOR_SCHEMES.DEFAULT]: {
    light: {
      primary: { main: '#6366f1', light: '#818cf8', dark: '#4f46e5', contrastText: '#ffffff' },
      secondary: { main: '#10b981', light: '#34d399', dark: '#059669', contrastText: '#ffffff' },
      background: { default: '#f8fafc', paper: '#ffffff' },
      text: { primary: '#0f172a', secondary: '#475569', disabled: '#94a3b8' }
    },
    dark: {
      primary: { main: '#818cf8', light: '#a5b4fc', dark: '#6366f1', contrastText: '#ffffff' },
      secondary: { main: '#34d399', light: '#6ee7b7', dark: '#10b981', contrastText: '#ffffff' },
      background: { default: '#0f172a', paper: '#1e293b' },
      text: { primary: '#f1f5f9', secondary: '#cbd5e1', disabled: '#64748b' }
    }
  },
  [COLOR_SCHEMES.BLUE]: {
    light: {
      primary: { main: '#3b82f6', light: '#60a5fa', dark: '#2563eb', contrastText: '#ffffff' },
      secondary: { main: '#06b6d4', light: '#22d3ee', dark: '#0891b2', contrastText: '#ffffff' },
      background: { default: '#f0f9ff', paper: '#ffffff' },
      text: { primary: '#0c4a6e', secondary: '#475569', disabled: '#94a3b8' }
    },
    dark: {
      primary: { main: '#60a5fa', light: '#93c5fd', dark: '#3b82f6', contrastText: '#ffffff' },
      secondary: { main: '#22d3ee', light: '#67e8f9', dark: '#06b6d4', contrastText: '#ffffff' },
      background: { default: '#0c4a6e', paper: '#082f49' },
      text: { primary: '#f0f9ff', secondary: '#bae6fd', disabled: '#7dd3fc' }
    }
  },
  [COLOR_SCHEMES.GREEN]: {
    light: {
      primary: { main: '#10b981', light: '#34d399', dark: '#059669', contrastText: '#ffffff' },
      secondary: { main: '#14b8a6', light: '#2dd4bf', dark: '#0d9488', contrastText: '#ffffff' },
      background: { default: '#ecfdf5', paper: '#ffffff' },
      text: { primary: '#064e3b', secondary: '#475569', disabled: '#94a3b8' }
    },
    dark: {
      primary: { main: '#34d399', light: '#6ee7b7', dark: '#10b981', contrastText: '#ffffff' },
      secondary: { main: '#2dd4bf', light: '#5eead4', dark: '#14b8a6', contrastText: '#ffffff' },
      background: { default: '#064e3b', paper: '#022c22' },
      text: { primary: '#ecfdf5', secondary: '#a7f3d0', disabled: '#6ee7b7' }
    }
  },
  [COLOR_SCHEMES.PURPLE]: {
    light: {
      primary: { main: '#8b5cf6', light: '#a78bfa', dark: '#7c3aed', contrastText: '#ffffff' },
      secondary: { main: '#d946ef', light: '#e879f9', dark: '#c026d3', contrastText: '#ffffff' },
      background: { default: '#faf5ff', paper: '#ffffff' },
      text: { primary: '#4c1d95', secondary: '#475569', disabled: '#94a3b8' }
    },
    dark: {
      primary: { main: '#a78bfa', light: '#c4b5fd', dark: '#8b5cf6', contrastText: '#ffffff' },
      secondary: { main: '#e879f9', light: '#f0abfc', dark: '#d946ef', contrastText: '#ffffff' },
      background: { default: '#4c1d95', paper: '#2e1065' },
      text: { primary: '#faf5ff', secondary: '#e9d5ff', disabled: '#d8b4fe' }
    }
  },
  [COLOR_SCHEMES.ORANGE]: {
    light: {
      primary: { main: '#f59e0b', light: '#fbbf24', dark: '#d97706', contrastText: '#ffffff' },
      secondary: { main: '#ef4444', light: '#f87171', dark: '#dc2626', contrastText: '#ffffff' },
      background: { default: '#fffbeb', paper: '#ffffff' },
      text: { primary: '#78350f', secondary: '#475569', disabled: '#94a3b8' }
    },
    dark: {
      primary: { main: '#fbbf24', light: '#fcd34d', dark: '#f59e0b', contrastText: '#ffffff' },
      secondary: { main: '#f87171', light: '#fca5a5', dark: '#ef4444', contrastText: '#ffffff' },
      background: { default: '#78350f', paper: '#451a03' },
      text: { primary: '#fffbeb', secondary: '#fde68a', disabled: '#fcd34d' }
    }
  },
  [COLOR_SCHEMES.RED]: {
    light: {
      primary: { main: '#ef4444', light: '#f87171', dark: '#dc2626', contrastText: '#ffffff' },
      secondary: { main: '#f97316', light: '#fb923c', dark: '#ea580c', contrastText: '#ffffff' },
      background: { default: '#fef2f2', paper: '#ffffff' },
      text: { primary: '#7f1d1d', secondary: '#475569', disabled: '#94a3b8' }
    },
    dark: {
      primary: { main: '#f87171', light: '#fca5a5', dark: '#ef4444', contrastText: '#ffffff' },
      secondary: { main: '#fb923c', light: '#fdba74', dark: '#f97316', contrastText: '#ffffff' },
      background: { default: '#7f1d1d', paper: '#450a0a' },
      text: { primary: '#fef2f2', secondary: '#fecaca', disabled: '#fca5a5' }
    }
  }
};

const FONT_SIZES = {
  [FONT_OPTIONS.DEFAULT]: {
    fontSize: 16,
    h1: '2.5rem',
    h2: '2rem',
    h3: '1.75rem',
    h4: '1.5rem',
    h5: '1.25rem',
    h6: '1rem',
    body1: '1rem',
    body2: '0.875rem'
  },
  [FONT_OPTIONS.LARGE]: {
    fontSize: 18,
    h1: '3rem',
    h2: '2.5rem',
    h3: '2rem',
    h4: '1.75rem',
    h5: '1.5rem',
    h6: '1.25rem',
    body1: '1.125rem',
    body2: '1rem'
  },
  [FONT_OPTIONS.EXTRA_LARGE]: {
    fontSize: 20,
    h1: '3.5rem',
    h2: '3rem',
    h3: '2.5rem',
    h4: '2rem',
    h5: '1.75rem',
    h6: '1.5rem',
    body1: '1.25rem',
    body2: '1.125rem'
  },
  [FONT_OPTIONS.COMPACT]: {
    fontSize: 14,
    h1: '2rem',
    h2: '1.75rem',
    h3: '1.5rem',
    h4: '1.25rem',
    h5: '1rem',
    h6: '0.875rem',
    body1: '0.875rem',
    body2: '0.75rem'
  }
};

const SPACING_VALUES = {
  [SPACING_OPTIONS.DEFAULT]: 8,
  [SPACING_OPTIONS.COMFORTABLE]: 10,
  [SPACING_OPTIONS.COMPACT]: 6
};

const RADIUS_VALUES = {
  [RADIUS_OPTIONS.DEFAULT]: 8,
  [RADIUS_OPTIONS.ROUNDED]: 16,
  [RADIUS_OPTIONS.SQUARE]: 0,
  [RADIUS_OPTIONS.PILL]: 24
};

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem('theme_mode');
    return saved && Object.values(THEME_MODES).includes(saved) ? saved : THEME_MODES.SYSTEM;
  });
  
  const [colorScheme, setColorScheme] = useState(() => {
    const saved = localStorage.getItem('theme_color_scheme');
    return saved && Object.values(COLOR_SCHEMES).includes(saved) ? saved : COLOR_SCHEMES.DEFAULT;
  });
  
  const [fontOption, setFontOption] = useState(() => {
    const saved = localStorage.getItem('theme_font_option');
    return saved && Object.values(FONT_OPTIONS).includes(saved) ? saved : FONT_OPTIONS.DEFAULT;
  });
  
  const [spacingOption, setSpacingOption] = useState(() => {
    const saved = localStorage.getItem('theme_spacing_option');
    return saved && Object.values(SPACING_OPTIONS).includes(saved) ? saved : SPACING_OPTIONS.DEFAULT;
  });
  
  const [radiusOption, setRadiusOption] = useState(() => {
    const saved = localStorage.getItem('theme_radius_option');
    return saved && Object.values(RADIUS_OPTIONS).includes(saved) ? saved : RADIUS_OPTIONS.DEFAULT;
  });
  
  const [reducedMotion, setReducedMotion] = useState(() => {
    const saved = localStorage.getItem('theme_reduced_motion');
    return saved === 'true' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  
  const [highContrast, setHighContrast] = useState(() => {
    const saved = localStorage.getItem('theme_high_contrast');
    return saved === 'true' || window.matchMedia('(prefers-contrast: high)').matches;
  });
  
  const [systemModePref, setSystemModePref] = useState(() => {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setSystemModePref(e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme_reduced_motion')) setReducedMotion(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    const handleChange = (e) => {
      if (!localStorage.getItem('theme_high_contrast')) setHighContrast(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const actualMode = useMemo(() => {
    return mode === THEME_MODES.SYSTEM ? systemModePref : mode;
  }, [mode, systemModePref]);

  useEffect(() => {
    localStorage.setItem('theme_mode', mode);
    localStorage.setItem('theme_color_scheme', colorScheme);
    localStorage.setItem('theme_font_option', fontOption);
    localStorage.setItem('theme_spacing_option', spacingOption);
    localStorage.setItem('theme_radius_option', radiusOption);
    localStorage.setItem('theme_reduced_motion', reducedMotion);
    localStorage.setItem('theme_high_contrast', highContrast);
  }, [mode, colorScheme, fontOption, spacingOption, radiusOption, reducedMotion, highContrast]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualMode);
    document.documentElement.setAttribute('data-color-scheme', colorScheme);
    document.documentElement.setAttribute('data-font-size', fontOption);
    document.documentElement.setAttribute('data-spacing', spacingOption);
    document.documentElement.setAttribute('data-radius', radiusOption);
    
    if (reducedMotion) document.documentElement.classList.add('reduce-motion');
    else document.documentElement.classList.remove('reduce-motion');
    
    if (highContrast) document.documentElement.classList.add('high-contrast');
    else document.documentElement.classList.remove('high-contrast');
    
    if (actualMode === THEME_MODES.DARK) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    document.documentElement.style.fontSize = `${FONT_SIZES[fontOption].fontSize}px`;
  }, [actualMode, colorScheme, fontOption, spacingOption, radiusOption, reducedMotion, highContrast]);

  const muiTheme = useMemo(() => {
    const colors = COLOR_PALETTES[colorScheme][actualMode];
    const fonts = FONT_SIZES[fontOption];
    const spacing = SPACING_VALUES[spacingOption];
    const radius = RADIUS_VALUES[radiusOption];
    
    return createTheme({
      palette: {
        mode: actualMode,
        primary: colors.primary,
        secondary: colors.secondary,
        background: colors.background,
        text: colors.text,
      },
      typography: {
        fontFamily: '"Inter", "Roboto", sans-serif',
        h1: { fontSize: fonts.h1, fontWeight: 700 },
        h2: { fontSize: fonts.h2, fontWeight: 700 },
        h3: { fontSize: fonts.h3, fontWeight: 600 },
        h4: { fontSize: fonts.h4, fontWeight: 600 },
        h5: { fontSize: fonts.h5, fontWeight: 600 },
        h6: { fontSize: fonts.h6, fontWeight: 600 },
        body1: { fontSize: fonts.body1 },
        body2: { fontSize: fonts.body2 },
        button: { textTransform: 'none', fontWeight: 500 }
      },
      shape: { borderRadius: radius },
      spacing,
      components: {
        MuiButton: {
          styleOverrides: {
            root: {
              borderRadius: radiusOption === RADIUS_OPTIONS.PILL ? 40 : radius,
              textTransform: 'none'
            }
          }
        }
      }
    });
  }, [actualMode, colorScheme, fontOption, spacingOption, radiusOption]);

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      if (prev === THEME_MODES.LIGHT) return THEME_MODES.DARK;
      if (prev === THEME_MODES.DARK) return THEME_MODES.SYSTEM;
      return THEME_MODES.LIGHT;
    });
  }, []);

  const setLightMode = useCallback(() => setMode(THEME_MODES.LIGHT), []);
  const setDarkMode = useCallback(() => setMode(THEME_MODES.DARK), []);
  const setSystemMode = useCallback(() => setMode(THEME_MODES.SYSTEM), []);
  
  const setColorSchemeValue = useCallback((scheme) => {
    if (COLOR_PALETTES[scheme]) setColorScheme(scheme);
  }, []);
  
  const setFontSize = useCallback((option) => {
    if (FONT_SIZES[option]) setFontOption(option);
  }, []);
  
  const setSpacing = useCallback((option) => {
    if (SPACING_VALUES[option] !== undefined) setSpacingOption(option);
  }, []);
  
  const setBorderRadius = useCallback((option) => {
    if (RADIUS_VALUES[option] !== undefined) setRadiusOption(option);
  }, []);
  
  const toggleReducedMotion = useCallback(() => setReducedMotion(prev => !prev), []);
  const toggleHighContrast = useCallback(() => setHighContrast(prev => !prev), []);
  
  const resetToDefaults = useCallback(() => {
    setMode(THEME_MODES.SYSTEM);
    setColorScheme(COLOR_SCHEMES.DEFAULT);
    setFontOption(FONT_OPTIONS.DEFAULT);
    setSpacingOption(SPACING_OPTIONS.DEFAULT);
    setRadiusOption(RADIUS_OPTIONS.DEFAULT);
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    setHighContrast(window.matchMedia('(prefers-contrast: high)').matches);
  }, []);

  const cssVariables = useMemo(() => {
    const colors = COLOR_PALETTES[colorScheme][actualMode];
    return {
      '--primary-color': colors.primary.main,
      '--primary-light': colors.primary.light,
      '--primary-dark': colors.primary.dark,
      '--secondary-color': colors.secondary.main,
      '--background-color': colors.background.default,
      '--surface-color': colors.background.paper,
      '--text-primary': colors.text.primary,
      '--text-secondary': colors.text.secondary,
      '--border-radius': `${RADIUS_VALUES[radiusOption]}px`,
      '--spacing-unit': `${SPACING_VALUES[spacingOption]}px`
    };
  }, [actualMode, colorScheme, radiusOption, spacingOption]);

  useEffect(() => {
    Object.entries(cssVariables).forEach(([key, value]) => {
      document.documentElement.style.setProperty(key, value);
    });
  }, [cssVariables]);

  const value = {
    mode,
    actualMode,
    colorScheme,
    fontOption,
    spacingOption,
    radiusOption,
    reducedMotion,
    highContrast,
    systemMode: systemModePref,
    isDarkMode: actualMode === THEME_MODES.DARK,
    isLightMode: actualMode === THEME_MODES.LIGHT,
    isSystemMode: mode === THEME_MODES.SYSTEM,
    toggleTheme,
    setLightMode,
    setDarkMode,
    setSystemMode,
    setColorScheme: setColorSchemeValue,
    setFontSize,
    setSpacing,
    setBorderRadius,
    toggleReducedMotion,
    toggleHighContrast,
    resetToDefaults,
    availableColorSchemes: Object.values(COLOR_SCHEMES),
    availableFontOptions: Object.values(FONT_OPTIONS),
    availableSpacingOptions: Object.values(SPACING_OPTIONS),
    availableRadiusOptions: Object.values(RADIUS_OPTIONS),
    cssVariables,
    muiTheme,
    getContrastColor: (color) => {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 128 ? '#000000' : '#ffffff';
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;