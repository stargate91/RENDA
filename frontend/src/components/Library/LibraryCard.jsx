import React from 'react';
import { User, Film, Check, Heart, Star } from 'lucide-react';
import { api } from '../../services/api';

const LibraryCard = ({
  item,
  index,
  isSelectionMode,
  itemIsSelected,
  onSelect,
  onNavigate,
  T,
  viewMode,
}) => {
  const targetTmdbId = item.series_tmdb_id || item.tmdb_id;

  const handleClick = () => {
    if (isSelectionMode) {
      onSelect();
      return;
    }
    
    if (item.isSeriesNode || item.isEpisodeNode) {
      if (targetTmdbId) {
        onNavigate('series', targetTmdbId);
      } else {
        console.warn("No TMDB ID found for this series. Cannot open detail view.");
      }
    } else if (item.type === 'actor' || item.type === 'director') {
      onNavigate('person', item.id);
    } else {
      // Open movie detail page
      onNavigate('movie', item.id);
    }
  };

  const handleMouseOver = e => {
    if (!isSelectionMode) {
      e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
      e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
      const overlay = e.currentTarget.querySelector('.poster-overlay');
      if (overlay) overlay.style.opacity = 1;
    }
  };

  const handleMouseOut = e => {
    if (!isSelectionMode) {
      e.currentTarget.style.transform = 'translateY(0) scale(1)';
      e.currentTarget.style.boxShadow = 'none';
      const overlay = e.currentTarget.querySelector('.poster-overlay');
      if (overlay) overlay.style.opacity = 0;
    }
  };

  const handlePlayClick = async (e) => {
    e.stopPropagation();
    try {
      await api.playMedia(item.id);
    } catch (err) {
      console.error("Failed to play media:", err);
    }
  };

  return (
    <div 
      className="poster-card" 
      style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'var(--bg-card)',
        border: itemIsSelected ? '2px solid #a78bfa' : '1px solid var(--border-card)',
        aspectRatio: viewMode === 'episodes' ? '16/9' : '2/3',
        cursor: 'pointer',
        transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
        animation: 'staggerFadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: `${index * 20}ms`,
        opacity: (isSelectionMode && !itemIsSelected) ? 0.6 : 1,
        transform: itemIsSelected ? 'scale(0.97)' : 'none'
      }}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {item.displayPoster ? (
        <img 
          src={`http://localhost:8000/media/images/${item.displayPosterFolder || 'posters'}${item.displayPoster}`} 
          alt={item.displayTitle}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <div style={{ 
          width: '100%', height: '100%', 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #222, #111)',
          padding: '20px', textAlign: 'center'
        }}>
          {item.type === 'actor' || item.type === 'director' ? (
            <User size={40} color="var(--text-dim)" style={{ marginBottom: '15px' }} />
          ) : (
            <Film size={40} color="var(--text-dim)" style={{ marginBottom: '15px' }} />
          )}
          <div style={{ fontSize: '14px', fontWeight: '700' }}>{item.displayTitle}</div>
        </div>
      )}

      {/* Selection Checkmark / Empty Circle */}
      {isSelectionMode && (
        <div style={{
          position: 'absolute', top: '12px', left: '12px', zIndex: 30,
          background: itemIsSelected ? 'linear-gradient(135deg, #a78bfa 0%, #3b82f6 100%)' : 'rgba(0,0,0,0.4)',
          border: itemIsSelected ? 'none' : '2px solid rgba(255,255,255,0.8)',
          color: '#fff', borderRadius: '50%',
          width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          {itemIsSelected && <Check size={16} strokeWidth={3} />}
        </div>
      )}

      {/* User Badges (Favorite & User Rating) */}
      {item.is_favorite && !isSelectionMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 10,
          background: 'rgba(233, 30, 99, 0.95)',
          color: '#fff',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
        }}>
          <Heart size={14} fill="currentColor" />
        </div>
      )}
      {item.user_rating > 0 && !isSelectionMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 10,
          background: 'rgba(255, 193, 7, 0.95)',
          color: '#000',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '800',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
        }}>
          <Star size={10} fill="currentColor" /> {item.user_rating}
        </div>
      )}

      {item.path && item.path.startsWith('watchlist://') && !isSelectionMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          left: item.user_rating > 0 ? '50px' : '10px',
          zIndex: 10,
          background: 'rgba(59, 130, 246, 0.95)',
          color: '#fff',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: '800',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
        }}>
          {T('library.watchlist') || 'Watchlist'}
        </div>
      )}

      {/* Playback Progress Bar */}
      {item.resume_position > 0 && item.duration > 0 && !item.is_watched && !isSelectionMode && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '4px',
          width: '100%',
          background: 'rgba(255, 255, 255, 0.2)',
          zIndex: 20
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, (item.resume_position / item.duration) * 100)}%`,
            background: '#3b82f6',
            boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
          }} />
        </div>
      )}

      {/* Watched Checkmark */}
      {item.is_watched && !isSelectionMode && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: item.is_favorite ? '45px' : '10px',
          zIndex: 10,
          background: 'rgba(59, 130, 246, 0.2)',
          color: '#3b82f6',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(4px)',
          border: '1px solid rgba(59, 130, 246, 0.5)'
        }}>
          <Check size={16} strokeWidth={3} />
        </div>
      )}

      <div className="poster-overlay" style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        opacity: 0,
        transition: 'opacity 0.3s ease'
      }}>
        {/* Left-aligned metadata container with padding to avoid floating play button */}
        <div style={{ paddingRight: '52px' }}>
          <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '5px', lineHeight: '1.2' }}>
            {item.isEpisodeNode && <span style={{ opacity: 0.6, marginRight: '5px' }}>{item.episode_number}.</span>}
            {item.displayTitle}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{item.isSeasonNode ? `${item.year || ''}` : item.year}</span>
            {item.rating > 0 && (
              <span style={{ 
                fontSize: '11px', 
                fontWeight: '700', 
                color: 'var(--accent-yellow)',
                background: 'rgba(255, 193, 7, 0.1)',
                padding: '2px 6px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 193, 7, 0.2)'
              }}>★ {item.rating.toFixed(1)}</span>
            )}
          </div>
          {item.custom_tags && item.custom_tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
              {item.custom_tags.slice(0, 2).map(tag => (
                <span key={tag} style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  color: '#fff',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  padding: '1px 5px',
                  borderRadius: '8px',
                }}>
                  {tag}
                </span>
              ))}
              {item.custom_tags.length > 2 && (
                <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', alignSelf: 'center', fontWeight: '700' }}>+{item.custom_tags.length - 2}</span>
              )}
            </div>
          )}
        </div>

        {/* Spotify-style Floating Action Play Button */}
        {(item.type === 'movie' || item.isEpisodeNode) && (
          <button
            onClick={handlePlayClick}
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.15)',
              border: '1px solid rgba(59, 130, 246, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              color: '#3b82f6',
              paddingLeft: '3px',
              zIndex: 20,
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.35)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.9)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.6)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.5)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.5)';
              e.currentTarget.style.color = '#3b82f6';
            }}
          >
            <span style={{ fontSize: '15px', display: 'flex', alignItems: 'center' }}>▶</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default LibraryCard;
