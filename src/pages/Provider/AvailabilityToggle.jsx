/* src/components/Provider/AvailabilityToggle.css */
.availability-toggle-btn {
  position: relative;
  overflow: hidden;
}

.availability-toggle-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.3);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

.availability-toggle-btn:active::before {
  width: 200px;
  height: 200px;
}

.availability-toggle-btn.active {
  background: linear-gradient(135deg, #10b981, #059669);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.availability-toggle-btn.inactive {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.availability-toggle-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

.availability-toggle-btn:active:not(:disabled) {
  transform: translateY(0);
}

/* Pulse animation for online status */
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(16, 185, 129, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
  }
}

.availability-toggle-btn.active {
  animation: pulse 2s infinite;
}

/* Responsive */
@media (max-width: 640px) {
  .availability-toggle-btn {
    padding: 8px 16px;
    font-size: 0.75rem;
  }
}