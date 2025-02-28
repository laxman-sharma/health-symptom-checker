import React from 'react';
import MetricCard from './MetricCard';

function HealthAnalysis({ healthData }) {
  return (
    <div className="health-analysis">
      <h2>Your Health Analysis</h2>
      
      <div className="metrics-grid">
        <MetricCard 
          title="Weight"
          value={healthData.weight.value}
          unit={healthData.weight.unit}
          comparison={`Compared to ${healthData.weight.avg} ${healthData.weight.unit} avg`}
        />
        
        <MetricCard 
          title="Steps"
          value={healthData.steps.value}
          comparison={`Compared to ${healthData.steps.avg} avg`}
        />
        
        <MetricCard 
          title="Heart Rate"
          value={healthData.heartRate.value}
          unit={healthData.heartRate.unit}
          comparison={`Compared to ${healthData.heartRate.avg} ${healthData.heartRate.unit} avg`}
        />
        
        <MetricCard 
          title="Calories"
          value={healthData.calories.value}
          unit={healthData.calories.unit}
          comparison={`Compared to ${healthData.calories.avg} ${healthData.calories.unit} avg`}
        />
        
        <MetricCard 
          title="Sleep"
          value={healthData.sleep.value}
          unit={healthData.sleep.unit}
          comparison={`Compared to ${healthData.sleep.avg} ${healthData.sleep.unit} avg`}
        />
      </div>
    </div>
  );
}

export default HealthAnalysis;