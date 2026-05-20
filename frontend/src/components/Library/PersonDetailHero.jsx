import React, { useState } from 'react';
import { ArrowLeft, Star, Heart, Plus, Minus, Calendar, MapPin, User, Sparkles } from 'lucide-react';
import CustomTagsList from './CustomTagsList';

const PersonDetailHero = ({
  data,
  onBack,
  onToggleStatus,
  onSetRating,
  onAddTag,
  onRemoveTag,
  onImageClick,
  T,
  API_BASE
}) => {
  const [hoverRating, setHoverRating] = useState(0);

  const backdropUrl = data.backdrop_path ? `${API_BASE}/media/images/backdrops${data.backdrop_path}` : null;
  const profileUrl = data.profile_path 
    ? (data.profile_path.startsWith('http') 
        ? data.profile_path 
        : `${API_BASE}/media/images/persons${data.profile_path}`) 
    : null;

  const getGenderLabel = (g) => {
    if (g === 1) return 'Female';
    if (g === 2) return 'Male';
    if (g === 3) return 'Non-Binary';
    return 'Unspecified';
  };

  return (
    <div className="detail-hero" style={{ minHeight: '460px' }}>
      <button className="detail-back-btn" onClick={onBack}>
        <ArrowLeft size={14} /> {T('library.go_back')}
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
          onClick={onImageClick}
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
              onClick={() => onToggleStatus('is_favorite')}
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
              onClick={() => onToggleStatus('is_active')}
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
                {T('detail.your_rating')}
              </span>
            )}
          </div>

          {/* Department / Category Tagline */}
          {data.known_for_department && (
            <div className="detail-tagline" style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} /> {T('detail.known_for')}: {data.known_for_department}
            </div>
          )}

          {/* Meta pills */}
          <div className="detail-meta-row" style={{ marginTop: '15px' }}>
            {data.birthday && (
              <span className="detail-meta-pill">
                <Calendar size={14} /> {T('detail.born')}: {data.birthday}
                {data.deathday && ` — ${T('detail.died')}: ${data.deathday}`}
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
                ★ {T('detail.popularity')}: {data.popularity.toFixed(1)}
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
              onAddTag={onAddTag}
              onRemoveTag={onRemoveTag}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonDetailHero;
