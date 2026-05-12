import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, Tv, Calendar, X, Hash, ChevronRight, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

const ResolverModal = ({ show, item, onClose, onResolve, T }) => {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('movie');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');
  const searchInputRef = useRef(null);

  useEffect(() => {
    if (show && item) {
      const initialQuery = item.title || item.filename.split('.')[0];
      setQuery(initialQuery);
      setYear(item.year || '');
      setType(item.type === 'series' || item.type === 'episode' ? 'tv' : 'movie');
      
      // If we have existing matches, use them as initial results
      if (item.matches && item.matches.length > 0) {
        setResults(item.matches.map(m => ({
          ...m,
          id: m.tmdb_id, // Normalize ID for selection logic
          is_proposed: true
        })));
      } else {
        // Auto-trigger search ONLY if no existing matches
        handleSearch(initialQuery, item.year, (item.type === 'series' || item.type === 'episode' ? 'tv' : 'movie'));
      }
      
      if (item.type === 'episode' || item.type === 'series') {
        setSeason(item.season || '1');
        setEpisode(item.episode || '1');
      }

      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    } else {
      setResults([]);
      setSelectedResult(null);
    }
  }, [show, item]);

  const handleSearch = async (overrideQuery, overrideYear, overrideType) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const y = overrideYear !== undefined ? overrideYear : year;
    const t = overrideType !== undefined ? overrideType : type;

    if (!q) return;
    setSearching(true);
    setSelectedResult(null);
    try {
      const data = await api.searchMetadata(q, t, y);
      // Mark as NOT proposed (live search results)
      setResults(data.map(r => ({ ...r, is_proposed: false })) || []);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (!show || !item) return null;

  const hasProposed = results.some(r => r.is_proposed);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container resolver-modal" onClick={e => e.stopPropagation()}>
        <div className="resolver-header">
          <div className="resolver-title-group">
            <Film className="resolver-title-icon" size={20} />
            <h2>{T('modal.resolver.title')}</h2>
          </div>
          <button className="resolver-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="resolver-controls">
            <div className="resolver-search-group">
              <div className="resolver-input-wrapper">
                <Search className="input-icon" size={18} />
                <input 
                  ref={searchInputRef}
                  type="text" 
                  value={query} 
                  onChange={e => setQuery(e.target.value)}
                  placeholder={T('modal.resolver.search_placeholder')}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>
              <div className="resolver-year-wrapper">
                <Calendar className="input-icon" size={18} />
                <input 
                  type="text" 
                  value={year} 
                  onChange={e => setYear(e.target.value)} 
                  placeholder={T('modal.resolver.year')}
                  maxLength="4"
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                />
              </div>

              {type === 'tv' && (
                <>
                  <div className="resolver-mini-wrapper">
                    <span className="input-label">S</span>
                    <input 
                      type="number" 
                      value={season} 
                      onChange={e => setSeason(e.target.value)} 
                      placeholder="Season"
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="resolver-mini-wrapper">
                    <span className="input-label">E</span>
                    <input 
                      type="number" 
                      value={episode} 
                      onChange={e => setEpisode(e.target.value)} 
                      placeholder="Episode"
                      onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                </>
              )}

              <button className="btn-search-trigger" onClick={() => handleSearch()} disabled={searching}>
                {searching ? <Loader2 className="spin" size={18} /> : <Search size={18} />}
              </button>
            </div>

            <div className="resolver-pro-tabs-container">
              <div className="resolver-pro-tabs">
                <button 
                  className={`resolver-pro-tab ${type === 'movie' ? 'active' : ''}`}
                  onClick={() => { setType('movie'); handleSearch(query, year, 'movie'); }}
                >
                  <Film size={16} />
                  {T('discovery.tabs.movies')}
                </button>
                <button 
                  className={`resolver-pro-tab ${type === 'tv' ? 'active' : ''}`}
                  onClick={() => { setType('tv'); handleSearch(query, year, 'tv'); }}
                >
                  <Tv size={16} />
                  {T('discovery.tabs.series')}
                </button>
              </div>
            </div>
          </div>

          <div className="resolver-content">
            <div className="resolver-results-list">
              {hasProposed && !searching && (
                <div className="results-section-header">Proposed Matches</div>
              )}
              
              {searching ? (
                <div className="resolver-status">
                  <Loader2 className="spinner" size={24} />
                  <span>{T('discovery.processing')}</span>
                </div>
              ) : results.length === 0 ? (
                <div className="resolver-status">
                  <span>{T('discovery.no_items')}</span>
                </div>
              ) : (
                results.map(res => (
                  <div 
                    key={res.id} 
                    className={`resolver-result-card ${selectedResult?.id === res.id ? 'selected' : ''} ${res.is_proposed ? 'proposed' : ''}`}
                    onClick={() => setSelectedResult(res)}
                  >
                    <div className="result-poster">
                      {res.poster_path ? (
                        <img src={`https://image.tmdb.org/t/p/w185${res.poster_path}`} alt="" />
                      ) : (
                        <div className="poster-placeholder"><ImageIcon size={20} /></div>
                      )}
                    </div>
                    <div className="result-info">
                      <div className="result-title">
                        {res.title || res.name}
                        {res.is_proposed && <span className="proposed-badge">Proposed</span>}
                      </div>
                      <div className="result-meta">
                        <span className="result-year">{(res.release_date || res.first_air_date || res.year || '').toString().split('-')[0]}</span>
                        <span className="result-rating">★ {res.vote_average?.toFixed(1)}</span>
                        {res.confidence && (
                          <div className="match-score">
                            <div className="match-bar" style={{ width: `${(res.confidence * 100)}%` }} />
                            <span>{(res.confidence * 100).toFixed(0)}% Match</span>
                          </div>
                        )}
                      </div>
                      <div className="result-overview">{res.overview}</div>
                    </div>
                    <div className="result-selection-indicator">
                      <ChevronRight size={18} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="resolver-details-panel">
              {selectedResult ? (
                <div className="resolver-final-options">
                  <h3>{T('modal.resolver.assignment')}</h3>
                  <div className="item-to-resolve">
                    <div className="item-label">{T('discovery.table.name_mapping')}:</div>
                    <div className="item-val">{item.filename}</div>
                  </div>
                  
                  <div className="assignment-arrow">➔</div>
                  
                  <div className="selected-target">
                    <div className="target-title">{selectedResult.title || selectedResult.name}</div>
                    <div className="target-year">{(selectedResult.release_date || selectedResult.first_air_date || selectedResult.year || '').toString().split('-')[0]}</div>
                  </div>

                  {(type === 'tv' || selectedResult.type === 'episode' || selectedResult.type === 'tv') && (
                    <div className="resolver-series-meta-summary">
                      <div className="meta-badge">Season {season || '?'}</div>
                      <div className="meta-badge">Episode {episode || '?'}</div>
                    </div>
                  )}

                  <button 
                    className="resolver-submit-btn"
                    onClick={() => {
                      const finalType = (type === 'tv' || selectedResult.type === 'episode' || selectedResult.type === 'tv') ? 'tv' : 'movie';
                      onResolve(item.id, selectedResult.tmdb_id || selectedResult.id, finalType, finalType === 'tv' ? parseInt(season) : null, finalType === 'tv' ? parseInt(episode) : null);
                    }}
                  >
                    {T('modal.resolver.confirm')}
                  </button>
                </div>
              ) : (
                <div className="resolver-empty-selection">
                  <ImageIcon size={48} className="ghost-icon" />
                  <p>{T('modal.resolver.select_hint')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResolverModal;
