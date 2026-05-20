import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Loader2, User, Check, Plus, Minus, Heart, X } from 'lucide-react';
import { api, API_BASE } from '../../../services/api';

const PeopleManagerModal = ({
  activeTab, // 'actors' | 'directors'
  isDrawerOpen,
  onClose,
  navigateTo,
  T,
}) => {
  // Drawer States
  const [peopleList, setPeopleList] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerSortBy, setDrawerSortBy] = useState('library_count');
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [visiblePeopleCount, setVisiblePeopleCount] = useState(40);

  // TMDB Performer Search States & Handlers
  const [drawerTab, setDrawerTab] = useState('catalog'); // 'catalog' | 'tmdb'
  const [tmdbSearchQuery, setTmdbSearchQuery] = useState('');
  const [tmdbSearchResults, setTmdbSearchResults] = useState([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);

  // Reset visible people count on search, sort, or active tab changes
  useEffect(() => {
    setVisiblePeopleCount(40);
  }, [drawerSearch, drawerSortBy, activeTab]);

  // Infinite Scroll Observer for people catalog
  const drawerObserver = useRef();
  const drawerTriggerRef = useCallback(node => {
    if (drawerLoading) return;
    if (drawerObserver.current) drawerObserver.current.disconnect();
    
    drawerObserver.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisiblePeopleCount(prev => prev + 40);
      }
    }, {
      root: null,
      rootMargin: '200px',
      threshold: 0
    });
    
    if (node) drawerObserver.current.observe(node);
  }, [drawerLoading]);

  // Fetch People from Local Catalog
  const fetchPeople = useCallback(async () => {
    if (!isDrawerOpen) return;
    setDrawerLoading(true);
    try {
      const role = activeTab === 'actors' ? 'Actor' : 'Director';
      const res = await api.getPeople(drawerSearch, role, drawerSortBy);
      setPeopleList(res);
    } catch (e) {
      console.error("Failed to fetch people list:", e);
    } finally {
      setDrawerLoading(false);
    }
  }, [isDrawerOpen, activeTab, drawerSearch, drawerSortBy]);

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  // Handle TMDB search
  const handleTMDBSearch = async (e) => {
    if (e) e.preventDefault();
    const query = tmdbSearchQuery.trim();
    if (!query) return;

    setTmdbSearching(true);
    setTmdbSearchResults([]);
    try {
      const res = await api.searchPeopleTMDB(query);
      setTmdbSearchResults(res || []);
    } catch (err) {
      console.error("Failed to search TMDB people:", err);
    } finally {
      setTmdbSearching(false);
    }
  };

  // Add person from TMDB to local library
  const handleAddPersonFromTMDB = async (tmdbId) => {
    try {
      const newPerson = await api.addPersonTMDB(tmdbId);
      // Immediately add/activate in people list
      setPeopleList(prevList => {
        if (prevList.some(p => p.id === newPerson.id)) {
          return prevList.map(p => p.id === newPerson.id ? { ...p, is_active: true } : p);
        }
        return [newPerson, ...prevList];
      });
    } catch (err) {
      console.error("Failed to add person from TMDB:", err);
    }
  };

  // Toggle favorite / active local status (with optimistic updates)
  const handleToggleStatus = async (personId, field, currentValue) => {
    const newValue = !currentValue;
    
    // Optimistic UI update for immediate responsiveness
    setPeopleList(prevList => 
      prevList.map(person => 
        person.id === personId 
          ? { ...person, [field]: newValue } 
          : person
      )
    );

    try {
      await api.updatePersonStatus(personId, { [field]: newValue });
    } catch (e) {
      console.error(`Failed to update ${field} status:`, e);
      // Revert optimistic update on failure
      setPeopleList(prevList => 
        prevList.map(person => 
          person.id === personId 
            ? { ...person, [field]: currentValue } 
            : person
        )
      );
    }
  };

  if (!isDrawerOpen) return null;

  return (
    <div 
      className="drawer-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'flex-end'
      }}
    >
      <div 
        className="drawer-content"
        onClick={e => e.stopPropagation()}
        style={{
          width: '480px',
          height: '100%',
          background: 'rgba(20, 20, 20, 0.85)',
          backdropFilter: 'blur(20px)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '30px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 40px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
            {activeTab === 'actors' ? 'Manage Actors' : 'Manage Directors'}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.color = '#fff'}
            onMouseOut={e => e.currentTarget.style.color = 'var(--text-dim)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <button
            onClick={() => setDrawerTab('catalog')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: drawerTab === 'catalog' ? 'rgba(255, 255, 255, 0.08)' : 'none',
              color: drawerTab === 'catalog' ? '#fff' : 'var(--text-dim)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Local Catalog
          </button>
          <button
            onClick={() => setDrawerTab('tmdb')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: drawerTab === 'tmdb' ? 'rgba(255, 255, 255, 0.08)' : 'none',
              color: drawerTab === 'tmdb' ? '#fff' : 'var(--text-dim)',
              fontSize: '13px',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Search TMDB API
          </button>
        </div>

        {drawerTab === 'tmdb' ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <form onSubmit={handleTMDBSearch} style={{
              position: 'relative',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '2px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <Search size={16} color="var(--text-dim)" />
              <input 
                type="text" 
                placeholder={`Search TMDB for ${activeTab === 'actors' ? 'actors' : 'directors'}...`} 
                value={tmdbSearchQuery}
                onChange={(e) => setTmdbSearchQuery(e.target.value)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  padding: '10px 0',
                  width: '100%',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '6px 14px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              >
                Search
              </button>
            </form>

            {/* TMDB Results List */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px' }}>
              {tmdbSearching ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                  <Loader2 className="animate-spin" size={24} color="var(--accent-blue)" />
                </div>
              ) : tmdbSearchResults.length > 0 ? (
                tmdbSearchResults.map(person => {
                  const hasPortrait = person.profile_path;
                  const addedLocally = peopleList.some(p => p.id === person.id && p.is_active);

                  // Get known for movies/roles
                  const knownForTitles = person.known_for 
                    ? person.known_for.map(m => m.title || m.name).filter(Boolean).slice(0, 2).join(', ')
                    : '';

                  return (
                    <div 
                      key={person.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          background: 'rgba(255,255,255,0.05)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#fff'
                        }}>
                          {hasPortrait ? (
                            <img 
                              src={`https://image.tmdb.org/t/p/w185${person.profile_path}`} 
                              alt={person.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          ) : (
                            person.name ? person.name[0] : '?'
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{person.name}</div>
                          {knownForTitles && (
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {knownForTitles}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => !addedLocally && handleAddPersonFromTMDB(person.id)}
                        disabled={addedLocally}
                        style={{
                          background: addedLocally ? 'rgba(76, 175, 80, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                          border: `1px solid ${addedLocally ? 'rgba(76, 175, 80, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                          borderRadius: '8px',
                          color: addedLocally ? '#4CAF50' : '#3b82f6',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: addedLocally ? 'default' : 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        {addedLocally ? (
                          <>
                            <Check size={14} /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={14} /> Add
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '150px', color: 'var(--text-dim)' }}>
                  <p style={{ fontSize: '13px', fontStyle: 'italic' }}>
                    {tmdbSearchQuery ? 'No results found on TMDB' : 'Search by name to discover performers'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            {/* Search and Sort controls inside Drawer */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
              <div className="search-box-pro" style={{
                position: 'relative',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '2px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <Search size={16} color="var(--text-dim)" />
                <input 
                  type="text" 
                  placeholder={`Search all ${activeTab}...`} 
                  value={drawerSearch}
                  onChange={(e) => setDrawerSearch(e.target.value)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#fff',
                    fontSize: '13px',
                    padding: '8px 0',
                    width: '100%',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Sort selector */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-dim)', fontWeight: '600' }}>SORT BY</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[
                    { id: 'library_count', label: 'Frequency' },
                    { id: 'popularity', label: 'Popularity' },
                    { id: 'name', label: 'Name' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setDrawerSortBy(opt.id)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        border: 'none',
                        background: drawerSortBy === opt.id ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.04)',
                        color: drawerSortBy === opt.id ? '#fff' : 'var(--text-dim)',
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: '11px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* List of performers */}
            <div 
              style={{ 
                flex: 1, 
                overflowY: 'auto', 
                marginRight: '-10px', 
                paddingRight: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              {drawerLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100px' }}>
                  <Loader2 className="animate-spin" size={24} color="var(--accent-blue)" />
                </div>
              ) : peopleList.length > 0 ? (
                <>
                  {peopleList.slice(0, visiblePeopleCount).map(person => {
                    const hasPortrait = person.profile_path;
                    // Custom name hash gradient generator
                    const getHashGradient = (name) => {
                      let hash = 0;
                      for (let i = 0; i < name.length; i++) {
                        hash = name.charCodeAt(i) + ((hash << 5) - hash);
                      }
                      const c1 = Math.abs(hash % 360);
                      const c2 = (c1 + 40) % 360;
                      return `linear-gradient(135deg, hsl(${c1}, 70%, 45%) 0%, hsl(${c2}, 75%, 25%) 100%)`;
                    };
                    const initials = person.name ? person.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?';

                    return (
                      <div 
                        key={person.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.04)',
                          borderRadius: '12px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div 
                          style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '12px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            onClose();
                            navigateTo('person', person.id);
                          }}
                        >
                          {/* Circle Portrait */}
                          <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            overflow: 'hidden',
                            background: hasPortrait ? 'none' : getHashGradient(person.name),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                            fontWeight: '700',
                            fontSize: '14px',
                            color: '#fff'
                          }}>
                            {hasPortrait ? (
                              <img 
                                src={`${API_BASE}/media/images/persons${person.profile_path}`} 
                                alt={person.name} 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>{person.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{person.library_count} {person.library_count === 1 ? 'item' : 'items'}</span>
                              <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)' }}></span>
                              <span>★ {person.popularity ? person.popularity.toFixed(1) : '0.0'}</span>
                            </div>
                          </div>
                        </div>

                        {/* +/- and Star Toggles */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            onClick={() => handleToggleStatus(person.id, 'is_favorite', person.is_favorite)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: person.is_favorite ? '#e91e63' : 'rgba(255,255,255,0.15)',
                              padding: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            title={person.is_favorite ? "Remove from Favorites" : "Mark as Favorite"}
                          >
                            <Heart size={18} fill={person.is_favorite ? "currentColor" : "none"} />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(person.id, 'is_active', person.is_active)}
                            style={{
                              background: person.is_active ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${person.is_active ? 'rgba(76, 175, 80, 0.3)' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '8px',
                              color: person.is_active ? '#4CAF50' : 'var(--text-dim)',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                            title={person.is_active ? "Remove from Library" : "Add to Library"}
                          >
                            {person.is_active ? <Minus size={14} /> : <Plus size={14} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {peopleList.length > visiblePeopleCount && (
                    <div ref={drawerTriggerRef} style={{ height: '10px', margin: '15px 0' }} />
                  )}
                </>
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                  No matched people found.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeopleManagerModal;

