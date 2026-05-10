import React from 'react';
import { useAppContext } from '../../context/AppContext';

const FloatingActionBar = () => {
  const { isSettingsDirty, saveSettings, resetSettings, saveStatus, T } = useAppContext();

  const isActive = isSettingsDirty || !!saveStatus;

  return (
    <div className={`floating-action-bar ${isActive ? 'active' : ''}`}>
      <div className="floating-action-content">
        <span className="floating-action-text">
          {saveStatus ? saveStatus : T('floating.unsaved')}
        </span>
        <div className="floating-action-buttons">
          <button 
            className="btn-secondary" 
            onClick={resetSettings}
            disabled={!!saveStatus}
          >
            {T('floating.reset')}
          </button>
          <button 
            className="btn-primary" 
            onClick={saveSettings}
            disabled={!!saveStatus}
          >
            {saveStatus ? T('floating.saving') : T('floating.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingActionBar;
