import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Tv, ShieldAlert, Loader2, User, Clapperboard, Settings, Plus, Minus, X, Star } from 'lucide-react';
import { api } from '../../services/api';
import MovieDetailView from './MovieDetailView';
import SeriesDetailView from './SeriesDetailView';
import '../../styles/components/library.css';

const LibraryView = ({ T }) => {
  const [data, setData] = useState({ movies: [], series: [], adult: [], counts: { movies: 0, series: 0, adult: 0 } });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(42);
  const [detailItemId, setDetailItemId] = useState(null);
  const [detailSeriesTmdbId, setDetailSeriesTmdbId] = useState(null);

  // Drawer States for managing actors/directors
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [peopleList, setPeopleList] = useState([]);
  const [drawerSearch, setDrawerSearch] = useState('');
  const [drawerSortBy, setDrawerSortBy] = useState('library_count');
  const [drawerLoading, setDrawerLoading] = useState(false);

  // Reset visible count on filter/tab changes
  useEffect(() => {
    setVisibleCount(42);
  }, [activeTab, searchQuery]);

  const observer = useRef();
  const triggerRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setVisibleCount(prev => prev + 42);
      }
    }, {
      root: null,
      rootMargin: '400px', // Load earlier to avoid stuttering
      threshold: 0
    });
    
    if (node) observer.current.observe(node);
  }, [loading]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSearchQuery('');
  };

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLibrary();
      setData(res);
      
      // Select first non-empty tab
      if (res.counts.movies > 0) setActiveTab('movies');
      else if (res.counts.series > 0) setActiveTab('series');
      else if (res.counts.adult > 0) setActiveTab('adult');
    } catch (e) {
      console.error("Failed to fetch library:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLibrary();
  }, [fetchLibrary]);

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

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setDrawerSearch('');
    fetchLibrary();
  };

  const visibleTabs = [
    { id: 'movies', label: T('discovery.tabs.movies'), icon: <Film size={18} />, count: data.counts.movies },
    { id: 'series', label: T('discovery.tabs.series'), icon: <Tv size={18} />, count: data.counts.series },
    { id: 'adult', label: 'Adult', icon: <ShieldAlert size={18} />, count: data.counts.adult },
    { id: 'actors', label: 'Actors', icon: <User size={18} />, count: data.counts.actors || 0 },
    { id: 'directors', label: 'Directors', icon: <Clapperboard size={18} />, count: data.counts.directors || 0 }
  ].filter(tab => {
    if (tab.id === 'actors' || tab.id === 'directors') {
      // Show Actors and Directors tabs as long as we have movies or series, so the user can manage them!
      return (data.counts.movies || 0) > 0 || (data.counts.series || 0) > 0;
    }
    return tab.count > 0;
  });

  const currentItems = data[activeTab] || [];
  let filteredItems = currentItems.filter(item => 
    item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let renderItems = filteredItems;
  let viewMode = 'grid'; // grid (posters) or list (episodes)
  
  if (activeTab === 'series') {
    // ONLY show unique series posters! No drilling down into seasons/episodes here.
    const seriesMap = new Map();
    filteredItems.forEach(item => {
      // Fallback to title if series_tmdb_id is missing
      const sid = item.series_tmdb_id || item.series_title || item.title || `unknown_${item.id}`;
      if (!seriesMap.has(sid)) {
        seriesMap.set(sid, {
          ...item,
          id: `series_${sid}`,
          displayTitle: item.series_title || item.title,
          displayPoster: item.series_poster_path || item.poster_path,
          displayPosterFolder: 'posters',
          isSeriesNode: true,
          series_id_key: sid
        });
      }
    });
    renderItems = Array.from(seriesMap.values());
  } else {
    // Movies / Adult / Actors / Directors flat map
    renderItems = filteredItems.map(item => ({
      ...item,
      displayTitle: item.title,
      displayPoster: item.displayPoster || item.poster_path,
      displayPosterFolder: (item.type === 'actor' || item.type === 'director') ? 'persons' : 'posters'
    }));
  }

  // If a detail item is selected, show the detail page
  if (detailSeriesTmdbId) {
    return (
      <div style={{ padding: '30px' }}>
        <SeriesDetailView 
          seriesTmdbId={detailSeriesTmdbId} 
          onBack={() => setDetailSeriesTmdbId(null)} 
        />
      </div>
    );
  }

  if (detailItemId) {
    return (
      <div style={{ padding: '30px' }}>
        <MovieDetailView 
          itemId={detailItemId} 
          onBack={() => setDetailItemId(null)} 
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="library-loading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Loader2 className="animate-spin" size={48} color="var(--accent-blue)" />
      </div>
    );
  }

  return (
    <div className="library-view-container" style={{ padding: '30px', animation: 'fadeIn 0.5s ease-out' }}>
      <header className="library-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div className="header-left">
          <h1 style={{ fontSize: '32px', fontWeight: '900', marginBottom: '8px', letterSpacing: '-0.5px' }}>
            {T('navigation.library')}
          </h1>
          <p style={{ color: 'var(--text-dim)', fontSize: '15px' }}>
            {visibleTabs.length > 0 ? `${visibleTabs.reduce((a, b) => a + b.count, 0)} items in your organized collection` : 'No organized items yet.'}
          </p>
        </div>

        <div className="header-right" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {(activeTab === 'actors' || activeTab === 'directors') && (
            <button 
              onClick={() => setIsDrawerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-card)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'var(--accent-gradient)';
                e.currentTarget.style.boxShadow = '0 5px 15px var(--accent-glow)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'var(--bg-card)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <Settings size={16} />
              {activeTab === 'actors' ? 'Manage Actors' : 'Manage Directors'}
            </button>
          )}

          <div className="search-box-pro" style={{
            position: 'relative',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            borderRadius: '14px',
            padding: '4px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '300px'
          }}>
            <Search size={18} color="var(--text-dim)" />
            <input 
              type="text" 
              placeholder="Search collection..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                fontSize: '14px',
                padding: '10px 0',
                width: '100%',
                outline: 'none'
              }}
            />
          </div>
        </div>
      </header>

      {visibleTabs.length > 1 && (
        <div className="library-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`lib-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid var(--border-card)',
                background: activeTab === tab.id ? 'var(--accent-gradient)' : 'var(--bg-card)',
                color: activeTab === tab.id ? '#fff' : 'var(--text-dim)',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                boxShadow: activeTab === tab.id ? '0 10px 20px var(--accent-glow)' : 'none'
              }}
            >
              {tab.icon}
              {tab.label}
              <span style={{ 
                opacity: 0.6, 
                fontSize: '12px', 
                background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                padding: '2px 8px',
                borderRadius: '6px',
                marginLeft: '5px'
              }}>{tab.count}</span>
            </button>
          ))}
        </div>
      )}



      {renderItems.length > 0 ? (
        <>
          <div className="library-grid" style={{
            display: 'grid',
            gridTemplateColumns: viewMode === 'episodes' ? 'repeat(auto-fill, minmax(250px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '30px'
          }}>
            {renderItems.slice(0, visibleCount).map(item => (
              <div key={item.id} className="poster-card" style={{
                position: 'relative',
                borderRadius: '20px',
                overflow: 'hidden',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-card)',
                aspectRatio: viewMode === 'episodes' ? '16/9' : '2/3',
                cursor: 'pointer',
                transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
              }}
              onClick={() => {
                if (item.isSeriesNode || item.isEpisodeNode) {
                  const targetTmdbId = item.series_tmdb_id || item.tmdb_id;
                  if (targetTmdbId) {
                    setDetailSeriesTmdbId(targetTmdbId);
                  } else {
                    console.warn("No TMDB ID found for this series. Cannot open detail view.");
                  }
                }
                else if (item.type === 'actor' || item.type === 'director') {
                  // Actors/Directors: no detail page yet
                } else {
                  // Open movie detail page
                  setDetailItemId(item.id);
                }
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)';
                e.currentTarget.querySelector('.poster-overlay').style.opacity = 1;
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.querySelector('.poster-overlay').style.opacity = 0;
              }}
              >
                {item.displayPoster ? (
                  <img 
                    src={`http://localhost:8000/media/images/${item.displayPosterFolder || 'posters'}${item.displayPoster}`} 
                    alt={item.displayTitle}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ 
                    width: '100%', height: '100%', 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: 'linear-gradient(135deg, #222, #111)',
                    padding: '20px', textAlign: 'center'
                  }}>
                    {item.type === 'actor' || item.type === 'director' ? (
                      <User size={40} color="var(--text-dim)" style={{ marginBottom: '15px' }} />
                    ) : (
                      <Film size={40} color="var(--text-dim)" style={{ marginBottom: '15px' }} />
                    )}
                    <div style={{ fontSize: '14px', fontWeight: '700' }}>{item.displayTitle}</div>
                  </div>
                )}
  
                <div className="poster-overlay" style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  opacity: 0,
                  transition: 'opacity 0.3s ease'
                }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', marginBottom: '5px' }}>
                    {item.isEpisodeNode && <span style={{ opacity: 0.6, marginRight: '5px' }}>{item.episode_number}.</span>}
                    {item.displayTitle}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>{item.isSeasonNode ? `${item.year || ''}` : item.year}</span>
                    {item.rating > 0 && (
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: '700', 
                        color: 'var(--accent-yellow)',
                        background: 'rgba(255, 193, 7, 0.1)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 193, 7, 0.2)'
                      }}>★ {item.rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {renderItems.length > visibleCount && (
            <div ref={triggerRef} style={{ height: '10px', margin: '20px 0' }} />
          )}
        </>
      ) : (
        <div className="library-empty" style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          height: '400px', color: 'var(--text-dim)' 
        }}>
          {activeTab === 'actors' || activeTab === 'directors' ? (
            <>
              <User size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                {activeTab === 'actors' ? 'No featured actors selected' : 'No featured directors selected'}
              </h3>
              <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '300px', textAlign: 'center', marginBottom: '24px' }}>
                {activeTab === 'actors' 
                  ? 'Add your favorite actors to display them as catalogs in your media library.' 
                  : 'Add your favorite directors to display them as catalogs in your media library.'}
              </p>
              <button 
                onClick={() => setIsDrawerOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  background: 'var(--accent-gradient)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 10px 20px var(--accent-glow)'
                }}
              >
                <Plus size={16} />
                {activeTab === 'actors' ? 'Select Featured Actors' : 'Select Featured Directors'}
              </button>
            </>
          ) : (
            <>
              <Film size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
              <p>{searchQuery ? 'No results for your search' : 'Your collection is empty'}</p>
            </>
          )}
        </div>
      )}

      {/* Sliding Drawer Panel for Managing Actors/Directors */}
      {isDrawerOpen && (
        <div 
          className="drawer-overlay" 
          onClick={handleCloseDrawer}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>
                {activeTab === 'actors' ? 'Manage Actors' : 'Manage Directors'}
              </h2>
              <button 
                onClick={handleCloseDrawer}
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
                peopleList.map(person => {
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                              src={`http://localhost:8000/media/images/persons${person.profile_path}`} 
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
                            color: person.is_favorite ? 'var(--accent-yellow)' : 'rgba(255,255,255,0.15)',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s'
                          }}
                          title={person.is_favorite ? "Remove from Favorites" : "Mark as Favorite"}
                        >
                          <Star size={18} fill={person.is_favorite ? "currentColor" : "none"} />
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
                })
              ) : (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '13px' }}>
                  No matched people found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
