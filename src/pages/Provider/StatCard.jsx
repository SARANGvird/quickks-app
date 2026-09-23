import React from 'react';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color = '#6366f1',
  trend,
  prefix = '',
  suffix = '',
  onClick,
  subtitle
}) => {
  // Format number with Indian numbering system
  const formattedValue = typeof value === 'number' 
    ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)
    : value || '0';

  // Determine trend color
  const getTrendColor = (trend) => {
    if (trend > 0) return '#10b981';
    if (trend < 0) return '#ef4444';
    return '#64748b';
  };

  return (
    <div 
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ...(onClick && {
          ':hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }
        })
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        {Icon && (
          <div style={{
            background: `${color}15`,
            padding: '12px',
            borderRadius: '12px',
            color: color
          }}>
            <Icon size={24} />
          </div>
        )}
        
        {trend !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '20px',
            background: `${getTrendColor(trend)}15`,
            color: getTrendColor(trend),
            fontSize: '12px',
            fontWeight: 600
          }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div>
        <p style={{
          color: '#64748b',
          fontSize: '14px',
          fontWeight: 500,
          margin: '0 0 8px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {title}
        </p>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
            lineHeight: 1.2
          }}>
            {prefix}{formattedValue}{suffix}
          </h2>
          
          {subtitle && (
            <span style={{
              color: '#94a3b8',
              fontSize: '14px',
              fontWeight: 400
            }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;