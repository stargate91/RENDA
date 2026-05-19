import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Star, Heart, Plus, Minus, Calendar, MapPin, Film, Tv, User, Award, Sparkles, Eye, EyeOff, Tag, Check, X, Upload, Link } from 'lucide-react';
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

const PersonDetailView = ({ personId, onBack, onMovieClick, onSeriesClick }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(null);
  const [hoverRating, setHoverRating] = useState(0);
  const [showMissingMovies, setShowMissingMovies] = useState(false);
  const [showMissingSeries, setShowMissingSeries] = useState(false);

  const handleSetRating = async (ratingValue) => {
    if (!data) return;
    const currentRating = data.user_rating;
    const newRating = currentRating === ratingValue ? null : ratingValue;

    setData(prev => ({ ...prev, user_rating: newRating }));

    try {
      await api.updatePersonStatus(data.id, { user_rating: newRating });
    } catch (e) {
      console.error("Failed to update user rating:", e);
      setData(prev => ({ ...prev, user_rating: currentRating }));
    }
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getPersonDetail(personId);
      setData(res);
    } catch (e) {
      console.error("Failed to fetch person detail:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [personId]);

  const handleToggleStatus = async (field) => {
    if (!data) return;
    const currentValue = data[field];
    const newValue = !currentValue;
    
    setData(prev => ({ ...prev, [field]: newValue }));
    
    try {
      await api.updatePersonStatus(data.id, { [field]: newValue });
    } catch (e) {
      console.error(`Failed to update ${field} status:`, e);
      setData(prev => ({ ...prev, [field]: currentValue }));
    }
  };

  const handleSelectImage = async (path) => {
    setUpdatingProfile(path);
    try {
      await api.updatePersonProfile(data.id, path);
      setData(prev => ({ ...prev, profile_path: path }));
      setShowImageModal(false);
    } catch (e) {
      console.error("Failed to update profile picture:", e);
    } finally {
      setUpdatingProfile(null);
    }
  };

  const fileInputRef = useRef(null);

  const handleCustomUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUpdatingProfile('upload');
    try {
      await api.uploadPersonProfile(data.id, file);
      await fetchDetail();
      setShowImageModal(false);
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setUpdatingProfile(null);
    }
  };

  const handleCustomUrl = async () => {
    const url = prompt("Enter an image URL (Imgur, direct link, TMDB, etc.):");
    if (!url) return;
    setUpdatingProfile('url');
    try {
      await api.updatePersonProfile(data.id, url);
      await fetchDetail();
      setShowImageModal(false);
    } catch (err) {
      console.error("URL update failed", err);
    } finally {
      setUpdatingProfile(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '400px', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <User size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
        <p>Could not load details.</p>
        <button className="detail-back-btn" onClick={onBack} style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const backdropUrl = data.backdrop_path ? `${API_BASE}/media/images/backdrops${data.backdrop_path}` : null;
  const profileUrl = data.profile_path ? `${API_BASE}/media/images/persons${data.profile_path}` : null;

  const getGenderLabel = (g) => {
    if (g === 1) return 'Female';
    if (g === 2) return 'Male';
    if (g === 3) return 'Non-Binary';
    return 'Unspecified';
  };

  return (
    <div className="movie-detail series-detail person-detail">
      {/* ===== HERO ===== */}
      <div className="detail-hero" style={{ minHeight: '460px' }}>
        <button className="detail-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>

        {backdropUrl && (
          <img className="detail-hero-backdrop" src={backdropUrl} alt="" />
        )}
        <div className="detail-hero-gradient" />

        <div className="detail-hero-content" style={{ minHeight: '460px' }}>
          <div 
            className="detail-poster profile-avatar-container" 
            style={{ 
              borderRadius: '16px', 
              aspectRatio: '2/3', 
              width: '240px', 
              minWidth: '240px', 
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
            onClick={() => setShowImageModal(true)}
          >
            {profileUrl ? (
              <img className="profile-avatar-img" src={profileUrl} alt={data.name} style={{ borderRadius: '12px', width: '100%', height: '100%', objectFit: 'cover', transition: 'all 0.3s' }} />
            ) : (
              <div className="detail-poster-placeholder" style={{ borderRadius: '12px' }}>
                <User size={64} color="var(--text-muted)" />
              </div>
            )}
            
            <div 
              className="profile-avatar-hover"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0,
                transition: 'opacity 0.3s',
                color: '#fff',
                fontSize: '12px',
                fontWeight: '600',
                gap: '6px',
                borderRadius: '12px'
              }}
            >
              <Sparkles size={18} />
              <span>Change Photo</span>
            </div>
          </div>

          <div className="detail-info">
            <h1 className="detail-title">{data.name}</h1>

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
                onClick={() => handleToggleStatus('is_favorite')}
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

              {/* Active Plus/Minus Button */}
              <button
                onClick={() => handleToggleStatus('is_active')}
                style={{
                  background: data.is_active ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: data.is_active ? '#4CAF50' : 'rgba(255, 255, 255, 0.4)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={e => {
                  e.currentTarget.style.color = '#4CAF50';
                  e.currentTarget.style.background = 'rgba(76, 175, 80, 0.1)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.color = data.is_active ? '#4CAF50' : 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.background = data.is_active ? 'rgba(76, 175, 80, 0.2)' : 'transparent';
                }}
                title={data.is_active ? "Remove from Library Catalog" : "Add to Library Catalog"}
              >
                {data.is_active ? <Minus size={18} /> : <Plus size={18} />}
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

            {/* Department / Category Tagline */}
            {data.known_for_department && (
              <div className="detail-tagline" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} /> Known for: {data.known_for_department}
              </div>
            )}

            {/* Meta pills */}
            <div className="detail-meta-row" style={{ marginTop: '15px' }}>
              {data.birthday && (
                <span className="detail-meta-pill">
                  <Calendar size={14} /> Born: {data.birthday}
                  {data.deathday && ` — Died: ${data.deathday}`}
                </span>
              )}
              {data.place_of_birth && (
                <span className="detail-meta-pill">
                  <MapPin size={14} /> {data.place_of_birth}
                </span>
              )}
              {data.gender > 0 && (
                <span className="detail-meta-pill">
                  {getGenderLabel(data.gender)}
                </span>
              )}
              {data.popularity > 0 && (
                <span className="detail-meta-pill accent">
                  ★ Popularity: {data.popularity.toFixed(1)}
                </span>
              )}
            </div>

            {/* Biography */}
            {data.biography && (
              <div className="detail-overview" style={{ fontSize: '14px', maxHeight: '140px', overflowY: 'auto', paddingRight: '10px' }}>
                {data.biography}
              </div>
            )}

            {/* Custom Tags */}
            <div style={{ marginTop: '15px' }}>
              <CustomTagsList
                tags={data.custom_tags || []}
                onAddTag={async (newTag) => {
                  const updatedTags = [...(data.custom_tags || []), newTag];
                  setData(prev => ({ ...prev, custom_tags: updatedTags }));
                  try {
                    await api.updatePersonStatus(data.id, { custom_tags: updatedTags });
                  } catch (e) {
                    console.error("Failed to add custom tag:", e);
                  }
                }}
                onRemoveTag={async (tagToRemove) => {
                  const updatedTags = (data.custom_tags || []).filter(t => t !== tagToRemove);
                  setData(prev => ({ ...prev, custom_tags: updatedTags }));
                  try {
                    await api.updatePersonStatus(data.id, { custom_tags: updatedTags });
                  } catch (e) {
                    console.error("Failed to remove custom tag:", e);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="detail-body">
        
        {/* Movies Filmography */}
        {data.movies && data.movies.length > 0 && (() => {
          const displayedMovies = showMissingMovies 
            ? data.movies 
            : data.movies.filter(m => m.in_library);
          const totalMoviesCount = data.movies.length;
          const libraryMoviesCount = data.movies.filter(m => m.in_library).length;
          const missingMoviesCount = totalMoviesCount - libraryMoviesCount;

          return (
            <div className="detail-section" style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Film size={20} /> Movies ({libraryMoviesCount} / {totalMoviesCount} in Library)
                </div>
                
                {missingMoviesCount > 0 && (
                  <button 
                    onClick={() => setShowMissingMovies(!showMissingMovies)}
                    style={{
                      marginLeft: 'auto',
                      background: showMissingMovies ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: showMissingMovies ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: showMissingMovies ? '#4CAF50' : 'var(--text-dim)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(8px)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                      if (!showMissingMovies) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      if (!showMissingMovies) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    {showMissingMovies ? (
                      <>
                        <Eye size={12} /> Hide Missing
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} /> Show Missing ({missingMoviesCount})
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="info-grid" style={{ transition: 'all 0.3s ease' }}>
                {displayedMovies.length === 0 ? (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    color: 'rgba(255,255,255,0.3)', 
                    fontSize: '13px', 
                    fontStyle: 'italic', 
                    padding: '24px 16px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px dashed rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    No movies from this person in your library. Click "Show Missing" to view their complete filmography.
                  </div>
                ) : (
                  displayedMovies.map(movie => {
                    const posterUrl = movie.poster_path 
                      ? (movie.in_library 
                          ? `${API_BASE}/media/images/posters${movie.poster_path}`
                          : `https://image.tmdb.org/t/p/w185${movie.poster_path}`)
                      : null;

                    return (
                      <div 
                        key={movie.id} 
                        className="info-card"
                        style={{ 
                          display: 'flex', 
                          gap: '16px', 
                          cursor: movie.in_library ? 'pointer' : 'default', 
                          alignItems: 'center',
                          opacity: movie.in_library ? 1 : 0.55,
                          border: movie.in_library ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                          background: movie.in_library ? 'rgba(76, 175, 80, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={movie.in_library ? () => onMovieClick(movie.library_item_id) : undefined}
                        onMouseOver={movie.in_library ? e => {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        } : undefined}
                        onMouseOut={movie.in_library ? e => {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.2)';
                          e.currentTarget.style.transform = 'none';
                        } : undefined}
                      >
                        <div style={{ width: '48px', height: '72px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                          {posterUrl ? (
                            <img src={posterUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Film size={16} color="var(--text-muted)" />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                            {movie.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {movie.year ? `${movie.year} • ` : ''}{movie.job}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {movie.rating > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: '700' }}>
                                ★ {movie.rating.toFixed(1)}
                              </span>
                            )}
                            {movie.in_library ? (
                              <span style={{ fontSize: '10px', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                ✓ In Library
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: '4px' }}>
                                Missing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

        {/* Series Filmography */}
        {data.series && data.series.length > 0 && (() => {
          const displayedSeries = showMissingSeries 
            ? data.series 
            : data.series.filter(s => s.in_library);
          const totalSeriesCount = data.series.length;
          const librarySeriesCount = data.series.filter(s => s.in_library).length;
          const missingSeriesCount = totalSeriesCount - librarySeriesCount;

          return (
            <div className="detail-section" style={{ animation: 'fadeIn 0.4s ease-out' }}>
              <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Tv size={20} /> TV Series ({librarySeriesCount} / {totalSeriesCount} in Library)
                </div>
                
                {missingSeriesCount > 0 && (
                  <button 
                    onClick={() => setShowMissingSeries(!showMissingSeries)}
                    style={{
                      marginLeft: 'auto',
                      background: showMissingSeries ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                      border: showMissingSeries ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                      color: showMissingSeries ? '#4CAF50' : 'var(--text-dim)',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                      backdropFilter: 'blur(8px)',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
                      if (!showMissingSeries) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.transform = 'none';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                      if (!showMissingSeries) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    }}
                  >
                    {showMissingSeries ? (
                      <>
                        <Eye size={12} /> Hide Missing
                      </>
                    ) : (
                      <>
                        <EyeOff size={12} /> Show Missing ({missingSeriesCount})
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="info-grid" style={{ transition: 'all 0.3s ease' }}>
                {displayedSeries.length === 0 ? (
                  <div style={{ 
                    gridColumn: '1 / -1', 
                    color: 'rgba(255,255,255,0.3)', 
                    fontSize: '13px', 
                    fontStyle: 'italic', 
                    padding: '24px 16px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px dashed rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    textAlign: 'center'
                  }}>
                    No series from this person in your library. Click "Show Missing" to view their complete filmography.
                  </div>
                ) : (
                  displayedSeries.map(show => {
                    const posterUrl = show.poster_path 
                      ? (show.in_library 
                          ? `${API_BASE}/media/images/posters${show.poster_path}`
                          : `https://image.tmdb.org/t/p/w185${show.poster_path}`)
                      : null;

                    return (
                      <div 
                        key={show.id} 
                        className="info-card"
                        style={{ 
                          display: 'flex', 
                          gap: '16px', 
                          cursor: show.in_library ? 'pointer' : 'default', 
                          alignItems: 'center',
                          opacity: show.in_library ? 1 : 0.55,
                          border: show.in_library ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                          background: show.in_library ? 'rgba(76, 175, 80, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                          padding: '10px 14px',
                          borderRadius: '12px',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={show.in_library ? () => onSeriesClick(show.library_series_tmdb_id) : undefined}
                        onMouseOver={show.in_library ? e => {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        } : undefined}
                        onMouseOut={show.in_library ? e => {
                          e.currentTarget.style.background = 'rgba(76, 175, 80, 0.03)';
                          e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.2)';
                          e.currentTarget.style.transform = 'none';
                        } : undefined}
                      >
                        <div style={{ width: '48px', height: '72px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                          {posterUrl ? (
                            <img src={posterUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                          ) : (
                            <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Tv size={16} color="var(--text-muted)" />
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                            {show.title}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {show.year ? `${show.year} • ` : ''}{show.job}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {show.rating > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: '700' }}>
                                ★ {show.rating.toFixed(1)}
                              </span>
                            )}
                            {show.in_library ? (
                              <span style={{ fontSize: '10px', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                                ✓ In Library
                              </span>
                            ) : (
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: '4px' }}>
                                Missing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })()}

      </div>

      {/* ===== CHOOSE PROFILE IMAGE MODAL ===== */}
      {showImageModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => setShowImageModal(false)}
        >
          <div 
            style={{
              background: '#121318',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '20px',
              width: '90%',
              maxWidth: '640px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>Choose Profile Image</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>Select a custom portrait for {data.name}</p>
              </div>
              <button 
                onClick={() => setShowImageModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ✕
              </button>
            </div>

            {/* Custom Upload Actions */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleCustomUpload} />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={updatingProfile !== null}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', color: '#3b82f6', fontWeight: '600', cursor: updatingProfile ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
                onMouseOut={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
              >
                {updatingProfile === 'upload' ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Upload size={16} />}
                Upload File
              </button>
              <button 
                onClick={handleCustomUrl}
                disabled={updatingProfile !== null}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: updatingProfile ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
                onMouseOut={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
              >
                {updatingProfile === 'url' ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Link size={16} />}
                Set via URL
              </button>
            </div>

            {/* Grid Body */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '16px' }}>
                {data.images && data.images.map((img, idx) => {
                  const isCurrent = data.profile_path === img;
                  const isUpdating = updatingProfile === img;
                  const tmdbImgUrl = `https://image.tmdb.org/t/p/w185${img}`;
                  
                  return (
                    <div 
                      key={idx}
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        aspectRatio: '2/3',
                        width: '100%',
                        cursor: isUpdating ? 'default' : 'pointer',
                        border: `3px solid ${isCurrent ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'}`,
                        transition: 'all 0.2s',
                        transform: isCurrent ? 'scale(0.98)' : 'none',
                        boxShadow: isCurrent ? '0 0 12px rgba(64, 169, 255, 0.4)' : 'none'
                      }}
                      onClick={() => !isUpdating && handleSelectImage(img)}
                      className="modal-image-card"
                    >
                      <img 
                        src={tmdbImgUrl} 
                        alt="" 
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover',
                          opacity: isCurrent ? 1 : 0.75,
                          transition: 'opacity 0.2s'
                        }} 
                      />
                      
                      {/* Hover state overlay */}
                      <div 
                        className="modal-image-hover"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: 'rgba(0,0,0,0.3)',
                          opacity: 0,
                          transition: 'opacity 0.2s'
                        }}
                      />

                      {/* Selected Badge */}
                      {isCurrent && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' }}>
                          ✓
                        </div>
                      )}

                      {/* Spinner overlay if saving */}
                      {isUpdating && (
                        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .profile-avatar-container {
          border: 1px solid rgba(255, 255, 255, 0.08) !important;
        }
        .profile-avatar-container:hover {
          border-color: rgba(64, 169, 255, 0.45) !important;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6), 0 0 16px rgba(64, 169, 255, 0.25) !important;
          transform: translateY(-4px);
        }
        .profile-avatar-container:hover .profile-avatar-hover {
          opacity: 1 !important;
        }
        .profile-avatar-container:hover .profile-avatar-img {
          filter: blur(2px) brightness(0.7) !important;
          transform: scale(1.05) !important;
        }
        .modal-image-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .modal-image-card:hover {
          border-color: var(--accent-blue) !important;
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(64, 169, 255, 0.25) !important;
        }
        .modal-image-card:hover img {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default PersonDetailView;
