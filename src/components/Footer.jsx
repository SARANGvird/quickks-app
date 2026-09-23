// src/components/Footer.jsx
// ✅ COMPLETE FIXED - All errors resolved

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Mail, Phone, MapPin, Send, ArrowUp, 
  Shield, Truck, Clock, ChevronRight
} from "lucide-react";

// ✅ FIXED: Social icons from react-icons (lucide-react doesn't have these)
import { 
  FaFacebook, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedin, 
  FaYoutube, 
  FaGithub 
} from "react-icons/fa";

import "./Footer.css";

const Footer = () => {
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Navigation Links - ✅ Memoized
  const quickLinks = useMemo(() => [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: "How It Works", path: "/how-it-works" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
  ], []);

  const serviceLinks = useMemo(() => [
    { name: "Electrician Services", path: "/services/electrician" },
    { name: "Appliance Repair", path: "/services/appliance-repair" },
    { name: "Smart Home Setup", path: "/services/smart-home" },
    { name: "Emergency Services", path: "/services/emergency" },
    { name: "Maintenance Plans", path: "/services/maintenance" },
  ], []);

  const supportLinks = useMemo(() => [
    { name: "FAQ", path: "/faq" },
    { name: "Help Center", path: "/help" },
    { name: "Terms of Service", path: "/terms" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Refund Policy", path: "/refund-policy" },
  ], []);

  // ✅ FIXED: Using react-icons instead of lucide-react
  const socialLinks = useMemo(() => [
    { Icon: FaFacebook, url: "https://facebook.com/quickks", label: "Facebook", color: "#1877f2" },
    { Icon: FaTwitter, url: "https://twitter.com/quickks", label: "Twitter", color: "#1da1f2" },
    { Icon: FaInstagram, url: "https://instagram.com/quickks", label: "Instagram", color: "#e4405f" },
    { Icon: FaLinkedin, url: "https://linkedin.com/company/quickks", label: "LinkedIn", color: "#0077b5" },
    { Icon: FaYoutube, url: "https://youtube.com/quickks", label: "YouTube", color: "#ff0000" },
    { Icon: FaGithub, url: "https://github.com/quickks", label: "GitHub", color: "#333" },
  ], []);

  const paymentMethods = useMemo(() => [
    { name: "Visa", icon: "💳" },
    { name: "Mastercard", icon: "💳" },
    { name: "RuPay", icon: "🪙" },
    { name: "UPI", icon: "📱" },
    { name: "Paytm", icon: "🏦" },
    { name: "Google Pay", icon: "📱" },
  ], []);

  // Scroll handler for back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Newsletter subscription handler - ✅ FIXED with proper error handling
  const handleNewsletterSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!email) {
      setNewsletterStatus({ type: "error", message: "Please enter your email address" });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setNewsletterStatus({ type: "error", message: "Please enter a valid email address" });
      return;
    }
    
    setLoading(true);
    setNewsletterStatus(null);
    
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        setNewsletterStatus({ type: "success", message: "✅ Successfully subscribed! Check your inbox." });
        setEmail("");
      } else {
        const data = await response.json().catch(() => ({}));
        setNewsletterStatus({ type: "error", message: data.message || "Subscription failed. Please try again." });
      }
    } catch (error) {
      setNewsletterStatus({ type: "error", message: "Network error. Please try again." });
    } finally {
      setLoading(false);
      setTimeout(() => setNewsletterStatus(null), 5000);
    }
  }, [email]);

  // Back to top handler
  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-container">
        {/* Brand Section */}
        <div className="footer-section">
          <div className="brand-info">
            <h2 className="brand-title">
              Quickks<span className="brand-dot">.</span>
            </h2>
            <p className="brand-description">
              Quickks connects you with trusted electricians, appliance repair experts, 
              and smart home professionals — fast, reliable, and verified.
            </p>
            
            {/* Trust Badges */}
            <div className="trust-badges">
              <div className="trust-badge">
                <Shield size={16} />
                <span>Verified Professionals</span>
              </div>
              <div className="trust-badge">
                <Clock size={16} />
                <span>24/7 Support</span>
              </div>
              <div className="trust-badge">
                <Truck size={16} />
                <span>Quick Response</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-nav">
            {quickLinks.map((link) => (
              <li key={link.name} className="footer-nav-item">
                <Link 
                  to={link.path} 
                  className={`footer-nav-link ${location.pathname === link.path ? "active" : ""}`}
                >
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div className="footer-section">
          <h3 className="footer-title">Our Services</h3>
          <ul className="footer-nav">
            {serviceLinks.map((link) => (
              <li key={link.name} className="footer-nav-item">
                <Link to={link.path} className="footer-nav-link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Support */}
        <div className="footer-section">
          <h3 className="footer-title">Support</h3>
          <ul className="footer-nav">
            {supportLinks.map((link) => (
              <li key={link.name} className="footer-nav-item">
                <Link to={link.path} className="footer-nav-link">
                  {link.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact & Newsletter */}
        <div className="footer-section">
          <h3 className="footer-title">Get In Touch</h3>
          
          <div className="footer-contact">
            <div className="footer-contact-item">
              <Mail className="footer-contact-icon" size={18} />
              <a href="mailto:support@quickks.com" className="footer-contact-link">
                support@quickks.com
              </a>
            </div>
            
            <div className="footer-contact-item">
              <Phone className="footer-contact-icon" size={18} />
              <a href="tel:+919371365677" className="footer-contact-link">
                +91 93713 65677
              </a>
            </div>
            
            <div className="footer-contact-item">
              <MapPin className="footer-contact-icon" size={18} />
              <span>Pune, Maharashtra, India - 411001</span>
            </div>
          </div>

          {/* Newsletter Section */}
          <div className="footer-newsletter">
            <h4 className="newsletter-title">Subscribe to Newsletter</h4>
            <form onSubmit={handleNewsletterSubmit} className="newsletter-form">
              <input
                type="email"
                className="newsletter-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                aria-label="Email for newsletter"
              />
              <button 
                type="submit" 
                className={`newsletter-button ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                <Send size={16} />
                {loading ? "Subscribing..." : "Subscribe"}
              </button>
            </form>
            {newsletterStatus && (
              <div className={`newsletter-${newsletterStatus.type}`}>
                {newsletterStatus.message}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Social Media Section - ✅ FIXED */}
      <div className="footer-social-section">
        <div className="footer-container">
          <div className="social-links-wrapper">
            <p className="follow-us-text">Follow us on social media:</p>
            <div className="footer-social">
              {socialLinks.map(({ Icon, url, label }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social-link ${label.toLowerCase()}`}
                  aria-label={`Follow us on ${label}`}
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods Section */}
      <div className="footer-payment-section">
        <div className="footer-container">
          <div className="payment-wrapper">
            <p className="payment-text">Secure Payment Methods:</p>
            <div className="payment-methods">
              {paymentMethods.map((method, index) => (
                <div key={index} className="payment-method" title={method.name}>
                  <span className="payment-icon">{method.icon}</span>
                  <span className="payment-name">{method.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <div className="footer-container">
          <div className="footer-bottom-content">
            <div className="footer-copyright">
              <p>© {currentYear} Quickks. All rights reserved.</p>
            </div>
            
            <div className="footer-bottom-links">
              <Link to="/privacy" className="footer-bottom-link">Privacy Policy</Link>
              <Link to="/terms" className="footer-bottom-link">Terms of Service</Link>
              <Link to="/cookies" className="footer-bottom-link">Cookie Policy</Link>
              <Link to="/sitemap" className="footer-bottom-link">Sitemap</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      <button
        className={`back-to-top ${showBackToTop ? "visible" : ""}`}
        onClick={scrollToTop}
        aria-label="Back to top"
      >
        <ArrowUp size={20} />
      </button>
    </footer>
  );
};

export default React.memo(Footer);