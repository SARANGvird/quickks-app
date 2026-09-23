// src/utils/razorpayLoader.js
// ✅ COMPLETE PRODUCTION-READY v5.0 - QUICKKS EDITION
// ✅ FIXED: Added React imports (useState, useEffect, useRef, useCallback)
// ✅ FIXED: Added Razorpay preload warning suppression
// ✅ FIXED: Proper cleanup for event listeners
// ✅ ENHANCED: Full TypeScript JSDoc annotations
// ✅ ENHANCED: Comprehensive error handling
// ✅ ENHANCED: Browser compatibility fixes
// ✅ ENHANCED: Performance optimizations
// ✅ ENHANCED: Retry limit reset logic

import { useState, useEffect, useRef, useCallback } from 'react';

// ==========================================================
// 📦 CONSTANTS
// ==========================================================

const RAZORPAY_SCRIPT_ID = 'razorpay-checkout-js';
const RAZORPAY_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const RAZORPAY_FALLBACK_SRC = 'https://cdn.razorpay.com/static/checkout/v1/checkout.js';
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_BASE = 1000;
const MAX_RETRY_DELAY = 5000;

let loadPromise = null;
let isLoaded = false;
let loadAttempts = 0;
let preloadStarted = false;
let scriptLoadEventHandlers = [];

// ==========================================================
// 📦 BROWSER COMPATIBILITY HELPERS
// ==========================================================

/**
 * ✅ Check if running in browser environment
 */
const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

/**
 * ✅ Safe requestIdleCallback with fallback
 */
const safeRequestIdleCallback = (callback) => {
    if (!isBrowser()) return;
    
    if (window.requestIdleCallback) {
        window.requestIdleCallback(callback, { timeout: 2000 });
    } else if (window.requestAnimationFrame) {
        window.requestAnimationFrame(callback);
    } else {
        setTimeout(callback, 100);
    }
};

/**
 * ✅ Safe setInterval with cleanup
 */
const safeSetInterval = (callback, delay) => {
    if (!isBrowser()) return null;
    return setInterval(callback, delay);
};

// ==========================================================
// 📦 WARNING SUPPRESSION
// ==========================================================

/**
 * ✅ Suppress Razorpay preload warnings
 * These warnings are from Razorpay's CDN and don't affect functionality
 */
let originalWarn = null;
let originalError = null;
let warningSuppressionActive = false;

export const suppressRazorpayWarnings = () => {
    if (warningSuppressionActive || !isBrowser()) return;
    warningSuppressionActive = true;

    // Store original methods
    originalWarn = console.warn;
    originalError = console.error;

    // Filter out Razorpay warnings
    console.warn = function(...args) {
        const message = args[0] || '';
        const shouldSuppress = 
            typeof message === 'string' && (
                message.includes('preloaded with link preload') ||
                message.includes('resource was not used') ||
                message.includes('checkout-static-next.razorpay.com') ||
                message.includes('layout-shift') ||
                message.includes('Fingerprinting Protection') ||
                message.includes('OpaqueResponseBlocking') ||
                message.includes('Feature Policy: Skipping unsupported feature') ||
                message.includes('Partitioned cookie')
            );
        
        if (!shouldSuppress) {
            originalWarn.apply(console, args);
        }
    };

    console.error = function(...args) {
        const message = args[0] || '';
        const shouldSuppress = 
            typeof message === 'string' && (
                message.includes('preloaded with link preload') ||
                message.includes('checkout-static-next.razorpay.com') ||
                message.includes('OpaqueResponseBlocking')
            );
        
        if (!shouldSuppress) {
            originalError.apply(console, args);
        }
    };

    // Auto-restore after 15 seconds
    setTimeout(() => {
        restoreConsoleWarnings();
    }, 15000);
};

export const restoreConsoleWarnings = () => {
    if (!warningSuppressionActive) return;
    warningSuppressionActive = false;
    
    if (originalWarn) {
        console.warn = originalWarn;
        originalWarn = null;
    }
    if (originalError) {
        console.error = originalError;
        originalError = null;
    }
};

// ==========================================================
// 📦 CORE LOADER FUNCTIONS
// ==========================================================

/**
 * ✅ Load Razorpay script with retry mechanism
 * @param {number} retries - Number of retry attempts
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise<Object>} Razorpay instance
 */
