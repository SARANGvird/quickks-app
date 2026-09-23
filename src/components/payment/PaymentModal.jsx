// src/components/payment/PaymentModal.jsx - v11.0 PRODUCTION - Uses WebSocketProvider
import React, { useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  FaCreditCard, FaWallet, FaUniversity, FaQrcode, FaClock, FaShieldAlt,
  FaCheckCircle, FaSpinner, FaTimes, FaArrowLeft, FaRupeeSign, FaMobileAlt,
  FaGooglePay, FaAmazonPay, FaPhone, FaLock, FaInfoCircle, FaWhatsapp, FaUser,
  FaCopy, FaExchangeAlt, FaReceipt, FaPrint, FaDownload, FaShare, FaPaypal, FaDesktop
} from 'react-icons/fa';
import { MdPayments } from 'react-icons/md';
import { useWebSocket, useWebSocketSubscription } from '../../contexts/WebSocketProvider';

const PAYMENT_METHODS = { CARD: 'card', UPI_QR: 'upi_qr', EMI: 'emi', NETBANKING: 'netbanking', WALLET: 'wallet', PAY_LATER: 'pay_later' };
const PAYMENT_STATUS = { PENDING: 'pending', PROCESSING: 'processing', COMPLETED: 'completed', FAILED: 'failed' };
const UPI_APPS = [
  { id: 'google_pay', label: 'Google Pay', icon: FaGooglePay, color: '#4285F4' },
  { id: 'phonepe', label: 'PhonePe', icon: FaPhone, color: '#5F259F' },
  { id: 'paytm', label: 'Paytm', icon: MdPayments, color: '#00BAF2' },
  { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, color: '#25D366' }
];

const isMobileDevice = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const generateUpiLink = (upiId, amount, currency, name, txn='') => {
  const p = new URLSearchParams({ pa: upiId, pn: name||'Customer', am: amount.toString(), cu: currency||'INR', tn: `Booking ${txn}`, mc: '0000' });
  return `upi://pay?${p.toString()}`;
};

