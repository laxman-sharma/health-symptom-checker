import React from 'react';

function ActionButtons() {
  return (
    <div className="action-buttons">
      <button onClick={() => console.log('Schedule Check-Up clicked')}>
        Schedule Check-Up
      </button>
      <button onClick={() => console.log('View Detailed Metrics clicked')}>
        View Detailed Metrics
      </button>
      <button onClick={() => console.log('Log More Details clicked')}>
        Log More Details
      </button>
    </div>
  );
}

export default ActionButtons;