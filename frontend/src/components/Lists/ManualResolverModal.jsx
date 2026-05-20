import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, Trash2, X, Film, Tv, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

const ManualResolverModal = ({ listDetails, onClose, onItemsUpdated, T }) => {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState('movie'); // 'movie' or 'tv'
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState(null);
  const searchTimeoutRef = useRef(null);

  const performSearch = async (searchQuery, type) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.searchMetadata(searchQuery, type);
      setResults(data || []);
    } catch (e) {
      console.error("Error searching TMDB:", e);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search on query change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query, searchType);
    }, 450);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, searchType]);

  const handleAdd = async (result) => {
    try {
      const payload = {
        tmdb_id: result.id,
        media_type: searchType,
        title: result.title || result.name,
        poster_path: result.poster_path
      };
      const newItem = await api.addToList(listDetails.id, payload);
      onItemsUpdated([...listDetails.items, newItem]);
    } catch (e) {
      console.error("Failed to add item:", e);
    }
  };

  const handleRemove = async (result) => {
    const matched = listDetails.items.find(
      item => item.tmdb_id === result.id && item.media_type === searchType
    );
    if (!matched) return;

    try {
      await api.removeFromList(listDetails.id, matched.id);
      onItemsUpdated(listDetails.items.filter(item => item.id !== matched.id));
    } catch (e) {
      console.error("Failed to remove item:", e);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
  };

  return (
    <div className="custom-modal-backdrop resolver-modal-backdrop">
      <div className="custom-modal-container resolver-modal-container glassmorphic animate-zoom-in" style={{ '--theme-color': listDetails.color }}>
        <div className="custom-modal-header resolver-modal-header">
          <div className="resolver-header-title">
            <Sparkles size={18} style={{ color: listDetails.color }} />
            <h3>Manual Resolver — Add to <span>{listDetails.name}</span></h3>
          </div>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="resolver-modal-body">
          {/* Tabs for Movie vs TV */}
          <div className="resolver-tabs">
            <button 
              className={`resolver-tab ${searchType === 'movie' ? 'active' : ''}`}
              onClick={() => { setSearchType('movie'); setResults([]); }}
            >
              <Film size={16} />
              Movies
            </button>
            <button 
              className={`resolver-tab ${searchType === 'tv' ? 'active' : ''}`}
              onClick={() => { setSearchType('tv'); setResults([]); }}
            >
              <Tv size={16} />
              TV Series
            </button>
          </div>

          {/* Search bar */}
          <div className="resolver-search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchType === 'movie' ? "Search movie title on TMDB..." : "Search series title on TMDB..."}
              autoFocus
            />
            {query && (
              <button className="clear-search-btn" onClick={handleClear}>
                <X size={16} />
              </button>
            )}
          </div>

          {/* Results list */}
          <div className="resolver-results-container">
            {loading ? (
              <div className="resolver-loading-wrapper">
                <div className="spinner" style={{ borderLeftColor: listDetails.color }} />
                <p>Querying TMDB database...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="resolver-results-list">
                {results.map(res => {
                  const isAdded = listDetails.items.some(
                    item => item.tmdb_id === res.id && item.media_type === searchType
                  );
                  const year = res.release_date ? res.release_date.split('-')[0] : (res.first_air_date ? res.first_air_date.split('-')[0] : null);
                  const isHovered = hoveredItemId === res.id;

                  return (
                    <div key={res.id} className="resolver-result-card">
                      <div className="resolver-card-poster">
                        {res.poster_path ? (
                          <img src={`https://image.tmdb.org/t/p/w92${res.poster_path}`} alt="" />
                        ) : (
                          <div className="resolver-poster-fallback">
                            {searchType === 'movie' ? <Film size={20} /> : <Tv size={20} />}
                          </div>
                        )}
                      </div>

                      <div className="resolver-card-details">
                        <div className="resolver-card-title-row">
                          <h4>{res.title || res.name}</h4>
                          {year && <span className="resolver-card-year">{year}</span>}
                        </div>
                        <p className="resolver-card-overview">
                          {res.overview || 'No overview available.'}
                        </p>
                      </div>

                      <div className="resolver-card-action">
                        {isAdded ? (
                          <button 
                            className="resolver-action-btn added"
                            style={{
                              backgroundColor: isHovered ? 'rgba(233, 30, 99, 0.15)' : 'rgba(0, 255, 100, 0.15)',
                              borderColor: isHovered ? '#e91e63' : '#00ff64',
                              color: isHovered ? '#e91e63' : '#00ff64',
                            }}
                            onMouseEnter={() => setHoveredItemId(res.id)}
                            onMouseLeave={() => setHoveredItemId(null)}
                            onClick={() => handleRemove(res)}
                          >
                            {isHovered ? (
                              <>
                                <Trash2 size={14} />
                                Remove
                              </>
                            ) : (
                              <>
                                <Check size={14} />
                                Added
                              </>
                            )}
                          </button>
                        ) : (
                          <button 
                            className="resolver-action-btn add"
                            style={{
                              borderColor: listDetails.color,
                              color: listDetails.color,
                            }}
                            onClick={() => handleAdd(res)}
                            onMouseEnter={e => {
                              e.currentTarget.style.backgroundColor = `${listDetails.color}22`;
                              e.currentTarget.style.boxShadow = `0 0 12px ${listDetails.color}44`;
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <Plus size={14} />
                            Add to List
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : query.trim() ? (
              <div className="resolver-empty-state">
                <p>No results found for "{query}" on TMDB.</p>
              </div>
            ) : (
              <div className="resolver-empty-state">
                <p>Type a movie or series title above to query TMDB and add it directly as a virtual item.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManualResolverModal;
