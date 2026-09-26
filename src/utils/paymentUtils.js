// src/utils/paymentUtils.js

/**
 * Formats a numeric amount into Indian standard currency format (INR).
 * Example: 1000000 -> "₹10,00,000.00"
 * 
 * @param {number} amount - The numerical amount to format.
 * @returns {string} Formatted INR currency string.
 */
export const formatCurrency = (amount) => {
  const numericAmount = Number(amount);
  if (isNaN(numericAmount) || !isFinite(numericAmount)) {
    return '₹0.00';
  }

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericAmount);
};

/**
 * Validates core attributes of a payment request.
 * 
 * @param {number} amount - Payment amount in INR.
 * @param {string} bookingId - Unique identifier for the booking.
 * @param {string} paymentMethod - Payment method token/string (e.g., 'UPI', 'CARD', 'NETBANKING').
 * @returns {boolean} True if payload passes structural validation.
 */
export const validatePayment = (amount, bookingId, paymentMethod) => {
  const numericAmount = Number(amount);

  // Validate amount
  if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 1000000) {
    return false;
  }

  // Validate booking ID
  if (typeof bookingId !== 'string' && typeof bookingId !== 'number') {
    return false;
  }
  const cleanBookingId = String(bookingId).trim();
  if (cleanBookingId.length === 0 || cleanBookingId.length > 100) {
    return false;
  }

  // Validate payment method
  if (typeof paymentMethod !== 'string') {
    return false;
  }
  const cleanPaymentMethod = paymentMethod.trim();
  if (cleanPaymentMethod.length === 0 || cleanPaymentMethod.length > 50) {
    return false;
  }

  return true;
};

/**
 * Generates an AES-GCM CryptoKey object from a raw key string or byte array using SHA-256.
 * 
 * @param {string|Uint8Array} secretKey - The secret key source material.
 * @returns {Promise<CryptoKey>} Web Crypto API key ready for encryption/decryption.
 */
const deriveCryptoKey = async (secretKey) => {
  const encoder = new TextEncoder();
  const keyData = typeof secretKey === 'string' ? encoder.encode(secretKey) : secretKey;
  
  // Hash secretKey to ensure a fixed 256-bit (32 byte) key length for AES-GCM
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', keyData);
  
  return window.crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

/**
 * Encrypts arbitrary serializable data using AES-GCM (Authenticated Encryption).
 * Output is Base64 encoded to safely transfer via HTTP/JSON.
 * 
 * @param {Object|Array|string|number} data - Data to encrypt.
 * @param {string} secretKey - Secret passphrase/key used for encryption.
 * @returns {Promise<string>} Base64-encoded string combining IV and Ciphertext.
 */
export const encryptData = async (data, secretKey) => {
  if (data === undefined) {
    throw new Error('Data to encrypt cannot be undefined.');
  }
  if (!secretKey || typeof secretKey !== 'string') {
    throw new Error('A valid secret key string must be provided for encryption.');
  }

  try {
    const key = await deriveCryptoKey(secretKey);
    const jsonString = JSON.stringify(data);
    const encodedPayload = new TextEncoder().encode(jsonString);

    // Generate a secure 12-byte initialization vector (IV) for AES-GCM
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedPayload
    );

    // Combine IV (12 bytes) and Ciphertext into a single Uint8Array
    const cipherTextArray = new Uint8Array(encryptedBuffer);
    const combinedBuffer = new Uint8Array(iv.length + cipherTextArray.length);
    combinedBuffer.set(iv, 0);
    combinedBuffer.set(cipherTextArray, iv.length);

    // Convert binary buffer to Base64 string for clean network transmission
    let binaryString = '';
    const bytes = combinedBuffer;
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }

    return btoa(binaryString);
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt payment data.');
  }
};

/**
 * Decrypts data created by `encryptData`.
 * 
 * @param {string} encryptedBase64 - Base64 encoded combined IV and Ciphertext string.
 * @param {string} secretKey - Secret passphrase/key used during encryption.
 * @returns {Promise<any>} Original JavaScript object or value.
 */
export const decryptData = async (encryptedBase64, secretKey) => {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    throw new Error('Invalid encrypted input string.');
  }
  if (!secretKey || typeof secretKey !== 'string') {
    throw new Error('A valid secret key string must be provided for decryption.');
  }

  try {
    const key = await deriveCryptoKey(secretKey);

    // Decode Base64 string to Uint8Array
    const binaryString = atob(encryptedBase64);
    const combinedBuffer = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combinedBuffer[i] = binaryString.charCodeAt(i);
    }

    if (combinedBuffer.length < 13) {
      throw new Error('Invalid payload size.');
    }

    // Extract IV (first 12 bytes) and Ciphertext
    const iv = combinedBuffer.slice(0, 12);
    const cipherText = combinedBuffer.slice(12);

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherText
    );

    const decodedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decodedString);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data or authentication check failed.');
  }
};

/**
 * Validates standard Credit/Debit card numbers against the Luhn (Mod 10) algorithm.
 * Automatically sanitizes whitespace, hyphens, and non-numeric characters.
 * 
 * @param {string|number} number - Credit/debit card number.
 * @returns {boolean} True if card number passes checksum and length criteria.
 */
export const validateCardNumber = (number) => {
  if (number === null || number === undefined) return false;

  // Clean input string (strip all non-digit characters)
  const cleaned = String(number).replace(/\D/g, '');

  // Standard primary account numbers (PAN) range between 13 and 19 digits
  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEvenPosition = false;

  // Luhn Algorithm calculation starting from rightmost digit
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEvenPosition) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEvenPosition = !isEvenPosition;
  }

  return sum % 10 === 0;
};