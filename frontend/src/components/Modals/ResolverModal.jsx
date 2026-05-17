import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, Tv, Calendar, X, Hash, ChevronRight, ChevronLeft, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useAppContext } from '../../context/AppContext';

const ResolverModal = ({ show, item, onClose, onResolve, T }) => {
  const { settings } = useAppContext();
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('movie');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  
  // Manual numeric overrides
  const [manualSeason, setManualSeason] = useState('');
  const [manualEpisode, setManualEpisode] = useState('');

  // Drill-down state
  const [viewMode, setViewMode] = useState('results'); // 'results', 'seasons', 'episodes'
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [drillDownItems, setDrillDownItems] = useState([]);
  const [loadingDrillDown, setLoadingDrillDown] = useState(false);
  const [basket, setBasket] = useState([]); // List of episode numbers

  const searchInputRef = useRef(null);

  useEffect(() => {
    if (show && item) {
      const initialQuery = item.title || item.filename.split('.')[0];
      setQuery(initialQuery);
      setYear(item.year || '');
      setType(item.type === 'series' || item.type === 'episode' || item.type === 'season' ? 'tv' : 'movie');
      
      setViewMode('results');
      setSelectedSeries(null);
      setSelectedSeason(null);
      setSelectedEpisode(null);
      setBasket([]);
      setDrillDownItems([]);

      // Initialize S/E from item
      setManualSeason(item.season || '');
      setManualEpisode(item.episode || '');

      // If we have existing matches, use them as initial results
      if (item.matches && item.matches.length > 0) {
        setResults(item.matches.map(m => ({
          ...m,
          id: m.tmdb_id, // Normalize ID for selection logic
          is_proposed: true
        })));
      } else {
        // Auto-trigger search ONLY if no existing matches
        handleSearch(initialQuery, item.year, (item.type === 'series' || item.type === 'episode' || item.type === 'season' ? 'tv' : 'movie'));
      }

      setTimeout(() => {
        if (searchInputRef.current) searchInputRef.current.focus();
      }, 100);
    } else {
      setResults([]);
      setSelectedSeries(null);
    }
  }, [show, item]);

  const handleSearch = async (overrideQuery, overrideYear, overrideType) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    const y = overrideYear !== undefined ? overrideYear : year;
    const t = overrideType !== undefined ? overrideType : type;
    const lang = settings?.primary_metadata_language || 'en';

    if (!q) return;
    setSearching(true);
    setViewMode('results');
    setSelectedSeries(null);
    setSelectedSeason(null);
    setSelectedEpisode(null);
    setBasket([]);
    
    try {
      const data = await api.searchMetadata(q, t, y, lang);
      setResults(data.map(r => ({ ...r, is_proposed: false })) || []);
    } catch (e) {
      console.error('Search failed:', e);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectSeries = async (series) => {
    setSelectedSeries(series);
    if (type === 'movie') return;

    setSelectedSeason(null);
    setSelectedEpisode(null);
    setBasket([]);
    setLoadingDrillDown(true);
    setViewMode('seasons');

    try {
      const seasons = await api.getTVSeasons(series.id, settings?.primary_metadata_language || 'en');
      setDrillDownItems(seasons || []);
      
      // If we have a manual season, try to find it
      if (manualSeason) {
        const found = seasons.find(s => s.season_number === parseInt(manualSeason));
        if (found) setSelectedSeason(found);
      }
    } catch (e) {
      console.error('Failed to fetch seasons:', e);
    } finally {
      setLoadingDrillDown(false);
    }
  };

  const handleSelectSeason = async (season) => {
    setSelectedSeason(season);
    setManualSeason(season.season_number.toString());
    setSelectedEpisode(null);
    setBasket([]);
    setLoadingDrillDown(true);
    setViewMode('episodes');

    try {
      const episodes = await api.getTVSeasonEpisodes(selectedSeries.id, season.season_number, settings?.primary_metadata_language || 'en');
      setDrillDownItems(episodes || []);

      // If we have a manual episode, try to find it
      if (manualEpisode) {
        const found = episodes.find(e => e.episode_number === parseInt(manualEpisode));
        if (found) setSelectedEpisode(found);
      }
    } catch (e) {
      console.error('Failed to fetch episodes:', e);
    } finally {
      setLoadingDrillDown(false);
    }
  };

  const handleSelectEpisode = (episode) => {
    setSelectedEpisode(episode);
    setManualEpisode(episode.episode_number.toString());
  };

  const toggleBasket = (target) => {
    // Enforce type consistency: If basket has items, they must match the new target type
    if (basket.length > 0) {
      const basketType = basket[0].type;
      // In our UI, 'tv', 'season', and 'episode' are all 'tv' category
      const isTargetTV = ['tv', 'season', 'episode'].includes(target.type);
      const isBasketTV = ['tv', 'season', 'episode'].includes(basketType);
      
      if (isTargetTV !== isBasketTV) {
        alert("You cannot mix Movies and TV items in the same basket.");
        return;
      }
    }

    // Generate unique key for the target
    const key = `${target.type}-${target.tmdb_id}-${target.season || ''}-${target.episode || ''}`;
    
    setBasket(prev => {
      const exists = prev.find(b => b.key === key);
      if (exists) {
        return prev.filter(b => b.key !== key);
      } else {
        return [...prev, { ...target, key }];
      }
    });
  };

  const isInBasket = (type, id, season, episode) => {
    const key = `${type}-${id}-${season || ''}-${episode || ''}`;
    return basket.some(b => b.key === key);
  };

  const goBack = () => {
    if (viewMode === 'episodes') {
      setViewMode('seasons');
      setSelectedEpisode(null);
      // Re-fetch seasons or use cached? For simplicity, re-fetch or just go back to results if we don't cache
      handleSelectSeries(selectedSeries); 
    } else if (viewMode === 'seasons') {
      setViewMode('results');
      setSelectedSeason(null);
      setSelectedSeries(null);
      setBasket([]);
    }
  };

  if (!show || !item) return null;

  const hasProposed = results.some(r => r.is_proposed);

  const renderResultCard = (res, isDrillDown = false) => {
    let title = res.title || res.name;
    let sub = '';
    let imgPath = res.poster_path;
    let isSelected = false;
    let onClick = () => {};

    if (viewMode === 'results') {
      isSelected = selectedSeries?.id === res.id;
      sub = (res.release_date || res.first_air_date || res.year || '').toString().split('-')[0];
      onClick = () => handleSelectSeries(res);
    } else if (viewMode === 'seasons') {
      title = res.name || `Season ${res.season_number}`;
      sub = res.air_date ? res.air_date.split('-')[0] : '';
      isSelected = selectedSeason?.id === res.id || (manualSeason === res.season_number.toString());
      onClick = () => handleSelectSeason(res);
    } else if (viewMode === 'episodes') {
      title = `${res.episode_number}. ${res.name}`;
      sub = res.air_date ? res.air_date.split('-')[0] : '';
      imgPath = res.still_path;
      isSelected = selectedEpisode?.id === res.id;
      const bundled = isInBasket('tv', selectedSeries.id, selectedSeason.season_number, res.episode_number);
      onClick = () => handleSelectEpisode(res);
      // Special class for basket items
      if (bundled) title = <span>{title} <span className="basket-badge">In Basket</span></span>;
    }

    return (
      <div 
        key={res.id} 
        className={`resolver-result-card ${isSelected ? 'selected' : ''} ${res.is_proposed ? 'proposed' : ''} mode-${viewMode}`}
        onClick={onClick}
      >
        <div className="result-poster">
          {imgPath ? (
            <img src={`https://image.tmdb.org/t/p/w185${imgPath}`} alt="" />
          ) : (
            <div className="poster-placeholder"><ImageIcon size={20} /></div>
          )}
        </div>
        <div className="result-info">
          <div className="result-title">
            {title}
            {res.is_proposed && <span className="proposed-badge">Proposed</span>}
          </div>
          <div className="result-meta">
            {sub && <span className="result-year">{sub}</span>}
            {res.vote_average !== undefined && <span className="result-rating">★ {res.vote_average?.toFixed(1)}</span>}
            {res.episode_count && <span className="result-count">{res.episode_count} Episodes</span>}
          </div>
          <div className="result-overview">{res.overview}</div>
        </div>
        <div className="result-selection-indicator">
          <ChevronRight size={18} />
        </div>
      </div>
    );
  };

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
                      value={manualSeason} 
                      onChange={e => setManualSeason(e.target.value)} 
                      placeholder="S"
                    />
                  </div>
                  <div className="resolver-mini-wrapper">
                    <span className="input-label">E</span>
                    <input 
                      type="number" 
                      value={manualEpisode} 
                      onChange={e => setManualEpisode(e.target.value)} 
                      placeholder="E"
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
                  onClick={() => { 
                    if (basket.length > 0 && type !== 'movie') {
                      if (!confirm("Switching categories will clear your current basket. Continue?")) return;
                      setBasket([]);
                    }
                    setType('movie'); 
                    handleSearch(query, year, 'movie'); 
                  }}
                >
                  <Film size={16} />
                  {T('discovery.tabs.movies')}
                </button>
                <button 
                  className={`resolver-pro-tab ${type === 'tv' ? 'active' : ''}`}
                  onClick={() => { 
                    if (basket.length > 0 && type !== 'tv') {
                      if (!confirm("Switching categories will clear your current basket. Continue?")) return;
                      setBasket([]);
                    }
                    setType('tv'); 
                    handleSearch(query, year, 'tv'); 
                  }}
                >
                  <Tv size={16} />
                  {T('discovery.tabs.series')}
                </button>
              </div>
            </div>
          </div>

          <div className="resolver-content">
            <div className="resolver-results-list">
              {viewMode !== 'results' && (
                <button className="resolver-back-btn" onClick={goBack}>
                  <ChevronLeft size={16} />
                  Back to {viewMode === 'episodes' ? 'Seasons' : 'Search Results'}
                </button>
              )}

              {viewMode === 'results' && hasProposed && !searching && (
                <div className="results-section-header">Proposed Matches</div>
              )}
              
              {(searching || loadingDrillDown) ? (
                <div className="resolver-status">
                  <Loader2 className="spinner" size={24} />
                  <span>{T('discovery.processing')}</span>
                </div>
              ) : (viewMode === 'results' ? results : drillDownItems).length === 0 ? (
                <div className="resolver-status">
                  <span>{T('discovery.no_items')}</span>
                </div>
              ) : (
                (viewMode === 'results' ? results : drillDownItems).map(res => renderResultCard(res))
              )}
            </div>

            <div className="resolver-details-panel">
              {selectedSeries ? (
                <div className="resolver-final-options">
                  <h3>{T('modal.resolver.assignment')}</h3>
                  <div className="item-to-resolve">
                    <div className="item-label">{T('discovery.table.name_mapping')}:</div>
                    <div className="item-val">{item.filename}</div>
                  </div>
                  
                  <div className="assignment-arrow">➔</div>
                  
                  <div className="selected-target-card">
                    <div className="target-main-info">
                      <div className="target-title">
                        {selectedSeries.title || selectedSeries.name}
                        {isInBasket(type, selectedSeries.id, null, null) && <span className="basket-badge">In Basket</span>}
                      </div>
                      <div className="target-year">{(selectedSeries.release_date || selectedSeries.first_air_date || selectedSeries.year || '').toString().split('-')[0]}</div>
                    </div>
                    
                    {(manualSeason || selectedSeason) && (
                      <div className="target-sub-info">
                        <div className="target-season">
                          Season {manualSeason || selectedSeason?.season_number}
                          {isInBasket('tv', selectedSeries.id, manualSeason || selectedSeason?.season_number, null) && <span className="basket-badge">In Basket</span>}
                        </div>
                        {(manualEpisode || selectedEpisode) && (
                          <div className="target-episode">
                            Episode {manualEpisode || selectedEpisode?.episode_number}{selectedEpisode ? `: ${selectedEpisode.name}` : ''}
                            {isInBasket('tv', selectedSeries.id, manualSeason || selectedSeason?.season_number, manualEpisode || selectedEpisode?.episode_number) && <span className="basket-badge">In Basket</span>}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="target-basket-actions">
                      {/* Determine what to add to basket based on deepest selection */}
                      {(() => {
                        let target = { type, tmdb_id: selectedSeries.id, title: selectedSeries.title || selectedSeries.name };
                        let label = type === 'movie' ? 'Add Movie to Basket' : 'Add Series to Basket';
                        
                        if (selectedEpisode) {
                          target = { type: 'tv', tmdb_id: selectedSeries.id, title: `${selectedSeries.name} - S${selectedSeason.season_number}E${selectedEpisode.episode_number}`, season: selectedSeason.season_number, episode: selectedEpisode.episode_number };
                          label = 'Add Episode to Basket';
                        } else if (selectedSeason) {
                          target = { type: 'tv', tmdb_id: selectedSeries.id, title: `${selectedSeries.name} - Season ${selectedSeason.season_number}`, season: selectedSeason.season_number };
                          label = 'Add Season to Basket';
                        }
                        
                        const alreadyIn = isInBasket(target.type, target.tmdb_id, target.season, target.episode);
                        
                        return (
                          <button 
                            className={`btn-add-to-basket ${alreadyIn ? 'in-basket' : ''}`}
                            onClick={() => toggleBasket(target)}
                          >
                            {alreadyIn ? 'Remove from Basket' : label}
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="resolver-actions">
                    <button 
                      className="resolver-submit-btn primary"
                      disabled={basket.length === 0 && (type === 'tv' && viewMode === 'results' && !selectedSeries)}
                      onClick={() => {
                        const resolveTargets = basket.length > 0 
                          ? basket.map(b => ({ tmdb_id: b.tmdb_id, item_type: b.type, season: b.season, episode: b.episode }))
                          : [{ tmdb_id: selectedSeries.id, item_type: type, season: manualSeason ? parseInt(manualSeason) : null, episode: manualEpisode ? parseInt(manualEpisode) : null }];

                        onResolve(item.id, null, null, null, null, null, resolveTargets);
                      }}
                    >
                      {basket.length > 0 ? `Resolve ${basket.length} Targets` :
                       selectedEpisode ? T('modal.resolver.confirm') : 
                       selectedSeason ? 'Assign as Season (Uncertain)' : 
                       selectedSeries ? (type === 'movie' ? 'Assign as Movie' : 'Assign as Series (Uncertain)') : T('modal.resolver.confirm')}
                    </button>
                    
                    {type === 'tv' && viewMode === 'results' && (
                      <p className="resolver-hint">Click a series to select seasons and episodes</p>
                    )}
                    {type === 'tv' && viewMode === 'seasons' && (
                      <p className="resolver-hint">Click a season to select episodes or assign season now</p>
                    )}
                  </div>

                  <div className="resolver-basket-section">
                    {basket.length > 0 && (
                      <div className="basket-container">
                        <div className="basket-label">
                          Basket ({basket.length} items)
                          <button className="btn-clear-basket" onClick={() => setBasket([])}>
                            <Trash2 size={12} />
                            Clear All
                          </button>
                        </div>
                        <div className="basket-items">
                          {basket.map(item => (
                            <span 
                              key={item.key} 
                              className="basket-item-pill mixed interactive"
                              onClick={() => toggleBasket(item)}
                              title="Click to remove"
                            >
                              {item.type === 'movie' ? <Film size={10} /> : <Tv size={10} />}
                              {item.title}
                              <X size={10} className="remove-icon" />
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
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
