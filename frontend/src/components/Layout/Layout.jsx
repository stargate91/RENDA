import React from 'react';
import { Upload } from 'lucide-react';
import { X } from 'lucide-react';
import Sidebar from '../Navigation/Sidebar';
import GlobalProgress from '../Navigation/GlobalProgress';
import FloatingActionBar from '../Navigation/FloatingActionBar';
import { useAppContext } from '../../context/AppContext';

const Layout = ({ view, setView, isDragging, progress, imageStatus, hasInspector, inspector, T, children }) => {
  const { isSidebarCollapsed, handleResetImageStatus } = useAppContext();
  
  return (
    <div className={`app-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${(view === 'discovery' && hasInspector) ? 'has-inspector' : ''}`}>
      <Sidebar view={view} setView={setView} T={T} />

      <div className={`main-content ${isDragging ? 'dragging' : ''}`}>
        {isDragging && (
          <div className="global-drop-overlay">
            <div className="drop-content">
              <Upload size={64} />
              <h2>{T('discovery.empty.drop_overlay_title')}</h2>
              <p>{T('discovery.empty.drop_overlay_subtitle')}</p>
            </div>
          </div>
        )}
        <GlobalProgress progress={progress} T={T} />
        
        {children}
      </div>

      {hasInspector && inspector && (
        <div className="inspector-panel-container">
          {inspector}
        </div>
      )}

      <FloatingActionBar />



    </div>
  );
};

export default Layout;
