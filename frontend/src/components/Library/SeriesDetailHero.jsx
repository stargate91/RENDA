import React, { useState } from 'react';
import { ArrowLeft, Play, Star, Heart, Clapperboard, Film } from 'lucide-react';
import CustomTagsList from './CustomTagsList';

const SeriesDetailHero = ({
  data,
  continueEpisode,
  onBack,
  onPlayMedia,
  onPlayTrailer,
  onToggleFavorite,
  onSetRating,
  onAddTag,
  onRemoveTag,
  onPosterClick,
  onPersonClick,
  T,
  API_BASE
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const backdropUrl = data.backdrop_path 
    ? (data.in_library === false 
        ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}`
        : `${API_BASE}/media/images/backdrops${data.backdrop_path}`)
    : null;
  const posterUrl = data.poster_path 
    ? (data.in_library === false 
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : `${API_BASE}/media/images/posters${data.poster_path}`)
    : null;

  return (
    <div className="detail-hero">
      <button className="detail-back-btn" onClick={onBack}>
        <ArrowLeft size={14} /> {T('library.go_back')}
      </button>

      {backdropUrl && (
        <img 
          className="detail-hero-backdrop" 
          src={backdropUrl} 
          alt="" 
        />
      )}
      
      <div className="detail-hero-gradient" />

      <div className="detail-hero-content">
        <div 
          className="detail-poster" 
          style={posterUrl ? { cursor: 'zoom-in' } : {}}
          onClick={() => posterUrl && onPosterClick()}
        >
          {posterUrl ? (
            <img src={posterUrl} alt={data.title} />
          ) : (
            <div className="detail-poster-placeholder">
              <Clapperboard size={48} color="var(--text-muted)" />
            </div>
          )}
        </div>

        <div className="detail-info">
          <h1 className="detail-title">{data.title}</h1>

          {/* Premium Continue Watching Banner & Trailer */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            {continueEpisode && (
              <button 
                onClick={() => onPlayMedia(continueEpisode.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '15px 0',
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))',
                  border: '1px solid rgba(59, 130, 246, 0.5)',
                  borderRadius: '30px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.2)',
                  backdropFilter: 'blur(10px)',
                  letterSpacing: '0.5px'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(139, 92, 246, 0.3))';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(59, 130, 246, 0.2)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2))';
                }}
              >
                <Play size={18} fill="currentColor" />
                Continue: Episode {continueEpisode.episode_number}
              </button>
            )}
            
            {data.trailer_key && (
              <button 
                onClick={onPlayTrailer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: continueEpisode ? '15px 0 15px 15px' : '15px 0',
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '30px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backdropFilter: 'blur(12px)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                }}
              >
                <Film size={16} />
                {T('detail.play_trailer')}
              </button>
            )}
          </div>

          {/* Premium Glassmorphic User Interaction Bar */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px', 
            margin: '15px 0 20px 0', 
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '6px 14px',
            borderRadius: '12px',
            width: 'fit-content',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
            {/* Favorite Heart Button */}
            <button
              onClick={onToggleFavorite}
              style={{
                background: data.is_favorite ? 'rgba(233, 30, 99, 0.2)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: data.is_favorite ? '#e91e63' : 'rgba(255, 255, 255, 0.4)',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = '#e91e63';
                e.currentTarget.style.background = 'rgba(233, 30, 99, 0.1)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = data.is_favorite ? '#e91e63' : 'rgba(255, 255, 255, 0.4)';
                e.currentTarget.style.background = data.is_favorite ? 'rgba(233, 30, 99, 0.2)' : 'transparent';
              }}
              title={data.is_favorite ? "Remove from Favorites" : "Mark as Favorite"}
            >
              <Heart size={18} fill={data.is_favorite ? "currentColor" : "none"} />
            </button>

            <div style={{ width: '1px', height: '16px', background: 'rgba(255, 255, 255, 0.15)' }} />

            {/* 1-5 Star Interactive Rating */}
            <div 
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseLeave={() => setHoverRating(0)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = hoverRating ? star <= hoverRating : star <= (data.user_rating || 0);
                return (
                  <Star
                    key={star}
                    size={18}
                    onClick={() => onSetRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    style={{
                      cursor: 'pointer',
                      color: isLit ? 'var(--accent-yellow, #ffc107)' : 'rgba(255, 255, 255, 0.2)',
                      fill: isLit ? 'var(--accent-yellow, #ffc107)' : 'none',
                      transition: 'all 0.15s ease',
                      transform: hoverRating === star ? 'scale(1.2)' : 'none'
                    }}
                  />
                );
              })}
            </div>

            {data.user_rating > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--accent-yellow)', fontWeight: '600', marginLeft: '5px', opacity: 0.9 }}>
                Your Rating
              </span>
            )}
          </div>
          
          <div className="detail-meta-row" style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap' }}>
            {data.year && (
              <span className="detail-meta-pill">{data.year}</span>
            )}
            <span className="detail-meta-pill accent">TV Series</span>
            <span className="detail-meta-pill">{data.seasons.length} Season{data.seasons.length > 1 ? 's' : ''}</span>
            {data.rating_tmdb > 0 && (
              <span className="detail-meta-pill" style={{ color: 'var(--accent-yellow)', border: '1px solid rgba(255, 193, 7, 0.3)' }}>
                ★ {data.rating_tmdb.toFixed(1)}
              </span>
            )}
          </div>

          {data.genres && data.genres.length > 0 && (
            <div className="detail-genres" style={{ marginBottom: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {data.genres.map(g => (
                <span key={g} style={{ fontSize: '12px', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '12px' }}>{g}</span>
              ))}
            </div>
          )}

          {/* Custom Tags */}
          <div style={{ marginBottom: '20px' }}>
            <CustomTagsList
              tags={data.custom_tags || []}
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
            />
          </div>

          {data.overview && (
            <div className="detail-overview" style={{ 
              fontSize: '15px', 
              lineHeight: '1.6', 
              color: 'var(--text-dim)', 
              marginBottom: '25px',
              maxWidth: '800px',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}>
              {data.overview}
            </div>
          )}

          {/* Directors / Creators */}
          {data.directors && data.directors.length > 0 && (
            <div className="series-creators" style={{ marginBottom: '20px', display: 'flex', gap: '15px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-dim)', fontSize: '13px' }}>Created by</span>
              {data.directors.map(d => (
                <span 
                  key={d.id} 
                  style={{ 
                    fontWeight: '600', 
                    fontSize: '14px', 
                    cursor: onPersonClick ? 'pointer' : 'default',
                    color: onPersonClick ? 'var(--accent-blue)' : 'inherit',
                    textDecoration: onPersonClick ? 'underline' : 'none'
                  }} 
                  onClick={() => onPersonClick && onPersonClick(d.id)}
                >
                  {d.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SeriesDetailHero;
