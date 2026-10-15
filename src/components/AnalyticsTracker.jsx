// src/components/AnalyticsTracker.jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
export default function AnalyticsTracker() {
  const location = useLocation();
  const lastPathRef = useRef('');
  const lastTimeRef = useRef(0);
  useEffect(() => {
    const path = location.pathname + location.search;
    const now = Date.now();
    if (lastPathRef.current === path) return;
    if (now - lastTimeRef.current < 1000) return;
    lastPathRef.current = path;
    lastTimeRef.current = now;
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', { page_path: path, page_title: document.title, page_location: window.location.href });
    }
  }, [location.pathname, location.search]);
  return null;
}