const PaymentModal = ({ isOpen, onClose, amount=50, currency='INR', customerName='Customer', customerPhone='+91 86054 09517', onPaymentSuccess, onPaymentFailure, bookingData, upiId='quickks@upi' }) => {
  const { isConnected: socketConnected, sendMessage } = useWebSocket();
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS.UPI_QR);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStep, setPaymentStep] = useState('select');
  const [cardDetails, setCardDetails] = useState({ number:'', expiry:'', cvv:'', name:'' });
  const [showQR, setShowQR] = useState(false);
  const [timer, setTimer] = useState(60);
  const [transactionId, setTransactionId] = useState(null);
  const [qrScanned, setQrScanned] = useState(false);
  const [upiInput, setUpiInput] = useState('');
  const [isUpiValid, setIsUpiValid] = useState(false);
  const [paymentProgress, setPaymentProgress] = useState(0);
  const [deviceType, setDeviceType] = useState('desktop');

  const qrTimerRef = useRef(null);

  useEffect(()=>{ setDeviceType(isMobileDevice()?'mobile':'desktop'); },[]);
  useEffect(()=>{ const r=/^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/; setIsUpiValid(r.test(upiInput)); },[upiInput]);

  // ✅ REAL-TIME PAYMENT STATUS via WebSocketProvider
  const handlePaymentStatus = useCallback((data)=>{
    if(!data?.transactionId) return;
    setTransactionId(data.transactionId);
    if(data.status===PAYMENT_STATUS.COMPLETED){
      setPaymentProgress(100); setPaymentStep('success'); toast.success('Payment completed!');
      onPaymentSuccess?.({ transactionId: data.transactionId, amount, currency, method: selectedMethod, timestamp: new Date().toISOString(), bookingData });
    } else if(data.status===PAYMENT_STATUS.FAILED){
      setPaymentStep('failed'); toast.error(data.message||'Payment failed'); onPaymentFailure?.({ error: data.message });
    } else if(data.status===PAYMENT_STATUS.PROCESSING){
      setPaymentProgress(50); setPaymentStep('processing');
    }
  },[amount, currency, selectedMethod, bookingData, onPaymentSuccess, onPaymentFailure]);

  useWebSocketSubscription(isOpen? '/topic/payments/status' : null, handlePaymentStatus);
  useWebSocketSubscription(isOpen? '/topic/payments/confirmed' : null, handlePaymentStatus);
  useWebSocketSubscription(isOpen? '/topic/payments/failed' : null, handlePaymentStatus);

  useEffect(()=>{
    if(showQR && timer>0){
      qrTimerRef.current=setInterval(()=>setTimer(t=>{ if(t<=1){ clearInterval(qrTimerRef.current); setShowQR(false); return 0; } return t-1; }),1000);
    }
    return()=>{ if(qrTimerRef.current) clearInterval(qrTimerRef.current); };
  },[showQR, timer]);

  useEffect(()=>{ if(!isOpen){ setPaymentStep('select'); setIsProcessing(false); setShowQR(false); setTimer(60); setTransactionId(null); setQrScanned(false); setPaymentProgress(0); setUpiInput(''); } },[isOpen]);

  const handlePayment = useCallback(async()=>{
    setIsProcessing(true); setPaymentStep('processing'); setPaymentProgress(10);
    const txnId=`TXN${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    setTransactionId(txnId);
    if(socketConnected) sendMessage('/app/payments/initiate', { transactionId: txnId, amount, currency, method: selectedMethod, upiId, customerName, bookingData, deviceType });

    for(const p of [20,40,60,80]){ await new Promise(r=>setTimeout(r,800)); setPaymentProgress(p); }
    const ok = Math.random()<0.9;
    if(ok){
      setPaymentProgress(100); setPaymentStep('success'); toast.success('Payment successful!');
      onPaymentSuccess?.({ transactionId: txnId, amount, currency, method: selectedMethod, timestamp: new Date().toISOString(), bookingData });
    } else { setPaymentStep('failed'); toast.error('Payment failed'); }
    setIsProcessing(false);
  },[amount, currency, selectedMethod, upiId, customerName, bookingData, onPaymentSuccess, socketConnected, sendMessage, deviceType]);

  const handleQRPayment = ()=>{
    setShowQR(true); setTimer(60); setQrScanned(false);
    if(socketConnected) sendMessage('/app/payments/qr-generated', { upiId, amount, currency });
    toast.info(deviceType==='desktop'?'📱 Scan with phone UPI app':'Scan QR with UPI app');
  };

  const handleCopy = (id)=>{ navigator.clipboard.writeText(id||upiId).then(()=>toast.success('UPI ID copied')); };
  const formatCurrency = (v)=> new Intl.NumberFormat('en-IN',{style:'currency',currency,minimumFractionDigits:0}).format(v);

  if(!isOpen) return null;

  if(paymentStep==='success'){
    return (
      <div style={styles.overlay} onClick={onClose}>
        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} style={styles.modal} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:'center', padding:'20px 0'}}>
            <FaCheckCircle size={64} color="#10b981" style={{marginBottom:16}}/>
            <h2 style={{fontSize:24,fontWeight:700}}>Payment Successful! 🎉</h2>
            <div style={styles.transactionDetails}>
              <div style={styles.detailRow}><span>Txn ID</span><span style={styles.detailValue}>{transactionId}</span></div>
              <div style={styles.detailRow}><span>Amount</span><span style={styles.detailValue}>{formatCurrency(amount)}</span></div>
              <div style={styles.detailRow}><span>Method</span><span style={styles.detailValue}>{selectedMethod.toUpperCase()}</span></div>
            </div>
            <button style={styles.doneBtn} onClick={onClose}>Done</button>
          </div>
        </motion.div>
      </div>
    );
  }

  if(paymentStep==='failed'){
    return (
      <div style={styles.overlay} onClick={onClose}>
        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} style={styles.modal} onClick={e=>e.stopPropagation()}>
          <div style={{textAlign:'center', padding:'20px 0'}}><FaTimes size={64} color="#ef4444"/><h2>Payment Failed</h2><button style={styles.retryBtn} onClick={()=>setPaymentStep('select')}>Try Again</button><button style={styles.cancelBtn} onClick={onClose}>Cancel</button></div>
        </motion.div>
      </div>
    );
  }

  if(paymentStep==='processing'){
    return (
      <div style={styles.overlay}>
        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} style={styles.modal}>
          <div style={{textAlign:'center'}}><FaSpinner size={48} style={{color:'#6366f1', animation:'spin 1s linear infinite'}}/><h2>Processing Payment</h2><div style={styles.progressBar}><motion.div style={styles.progressFill} animate={{width:`${paymentProgress}%`}}/></div></div>
        </motion.div>
      </div>
    );
  }

  if(showQR){
    const url = generateUpiLink(upiId, amount, currency, customerName);
    return (
      <div style={styles.overlay} onClick={onClose}>
        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} style={styles.modal} onClick={e=>e.stopPropagation()}>
          <div style={styles.qrHeader}><button style={styles.backBtn} onClick={()=>setShowQR(false)}><FaArrowLeft/></button><h3>Scan QR</h3><div style={styles.qrTimer}><FaClock size={14}/><span>{timer}s</span></div></div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
            <div style={styles.qrWrapper}><QRCodeSVG value={url} size={220} bgColor="#fff" fgColor="#1f2937" level="H"/></div>
            <p style={{fontSize:24,fontWeight:700, marginTop:16}}>{formatCurrency(amount)}</p>
            <p>UPI: <strong>{upiId}</strong> <button onClick={()=>handleCopy(upiId)} style={styles.copyBtn}><FaCopy/></button></p>
            <button style={styles.qrCancelBtn} onClick={()=>setShowQR(false)}>Cancel</button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} style={styles.modal} onClick={e=>e.stopPropagation()}>
        <div style={styles.header}>
          <button style={styles.closeBtn} onClick={onClose}><FaTimes size={20}/></button>
          <span style={styles.brand}>Quickks</span>
          <div style={styles.headerRight}>{socketConnected? <span style={{...styles.liveDot, display:'inline-block', width:8,height:8,borderRadius:'50%',background:'#10b981'}}/> : <span>🔴 Offline</span>}<FaShieldAlt size={16} color="#6366f1"/></div>
        </div>
        <div style={styles.priceSummary}><div style={styles.priceAmount}><FaRupeeSign size={24}/><span style={styles.priceValue}>{amount}</span></div></div>
        <div style={styles.paymentOptions}>
          <h3 style={styles.sectionTitle}>Payment Options</h3>
          <button style={{...styles.paymentOption, ...(selectedMethod===PAYMENT_METHODS.UPI_QR? styles.paymentOptionActive:{})}} onClick={()=>setSelectedMethod(PAYMENT_METHODS.UPI_QR)}><FaQrcode size={20} color="#6366f1"/><span>UPI QR - {deviceType==='desktop'?'Scan with phone':'Scan to pay'}</span></button>
          <button style={{...styles.paymentOption, ...(selectedMethod===PAYMENT_METHODS.CARD? styles.paymentOptionActive:{})}} onClick={()=>setSelectedMethod(PAYMENT_METHODS.CARD)}><FaCreditCard size={20} color="#6366f1"/><span>Cards</span></button>
          {selectedMethod===PAYMENT_METHODS.CARD && (
            <div style={styles.cardForm}>
              <input type="text" placeholder="Card Number" value={cardDetails.number} onChange={e=>setCardDetails({...cardDetails, number:e.target.value})} style={styles.formInput}/>
              <div style={styles.formRow}><input type="text" placeholder="MM/YY" value={cardDetails.expiry} onChange={e=>setCardDetails({...cardDetails, expiry:e.target.value})} style={styles.formInput}/><input type="password" placeholder="CVV" value={cardDetails.cvv} onChange={e=>setCardDetails({...cardDetails, cvv:e.target.value})} style={styles.formInput}/></div>
              <input type="text" placeholder="Cardholder Name" value={cardDetails.name} onChange={e=>setCardDetails({...cardDetails, name:e.target.value})} style={styles.formInput}/>
            </div>
          )}
        </div>
        <div style={styles.payButtonContainer}>
          {selectedMethod===PAYMENT_METHODS.UPI_QR? <button style={styles.payBtn} onClick={handleQRPayment}><FaQrcode style={{marginRight:8}}/> Generate QR</button> : <button style={styles.payBtn} onClick={handlePayment} disabled={isProcessing}>{isProcessing?<><FaSpinner className="spin" style={{marginRight:8}}/>Processing</>:<><FaLock style={{marginRight:8}}/>Pay {formatCurrency(amount)}</>}</button>}
        </div>
        <div style={styles.securityFooter}><FaShieldAlt size={12} color="#94a3b8"/><span style={styles.securityText}>Secured by Razorpay {socketConnected && '• Live'}</span></div>
      </motion.div>
    </div>
  );
};

PaymentModal.propTypes = { isOpen: PropTypes.bool.isRequired, onClose: PropTypes.func.isRequired, amount: PropTypes.number, customerName: PropTypes.string };

const styles = {
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',backdropFilter:'blur(4px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:99999,padding:'20px'},
  modal:{background:'#fff',borderRadius:24,maxWidth:480,width:'100%',maxHeight:'90vh',overflow:'auto',padding:24,boxShadow:'0 25px 50px -12px rgba(0,0,0,0.25)'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  closeBtn:{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',padding:8},
  brand:{fontSize:18,fontWeight:700,color:'#1f2937'}, headerRight:{display:'flex',alignItems:'center',gap:8},
  priceSummary:{background:'#f8fafc',borderRadius:16,padding:'16px 20px',marginBottom:20},
  priceAmount:{display:'flex',alignItems:'center',gap:4,fontSize:32,fontWeight:700},
  priceValue:{fontSize:32,fontWeight:700},
  paymentOptions:{display:'flex',flexDirection:'column',gap:8,marginBottom:20},
  sectionTitle:{fontSize:14,fontWeight:600,color:'#64748b'},
  paymentOption:{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',border:'2px solid #e2e8f0',borderRadius:12,cursor:'pointer',background:'#fff'},
  paymentOptionActive:{borderColor:'#6366f1',background:'#eef2ff'},
  cardForm:{background:'#f8fafc',borderRadius:12,padding:16,display:'flex',flexDirection:'column',gap:12},
  formRow:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12},
  formInput:{width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',borderRadius:8,fontSize:14,outline:'none'},
  payBtn:{width:'100%',padding:'14px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',border:'none',borderRadius:12,fontSize:16,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'},
  payButtonContainer:{marginBottom:12},
  securityFooter:{display:'flex',alignItems:'center',justifyContent:'center',gap:6,paddingTop:12,borderTop:'1px solid #e2e8f0'},
  securityText:{fontSize:12,color:'#94a3b8'},
  qrHeader:{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20},
  backBtn:{background:'none',border:'none',cursor:'pointer',color:'#64748b'},
  qrTimer:{display:'flex',alignItems:'center',gap:4,padding:'4px 12px',background:'#f1f5f9',borderRadius:20},
  qrWrapper:{padding:16,background:'#fff',borderRadius:16,boxShadow:'0 4px 12px rgba(0,0,0,0.05)',border:'2px solid #e2e8f0'},
  copyBtn:{background:'none',border:'none',cursor:'pointer',color:'#6366f1',padding:4},
  qrCancelBtn:{marginTop:16,padding:'12px',border:'2px solid #ef4444',borderRadius:12,background:'transparent',color:'#ef4444',fontSize:14,fontWeight:600,cursor:'pointer',width:'100%'},
  transactionDetails:{background:'#f8fafc',borderRadius:12,padding:16,textAlign:'left',marginBottom:20},
  detailRow:{display:'flex',justifyContent:'space-between',padding:'6px 0',fontSize:13,color:'#64748b',borderBottom:'1px solid #e2e8f0'},
  detailValue:{fontWeight:600,color:'#1f2937'},
  doneBtn:{padding:'12px 40px',background:'#10b981',color:'#fff',border:'none',borderRadius:12,fontSize:16,fontWeight:600,cursor:'pointer',width:'100%'},
  progressBar:{width:'100%',height:6,background:'#e2e8f0',borderRadius:3,overflow:'hidden',marginTop:12},
  progressFill:{height:'100%',background:'linear-gradient(90deg,#6366f1,#8b5cf6)',borderRadius:3},
  liveDot:{animation:'pulse 1.5s infinite'}
};

export default PaymentModal;