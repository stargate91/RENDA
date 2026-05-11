import React, { useEffect, useState } from 'react';
import { Save, RotateCcw, Check } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const FloatingActionBar = () => {
  const { isSettingsDirty, saveSettings, resetSettings, saveStatus, view, T } = useAppContext();
  const [visible, setVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  // Only show when on settings view AND something actually changed
  const shouldShow = view === 'settings' && (isSettingsDirty || saved);

  useEffect(() => {
    if (shouldShow) {
      // Small delay for smooth entrance
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [shouldShow]);

  const handleSave = async () => {
    await saveSettings();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className={`floating-save-bar ${visible ? 'visible' : ''} ${saved ? 'saved' : ''}`}>
      <div className="save-bar-pill">
        {saved ? (
          <>
            <div className="save-bar-icon success">
              <Check size={16} />
            </div>
            <span className="save-bar-text">{T('floating.saved') || 'Settings saved!'}</span>
          </>
        ) : (
          <>
            <div className="save-bar-dot" />
            <span className="save-bar-text">{T('floating.unsaved')}</span>
            <div className="save-bar-actions">
              <button className="save-bar-btn reset" onClick={resetSettings}>
                <RotateCcw size={16} />
                <span>{T('floating.reset')}</span>
              </button>
              <button className="save-bar-btn save" onClick={handleSave} disabled={!!saveStatus}>
                <Save size={16} />
                <span>{saveStatus ? T('floating.saving') : T('floating.save')}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default FloatingActionBar;
