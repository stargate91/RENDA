import React, { useState } from 'react';
import { ArrowLeft, Clock, Calendar, Star, Heart, ListVideo, Film, Monitor } from 'lucide-react';
import CustomTagsList from '../Shared/CustomTagsList';
import ListsPopover from '../Shared/ListsPopover';

const MovieDetailHero = ({
  data,
  itemId,
  onBack,
  onPlayMedia,
  onPlayTrailer,
  onToggleFavorite,
  onSetRating,
  onAddTag,
  onRemoveTag,
  onPosterClick,
  T,
  API_BASE
}) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [isListsPopoverOpen, setIsListsPopoverOpen] = useState(false);

  const tech = data.technical || {};
  const hasRatings = data.rating_tmdb || data.rating_imdb || data.rating_rotten || data.rating_meta;

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

  const formatRuntime = (min) => {
    if (!min) return null;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

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
              <Film size={48} color="var(--text-muted)" />
            </div>
          )}
        </div>

        <div className="detail-info">
          <h1 className="detail-title">{data.title}</h1>
          
          {data.original_title && data.original_title !== data.title && (
            <div className="detail-original-title">{data.original_title}</div>
          )}

          {data.tagline && (
            <div className="detail-tagline">"{data.tagline}"</div>
          )}

          {/* futuristic glassmorphic play button */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            {data.in_library === false ? (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '15px 0',
                  padding: '12px 32px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '30px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '15px',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backdropFilter: 'blur(12px)',
                  cursor: 'not-allowed',
                }}
                title="This item is not present in your library"
              >
                <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', color: 'rgba(255, 255, 255, 0.3)' }}>✖</span>
                {T('detail.missing') || 'Missing'}
              </div>
            ) : (
              <button 
                onClick={() => onPlayMedia(data.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '15px 0',
                  padding: '12px 32px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.45)',
                  borderRadius: '30px',
                  color: '#fff',
                  fontSize: '15px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.85)';
                  e.currentTarget.style.boxShadow = '0 12px 32px rgba(59, 130, 246, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.45)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(59, 130, 246, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)';
                }}
              >
                <span style={{ fontSize: '16px', display: 'flex', alignItems: 'center', color: '#3b82f6' }}>▶</span>
                {T('common.play')}
              </button>
            )}
            
            {data.trailer_key && (
              <button 
                onClick={onPlayTrailer}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '15px 0 15px 15px',
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

            {/* Lists Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsListsPopoverOpen(!isListsPopoverOpen)}
                style={{
                  background: isListsPopoverOpen ? 'rgba(0, 136, 255, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: isListsPopoverOpen ? '#0088ff' : 'rgba(255, 255, 255, 0.4)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#0088ff';
                  e.currentTarget.style.background = 'rgba(0, 136, 255, 0.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = isListsPopoverOpen ? '#0088ff' : 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.background = isListsPopoverOpen ? 'rgba(0, 136, 255, 0.2)' : 'transparent';
                }}
                title="Manage Custom Lists"
              >
                <ListVideo size={18} />
              </button>
              
              {isListsPopoverOpen && (
                <ListsPopover 
                  itemId={itemId}
                  movieTitle={data.title}
                  moviePoster={data.poster_path}
                  onClose={() => setIsListsPopoverOpen(false)}
                  T={T}
                />
              )}
            </div>

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

          {/* Meta pills */}
          <div className="detail-meta-row">
            {data.year && (
              <span className="detail-meta-pill">
                <Calendar size={14} /> {data.year}
              </span>
            )}
            {data.runtime && (
              <span className="detail-meta-pill">
                <Clock size={14} /> {formatRuntime(data.runtime)}
              </span>
            )}
            {tech.resolution && (
              <span className="detail-meta-pill accent">
                <Monitor size={14} /> {tech.resolution}
              </span>
            )}
            {tech.hdr_type && tech.hdr_type !== 'none' && (
              <span className="detail-meta-pill accent">{tech.hdr_type}</span>
            )}
            {data.original_language && (
              <span className="detail-meta-pill">{data.original_language.toUpperCase()}</span>
            )}
          </div>

          {/* Genres */}
          {data.genres && data.genres.length > 0 && (
            <div className="detail-genres">
              {data.genres.map((g, i) => (
                <span key={i} className="detail-genre-tag">{g}</span>
              ))}
            </div>
          )}

          {/* Custom Tags */}
          <CustomTagsList
            tags={data.custom_tags || []}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
          />

          {/* Ratings */}
          {hasRatings && (
            <div className="detail-ratings">
              {data.rating_tmdb > 0 && (
                <div className="rating-card">
                  <span className="rating-value tmdb">{data.rating_tmdb.toFixed(1)}</span>
                  <span className="rating-label">TMDB</span>
                  {data.vote_count_tmdb > 0 && (
                    <span className="rating-votes">{data.vote_count_tmdb.toLocaleString()} votes</span>
                  )}
                </div>
              )}
              {data.rating_imdb > 0 && (
                <div className="rating-card">
                  <span className="rating-value imdb">{data.rating_imdb.toFixed(1)}</span>
                  <span className="rating-label">IMDb</span>
                  {data.vote_count_imdb > 0 && (
                    <span className="rating-votes">{data.vote_count_imdb.toLocaleString()} votes</span>
                  )}
                </div>
              )}
              {data.rating_rotten && (
                <div className="rating-card">
                  <span className="rating-value rotten">{data.rating_rotten}</span>
                  <span className="rating-label">Rotten</span>
                </div>
              )}
              {data.rating_meta > 0 && (
                <div className="rating-card">
                  <span className="rating-value meta">{data.rating_meta}</span>
                  <span className="rating-label">Meta</span>
                </div>
              )}
            </div>
          )}

          {/* Overview */}
          {data.overview && (
            <div className="detail-overview">{data.overview}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieDetailHero;
