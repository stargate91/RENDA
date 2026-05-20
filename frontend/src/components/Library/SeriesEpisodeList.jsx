import React, { useState } from 'react';
import { Play, ChevronDown, ChevronUp, FolderOpen, RefreshCcw, Check } from 'lucide-react';
import { api } from '../../services/api';

const SeriesEpisodeList = ({ activeSeason, activeSeasonNum, inLibrary, onPlayMedia, openResolver, T, API_BASE }) => {
  const [expandedEpisodeId, setExpandedEpisodeId] = useState(null);

  const formatSize = (bytes) => {
    if (!bytes) return '—';
    if (bytes >= 1024 ** 3) return `${(bytes / (1024 ** 3)).toFixed(2)} GB`;
    if (bytes >= 1024 ** 2) return `${(bytes / (1024 ** 2)).toFixed(0)} MB`;
    return `${bytes} B`;
  };

  if (!activeSeason) return null;

  return (
    <div className="episode-list detail-section">
      {activeSeason.episodes.map(episode => {
        const isExpanded = expandedEpisodeId === episode.id;
        const thumbUrl = episode.still_path 
          ? (inLibrary === false 
              ? `https://image.tmdb.org/t/p/w300${episode.still_path}`
              : `${API_BASE}/media/images/stills${episode.still_path}`)
          : null;
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
                {inLibrary !== false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlayMedia(episode.id);
                    }}
                    className="episode-play-overlay-btn"
                  >
                    <div className="play-icon-circle">▶</div>
                  </button>
                )}

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
                   {tech.size_bytes > 0 && (
                     <div className="tech-item">
                       <span className="tech-label">Size</span>
                       <span className="tech-val">{formatSize(tech.size_bytes)}</span>
                     </div>
                   )}
                   {tech.source && tech.source !== 'none' && (
                     <div className="tech-item">
                       <span className="tech-label">Source</span>
                       <span className="tech-val">{tech.source.toUpperCase()}</span>
                     </div>
                   )}
                 </div>
 
                 {inLibrary !== false && (
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
                     <button 
                       className="episode-action-btn"
                       onClick={(e) => {
                         e.stopPropagation();
                         openResolver({
                           id: episode.id,
                           title: episode.title || `Episode ${episode.episode_number}`,
                           filename: episode.filename,
                           type: 'episode',
                           season: activeSeasonNum,
                           episode: episode.episode_number
                         });
                       }}
                     >
                       <RefreshCcw size={16} /> {T('resolver.correct_match') || 'Párosítás javítása'}
                     </button>
                   </div>
                 )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SeriesEpisodeList;
