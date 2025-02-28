import React from 'react';

function MetricCard({ title, value, unit = '', comparison }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <p className="metric-value">{value} {unit}</p>
      <p className="metric-comparison">{comparison}</p>
    </div>
  );
}

export default MetricCard;