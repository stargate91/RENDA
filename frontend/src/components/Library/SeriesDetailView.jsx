import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, User, X } from 'lucide-react';
import { api, API_BASE } from '../../services/api';
import { useAppContext } from '../../context/AppContext';
import SeriesDetailHero from './SeriesDetailHero';
import SeriesSeasonSelector from './SeriesSeasonSelector';
import SeriesEpisodeList from './SeriesEpisodeList';
import SeriesDetailFooter from './SeriesDetailFooter';

const SeriesDetailView = ({ seriesTmdbId, onBack, onPersonClick }) => {
  const { T, openResolver, showResolverModal } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeasonNum, setActiveSeasonNum] = useState(1);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!showResolverModal && data) {
      const fetchDetail = async () => {
        try {
          const res = await api.getLibrarySeriesDetail(seriesTmdbId);
          setData(res);
        } catch (e) {
          console.error("Failed to re-fetch series details:", e);
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

  const activeSeason = data.seasons.find(s => s.season_number === activeSeasonNum);

  // Calculate the Next Episode to watch
  let continueEpisode = null;
  let allEpisodes = [];
  if (data.in_library !== false) {
    data.seasons.forEach(s => s.episodes.forEach(e => allEpisodes.push(e)));
  }
  
  if (allEpisodes.length > 0) {
    const partiallyWatched = allEpisodes.find(e => !e.is_watched && e.resume_position > 0);
    if (partiallyWatched) {
      continueEpisode = partiallyWatched;
    } else {
      const firstUnwatched = allEpisodes.find(e => !e.is_watched);
      if (firstUnwatched) {
        continueEpisode = firstUnwatched;
      } else {
        continueEpisode = allEpisodes[0];
      }
    }
  }

  return (
    <div className="movie-detail series-detail">
      {/* ===== HERO ===== */}
      <SeriesDetailHero
        data={data}
        continueEpisode={continueEpisode}
        onBack={onBack}
        onPlayMedia={handlePlayMedia}
        onPlayTrailer={handlePlayTrailer}
        onToggleFavorite={handleToggleFavorite}
        onSetRating={handleSetRating}
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
        onPosterClick={() => setIsLightboxOpen(true)}
        onPersonClick={onPersonClick}
        T={T}
        API_BASE={API_BASE}
      />

      <div className="detail-body">
        {/* Cast Carousel */}
        {data.cast && data.cast.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">
              <Users size={20} /> {T('detail.series_cast')}
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
                      <img 
                        src={c.profile_path.startsWith('http') ? c.profile_path : `${API_BASE}/media/images/persons${c.profile_path}`} 
                        alt={c.name} 
                      />
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
        <SeriesSeasonSelector
          seasons={data.seasons}
          activeSeasonNum={activeSeasonNum}
          onSeasonChange={(num) => {
            setActiveSeasonNum(num);
          }}
          posterUrl={posterUrl}
          inLibrary={data.in_library}
          API_BASE={API_BASE}
        />

        {/* Episode List */}
        <SeriesEpisodeList
          activeSeason={activeSeason}
          activeSeasonNum={activeSeasonNum}
          inLibrary={data.in_library}
          onPlayMedia={handlePlayMedia}
          openResolver={openResolver}
          T={T}
          API_BASE={API_BASE}
        />

        {/* File Path + External Links */}
        <SeriesDetailFooter
          data={data}
          openResolver={openResolver}
          T={T}
        />
      </div>

      {/* Episode card animation styles */}
      <style>{`
        .episode-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
          border: 1px solid transparent !important;
        }
        .episode-card:hover {
          background: rgba(255, 255, 255, 0.015) !important;
          border-color: rgba(59, 130, 246, 0.1) !important;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.2) !important;
        }
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

export default SeriesDetailView;
