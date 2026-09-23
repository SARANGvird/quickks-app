// src/pages/SupportPage.js
import React from "react";

const SupportPage = () => {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>
      <h1 style={{ textAlign: "center", marginBottom: 20 }}>Quickks Support</h1>

      <p>
        Welcome to QuickServe Support! We're here to help you with any questions or issues you may have.
        Reach out to us through any of the following channels:
      </p>

      <div style={{ marginTop: 30 }}>
        <h2>Contact Information</h2>
        <p>
          📧 Email: <a href="mailto:support@quickks.com">support@quickserve.com</a><br />
          📞 Phone: +91 98765 43210
        </p>

        <h2>Follow Us</h2>
        <div style={{ display: "flex", gap: 20, marginTop: 10 }}>
          <a href="https://www.facebook.com/Quickks" target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
          <a href="https://www.twitter.com/Quickks" target="_blank" rel="noopener noreferrer">
            Twitter
          </a>
          <a href="https://www.linkedin.com/company/Quickks" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
          <a href="https://www.instagram.com/Quickks" target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Support Hours</h2>
        <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
        <p>Saturday: 10:00 AM - 4:00 PM</p>
        <p>Sunday: Closed</p>
      </div>

      <div style={{ marginTop: 40 }}>
        <h2>Need Immediate Assistance?</h2>
        <p>Click the chat icon at the bottom-right corner of your screen to connect with our support team in real-time.</p>
      </div>
    </div>
  );
};

export default SupportPage;
