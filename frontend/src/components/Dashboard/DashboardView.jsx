import React, { useState, useEffect } from 'react';
import { Loader2, Play, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';

const DashboardView = ({ settings, stats, T, navigateTo }) => {
  const { imageStatus } = useAppContext();
  const [cwItems, setCwItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCW = async () => {
      try {
        const libData = await api.getLibrary();
        const allItems = [...(libData.movies || []), ...(libData.series || [])];
        const cw = allItems.filter(i => i.resume_position > 0 && !i.is_watched && i.duration > 0);
        // Sort by most recently watched
        cw.sort((a, b) => new Date(b.last_watched_at || 0) - new Date(a.last_watched_at || 0));
        setCwItems(cw);
      } catch (e) {
        console.error("Failed to fetch library for continue watching:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCW();
  }, []);

  return (
    <>
      <div className="header">
        <h1>{T('dashboard.welcome', { name: settings.user_name || 'User' })}</h1>
        <p>{T('dashboard.subtitle')}</p>
      </div>

      {cwItems.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Play size={20} color="var(--accent-blue)" fill="var(--accent-blue)" /> Continue Watching
          </div>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }} className="custom-scrollbar">
            {cwItems.map(item => (
              <div key={`cw-${item.id}`} style={{
                minWidth: '280px',
                width: '280px',
                height: '160px',
                position: 'relative',
                borderRadius: '16px',
                overflow: 'hidden',
                background: '#111',
                cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                transition: 'transform 0.2s',
              }}
              onClick={() => {
                if (item.type === 'episode' || item.type === 'movie') {
                  api.playMedia(item.id);
                } else {
                  if (navigateTo) navigateTo('series', item.series_tmdb_id || item.tmdb_id);
                }
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                {/* Dismiss / X Button */}
                <div 
                  style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: '6px', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onClick={async (e) => {
                    e.stopPropagation();
                    try {
                      await api.resetProgress(item.id);
                      setCwItems(prev => prev.filter(i => i.id !== item.id));
                    } catch (err) {
                      console.error("Failed to reset progress", err);
                    }
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.6)'}
                  title="Remove from Continue Watching"
                >
                  <X size={14} color="#fff" />
                </div>

                {item.still_path || item.backdrop_path ? (
                  <img 
                    src={`http://localhost:8000/media/images/${item.still_path ? 'stills' : 'backdrops'}${item.still_path || item.backdrop_path}`} 
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, #222, #333)' }} />
                )}
                
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
                
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(59, 130, 246, 0.4)', borderRadius: '50%', padding: '10px', backdropFilter: 'blur(4px)' }}>
                    <Play fill="#fff" color="#fff" size={24} />
                  </div>
                </div>

                <div style={{ position: 'absolute', bottom: 0, left: 0, height: '4px', width: '100%', background: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (item.resume_position / item.duration) * 100)}%`, background: '#3b82f6', boxShadow: '0 0 10px rgba(59,130,246,0.8)' }} />
                </div>

                <div style={{ position: 'absolute', bottom: '15px', left: '15px', right: '15px' }}>
                  <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.series_title || item.title}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
                    {item.type === 'episode' && item.season_number && item.episode_number ? `S${String(item.season_number).padStart(2, '0')}E${String(item.episode_number).padStart(2, '0')} - ${item.episode_title || item.title}` : `${Math.floor(item.duration / 60) - Math.floor(item.resume_position / 60)} min left`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
