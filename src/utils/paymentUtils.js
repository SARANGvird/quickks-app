// src/utils/paymentUtils.js
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const validatePayment = (amount, bookingId, paymentMethod) => {
  if (!amount || amount <= 0) return false;
  if (!bookingId) return false;
  if (!paymentMethod) return false;
  if (amount > 1000000) return false; // Max ₹10,00,000
  return true;
};

export const encryptData = async (data) => {
  // Implement encryption logic
  return btoa(JSON.stringify(data));
};

export const decryptData = async (encryptedData) => {
  // Implement decryption logic
  return JSON.parse(atob(encryptedData));
};

export const validateCardNumber = (number) => {
  const cleaned = number.replace(/\s/g, '');
  if (!/^\d+$/.test(cleaned)) return false;
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);
    if (isEven) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    isEven = !isEven;
  }
  return sum % 10 === 0;
};