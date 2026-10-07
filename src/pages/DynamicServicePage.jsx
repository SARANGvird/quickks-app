import React from 'react';
import { useParams } from 'react-router-dom';

export default function DynamicServicePage() {
  const { slug, serviceName } = useParams();
  const display = slug || serviceName || "Service";
  return (
    <div style={{padding:40, textAlign:'center'}}>
      <h1>{display.replace(/-/g,' ').toUpperCase()} in Pune</h1>
      <p>Book best {display} service at Quickks - Fast, Reliable, Affordable!</p>
      <a href="/booking">Book Now</a>
    </div>
  )
}