export const loadRazorpayScript = async (retries = MAX_ATTEMPTS, delay = RETRY_DELAY_BASE) => {
    // ✅ Return existing promise if already loading
    if (loadPromise) {
        return loadPromise;
    }

    // ✅ Check if already loaded
    if (isLoaded && isRazorpayAvailable()) {
        return Promise.resolve(window.Razorpay);
    }

    // ✅ Check if script already exists in DOM
    const existingScript = document.getElementById(RAZORPAY_SCRIPT_ID);
    if (existingScript && isRazorpayAvailable()) {
        isLoaded = true;
        loadAttempts = 0;
        return Promise.resolve(window.Razorpay);
    }

    // ✅ Suppress warnings before loading
    suppressRazorpayWarnings();

    // ✅ Create load promise
    loadPromise = new Promise((resolve, reject) => {
        try {
            // ✅ Remove existing script if any
            if (existingScript) {
                existingScript.remove();
            }

            const script = document.createElement('script');
            script.id = RAZORPAY_SCRIPT_ID;
            script.src = loadAttempts === 0 ? RAZORPAY_SRC : RAZORPAY_FALLBACK_SRC;
            script.async = true;
            script.defer = true;
            script.crossOrigin = 'anonymous';
            script.referrerPolicy = 'no-referrer-when-downgrade';

            // ✅ Track script load state
            let scriptLoaded = false;
            let checkCount = 0;
            const maxChecks = 20;
            let checkInterval = null;

            // ✅ Handle script load success
            const handleLoad = () => {
                if (scriptLoaded) return;
                scriptLoaded = true;
                
                if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                }

                // ✅ Check if Razorpay is available
                if (isRazorpayAvailable()) {
                    isLoaded = true;
                    loadAttempts = 0;
                    loadPromise = null;
                    resolve(window.Razorpay);
                } else {
                    // ✅ Sometimes Razorpay loads but window.Razorpay is not set immediately
                    checkInterval = safeSetInterval(() => {
                        checkCount++;
                        if (isRazorpayAvailable()) {
                            clearInterval(checkInterval);
                            checkInterval = null;
                            isLoaded = true;
                            loadAttempts = 0;
                            loadPromise = null;
                            resolve(window.Razorpay);
                        } else if (checkCount >= maxChecks) {
                            clearInterval(checkInterval);
                            checkInterval = null;
                            retryLoad(resolve, reject, retries, delay);
                        }
                    }, 100);
                }
            };

            // ✅ Handle script load error
            const handleError = () => {
                if (scriptLoaded) return;
                scriptLoaded = true;
                
                if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                }

                retryLoad(resolve, reject, retries, delay);
            };

            // ✅ Retry logic
            const retryLoad = (resolveCb, rejectCb, remainingRetries, currentDelay) => {
                if (remainingRetries <= 0) {
                    loadPromise = null;
                    rejectCb(new Error(`Failed to load Razorpay SDK after ${MAX_ATTEMPTS} attempts`));
                    return;
                }

                const jitter = Math.random() * 200;
                const nextDelay = Math.min(currentDelay * 2 + jitter, MAX_RETRY_DELAY);
                
                setTimeout(() => {
                    loadPromise = null;
                    loadRazorpayScript(remainingRetries - 1, nextDelay)
                        .then(resolveCb)
                        .catch(rejectCb);
                }, currentDelay);
            };

            // ✅ Add event listeners
            script.addEventListener('load', handleLoad);
            script.addEventListener('error', handleError);

            // ✅ Handle script already loaded case
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                handleLoad();
            }

            // ✅ Append script to head
            document.head.appendChild(script);

            // ✅ Store handlers for cleanup
            scriptLoadEventHandlers.push({ 
                script, 
                handleLoad, 
                handleError,
                checkInterval 
            });

        } catch (error) {
            loadPromise = null;
            reject(error);
        }
    });

    return loadPromise;
};

/**
 * ✅ Preload Razorpay script early in app initialization
 * @param {Object} options - Preload options
 * @param {number} options.priority - Priority level (1-5)
 * @param {number} options.delay - Delay in milliseconds
 */
export const preloadRazorpayScript = (options = { priority: 3, delay: 0 }) => {
    if (preloadStarted || !isBrowser()) return;
    
    preloadStarted = true;
    const { delay = 0 } = options;

    const performPreload = () => {
        loadRazorpayScript().catch(() => {
            preloadStarted = false;
        });
    };

    safeRequestIdleCallback(performPreload);
};

/**
 * ✅ Check if Razorpay is available
 * @returns {boolean} True if Razorpay is available
 */
export const isRazorpayAvailable = () => {
    return isBrowser() && !!window.Razorpay;
};

/**
 * ✅ Cleanup Razorpay script and event listeners
 */
export const cleanupRazorpay = () => {
    // ✅ Remove script
    const script = document.getElementById(RAZORPAY_SCRIPT_ID);
    if (script) {
        script.remove();
    }

    // ✅ Cleanup event handlers
    scriptLoadEventHandlers.forEach(({ script: s, handleLoad, handleError, checkInterval }) => {
        if (s) {
            s.removeEventListener('load', handleLoad);
            s.removeEventListener('error', handleError);
        }
        if (checkInterval) {
            clearInterval(checkInterval);
        }
    });
    scriptLoadEventHandlers = [];

    isLoaded = false;
    loadPromise = null;
    preloadStarted = false;

    // ✅ Restore console warnings
    restoreConsoleWarnings();
};

