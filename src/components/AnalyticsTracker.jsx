import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function AnalyticsTracker() {
  const location = useLocation();
  const lastPath = useRef('');

  useEffect(() => {
    const path = location.pathname + location.search;
    if (lastPath.current === path) return; // same path = no send - loop stop!
    lastPath.current = path;

    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_path: path,
        page_title: document.title,
        page_location: window.location.href
      });
    }
  }, [location]);

  return null;
}