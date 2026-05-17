import React from 'react';
import { Loader2 } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const DashboardView = ({ settings, stats, T }) => {
  const { imageStatus } = useAppContext();
  return (
    <>
      <div className="header">
        <h1>{T('dashboard.welcome', { name: settings.user_name || 'User' })}</h1>
        <p>{T('dashboard.subtitle')}</p>
      </div>

      <div className="stats-grid">
        {imageStatus && imageStatus.active && (
          <div className="stat-card" style={{ borderColor: 'var(--accent-blue)', background: 'rgba(0, 136, 255, 0.05)' }}>
            <div className="stat-label" style={{ color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={14} className="spin" />
              {T('discovery.background_images')}
            </div>
            <div className="stat-value">{Math.round(imageStatus.progress || 0)}%</div>
            <div className="stat-sub" title={imageStatus.current_item}>
              {imageStatus.current_item || T('discovery.processing')}
            </div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.total_movies')}</div>
          <div className="stat-value">{(stats.total_movies || 0).toLocaleString()}</div>
          <div className="stat-sub">{T('dashboard.stats.movies_sub')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.tv_series')}</div>
          <div className="stat-value">{(stats.total_series || 0).toLocaleString()}</div>
          <div className="stat-sub">{(stats.total_episodes || 0).toLocaleString()} {T('dashboard.stats.episodes_sub')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.storage_used')}</div>
          <div className="stat-value">{stats.storage || '0 MB'}</div>
          <div className="stat-sub">{T('dashboard.stats.storage_sub', { count: stats.drive_count || 0 })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{T('dashboard.stats.unmatched')}</div>
          <div className="stat-value">{(stats.unmatched || 0).toLocaleString()}</div>
          <div className="stat-sub">{T('dashboard.stats.unmatched_sub')}</div>
        </div>
      </div>
    </>
  );
};

export default DashboardView;
