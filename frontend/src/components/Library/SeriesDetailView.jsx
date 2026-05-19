import React, { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Play, Clapperboard, Users, User, ChevronDown, ChevronUp, FolderOpen, ExternalLink, Star, Heart, RefreshCcw, Tag, Check, Plus, X, Film } from 'lucide-react';
import { api, API_BASE } from '../../services/api';

const CustomTagsList = ({ tags, onAddTag, onRemoveTag }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [globalTags, setGlobalTags] = useState([]);
  const containerRef = React.useRef(null);

  useEffect(() => {
    if (isEditing) {
      api.getTags().then(res => setGlobalTags(res || [])).catch(console.error);
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSelectTag = (tagName) => {
    if (!tags.includes(tagName)) {
      onAddTag(tagName);
    }
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      setNewTag('');
    }
    setIsEditing(false);
  };

  const availableTags = globalTags.filter(t => !tags.includes(t.name));
  const filteredTags = newTag.trim() 
    ? availableTags.filter(t => t.name.toLowerCase().includes(newTag.toLowerCase()))
    : availableTags;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '15px', position: 'relative' }}>
      {tags.map((tag) => {
        const globalTag = globalTags.find(t => t.name === tag);
        const tagColor = globalTag ? globalTag.color : '#a78bfa';
        
        return (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#fff',
              background: `linear-gradient(135deg, ${tagColor}33 0%, ${tagColor}11 100%)`,
              border: `1px solid ${tagColor}55`,
              padding: '4px 10px',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Tag size={12} color={tagColor} />
            {tag}
            <button
              onClick={() => onRemoveTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                marginLeft: '2px',
                transition: 'color 0.15s ease',
              }}
              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
            >
              <X size={12} />
            </button>
          </span>
        );
      })}

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: '700',
            color: isEditing ? '#fff' : 'rgba(255, 255, 255, 0.6)',
            background: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            border: isEditing ? '1px solid rgba(255, 255, 255, 0.4)' : '1px dashed rgba(255, 255, 255, 0.2)',
            padding: '4px 10px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => {
            if (!isEditing) {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }
          }}
          onMouseOut={e => {
            if (!isEditing) {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }
          }}
        >
          {isEditing ? <X size={12} /> : <Plus size={12} />}
          {isEditing ? 'Cancel' : 'Add Tag'}
        </button>

        {isEditing && (
          <div style={{
            position: 'absolute',
            top: '30px',
            left: 0,
            zIndex: 1000,
            width: '240px',
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="text"
                placeholder="Search or create tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                autoFocus
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  flex: 1,
                  transition: 'all 0.2s',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#3b82f6',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Check size={14} />
              </button>
            </form>

            <div style={{ 
              maxHeight: '160px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              paddingRight: '2px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.4)', padding: '4px 2px 2px 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Available Tags
              </div>
              {filteredTags.length > 0 ? (
                filteredTags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTag(t.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.color || '#3b82f6' }} />
                    {t.name}
                  </button>
                ))
              ) : (
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', padding: '10px 4px', textAlign: 'center', fontStyle: 'italic' }}>
                  {newTag.trim() ? 'Press enter to create new tag' : 'No pre-created tags available'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SeriesDetailView = ({ seriesTmdbId, onBack, onPersonClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeasonNum, setActiveSeasonNum] = useState(1);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);

  const handlePlayTrailer = () => {
    if (data?.trailer_key) {
      window.open(`https://www.youtube.com/watch?v=${data.trailer_key}`, '_blank');
    }
  };

  const handleToggleFavorite = async () => {
    if (!data) return;
    const currentFav = data.is_favorite;
    const newFav = !currentFav;
    
    setData(prev => ({ ...prev, is_favorite: newFav }));
    
    try {
      await api.updateItemStatus(data.id, { is_favorite: newFav });
    } catch (e) {
      console.error("Failed to toggle favorite:", e);
      setData(prev => ({ ...prev, is_favorite: currentFav }));
    }
  };

  const handleSetRating = async (ratingValue) => {
    if (!data) return;
    const currentRating = data.user_rating;
    const newRating = currentRating === ratingValue ? null : ratingValue;
    
    setData(prev => ({ ...prev, user_rating: newRating }));
    
    try {
      await api.updateItemStatus(data.id, { user_rating: newRating });
    } catch (e) {
      console.error("Failed to update rating:", e);
      setData(prev => ({ ...prev, user_rating: currentRating }));
    }
  };

  const handlePlayMedia = async (itemId) => {
    try {
      await api.playMedia(itemId);
    } catch (e) {
      console.error("Failed to play media file:", e);
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await api.getLibrarySeriesDetail(seriesTmdbId);
        setData(res);
        if (res.seasons && res.seasons.length > 0) {
          setActiveSeasonNum(res.seasons[0].season_number);
        }
      } catch (e) {
        console.error("Failed to fetch series detail:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [seriesTmdbId]);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
    return `${bytes} B`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', animation: 'fadeIn 0.3s ease' }}>
        <div className="spinner-glow" />
        <style>{`.spinner-glow { width: 40px; height: 40px; border: 3px solid rgba(255,255,255,0.08); border-top-color: var(--accent-blue); border-radius: 50%; animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <p>Could not load series details.</p>
        <button className="detail-back-btn" onClick={onBack} style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const backdropUrl = data.backdrop_path ? `${API_BASE}/media/images/backdrops${data.backdrop_path}` : null;
  const posterUrl = data.poster_path ? `${API_BASE}/media/images/posters${data.poster_path}` : null;

  const activeSeason = data.seasons.find(s => s.season_number === activeSeasonNum);

  // Calculate the Next Episode to watch
  let continueEpisode = null;
  let allEpisodes = [];
  data.seasons.forEach(s => s.episodes.forEach(e => allEpisodes.push(e)));
  
  if (allEpisodes.length > 0) {
    // Check if there's a partially watched episode first
    const partiallyWatched = allEpisodes.find(e => !e.is_watched && e.resume_position > 0);
    if (partiallyWatched) {
      continueEpisode = partiallyWatched;
    } else {
      // Find the first unwatched episode
      const firstUnwatched = allEpisodes.find(e => !e.is_watched);
      if (firstUnwatched) {
        continueEpisode = firstUnwatched;
      } else {
        // All watched, default to the first one
        continueEpisode = allEpisodes[0];
      }
    }
  }

  return (
    <div className="movie-detail series-detail">
      {/* ===== HERO ===== */}
      <div className="detail-hero">
        <button className="detail-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back to Library
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
          <div className="detail-poster">
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
                  onClick={() => handlePlayMedia(continueEpisode.id)}
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
                  onClick={handlePlayTrailer}
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
                  Play Trailer
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
                onClick={handleToggleFavorite}
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
                      onClick={() => handleSetRating(star)}
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
                onAddTag={async (newTag) => {
                  const updatedTags = [...(data.custom_tags || []), newTag];
                  setData(prev => ({ ...prev, custom_tags: updatedTags }));
                  try {
                    await api.updateItemStatus(data.id, { custom_tags: updatedTags });
                  } catch (e) {
                    console.error("Failed to add custom tag:", e);
                  }
                }}
                onRemoveTag={async (tagToRemove) => {
                  const updatedTags = (data.custom_tags || []).filter(t => t !== tagToRemove);
                  setData(prev => ({ ...prev, custom_tags: updatedTags }));
                  try {
                    await api.updateItemStatus(data.id, { custom_tags: updatedTags });
                  } catch (e) {
                    console.error("Failed to remove custom tag:", e);
                  }
                }}
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

      <div className="detail-body">
        {/* Cast Carousel */}
        {data.cast && data.cast.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">
              <Users size={20} /> Series Cast
            </div>
            <div className="cast-scroll">
              {data.cast.map(c => (
                <div 
                  key={c.id} 
                  className="cast-card"
                  onClick={() => onPersonClick && onPersonClick(c.id)}
                  style={{ cursor: onPersonClick ? 'pointer' : 'default' }}
                >
                  <div className="cast-card-img">
                    {c.profile_path ? (
                      <img src={`${API_BASE}/media/images/persons${c.profile_path}`} alt={c.name} />
                    ) : (
                      <div className="cast-card-img-placeholder"><User size={24} color="var(--text-muted)" /></div>
                    )}
                  </div>
                  <div className="cast-card-name">{c.name}</div>
                  {c.character && <div className="cast-card-character">{c.character}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Season Selector */}
        <div className="season-selector-wrapper detail-section">
          <div className="detail-section-title" style={{ marginBottom: '15px' }}>Seasons</div>
          <div className="season-cards-scroll" style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '10px 4px' }}>
            {data.seasons.map(season => {
              const sPosterUrl = season.poster_path ? `${API_BASE}/media/images/posters${season.poster_path}` : posterUrl;
              const isActive = activeSeasonNum === season.season_number;
              return (
                <div
                  key={season.season_number}
                  className={`season-card ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSeasonNum(season.season_number);
                    setExpandedEpisodeId(null);
                  }}
                  style={{
                    minWidth: '120px',
                    width: '120px',
                    cursor: 'pointer',
                    borderRadius: '12px',
                    border: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, border-color 0.2s',
                    transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    background: 'var(--bg-card)'
                  }}
                >
                  <div style={{ aspectRatio: '2/3', background: '#222' }}>
                    {sPosterUrl ? (
                      <img src={sPosterUrl} alt={season.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                        <Clapperboard size={30} opacity={0.3} />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                    {season.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Episode List */}
        {activeSeason && (
          <div className="episode-list detail-section">
            {activeSeason.episodes.map(episode => {
              const isExpanded = expandedEpisodeId === episode.id;
              const thumbUrl = episode.still_path ? `${API_BASE}/media/images/stills${episode.still_path}` : null;
              const tech = episode.technical || {};

              return (
                <div key={episode.id} className={`episode-card ${isExpanded ? 'expanded' : ''}`}>
                  {/* Episode Header (Always visible) */}
                  <div 
                    className="episode-header" 
                    onClick={() => setExpandedEpisodeId(isExpanded ? null : episode.id)}
                  >
                    <div className="episode-thumb" style={{ position: 'relative' }}>
                      <div className="episode-thumb-placeholder" style={{ position: 'absolute', inset: 0 }}>
                        <Play size={24} opacity={0.3} />
                      </div>
                      {thumbUrl && (
                        <img 
                          src={thumbUrl} 
                          alt="" 
                          style={{ position: 'relative', zIndex: 1 }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      )}
                      
                      {/* Play Episode Overlay Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayMedia(episode.id);
                        }}
                        className="episode-play-overlay-btn"
                      >
                        <div className="play-icon-circle">▶</div>
                      </button>

                      {/* Playback Progress Bar */}
                      {episode.resume_position > 0 && tech.duration > 0 && !episode.is_watched && (
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          height: '3px',
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.2)',
                          zIndex: 20
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${Math.min(100, (episode.resume_position / tech.duration) * 100)}%`,
                            background: '#3b82f6',
                            boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)'
                          }} />
                        </div>
                      )}

                      {/* Watched Checkmark */}
                      {episode.is_watched && (
                        <div style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          zIndex: 10,
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(59, 130, 246, 0.5)'
                        }}>
                          <Check size={14} strokeWidth={3} />
                        </div>
                      )}

                      <div className="episode-number" style={{ zIndex: 2 }}>{episode.episode_number}</div>
                    </div>
                    
                    <div className="episode-info-main">
                      <div className="episode-title">{episode.title}</div>
                      <div className="episode-meta">
                        {episode.runtime && <span>{episode.runtime} min</span>}
                        {tech.resolution && <span className="tech-badge">{tech.resolution}</span>}
                        {tech.video_codec && <span>{tech.video_codec}</span>}
                      </div>
                      {episode.overview && !isExpanded && (
                        <div className="episode-overview-snippet">{episode.overview}</div>
                      )}
                    </div>
                    
                    <div className="episode-expand-icon">
                      {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                  </div>

                  {/* Episode Details (Accordion Body) */}
                  {isExpanded && (
                    <div className="episode-body">
                      {episode.overview && (
                        <div className="episode-full-overview">{episode.overview}</div>
                      )}
                      
                      <div className="episode-technical-grid">
                        {tech.resolution && (
                          <div className="tech-item">
                            <span className="tech-label">Video</span>
                            <span className="tech-val">{tech.resolution} {tech.video_codec} {tech.hdr_type !== 'none' ? tech.hdr_type : ''}</span>
                          </div>
                        )}
                        {tech.audio_codec && (
                          <div className="tech-item">
                            <span className="tech-label">Audio</span>
                            <span className="tech-val">{tech.audio_codec} {tech.audio_channels}</span>
                          </div>
                        )}
                        <div className="tech-item">
                          <span className="tech-label">Size</span>
                          <span className="tech-val">{formatSize(tech.size_bytes)}</span>
                        </div>
                        {tech.source && tech.source !== 'none' && (
                          <div className="tech-item">
                            <span className="tech-label">Source</span>
                            <span className="tech-val">{tech.source.toUpperCase()}</span>
                          </div>
                        )}
                      </div>

                      <div className="episode-actions">
                        <button 
                          className="episode-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            api.revealInExplorer(episode.path);
                          }}
                        >
                          <FolderOpen size={16} /> Reveal File
                        </button>
                        <button 
                          className="episode-action-btn"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await api.retryItemImage(episode.id);
                              alert('Image queued for retry! It will be downloaded in the background.');
                            } catch (err) {
                              console.error("Failed to retry image:", err);
                              alert('Failed to trigger image retry.');
                            }
                          }}
                        >
                          <RefreshCcw size={16} /> Retry Image
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* External Links */}
        <div className="detail-section" style={{ marginTop: '20px' }}>
          <a
            className="external-link-btn tmdb"
            href={`https://www.themoviedb.org/tv/${data.series_tmdb_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Star size={14} /> View on TMDB
          </a>
        </div>
      </div>
      <style>{`
        /* Smooth transitions for episode cards */
        .episode-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          border: 1px solid transparent !important;
        }
        .episode-card:hover {
          background: rgba(255, 255, 255, 0.015) !important;
          border-color: rgba(59, 130, 246, 0.1) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2) !important;
        }
        
        /* Episode thumb image zoom */
        .episode-thumb {
          position: relative !important;
          overflow: hidden !important;
          border-radius: 8px !important;
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .episode-thumb img {
          transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .episode-card:hover .episode-thumb {
          border-color: rgba(59, 130, 246, 0.4) !important;
          box-shadow: 0 0 15px rgba(59, 130, 246, 0.15) !important;
        }
        .episode-card:hover .episode-thumb img {
          transform: scale(1.06) !important;
        }

        /* Hover Play Overlay button inside thumb */
        .episode-play-overlay-btn {
          position: absolute !important;
          inset: 0 !important;
          z-index: 5 !important;
          background: rgba(18, 19, 24, 0.5) !important;
          border: none !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
          opacity: 0 !important;
          transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .episode-card:hover .episode-play-overlay-btn {
          opacity: 1 !important;
        }

        /* Centered Cyber-Blue Glass Play Icon */
        .play-icon-circle {
          width: 42px !important;
          height: 42px !important;
          border-radius: 50% !important;
          background: rgba(59, 130, 246, 0.15) !important;
          border: 1px solid rgba(59, 130, 246, 0.55) !important;
          color: #3b82f6 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          padding-left: 3px !important;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          backdrop-filter: blur(4px) !important;
          -webkit-backdrop-filter: blur(4px) !important;
        }
        .episode-play-overlay-btn:hover .play-icon-circle {
          transform: scale(1.15) !important;
          background: rgba(59, 130, 246, 0.35) !important;
          border-color: rgba(59, 130, 246, 0.95) !important;
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.65) !important;
          color: #ffffff !important;
        }
      `}</style>
    </div>
  );
};

export default SeriesDetailView;
