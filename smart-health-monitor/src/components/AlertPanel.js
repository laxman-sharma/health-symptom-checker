import React from 'react';

function AlertPanel({ message }) {
  return (
    <div className="alert">
      <h3>Alert:</h3>
      <p>{message}</p>
    </div>
  );
}

export default AlertPanel;