import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, Play, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { api } from '../../services/api';

const COLORS = ['#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f43f5e', '#84cc16'];

const LibraryDNA = ({ genres, T }) => {
  if (!genres || Object.keys(genres).length === 0) return null;
  const sorted = Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 15);
  const maxCount = sorted[0][1];
  
  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '25px', border: '1px solid var(--border-card)', flex: 1, position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes floatAnim {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(2deg); }
          100% { transform: translateY(0px) rotate(-2deg); }
        }
      `}</style>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 10px #ec4899' }}></span>
        {T('dashboard.stats.library_dna') || 'Library DNA'}
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', justifyContent: 'center', alignItems: 'center', minHeight: '180px' }}>
        {sorted.map(([genre, count], idx) => {
          const color = COLORS[idx % COLORS.length];
          const size = Math.max(60, Math.min(130, (count / maxCount) * 130));
          return (
            <div key={genre} style={{
              width: `${size}px`, height: `${size}px`, borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}dd 0%, ${color}66 100%)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${color}44, inset 0 0 15px ${color}88`,
              backdropFilter: 'blur(4px)', border: `1px solid ${color}aa`,
              color: '#fff', textAlign: 'center', padding: '10px',
              animation: `floatAnim ${3 + (idx % 3)}s ease-in-out infinite alternate`,
              cursor: 'pointer', transition: 'all 0.3s'
            }}
            onMouseOver={e => { e.currentTarget.style.filter = 'brightness(1.2)'; e.currentTarget.style.zIndex = 10; }}
            onMouseOut={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.zIndex = 1; }}
            title={`${genre}: ${count} items`}
            >
              <span style={{ fontSize: size > 80 ? '14px' : '11px', fontWeight: '800', lineHeight: 1.1, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                {genre}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TimeTravelTimeline = ({ decades, T }) => {
  if (!decades || Object.keys(decades).length === 0) return null;
  const sorted = Object.entries(decades).sort((a, b) => a[0].localeCompare(b[0]));
  const maxCount = Math.max(...sorted.map(d => d[1]));
  const topDecade = [...sorted].sort((a, b) => b[1] - a[1])[0][0];

  return (
    <div style={{ background: 'var(--bg-card)', borderRadius: '24px', padding: '25px', border: '1px solid var(--border-card)', flex: 1 }}>
      <h3 style={{ margin: '0 0 5px 0', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }}></span>
        {T('dashboard.stats.timeline') || 'Time-Travel Timeline'}
      </h3>
      <p style={{ margin: '0 0 25px 0', fontSize: '14px', color: 'var(--accent-blue)', fontWeight: '600' }}>
        {T('dashboard.stats.top_decade', { decade: topDecade }) || `You are a ${topDecade} fanatic!`}
      </p>
      
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', height: '130px', paddingBottom: '30px', borderBottom: '2px solid rgba(255,255,255,0.1)' }}>
        {sorted.map(([decade, count]) => {
          const heightPct = (count / maxCount) * 100;
          return (
            <div key={decade} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '10px', position: 'relative' }}>
              <div 
                style={{
                  width: '100%', height: `${Math.max(5, heightPct)}%`,
                  background: 'linear-gradient(to top, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.9))',
                  borderRadius: '6px 6px 0 0',
                  boxShadow: '0 0 15px rgba(59, 130, 246, 0.3)',
                  transition: 'all 0.3s', cursor: 'pointer'
                }}
                title={`${decade}: ${count} items`}
                onMouseOver={e => { e.currentTarget.style.filter = 'brightness(1.5)'; e.currentTarget.style.boxShadow = '0 0 25px rgba(59, 130, 246, 0.8)'; }}
                onMouseOut={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.boxShadow = '0 0 15px rgba(59, 130, 246, 0.3)'; }}
              />
              <div style={{ position: 'absolute', bottom: '-25px', fontSize: '13px', fontWeight: '800', color: 'rgba(255,255,255,0.6)' }}>
                {decade}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SpotlightBanner = ({ item, onWatchlist, T }) => {
  if (!item) return null;
  const imageUrl = `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
  const title = item.title || item.name;
  
  return (
    <div style={{
      width: '100%', height: '400px', borderRadius: '24px', position: 'relative', overflow: 'hidden', marginBottom: '40px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.5)', background: '#000'
    }}>
      <img src={imageUrl} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8, filter: 'blur(2px) contrast(1.1)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 40%)' }} />
      
      <div style={{ position: 'absolute', bottom: '40px', left: '40px', maxWidth: '500px', zIndex: 10 }}>
        <h2 style={{ fontSize: '42px', fontWeight: '900', color: '#fff', margin: '0 0 10px 0', textShadow: '0 4px 8px rgba(0,0,0,0.8)' }}>
          {title}
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px', color: '#fff', fontWeight: 'bold' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '8px', backdropFilter: 'blur(4px)' }}>
            ⭐ {item.vote_average?.toFixed(1)}
          </span>
          <span style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
            {item.release_date ? item.release_date.split('-')[0] : (item.first_air_date ? item.first_air_date.split('-')[0] : '')}
          </span>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '15px', lineHeight: 1.5, marginBottom: '25px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.overview}
        </p>
        <button 
          onClick={() => onWatchlist(item.id, item.title ? 'movie' : 'tv')}
          style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '12px',
            fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer',
            boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)', transition: 'all 0.3s'
          }}
          onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 0 30px rgba(59, 130, 246, 0.8)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)'; }}
        >
          <span>+</span> {T('dashboard.watchlist.add') || 'Watchlist'}
        </button>
      </div>
    </div>
  );
};

const RecommendationCarousel = ({ title, items, onWatchlist, onCardClick, T }) => {
  const scrollRef = useRef(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);



  if (!items || items.length === 0) return null;

  const scroll = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  const arrowStyle = (side) => ({
    position: 'absolute',
    top: '50%',
    [side]: '0px',
    transform: 'translateY(-50%)',
    zIndex: 20,
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(0, 0, 0, 0.7)',
    backdropFilter: 'blur(8px)',
    color: '#fff',
    fontSize: '22px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease',
    boxShadow: '0 4px 15px rgba(0,0,0,0.4)',
  });

  return (
    <div style={{ marginBottom: '40px', position: 'relative' }}>
      <h3 style={{ margin: '0 0 20px 0', fontSize: '22px', fontWeight: '800' }}>{title}</h3>
      
      <div style={{ position: 'relative' }}>
        {showLeft && (
          <button
            style={arrowStyle('left')}
            onClick={() => scroll('left')}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
          >‹</button>
        )}

        {showRight && (
          <button
            style={arrowStyle('right')}
            onClick={() => scroll('right')}
            onMouseOver={e => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.8)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
          >›</button>
        )}

        <div 
          ref={scrollRef}
          onScroll={updateArrows}
          style={{ 
            display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '10px', paddingTop: '10px',
            scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none'
          }}
        >
          <style>{`
            .rec-card:hover .rec-overlay { opacity: 1 !important; }
          `}</style>
          {items.map(item => (
            <div key={item.id} style={{
              minWidth: '200px', width: '200px', position: 'relative', borderRadius: '16px', overflow: 'hidden',
              scrollSnapAlign: 'start', transition: 'transform 0.3s', cursor: 'pointer', background: '#111', flexShrink: 0
            }}
            className="rec-card"
            onClick={() => onCardClick && onCardClick(item)}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-10px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
            >
              <div style={{ paddingBottom: '150%' }}>
                <img src={`https://image.tmdb.org/t/p/w500${item.poster_path}`} alt={item.title || item.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              
              <div className="rec-overlay" style={{
                position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.4))',
                display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '15px', opacity: 0, transition: 'opacity 0.3s'
              }}>
                <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '14px', marginBottom: '5px' }}>{item.title || item.name}</div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px', marginBottom: '15px' }}>⭐ {item.vote_average?.toFixed(1)}</div>
                
                <button
                  onClick={(e) => { e.stopPropagation(); onWatchlist(item.id, item.title ? 'movie' : 'tv'); }}
                  style={{
                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff',
                    padding: '8px', borderRadius: '8px', backdropFilter: 'blur(4px)', cursor: 'pointer', fontWeight: 'bold',
                    transition: 'background 0.2s'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                >
                  + {T('dashboard.watchlist.add_short') || 'Watchlist'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DashboardView = ({ settings, stats, T }) => {
  const { imageStatus, setView, setPendingDetailId } = useAppContext();
  const [cwItems, setCwItems] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [libData, recsData] = await Promise.all([
          api.getLibrary(),
          api.getRecommendations().catch(e => { console.error("Recs error", e); return null; })
        ]);
        
        const allItems = [...(libData.movies || []), ...(libData.series || [])];
        const cw = allItems.filter(i => i.resume_position > 0 && !i.is_watched && i.duration > 0);
        cw.sort((a, b) => new Date(b.last_watched_at || 0) - new Date(a.last_watched_at || 0));
        setCwItems(cw);
        
        if (recsData) setRecommendations(recsData);
      } catch (e) {
        console.error("Failed to fetch dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleWatchlist = async (tmdbId, type) => {
    try {
      const result = await api.addToWatchlist(tmdbId, type);
      alert(T('dashboard.watchlist.success') || "Added to your Watchlist!");
      return result?.id;
    } catch (e) {
      console.error(e);
      alert("Failed to add to watchlist.");
      return null;
    }
  };

  const handleCardClick = (item) => {
    setPendingDetailId('tmdb_' + item.id);
    setView('library');
  };

  return (
    <>
      {recommendations?.trending?.length > 0 && (
        <SpotlightBanner item={recommendations.trending[0]} onWatchlist={handleWatchlist} T={T} />
      )}

      <div className="header">
        <h1>{T('dashboard.welcome', { name: settings.user_name || 'User' })}</h1>
        <p>{T('dashboard.subtitle')}</p>
      </div>

      {recommendations?.discover?.length > 0 && (
        <RecommendationCarousel 
          title={T('dashboard.recommendations.genre', { genre: recommendations.top_genre || 'Your favorites' }) || `Because you like ${recommendations.top_genre || 'these'}...`}
          items={recommendations.discover} 
          onWatchlist={handleWatchlist} 
          onCardClick={handleCardClick}
          T={T} 
        />
      )}

      {cwItems.length > 0 && (
        <div style={{ marginBottom: '40px' }}>
          <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Play size={20} color="var(--accent-blue)" fill="var(--accent-blue)" /> Continue Watching
          </div>
          <div style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px' }} className="custom-scrollbar">
            {cwItems.map(item => (
              <div key={`cw-${item.id}`} style={{
                minWidth: '280px', width: '280px', height: '160px',
                position: 'relative', borderRadius: '16px', overflow: 'hidden',
                background: '#111', cursor: 'pointer',
                boxShadow: '0 10px 25px rgba(0,0,0,0.3)', transition: 'transform 0.2s',
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

      {/* Premium Visualizations */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px', flexWrap: 'wrap' }}>
        <LibraryDNA genres={stats?.genre_distribution} T={T} />
        <TimeTravelTimeline decades={stats?.decade_distribution} T={T} />
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
