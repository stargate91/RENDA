import React from 'react';

const Switch = ({ checked, onChange, label, sublabel }) => (
  <div className="switch-container" onClick={() => onChange(!checked)}>
    <div className={`switch-track ${checked ? 'active' : ''}`}>
      <div className="switch-thumb" />
    </div>
    <div className="switch-labels">
      <div className="switch-label">{label}</div>
      {sublabel && <div className="switch-sublabel">{sublabel}</div>}
    </div>
  </div>
);

export default Switch;
