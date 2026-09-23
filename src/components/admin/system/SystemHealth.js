import React from 'react';

const SystemHealth = ({ connected, lastUpdated }) => (
  <div style={{ background: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 20 }}>
    <p style={{ color: '#fff' }}>
      Status: <span style={{ color: connected ? '#4ade80' : '#f87171' }}>
        {connected ? '● Live' : '○ Disconnected'}
      </span>
    </p>
    <small style={{ color: '#718096' }}>Last Sync: {lastUpdated}</small>
  </div>
);

export default SystemHealth;