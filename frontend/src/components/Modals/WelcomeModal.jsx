import React from 'react';

const WelcomeModal = ({ show, settings, setSettings, saveSettings, setShowWelcomeModal, T }) => {
  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h1>{T('setup.title')}</h1>
        <p>{T('setup.subtitle')}</p>
        <input
          type="text"
          className="welcome-input"
          placeholder={T('setup.input_placeholder')}
          value={settings.user_name}
          onChange={(e) => setSettings({ ...settings, user_name: e.target.value })}
          onKeyDown={(e) => { 
            if (e.key === 'Enter') { 
              saveSettings(); 
              setShowWelcomeModal(false); 
            } 
          }}
        />
        <button className="btn-primary btn-full" onClick={() => { saveSettings(); setShowWelcomeModal(false); }}>
          {T('setup.button')}
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;