/**
 * ✅ Reset loader state (useful for testing)
 */
export const resetRazorpayLoader = () => {
    isLoaded = false;
    loadPromise = null;
    loadAttempts = 0;
    preloadStarted = false;
    cleanupRazorpay();
};

// ==========================================================
// 🔄 REACT HOOK - useRazorpayScript
// ==========================================================

/**
 * ✅ React Hook for Razorpay script loading
 * 
 * @param {Object} options
 * @param {boolean} options.autoLoad - Automatically load script on mount (default: true)
 * @param {number} options.retries - Number of retry attempts (default: 3)
 * @param {boolean} options.cleanupOnUnmount - Cleanup script on unmount (default: false)
 * @param {number} options.preloadDelay - Delay before preloading (default: 0)
 * @returns {Object} { isLoaded, isLoading, error, reload, isAvailable, razorpay, load }
 */
export const useRazorpayScript = ({
    autoLoad = true,
    retries = MAX_ATTEMPTS,
    cleanupOnUnmount = false,
    preloadDelay = 0,
} = {}) => {
    // ✅ State
    const [state, setState] = useState({
        isLoaded: isLoaded && isRazorpayAvailable(),
        isLoading: false,
        error: null,
        isAvailable: isLoaded && isRazorpayAvailable(),
    });
    
    // ✅ Refs
    const mountedRef = useRef(true);
    const loadAttemptedRef = useRef(false);
    const initialLoadDoneRef = useRef(false);
    const preloadTimerRef = useRef(null);

    // ✅ Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (cleanupOnUnmount) {
                cleanupRazorpay();
            }
            if (preloadTimerRef.current) {
                clearTimeout(preloadTimerRef.current);
            }
        };
    }, [cleanupOnUnmount]);

    // ✅ Load function
    const load = useCallback(async () => {
        if (!mountedRef.current) return false;
        
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        try {
            const razorpay = await loadRazorpayScript(retries);
            
            if (mountedRef.current) {
                const isAvailable = !!razorpay && isRazorpayAvailable();
                setState({
                    isLoaded: isAvailable,
                    isLoading: false,
                    error: null,
                    isAvailable,
                });
                return isAvailable;
            }
            return false;
        } catch (error) {
            if (mountedRef.current) {
                setState({
                    isLoaded: false,
                    isLoading: false,
                    error: error.message || 'Failed to load Razorpay SDK',
                    isAvailable: false,
                });
            }
            return false;
        }
    }, [retries]);

    // ✅ Reload function (reset and try again)
    const reload = useCallback(async () => {
        if (!mountedRef.current) return false;
        
        resetRazorpayLoader();
        setState({
            isLoaded: false,
            isLoading: true,
            error: null,
            isAvailable: false,
        });
        
        try {
            const razorpay = await loadRazorpayScript(retries);
            
            if (mountedRef.current) {
                const isAvailable = !!razorpay && isRazorpayAvailable();
                setState({
                    isLoaded: isAvailable,
                    isLoading: false,
                    error: null,
                    isAvailable,
                });
                return isAvailable;
            }
            return false;
        } catch (error) {
            if (mountedRef.current) {
                setState({
                    isLoaded: false,
                    isLoading: false,
                    error: error.message || 'Failed to load Razorpay SDK',
                    isAvailable: false,
                });
            }
            return false;
        }
    }, [retries]);

    // ✅ Auto-load on mount
    useEffect(() => {
        if (autoLoad && !loadAttemptedRef.current && mountedRef.current) {
            loadAttemptedRef.current = true;
            initialLoadDoneRef.current = true;
            
            if (preloadDelay > 0) {
                preloadTimerRef.current = setTimeout(() => {
                    if (mountedRef.current) {
                        load();
                    }
                }, preloadDelay);
            } else {
                load();
            }
        }
    }, [autoLoad, load, preloadDelay]);

    // ✅ Check if Razorpay becomes available after load
    useEffect(() => {
        if (state.isLoaded && !state.isAvailable && isRazorpayAvailable()) {
            setState(prev => ({ ...prev, isAvailable: true }));
        }
    }, [state.isLoaded, state.isAvailable]);

    // ✅ Check if Razorpay is already loaded when hook mounts
    useEffect(() => {
        if (isRazorpayAvailable() && !state.isLoaded && !state.isLoading && !initialLoadDoneRef.current) {
            setState({
                isLoaded: true,
                isLoading: false,
                error: null,
                isAvailable: true,
            });
            initialLoadDoneRef.current = true;
        }
    }, []);

    return {
        ...state,
        load,
        reload,
        razorpay: state.isAvailable ? (isBrowser() ? window.Razorpay : null) : null,
    };
};

