// src/hooks/useProviderBookingsWS.js
import { useEffect, useRef, useState, useCallback } from "react";
import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import api from "../api/api";

export const useProviderBookingsWS = (providerId) => {
  const stompRef = useRef(null);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH BOOKINGS ================= */
  const refresh = useCallback(async () => {
    if (!providerId) return;

    try {
      setLoading(true);
      const res = await api.get("/api/provider/dashboard/pending");
      setBookings(res.data.bookings || []);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoading(false);
    }
  }, [providerId]);

  /* ================= WEBSOCKET ================= */
  useEffect(() => {
    if (!providerId) return;

    const client = new Client({
      webSocketFactory: () => new SockJS("http://localhost:8081/ws"),
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => {
      client.subscribe(`/topic/provider/${providerId}`, (msg) => {
        const event = JSON.parse(msg.body);

        setBookings((prev) => {
          // Remove instantly if no longer pending
          if (["ACCEPTED", "REJECTED", "CANCELLED"].includes(event.status)) {
            return prev.filter(b => b.bookingId !== event.bookingId);
          }

          // Update or insert
          const exists = prev.find(b => b.bookingId === event.bookingId);
          return exists
            ? prev.map(b => b.bookingId === event.bookingId ? event : b)
            : [event, ...prev];
        });
      });
    };

    client.activate();
    stompRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [providerId]);

  /* ================= ACTIONS ================= */
  const act = async (bookingId, action) => {
    // Optimistic UI
    setBookings(prev => prev.filter(b => b.bookingId !== bookingId));

    try {
      await api.patch(
        `/api/provider/dashboard/bookings/${bookingId}/${action}`
      );
    } catch (err) {
      console.error("Action failed", err);
      refresh(); // rollback safely
    }
  };

  return {
    bookings,
    loading,
    refresh,
    act,
  };
};
