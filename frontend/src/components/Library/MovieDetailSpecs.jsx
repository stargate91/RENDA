import React from 'react';
import { Monitor, HardDrive, FolderOpen, RefreshCcw, ExternalLink, Star } from 'lucide-react';
import { api } from '../../services/api';

const MovieDetailSpecs = ({ data, openResolver, T }) => {
  const tech = data.technical || {};
  const hasFinancials = data.budget || data.revenue;

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

  const formatMoney = (val) => {
    if (!val) return null;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
    return `$${val}`;
  };

  return (
    <>
      {/* Technical Info */}
      <div className="detail-section">
        <div className="detail-section-title">
          <Monitor size={20} /> {T('detail.technical_info')}
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
      {data.in_library !== false && (
        <div className="detail-section">
          <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={20} /> File
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openResolver({
                  id: data.id,
                  title: data.title,
                  filename: data.filename,
                  type: 'movie',
                  year: data.year
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <RefreshCcw size={12} />
              {T('resolver.correct_match') || 'Párosítás javítása'}
            </button>
          </div>
          <div 
            className="file-path-display"
            onClick={() => data.path && api.revealInExplorer(data.path)}
            title="Click to reveal in file explorer"
          >
            {data.path || data.filename}
          </div>
        </div>
      )}

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
    </>
  );
};

export default MovieDetailSpecs;