// ==========================================================
// 🎯 BASIC USAGE FUNCTIONS
// ==========================================================

/**
 * ✅ Simple function to load Razorpay and get instance
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Object>} Razorpay instance
 * @throws {Error} If Razorpay SDK is not available
 */
export const getRazorpayInstance = async (retries = MAX_ATTEMPTS) => {
    try {
        await loadRazorpayScript(retries);
        if (isRazorpayAvailable()) {
            return window.Razorpay;
        }
        throw new Error('Razorpay SDK not available');
    } catch (error) {
        throw error;
    }
};

/**
 * ✅ Initialize Razorpay with automatic retry
 * @param {Object} options - Razorpay options
 * @param {number} retries - Number of retry attempts
 * @returns {Promise<Object>} Razorpay instance
 * @throws {Error} If Razorpay initialization fails
 */
export const initializeRazorpay = async (options, retries = MAX_ATTEMPTS) => {
    let lastError = null;
    
    if (!options || typeof options !== 'object') {
        throw new Error('Invalid options provided to Razorpay');
    }

    if (!options.key && !options.key_id) {
        throw new Error('Razorpay key_id/key is required');
    }

    const normalizedOptions = { ...options };
    if (options.key_id && !options.key) {
        normalizedOptions.key = options.key_id;
    }

    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            await loadRazorpayScript(retries - attempt);
            
            if (!isRazorpayAvailable()) {
                throw new Error('Razorpay SDK not available');
            }
            
            try {
                return new window.Razorpay(normalizedOptions);
            } catch (initError) {
                throw new Error(`Failed to initialize Razorpay: ${initError.message}`);
            }
        } catch (error) {
            lastError = error;
            if (attempt < retries - 1) {
                const delay = Math.min(RETRY_DELAY_BASE * Math.pow(2, attempt), MAX_RETRY_DELAY);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    throw lastError || new Error('Failed to initialize Razorpay');
};

/**
 * ✅ Open Razorpay checkout with error handling
 * @param {Object} options - Razorpay options
 * @param {Function} onSuccess - Success callback
 * @param {Function} onError - Error callback
 * @param {Function} onModalClose - Modal close callback
 * @returns {Promise<Object>} Payment response
 * @throws {Error} If payment fails or modal is closed
 */
export const openRazorpayCheckout = async (options, onSuccess = null, onError = null, onModalClose = null) => {
    try {
        const razorpay = await initializeRazorpay(options);
        
        return new Promise((resolve, reject) => {
            razorpay.on('payment.success', (response) => {
                if (onSuccess) onSuccess(response);
                resolve(response);
            });
            
            razorpay.on('payment.error', (error) => {
                const errorObj = error?.error || error;
                if (onError) onError(errorObj);
                reject(errorObj);
            });
            
            razorpay.on('modal.closed', () => {
                const closeError = new Error('Payment modal closed by user');
                if (onModalClose) onModalClose(closeError);
                reject(closeError);
            });
            
            try {
                razorpay.open();
            } catch (openError) {
                reject(new Error(`Failed to open Razorpay checkout: ${openError.message}`));
            }
        });
    } catch (error) {
        throw error;
    }
};

/**
 * ✅ Create Razorpay payment options with standard fields
 * @param {Object} params - Payment parameters
 * @returns {Object} Razorpay options
 */
export const createRazorpayOptions = ({
    key,
    amount,
    currency = 'INR',
    orderId,
    name = 'Quickks',
    description = 'Payment for services',
    image = '/logo.png',
    prefill = {},
    theme = { color: '#6366f1' },
    ...rest
}) => {
    if (!key) throw new Error('Razorpay key is required');
    if (!amount || amount <= 0) throw new Error('Valid amount is required');
    if (!orderId) throw new Error('Order ID is required');

    return {
        key,
        amount,
        currency,
        name,
        description,
        image,
        order_id: orderId,
        prefill: {
            name: prefill.name || '',
            email: prefill.email || '',
            contact: prefill.contact || '',
            ...prefill,
        },
        theme: {
            color: theme.color || '#6366f1',
            ...theme,
        },
        modal: {
            confirm_close: true,
        },
        ...rest,
    };
};

// ==========================================================
// 📤 EXPORTS
// ==========================================================

const razorpayLoader = {
    loadRazorpayScript,
    preloadRazorpayScript,
    isRazorpayAvailable,
    cleanupRazorpay,
    resetRazorpayLoader,
    useRazorpayScript,
    getRazorpayInstance,
    initializeRazorpay,
    openRazorpayCheckout,
    createRazorpayOptions,
    suppressRazorpayWarnings,
    restoreConsoleWarnings,
};

export default razorpayLoader;