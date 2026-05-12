import React from 'react';
import { 
  LayoutDashboard, 
  Search, 
  Library, 
  History, 
  Settings, 
  RotateCcw, 
  Power,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const Sidebar = ({ view, setView, T }) => {
  const { isSidebarCollapsed, setIsSidebarCollapsed } = useAppContext();

  const handleRestart = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('app-restart');
    } catch (e) {
      console.error('Restart failed:', e);
      window.location.reload();
    }
  };

  const handleQuit = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('app-quit');
    } catch (e) {
      console.error('Quit failed:', e);
    }
  };

  return (
    <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
      <div className="logo-container">
        <div className="logo">{isSidebarCollapsed ? 'R' : 'RENDA'}</div>
        <button className="sidebar-toggle-btn" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
          {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
      
      <div className="sidebar-nav">
        <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')} title={isSidebarCollapsed ? T('sidebar.dashboard') : ''}>
          <LayoutDashboard size={20} />
          <span>{T('sidebar.dashboard')}</span>
        </div>
        <div className={`nav-item ${view === 'discovery' ? 'active' : ''}`} onClick={() => setView('discovery')} title={isSidebarCollapsed ? T('sidebar.discovery') : ''}>
          <Search size={20} />
          <span>{T('sidebar.discovery')}</span>
        </div>
        <div className={`nav-item ${view === 'library' ? 'active' : ''}`} onClick={() => setView('library')} title={isSidebarCollapsed ? T('sidebar.library') : ''}>
          <Library size={20} />
          <span>{T('sidebar.library')}</span>
        </div>
        <div className={`nav-item ${view === 'history' ? 'active' : ''}`} onClick={() => setView('history')} title={isSidebarCollapsed ? T('sidebar.history') : ''}>
          <History size={20} />
          <span>{T('sidebar.history')}</span>
        </div>
        <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')} title={isSidebarCollapsed ? T('sidebar.settings') : ''}>
          <Settings size={20} />
          <span>{T('sidebar.settings')}</span>
        </div>
      </div>

      <div className="sidebar-spacer"></div>

      <div className="sidebar-footer">
        <div className="nav-item system-btn restart" onClick={handleRestart} title={isSidebarCollapsed ? 'Restart App' : ''}>
          <RotateCcw size={20} />
          <span>Restart App</span>
        </div>
        <div className="nav-item system-btn quit" onClick={handleQuit} title={isSidebarCollapsed ? 'Quit Renda' : ''}>
          <Power size={20} />
          <span>Quit Renda</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
