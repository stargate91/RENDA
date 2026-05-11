import React from 'react';
import { Upload } from 'lucide-react';
import Sidebar from '../Navigation/Sidebar';
import GlobalProgress from '../Navigation/GlobalProgress';
import FloatingActionBar from '../Navigation/FloatingActionBar';

const Layout = ({ view, setView, isDragging, progress, imageStatus, hasInspector, inspector, T, children }) => {
  return (
    <div className={`app-container ${(view === 'discovery' && hasInspector) ? 'has-inspector' : ''}`}>
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


      {imageStatus && imageStatus.active && (
        <div className="bg-process-indicator">
          <div className="progress-circle-wrapper">
            <svg className="progress-circle" viewBox="0 0 36 36">
              <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              <path className="circle" strokeDasharray={`${Math.max(0, Math.min(100, imageStatus.progress || 0))}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            </svg>
            <div className="percentage">{Math.round(imageStatus.progress || 0)}%</div>
          </div>
          <div className="bg-process-info">
            <div className="bg-process-label">{T('discovery.background_images')}</div>
            <div className="bg-process-sub" title={imageStatus.current_item}>
              {imageStatus.current_item || T('discovery.processing')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
