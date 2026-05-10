import React from 'react';

const Sidebar = ({ view, setView, T }) => {
  return (
    <div className="sidebar">
      <div className="logo">RENDA</div>
      <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>{T('sidebar.dashboard')}</div>
      <div className={`nav-item ${view === 'discovery' ? 'active' : ''}`} onClick={() => setView('discovery')}>{T('sidebar.discovery')}</div>
      <div className={`nav-item ${view === 'library' ? 'active' : ''}`} onClick={() => setView('library')}>{T('sidebar.library')}</div>
      <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')}>{T('sidebar.history')}</div>
      <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>{T('sidebar.settings')}</div>
    </div>
  );
};

export default Sidebar;
