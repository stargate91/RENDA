import React, { useState } from 'react';
import { X } from 'lucide-react';

const MetadataModal = ({ show, metadata, onClose }) => {
  const [activeTab, setActiveTab] = useState('technical');

  if (!show || !metadata) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content metadata-modal" onClick={e => e.stopPropagation()}>
        <div className="metadata-modal-header">
          <h2>{metadata.filename}</h2>
          <button className="metadata-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="metadata-tabs">
          {[
            { id: 'technical', label: 'Technical' },
            { id: 'guessit', label: 'Guessit' },
            { id: 'overrides', label: 'Overrides' },
            { id: 'matches', label: `API Matches (${metadata.matches?.length || 0})` },
            { id: 'api_raw', label: 'Raw JSON' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`metadata-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        <div className="metadata-scroll-container">
          {activeTab === 'technical' && (
            <div className="metadata-section">
              <div className="metadata-grid">
                {Object.entries(metadata.technical).filter(([key]) => key !== 'audio_streams').map(([key, val]) => (
                  <div key={key} className="metadata-grid-item">
                    <span className="metadata-key">{key.replace(/_/g, ' ')}</span>
                    <span className="metadata-val">{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</span>
                  </div>
                ))}
              </div>
              {metadata.technical.audio_streams && metadata.technical.audio_streams.length > 0 && (
                <>
                  <div className="metadata-match-subheader" style={{marginTop: '20px'}}>Audio Streams</div>
                  <div className="metadata-code-block">
                    {JSON.stringify(metadata.technical.audio_streams, null, 2)}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'guessit' && (
            <div className="metadata-section">
              <div className="metadata-grid">
                {Object.entries(metadata.guessit).map(([key, val]) => (
                  <div key={key} className="metadata-grid-item">
                    <span className="metadata-key">{key.replace(/_/g, ' ')}</span>
                    <span className="metadata-val">{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'overrides' && (
            <div className="metadata-section">
              <div className="metadata-grid">
                {metadata.overrides && Object.entries(metadata.overrides).map(([key, val]) => (
                  <div key={key} className="metadata-grid-item">
                    <span className="metadata-key">{key.replace(/_/g, ' ')}</span>
                    <span className="metadata-val">{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="metadata-section">
              {metadata.matches && metadata.matches.length > 0 ? (
                metadata.matches.map((m, idx) => (
                  <div key={m.id} className="metadata-match-card">
                    <div className="metadata-match-header">
                      Match {idx + 1} — {m.type.toUpperCase()} — TMDB: {m.tmdb_id || 'N/A'}
                      {m.imdb_id ? ` — IMDb: ${m.imdb_id}` : ''}
                      {m.is_active && <span className="metadata-active-badge">ACTIVE</span>}
                    </div>

                    <div className="metadata-grid compact" style={{ marginBottom: '15px' }}>
                      {m.season_number != null && <div className="metadata-grid-item"><span className="metadata-key">Season Number</span><span className="metadata-val">{m.season_number}</span></div>}
                      {m.episode_number != null && <div className="metadata-grid-item"><span className="metadata-key">Episode Number</span><span className="metadata-val">{m.episode_number}</span></div>}
                      {m.episode_count != null && <div className="metadata-grid-item"><span className="metadata-key">Episode Count</span><span className="metadata-val">{m.episode_count}</span></div>}
                      
                      {m.series_tmdb_id && <div className="metadata-grid-item"><span className="metadata-key">Series TMDB ID</span><span className="metadata-val">{m.series_tmdb_id}</span></div>}
                      {m.season_tmdb_id && <div className="metadata-grid-item"><span className="metadata-key">Season TMDB ID</span><span className="metadata-val">{m.season_tmdb_id}</span></div>}

                      {m.release_date && <div className="metadata-grid-item"><span className="metadata-key">Release Date</span><span className="metadata-val">{m.release_date}</span></div>}
                      {m.first_air_date && <div className="metadata-grid-item"><span className="metadata-key">First Air Date</span><span className="metadata-val">{m.first_air_date}</span></div>}
                      {m.last_air_date && <div className="metadata-grid-item"><span className="metadata-key">Last Air Date</span><span className="metadata-val">{m.last_air_date}</span></div>}
                      {m.episode_air_date && <div className="metadata-grid-item"><span className="metadata-key">Ep. Air Date</span><span className="metadata-val">{m.episode_air_date}</span></div>}
                      {m.season_air_date && <div className="metadata-grid-item"><span className="metadata-key">Season Air Date</span><span className="metadata-val">{m.season_air_date}</span></div>}
                      
                      {m.runtime != null && <div className="metadata-grid-item"><span className="metadata-key">Runtime</span><span className="metadata-val">{m.runtime} min</span></div>}
                      {m.popularity != null && <div className="metadata-grid-item"><span className="metadata-key">Popularity</span><span className="metadata-val">{m.popularity}</span></div>}
                      {m.release_status && <div className="metadata-grid-item"><span className="metadata-key">Release Status</span><span className="metadata-val">{m.release_status}</span></div>}
                      
                      {m.rating_tmdb != null && <div className="metadata-grid-item"><span className="metadata-key">TMDB Rating</span><span className="metadata-val">{m.rating_tmdb} {m.vote_count_tmdb != null ? `(${m.vote_count_tmdb} votes)` : ''}</span></div>}
                      {m.rating_imdb != null && <div className="metadata-grid-item"><span className="metadata-key">IMDB Rating</span><span className="metadata-val">{m.rating_imdb} {m.vote_count_imdb != null ? `(${m.vote_count_imdb} votes)` : ''}</span></div>}
                      {m.rating_rotten != null && <div className="metadata-grid-item"><span className="metadata-key">Rotten Tomatoes</span><span className="metadata-val">{m.rating_rotten}</span></div>}
                      {m.rating_meta != null && <div className="metadata-grid-item"><span className="metadata-key">Metascore</span><span className="metadata-val">{m.rating_meta}</span></div>}
                      
                      {m.budget != null && m.budget > 0 && <div className="metadata-grid-item"><span className="metadata-key">Budget</span><span className="metadata-val">${(m.budget / 1e6).toFixed(1)}M</span></div>}
                      {m.revenue != null && m.revenue > 0 && <div className="metadata-grid-item"><span className="metadata-key">Revenue</span><span className="metadata-val">${(m.revenue / 1e6).toFixed(1)}M</span></div>}
                      {m.director && <div className="metadata-grid-item"><span className="metadata-key">Director</span><span className="metadata-val">{m.director}</span></div>}
                      {m.collection && <div className="metadata-grid-item"><span className="metadata-key">Collection</span><span className="metadata-val">{m.collection}</span></div>}
                      {m.series_type && <div className="metadata-grid-item"><span className="metadata-key">Series Type</span><span className="metadata-val">{m.series_type}</span></div>}
                      {m.number_of_seasons != null && <div className="metadata-grid-item"><span className="metadata-key">Seasons</span><span className="metadata-val">{m.number_of_seasons}</span></div>}
                      {m.number_of_episodes != null && <div className="metadata-grid-item"><span className="metadata-key">Episodes</span><span className="metadata-val">{m.number_of_episodes}</span></div>}
                      {m.fetched_languages && <div className="metadata-grid-item"><span className="metadata-key">Fetched Langs</span><span className="metadata-val">{m.fetched_languages}</span></div>}
                      {m.image_status && <div className="metadata-grid-item"><span className="metadata-key">Image Status</span><span className="metadata-val">{m.image_status}</span></div>}
                      {m.backdrop_status && <div className="metadata-grid-item"><span className="metadata-key">Backdrop Status</span><span className="metadata-val">{m.backdrop_status}</span></div>}

                      {m.networks && m.networks.length > 0 && <div className="metadata-grid-item full"><span className="metadata-key">Networks</span><span className="metadata-val">{m.networks.join(', ')}</span></div>}
                      {m.cast && m.cast.length > 0 && <div className="metadata-grid-item full"><span className="metadata-key">Cast</span><span className="metadata-val">{m.cast.slice(0, 10).map(c => c.name || c).join(', ')}{m.cast.length > 10 ? '…' : ''}</span></div>}
                      <div className="metadata-grid-item"><span className="metadata-key">Confidence</span><span className="metadata-val">{m.confidence}</span></div>
                    </div>

                    {m.localizations && m.localizations.length > 0 && (
                      <>
                        <div className="metadata-match-subheader">Localizations</div>
                        {m.localizations.map((loc, li) => (
                          <div key={li} className="metadata-loc-card">
                            <div className="metadata-loc-lang">{(loc.language || '??').toUpperCase()}{loc.is_primary ? ' (Primary)' : ''}</div>
                            <div className="metadata-grid compact">
                              <div className="metadata-grid-item"><span className="metadata-key">Title</span><span className="metadata-val">{loc.title || '—'}</span></div>
                              <div className="metadata-grid-item"><span className="metadata-key">Original Title</span><span className="metadata-val">{loc.original_title || '—'}</span></div>
                              {loc.series_title && loc.series_title !== loc.title && <div className="metadata-grid-item"><span className="metadata-key">Series Title</span><span className="metadata-val">{loc.series_title}</span></div>}
                              {loc.original_series_title && loc.original_series_title !== loc.original_title && <div className="metadata-grid-item"><span className="metadata-key">Orig. Series</span><span className="metadata-val">{loc.original_series_title}</span></div>}
                              {loc.season_title && <div className="metadata-grid-item"><span className="metadata-key">Season Title</span><span className="metadata-val">{loc.season_title}</span></div>}
                              {loc.episode_title && <div className="metadata-grid-item"><span className="metadata-key">Episode Title</span><span className="metadata-val">{loc.episode_title}</span></div>}
                              {loc.tagline && <div className="metadata-grid-item full"><span className="metadata-key">Tagline</span><span className="metadata-val">{loc.tagline}</span></div>}
                              {loc.genres && <div className="metadata-grid-item full"><span className="metadata-key">Genres</span><span className="metadata-val">{Array.isArray(loc.genres) ? loc.genres.join(', ') : loc.genres}</span></div>}
                              {loc.original_language && <div className="metadata-grid-item"><span className="metadata-key">Orig. Language</span><span className="metadata-val">{loc.original_language.toUpperCase()}</span></div>}
                              {loc.origin_country && <div className="metadata-grid-item"><span className="metadata-key">Country</span><span className="metadata-val">{loc.origin_country.join(', ')}</span></div>}
                              {loc.spoken_languages && <div className="metadata-grid-item full"><span className="metadata-key">Spoken Languages</span><span className="metadata-val">{loc.spoken_languages.join(', ')}</span></div>}
                              
                              {loc.poster_path && <div className="metadata-grid-item full"><span className="metadata-key">Poster Path</span><span className="metadata-val">{loc.poster_path}</span></div>}
                              {loc.local_poster_path && <div className="metadata-grid-item full"><span className="metadata-key">Local Poster</span><span className="metadata-val">{loc.local_poster_path}</span></div>}
                              {loc.backdrop_path && <div className="metadata-grid-item full"><span className="metadata-key">Backdrop Path</span><span className="metadata-val">{loc.backdrop_path}</span></div>}
                              {loc.local_backdrop_path && <div className="metadata-grid-item full"><span className="metadata-key">Local Backdrop</span><span className="metadata-val">{loc.local_backdrop_path}</span></div>}
                              {loc.still_path && <div className="metadata-grid-item full"><span className="metadata-key">Still Path</span><span className="metadata-val">{loc.still_path}</span></div>}
                              {loc.local_still_path && <div className="metadata-grid-item full"><span className="metadata-key">Local Still</span><span className="metadata-val">{loc.local_still_path}</span></div>}
                              
                              {loc.overview && <div className="metadata-grid-item full"><span className="metadata-key">Overview</span><span className="metadata-val overview-text">{loc.overview}</span></div>}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ opacity: 0.5, textAlign: 'center', padding: '40px 0' }}>No matches found for this item.</p>
              )}
            </div>
          )}

          {activeTab === 'api_raw' && (
            <div className="metadata-section">
              {metadata.matches && metadata.matches.length > 0 ? (
                metadata.matches.map((m, idx) => (
                  <div key={m.id} className="metadata-match-card">
                    <div className="metadata-match-header">
                      Match {idx + 1} — TMDB: {m.tmdb_id || 'N/A'}
                    </div>
                    <div className="metadata-code-block">
                      {JSON.stringify(m.api_responses, null, 2)}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ opacity: 0.5, textAlign: 'center', padding: '40px 0' }}>No API data available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetadataModal;
