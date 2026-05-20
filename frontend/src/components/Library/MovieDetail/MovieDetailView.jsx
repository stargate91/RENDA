import React, { useState, useEffect } from 'react';
import { ArrowLeft, Film, X } from 'lucide-react';
import { api, API_BASE } from '../../../services/api';
import { useAppContext } from '../../../context/AppContext';
import MovieDetailHero from './MovieDetailHero';
import MovieDetailCast from './MovieDetailCast';
import MovieDetailSpecs from './MovieDetailSpecs';

const MovieDetailView = ({ itemId, onBack, onPersonClick }) => {
  const { T, openResolver, showResolverModal } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!showResolverModal && data) {
      const fetchDetail = async () => {
        try {
          const res = await api.getLibraryItemDetail(itemId);
          setData(res);
        } catch (e) {
          console.error("Failed to re-fetch detail:", e);
        }
      };
      fetchDetail();
    }
  }, [showResolverModal]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false);
      }
    };
    if (isLightboxOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLightboxOpen]);

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
      await api.updateItemStatus(itemId, { is_favorite: newFav });
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
      await api.updateItemStatus(itemId, { user_rating: newRating });
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
        const res = await api.getLibraryItemDetail(itemId);
        setData(res);
      } catch (e) {
        console.error("Failed to fetch detail:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [itemId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', animation: 'fadeIn 0.3s ease' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-dim)' }}>
        <Film size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
        <p>{T('library.could_not_load')}</p>
        <button className="detail-back-btn" onClick={onBack} style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> {T('library.go_back')}
        </button>
      </div>
    );
  }

  const posterUrl = data.poster_path 
    ? (data.in_library === false 
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : `${API_BASE}/media/images/posters${data.poster_path}`)
    : null;

  return (
    <div className="movie-detail">
      {/* ===== HERO SECTION ===== */}
      <MovieDetailHero
        data={data}
        itemId={itemId}
        onBack={onBack}
        onPlayMedia={handlePlayMedia}
        onPlayTrailer={handlePlayTrailer}
        onToggleFavorite={handleToggleFavorite}
        onSetRating={handleSetRating}
        onAddTag={async (newTag) => {
          const updatedTags = [...(data.custom_tags || []), newTag];
          setData(prev => ({ ...prev, custom_tags: updatedTags }));
          try {
            await api.updateItemStatus(itemId, { custom_tags: updatedTags });
          } catch (e) {
            console.error("Failed to add custom tag:", e);
          }
        }}
        onRemoveTag={async (tagToRemove) => {
          const updatedTags = (data.custom_tags || []).filter(t => t !== tagToRemove);
          setData(prev => ({ ...prev, custom_tags: updatedTags }));
          try {
            await api.updateItemStatus(itemId, { custom_tags: updatedTags });
          } catch (e) {
            console.error("Failed to remove custom tag:", e);
          }
        }}
        onPosterClick={() => setIsLightboxOpen(true)}
        T={T}
        API_BASE={API_BASE}
      />

      {/* ===== BODY ===== */}
      <div className="detail-body">
        {/* Cast & Directors horizontal scrolls */}
        <MovieDetailCast
          directors={data.directors}
          cast={data.cast}
          onPersonClick={onPersonClick}
          T={T}
          API_BASE={API_BASE}
        />

        {/* Technical specs, budget financials, explorer integration, db web links */}
        <MovieDetailSpecs
          data={data}
          openResolver={openResolver}
          T={T}
        />
      </div>

      {/* ===== POSTER LIGHTBOX MODAL ===== */}
      {isLightboxOpen && posterUrl && (
        <div 
          onClick={() => setIsLightboxOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(10, 10, 12, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.25s ease-out',
            cursor: 'zoom-out',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            style={{
              position: 'absolute',
              top: '25px',
              right: '25px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={20} />
          </button>

          {/* Large image wrapper */}
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90%',
              maxHeight: '90%',
              borderRadius: '20px',
              overflow: 'hidden',
              boxShadow: '0 30px 100px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.1)',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <img 
              src={posterUrl} 
              alt={data.title} 
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetailView;

