import React from 'react';

const GlobalProgress = ({ progress, T }) => {
  if (!progress || !progress.active) return null;

  const getWeightedPercent = () => {
    const { phase, current, total } = progress;
    const subPercent = total > 0 ? (current / total) : 0;

    switch (phase) {
      case 'collecting': return Math.round(subPercent * 10);
      case 'probing': return Math.round(10 + (subPercent * 20));
      case 'enriching': return Math.round(30 + (subPercent * 30));
      case 'resolving': return Math.round(60 + (subPercent * 40));
      default: return 0;
    }
  };

  const calculateETA = () => {
    if (progress.current < 2) return "Estimating time...";
    const elapsed = (Date.now() / 1000) - progress.start_time;
    const itemsPerSec = progress.current / elapsed;
    const remainingItems = progress.total - progress.current;
    const remainingSecs = remainingItems / itemsPerSec;

    if (remainingSecs < 1) return "Finishing...";
    const mins = Math.floor(remainingSecs / 60);
    const secs = Math.floor(remainingSecs % 60);
    return mins > 0 ? `${mins}m ${secs}s left` : `${secs}s left`;
  };

  const percent = getWeightedPercent();

  return (
    <div className="global-activity-bar">
      <div className="activity-info">
        <span className="pulse-dot"></span>
        <span className="activity-phase">{T(`phases.${progress.phase}`) || progress.phase}</span>
        <span className="activity-percent">{percent}%</span>
        <span className="activity-eta">{calculateETA()}</span>
      </div>
      <div className="activity-progress-bg">
        <div className="activity-progress-fill" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
};

export default GlobalProgress;
