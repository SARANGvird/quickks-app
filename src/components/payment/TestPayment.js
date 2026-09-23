// src/components/Payment/TestPayment.js
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Divider,
  Card,
  CardContent
} from '@mui/material';
import { usePayment } from '../../contexts/PaymentContext';
import PaymentButton from './PaymentButton';

const TestPayment = () => {
  const [amount, setAmount] = useState(100);
  const [testCard, setTestCard] = useState('4111111111111111');
  const [testMessage, setTestMessage] = useState('');

  // Test card details
  const testCards = [
    { brand: 'Visa', number: '4111111111111111', cvv: '123', expiry: '12/25' },
    { brand: 'Mastercard', number: '5555555555554444', cvv: '123', expiry: '12/25' },
    { brand: 'Rupay', number: '6069851012345678', cvv: '123', expiry: '12/25' },
    { brand: 'Amex', number: '378282246310005', cvv: '1234', expiry: '12/25' }
  ];

  const handleSuccess = (response) => {
    setTestMessage('✅ Payment successful! (Test Mode)');
    console.log('Test payment success:', response);
  };

  const handleFailure = (error) => {
    setTestMessage('❌ Payment failed: ' + error);
    console.log('Test payment failed:', error);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h5" gutterBottom>
          🧪 Razorpay Test Mode
        </Typography>
        
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Test Mode Active:</strong> Use these test cards. No real money will be charged.
          </Typography>
        </Alert>

        {/* Test Cards */}
        <Typography variant="subtitle2" gutterBottom>
          Test Card Details:
        </Typography>
        
        <Stack spacing={1} sx={{ mb: 3 }}>
          {testCards.map((card, index) => (
            <Card key={index} variant="outlined">
              <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                <Typography variant="body2">
                  <strong>{card.brand}:</strong> {card.number} | CVV: {card.cvv} | Expiry: {card.expiry}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Test UPI IDs */}
        <Typography variant="subtitle2" gutterBottom>
          Test UPI IDs:
        </Typography>
        
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="body2">• success@razorpay (Payment success)</Typography>
          <Typography variant="body2">• failure@razorpay (Payment failure)</Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Test Scenarios */}
        <Typography variant="subtitle2" gutterBottom>
          Test Scenarios:
        </Typography>
        
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="body2">• Amount ₹100.00 - Successful payment</Typography>
          <Typography variant="body2">• Amount ₹200.00 - Payment requires authentication</Typography>
          <Typography variant="body2">• Amount ₹500.00 - Payment fails due to insufficient funds</Typography>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Test Message */}
        {testMessage && (
          <Alert 
            severity={testMessage.includes('✅') ? 'success' : 'error'}
            sx={{ mb: 2 }}
            onClose={() => setTestMessage('')}
          >
            {testMessage}
          </Alert>
        )}

        {/* Amount Input */}
        <TextField
          label="Test Amount (₹)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          fullWidth
          sx={{ mb: 2 }}
        />

        {/* Test Payment Button */}
        <PaymentButton
          amount={amount}
          bookingId="TEST_BOOKING_123"
          onSuccess={handleSuccess}
          onFailure={handleFailure}
          buttonText={`Test Pay ₹${amount}`}
          variant="contained"
          fullWidth
        />

        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            ⚠️ This is test mode. No real transactions will occur.
            Use test cards only.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};

export default TestPayment;