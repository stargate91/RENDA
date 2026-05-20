import React, { useState, useEffect } from 'react';
import { ArrowLeft, User } from 'lucide-react';
import { api, API_BASE } from '../../../services/api';
import { useAppContext } from '../../../context/AppContext';
import PersonDetailHero from './PersonDetailHero';
import PersonMoviesSection from './PersonMoviesSection';
import PersonSeriesSection from './PersonSeriesSection';
import PersonImageModal from './PersonImageModal';

const PersonDetailView = ({ personId, onBack, onMovieClick, onSeriesClick }) => {
  const { T } = useAppContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(null);
  const [showMissingMovies, setShowMissingMovies] = useState(false);
  const [showMissingSeries, setShowMissingSeries] = useState(false);

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

  const handleAddTag = async (newTag) => {
    if (!data) return;
    const updatedTags = [...(data.custom_tags || []), newTag];
    setData(prev => ({ ...prev, custom_tags: updatedTags }));
    try {
      await api.updatePersonStatus(data.id, { custom_tags: updatedTags });
    } catch (e) {
      console.error("Failed to add custom tag:", e);
    }
  };

  const handleRemoveTag = async (tagToRemove) => {
    if (!data) return;
    const updatedTags = (data.custom_tags || []).filter(t => t !== tagToRemove);
    setData(prev => ({ ...prev, custom_tags: updatedTags }));
    try {
      await api.updatePersonStatus(data.id, { custom_tags: updatedTags });
    } catch (e) {
      console.error("Failed to remove custom tag:", e);
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
        <p>{T('library.could_not_load')}</p>
        <button className="detail-back-btn" onClick={onBack} style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> {T('library.go_back')}
        </button>
      </div>
    );
  }

  return (
    <div className="movie-detail series-detail person-detail">
      {/* ===== HERO ===== */}
      <PersonDetailHero 
        data={data}
        onBack={onBack}
        onToggleStatus={handleToggleStatus}
        onSetRating={handleSetRating}
        onAddTag={handleAddTag}
        onRemoveTag={handleRemoveTag}
        onImageClick={() => setShowImageModal(true)}
        T={T}
        API_BASE={API_BASE}
      />

      {/* ===== BODY ===== */}
      <div className="detail-body">
        
        {/* Movies Filmography */}
        <PersonMoviesSection 
          movies={data.movies}
          showMissingMovies={showMissingMovies}
          onToggleShowMissing={() => setShowMissingMovies(!showMissingMovies)}
          onMovieClick={onMovieClick}
          T={T}
          API_BASE={API_BASE}
        />

        {/* Series Filmography */}
        <PersonSeriesSection 
          series={data.series}
          showMissingSeries={showMissingSeries}
          onToggleShowMissing={() => setShowMissingSeries(!showMissingSeries)}
          onSeriesClick={onSeriesClick}
          T={T}
          API_BASE={API_BASE}
        />

      </div>

      {/* ===== CHOOSE PROFILE IMAGE MODAL ===== */}
      {showImageModal && (
        <PersonImageModal 
          data={data}
          updatingProfile={updatingProfile}
          onClose={() => setShowImageModal(false)}
          onSelectImage={handleSelectImage}
          onCustomUpload={handleCustomUpload}
          onCustomUrl={handleCustomUrl}
          T={T}
          API_BASE={API_BASE}
        />
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
      `}</style>
    </div>
  );
};

export default PersonDetailView;

