// src/pages/PaymentFailed.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { XCircle, RefreshCw, HeadphonesIcon, ArrowLeft } from 'lucide-react';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const errorMessage = location.state?.error || 'Your payment could not be processed';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full text-center"
      >
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle size={40} className="text-red-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h2>
        
        <p className="text-gray-600 mb-2">
          {errorMessage}
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          Don't worry, no charges have been made to your account.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full px-6 py-3 bg-yellow-500 rounded-xl text-gray-900 font-semibold hover:bg-yellow-400 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw size={18} />
            Try Again
          </button>

          <button
            onClick={() => navigate('/contact')}
            className="w-full px-6 py-3 border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <HeadphonesIcon size={18} />
            Contact Support
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full px-6 py-3 text-gray-600 hover:text-gray-900 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Return to Home
          </button>
        </div>

        {/* Helpful Tips */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
          <h4 className="font-semibold text-gray-900 mb-2">Common solutions:</h4>
          <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
            <li>Check if your card has sufficient funds</li>
            <li>Verify the CVV code is correct</li>
            <li>Ensure your card is not expired</li>
            <li>Try a different payment method</li>
            <li>Contact your bank to authorize the transaction</li>
          </ul>
        </div>
      </motion.div>
    </div>
  );
};

export default PaymentFailed;