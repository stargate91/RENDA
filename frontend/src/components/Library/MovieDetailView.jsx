import React, { useState, useEffect } from 'react';
import { ArrowLeft, Clock, Calendar, Star, Users, Clapperboard, Film, Monitor, HardDrive, ExternalLink, User, FolderOpen } from 'lucide-react';
import { api, API_BASE } from '../../services/api';

const MovieDetailView = ({ itemId, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const formatRuntime = (min) => {
    if (!min) return null;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const formatMoney = (val) => {
    if (!val) return null;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val}`;
  };

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
    return `${bytes} B`;
  };

  const formatDuration = (sec) => {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m} min`;
  };

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
        <p>Could not load details.</p>
        <button className="detail-back-btn" onClick={onBack} style={{ marginTop: '20px' }}>
          <ArrowLeft size={16} /> Go Back
        </button>
      </div>
    );
  }

  const tech = data.technical || {};
  const hasRatings = data.rating_tmdb || data.rating_imdb || data.rating_rotten || data.rating_meta;
  const hasFinancials = data.budget || data.revenue;
  const backdropUrl = data.backdrop_path ? `${API_BASE}/media/images/backdrops${data.backdrop_path}` : null;
  const posterUrl = data.poster_path ? `${API_BASE}/media/images/posters${data.poster_path}` : null;

  return (
    <div className="movie-detail">
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
                <Film size={48} color="var(--text-muted)" />
              </div>
            )}
          </div>

          <div className="detail-info">
            <button className="detail-back-btn" onClick={onBack}>
              <ArrowLeft size={14} /> Back to Library
            </button>

            <h1 className="detail-title">{data.title}</h1>
            
            {data.original_title && data.original_title !== data.title && (
              <div className="detail-original-title">{data.original_title}</div>
            )}

            {data.tagline && (
              <div className="detail-tagline">"{data.tagline}"</div>
            )}

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

      {/* ===== BODY ===== */}
      <div className="detail-body">

        {/* Directors */}
        {data.directors && data.directors.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">
              <Clapperboard size={20} /> Director{data.directors.length > 1 ? 's' : ''}
            </div>
            <div className="director-row">
              {data.directors.map(d => (
                <div key={d.id} className="director-card">
                  <div className="director-card-img">
                    {d.profile_path ? (
                      <img src={`${API_BASE}/media/images/persons${d.profile_path}`} alt={d.name} />
                    ) : (
                      <div className="cast-card-img-placeholder"><User size={20} color="var(--text-muted)" /></div>
                    )}
                  </div>
                  <div>
                    <div className="director-card-name">{d.name}</div>
                    <div className="director-card-job">{d.job}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cast */}
        {data.cast && data.cast.length > 0 && (
          <div className="detail-section">
            <div className="detail-section-title">
              <Users size={20} /> Cast
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

        {/* Technical Info */}
        <div className="detail-section">
          <div className="detail-section-title">
            <Monitor size={20} /> Technical Details
          </div>
          <div className="info-grid">
            {tech.resolution && (
              <div className="info-card">
                <div className="info-card-label">Resolution</div>
                <div className="info-card-value">{tech.resolution}</div>
              </div>
            )}
            {tech.video_codec && (
              <div className="info-card">
                <div className="info-card-label">Video Codec</div>
                <div className="info-card-value">{tech.video_codec}</div>
              </div>
            )}
            {tech.audio_codec && (
              <div className="info-card">
                <div className="info-card-label">Audio Codec</div>
                <div className="info-card-value">{tech.audio_codec}</div>
              </div>
            )}
            {tech.audio_channels && (
              <div className="info-card">
                <div className="info-card-label">Audio Channels</div>
                <div className="info-card-value">{tech.audio_channels}</div>
              </div>
            )}
            {tech.bit_depth && (
              <div className="info-card">
                <div className="info-card-label">Bit Depth</div>
                <div className="info-card-value">{tech.bit_depth}-bit</div>
              </div>
            )}
            {tech.framerate && (
              <div className="info-card">
                <div className="info-card-label">Framerate</div>
                <div className="info-card-value">{tech.framerate} fps</div>
              </div>
            )}
            {tech.hdr_type && tech.hdr_type !== 'none' && (
              <div className="info-card">
                <div className="info-card-label">HDR</div>
                <div className="info-card-value">{tech.hdr_type}</div>
              </div>
            )}
            {tech.duration && (
              <div className="info-card">
                <div className="info-card-label">Duration</div>
                <div className="info-card-value">{formatDuration(tech.duration)}</div>
              </div>
            )}
            <div className="info-card">
              <div className="info-card-label">File Size</div>
              <div className="info-card-value">{formatSize(tech.size_bytes)}</div>
            </div>
            {tech.source && tech.source !== 'none' && (
              <div className="info-card">
                <div className="info-card-label">Source</div>
                <div className="info-card-value">{tech.source.toUpperCase()}</div>
              </div>
            )}
            {tech.edition && tech.edition !== 'none' && (
              <div className="info-card">
                <div className="info-card-label">Edition</div>
                <div className="info-card-value">{tech.edition.replace(/_/g, ' ')}</div>
              </div>
            )}
          </div>
        </div>

        {/* Financials */}
        {hasFinancials && (
          <div className="detail-section">
            <div className="detail-section-title">
              <HardDrive size={20} /> Box Office
            </div>
            <div className="info-grid">
              {data.budget > 0 && (
                <div className="info-card">
                  <div className="info-card-label">Budget</div>
                  <div className="info-card-value">{formatMoney(data.budget)}</div>
                </div>
              )}
              {data.revenue > 0 && (
                <div className="info-card">
                  <div className="info-card-label">Revenue</div>
                  <div className="info-card-value">{formatMoney(data.revenue)}</div>
                </div>
              )}
              {data.budget > 0 && data.revenue > 0 && (
                <div className="info-card">
                  <div className="info-card-label">Profit</div>
                  <div className="info-card-value" style={{ color: data.revenue > data.budget ? 'var(--success)' : 'var(--danger)' }}>
                    {formatMoney(data.revenue - data.budget)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Info */}
        <div className="detail-section">
          <div className="detail-section-title">
            <FolderOpen size={20} /> File
          </div>
          <div 
            className="file-path-display"
            onClick={() => data.path && api.revealInExplorer(data.path)}
            title="Click to reveal in file explorer"
          >
            {data.path || data.filename}
          </div>
        </div>

        {/* External Links */}
        {(data.tmdb_id || data.imdb_id) && (
          <div className="detail-section">
            <div className="detail-section-title">
              <ExternalLink size={20} /> External Links
            </div>
            <div className="external-links">
              {data.tmdb_id && (
                <a
                  className="external-link-btn tmdb"
                  href={`https://www.themoviedb.org/${data.type === 'movie' ? 'movie' : 'tv'}/${data.tmdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Star size={14} /> TMDB
                </a>
              )}
              {data.imdb_id && (
                <a
                  className="external-link-btn imdb"
                  href={`https://www.imdb.com/title/${data.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Star size={14} /> IMDb
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetailView;
