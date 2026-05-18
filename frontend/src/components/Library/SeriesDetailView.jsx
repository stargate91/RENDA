import React, { useState, useEffect } from 'react';
import { ArrowLeft, Monitor, Play, Clapperboard, Users, User, ChevronDown, ChevronUp, FolderOpen, ExternalLink, Star, RefreshCcw } from 'lucide-react';
import { api, API_BASE } from '../../services/api';

const SeriesDetailView = ({ seriesTmdbId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSeasonNum, setActiveSeasonNum] = useState(1);
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);

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

  return (
    <div className="movie-detail series-detail">
      {/* ===== HERO ===== */}
      <div className="detail-hero">
        {backdropUrl && (
          <img className="detail-hero-backdrop" src={backdropUrl} alt="" />
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
            <button className="detail-back-btn" onClick={onBack}>
              <ArrowLeft size={14} /> Back to Library
            </button>

            <h1 className="detail-title">{data.title}</h1>
            
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
                  <span key={d.id} style={{ fontWeight: '600', fontSize: '14px' }}>{d.name}</span>
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
                <div key={c.id} className="cast-card">
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
                    <div className="episode-thumb">
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
    </div>
  );
};

export default SeriesDetailView;
