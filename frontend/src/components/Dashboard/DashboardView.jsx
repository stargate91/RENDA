import React from 'react';

const DashboardView = ({ settings, stats, T }) => {
  return (
    <>
      <div className="header">
        <h1>{T('dashboard.welcome', { name: settings.user_name || 'User' })}</h1>
        <p>{T('dashboard.subtitle')}</p>
      </div>

      <div className="stats-grid">
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
          <div className="stat-sub">{T('dashboard.stats.storage_sub')}</div>
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
