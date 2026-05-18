import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Tv, ShieldAlert, Loader2, User, Clapperboard, Settings, Plus, Minus, X, Star, Heart, Tag, Check } from 'lucide-react';
import { api } from '../../services/api';
import MovieDetailView from './MovieDetailView';
import SeriesDetailView from './SeriesDetailView';
import PersonDetailView from './PersonDetailView';
import '../../styles/components/library.css';

const LibraryView = ({ T }) => {
  const [data, setData] = useState({ movies: [], series: [], adult: [], counts: { movies: 0, series: 0, adult: 0 } });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [visibleCount, setVisibleCount] = useState(42);
  const [detailItemId, setDetailItemId] = useState(null);
  const [detailSeriesTmdbId, setDetailSeriesTmdbId] = useState(null);
  const [detailPersonId, setDetailPersonId] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);

  const navigateTo = (viewType, id) => {
    let currentState = null;
    if (detailSeriesTmdbId) {
      currentState = { type: 'series', id: detailSeriesTmdbId };
    } else if (detailItemId) {
      currentState = { type: 'movie', id: detailItemId };
    } else if (detailPersonId) {
      currentState = { type: 'person', id: detailPersonId };
    } else {
      currentState = { type: 'main' };
    }

    setNavigationStack(prev => [...prev, currentState]);

    setDetailSeriesTmdbId(null);
    setDetailItemId(null);
    setDetailPersonId(null);

    if (viewType === 'series') setDetailSeriesTmdbId(id);
    else if (viewType === 'movie') setDetailItemId(id);
    else if (viewType === 'person') setDetailPersonId(id);
  };

  const handleBack = () => {
    if (navigationStack.length === 0) {
      setDetailSeriesTmdbId(null);
      setDetailItemId(null);
      setDetailPersonId(null);
      fetchLibrary();
      return;
    }

    const prev = navigationStack[navigationStack.length - 1];
    setNavigationStack(prevStack => prevStack.slice(0, -1));

    setDetailSeriesTmdbId(null);
    setDetailItemId(null);
    setDetailPersonId(null);

    if (prev.type === 'series') {
      setDetailSeriesTmdbId(prev.id);
    } else if (prev.type === 'movie') {
      setDetailItemId(prev.id);
    } else if (prev.type === 'person') {
      setDetailPersonId(prev.id);
    } else {
      fetchLibrary();
    }
  };

  // Drawer States for managing actors/directors
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

  const handleOpenDrawer = () => {
    setDrawerTab('catalog');
    setTmdbSearchQuery('');
    setTmdbSearchResults([]);
    setDrawerSearch('');
    setIsDrawerOpen(true);
  };

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

  // Reset visible count on filter/tab changes
  useEffect(() => {
    setVisibleCount(42);
  }, [activeTab, searchQuery]);

  // Reset visible people count on drawer state, search, sort, or active tab changes
  useEffect(() => {
    setVisiblePeopleCount(40);
  }, [isDrawerOpen, drawerSearch, drawerSortBy, activeTab]);

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

  const handleTabChange = (id) => {
    setActiveTab(id);
    setSearchQuery('');
    setSelectedTags([]);
  };

  const fetchLibrary = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getLibrary();
      setData(res);
      
      // Select first non-empty tab if the current active tab is the default 'movies' and it has no items
      if (res.counts) {
        setActiveTab(prevTab => {
          if (prevTab === 'movies' && (res.counts.movies || 0) === 0) {
            if ((res.counts.series || 0) > 0) return 'series';
            if ((res.counts.adult || 0) > 0) return 'adult';
          }
          return prevTab;
        });
      }
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
    { id: 'directors', label: 'Directors', icon: <Clapperboard size={18} />, count: data.counts.directors || 0 },
    { id: 'tags', label: 'Tags', icon: <Tag size={18} />, count: data.counts.tags || 0 }
  ].filter(tab => {
    if (tab.id === 'tags') return true;
    if (tab.id === 'actors' || tab.id === 'directors') {
      // Show Actors and Directors tabs as long as we have movies or series, so the user can manage them!
      return (data.counts.movies || 0) > 0 || (data.counts.series || 0) > 0;
    }
    return tab.count > 0;
  });

  const currentItems = data[activeTab] || [];

  // Extract all unique custom tags from current active tab's items
  const uniqueTags = React.useMemo(() => {
    const tags = new Set();
    currentItems.forEach(item => {
      if (item.custom_tags && Array.isArray(item.custom_tags)) {
        item.custom_tags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [currentItems]);

  let filteredItems = currentItems.filter(item => {
    const matchesSearch = !searchQuery || (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesTags = selectedTags.length === 0 || (
      item.custom_tags && 
      Array.isArray(item.custom_tags) && 
      selectedTags.every(tag => item.custom_tags.includes(tag))
    );
    return matchesSearch && matchesTags;
  });

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
          onBack={handleBack} 
          onPersonClick={(personId) => {
            navigateTo('person', personId);
          }}
        />
      </div>
    );
  }

  if (detailItemId) {
    return (
      <div style={{ padding: '30px' }}>
        <MovieDetailView 
          itemId={detailItemId} 
          onBack={handleBack} 
          onPersonClick={(personId) => {
            navigateTo('person', personId);
          }}
        />
      </div>
    );
  }

  if (detailPersonId) {
    return (
      <div style={{ padding: '30px' }}>
        <PersonDetailView 
          personId={detailPersonId} 
          onBack={handleBack} 
          onMovieClick={(movieId) => {
            navigateTo('movie', movieId);
          }}
          onSeriesClick={(seriesTmdbId) => {
            navigateTo('series', seriesTmdbId);
          }}
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
              onClick={handleOpenDrawer}
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

      {/* Custom Tags Filter Row */}
      {activeTab !== 'tags' && uniqueTags.length > 0 && (
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          alignItems: 'center', 
          gap: '8px', 
          marginBottom: '30px', 
          padding: '12px 18px', 
          background: 'rgba(255, 255, 255, 0.02)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', 
          borderRadius: '14px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}>
          <span style={{ 
            fontSize: '13px', 
            color: 'var(--text-dim)', 
            marginRight: '6px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px',
            fontWeight: '600'
          }}>
            <Tag size={14} color="#a78bfa" /> Filter by Tags:
          </span>
          {uniqueTags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => {
                  setSelectedTags(prev => 
                    prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                  );
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.6)',
                  background: isSelected 
                    ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)' 
                    : 'rgba(255, 255, 255, 0.03)',
                  border: isSelected 
                    ? '1px solid rgba(139, 92, 246, 0.5)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '5px 12px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: isSelected ? '0 4px 10px rgba(139, 92, 246, 0.15)' : 'none',
                }}
                onMouseOver={e => {
                  if (!isSelected) {
                    e.currentTarget.style.color = '#fff';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseOut={e => {
                  if (!isSelected) {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  }
                }}
              >
                {tag}
              </button>
            );
          })}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              style={{
                marginLeft: 'auto',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <X size={12} /> Clear Filters
            </button>
          )}
        </div>
      )}



      {activeTab === 'tags' ? (
        <TagsManagerView 
          tags={data.tags || []} 
          searchQuery={searchQuery}
          navigateTo={navigateTo}
        />
      ) : renderItems.length > 0 ? (
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
                    navigateTo('series', targetTmdbId);
                  } else {
                    console.warn("No TMDB ID found for this series. Cannot open detail view.");
                  }
                }
                else if (item.type === 'actor' || item.type === 'director') {
                  navigateTo('person', item.id);
                } else {
                  // Open movie detail page
                  navigateTo('movie', item.id);
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

                {/* User Badges (Favorite & User Rating) */}
                {item.is_favorite && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 10,
                    background: 'rgba(233, 30, 99, 0.95)',
                    color: '#fff',
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <Heart size={14} fill="currentColor" />
                  </div>
                )}
                {item.user_rating > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    zIndex: 10,
                    background: 'rgba(255, 193, 7, 0.95)',
                    color: '#000',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <Star size={10} fill="currentColor" /> {item.user_rating}
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
                  {/* Centered Play Button for playable items */}
                  {(item.type === 'movie' || item.isEpisodeNode) && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          await api.playMedia(item.id);
                        } catch (err) {
                          console.error("Failed to play media:", err);
                        }
                      }}
                      className="grid-play-btn"
                      style={{
                        position: 'absolute',
                        top: '40%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '52px',
                        height: '52px',
                        borderRadius: '50%',
                        background: 'rgba(255, 255, 255, 0.9)',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-out',
                        color: '#000',
                        paddingLeft: '3px',
                        zIndex: 10
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.15)';
                        e.currentTarget.style.background = '#fff';
                        e.currentTarget.style.boxShadow = '0 12px 30px rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'translate(-50%, -50%)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                        e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>▶</span>
                    </button>
                  )}

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
                  {item.custom_tags && item.custom_tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                      {item.custom_tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          fontSize: '9px',
                          fontWeight: '700',
                          color: '#fff',
                          background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                          border: '1px solid rgba(139, 92, 246, 0.35)',
                          padding: '1px 5px',
                          borderRadius: '8px',
                        }}>
                          {tag}
                        </span>
                      ))}
                      {item.custom_tags.length > 3 && (
                        <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.4)', alignSelf: 'center', fontWeight: '700' }}>+{item.custom_tags.length - 3}</span>
                      )}
                    </div>
                  )}
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
                onClick={handleOpenDrawer}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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
                                setIsDrawerOpen(false);
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
      )}
    </div>
  );
};

const TagsManagerView = ({ tags, searchQuery, navigateTo }) => {
  const [expandedTag, setExpandedTag] = useState(null);

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredTags.length === 0) {
    return (
      <div className="library-empty" style={{ 
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
        height: '400px', color: 'var(--text-dim)' 
      }}>
        <Tag size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
        <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
          No Tags Found
        </h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
          {searchQuery ? `No tags matching "${searchQuery}".` : 'Add custom tags to your movies, series, or people to see them here!'}
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.4s ease-out' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px'
      }}>
        {filteredTags.map(tag => {
          const isExpanded = expandedTag === tag.name;
          return (
            <div 
              key={tag.name}
              style={{
                background: 'var(--bg-card)',
                border: isExpanded ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid var(--border-card)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                boxShadow: isExpanded ? '0 10px 30px rgba(139, 92, 246, 0.15)' : 'none',
                transform: isExpanded ? 'translateY(-4px)' : 'none',
              }}
              onClick={() => setExpandedTag(isExpanded ? null : tag.name)}
              onMouseOver={e => {
                if (!isExpanded) {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={e => {
                if (!isExpanded) {
                  e.currentTarget.style.borderColor = 'var(--border-card)';
                  e.currentTarget.style.transform = 'none';
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(59, 130, 246, 0.2) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(139, 92, 246, 0.3)'
                  }}>
                    <Tag size={16} color="#a78bfa" />
                  </div>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff' }}>{tag.name}</span>
                </div>
                <span style={{
                  fontSize: '11px',
                  fontWeight: '800',
                  color: '#fff',
                  background: 'rgba(139, 92, 246, 0.2)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  padding: '3px 8px',
                  borderRadius: '20px'
                }}>
                  {tag.total_count} item{tag.total_count !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Counts Breakdown pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                {tag.movies.length > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>
                    🎬 {tag.movies.length} Movie{tag.movies.length !== 1 ? 's' : ''}
                  </span>
                )}
                {tag.series.length > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>
                    📺 {tag.series.length} Series
                  </span>
                )}
                {tag.adult.length > 0 && (
                  <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>
                    🔞 {tag.adult.length} Adult
                  </span>
                )}
                {(tag.actors.length > 0 || tag.directors.length > 0) && (
                  <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>
                    👥 {tag.actors.length + tag.directors.length} Person{tag.actors.length + tag.directors.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div style={{ marginTop: '12px', fontSize: '11px', color: '#a78bfa', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isExpanded ? 'Click to collapse details' : 'Click to show tagged items'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded tag list */}
      {expandedTag && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '20px',
          padding: '25px',
          animation: 'slideDown 0.3s ease-out',
          backdropFilter: 'blur(8px)',
        }}>
          <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Tag size={20} color="#a78bfa" /> Items tagged with "{expandedTag}"
          </h3>

          {(() => {
            const tagObj = tags.find(t => t.name === expandedTag);
            if (!tagObj) return null;

            const allTaggedItems = [
              ...tagObj.movies.map(m => ({ ...m, category: 'Movie', folder: 'posters' })),
              ...tagObj.series.map(s => ({ ...s, category: 'Series', folder: 'posters', isSeriesNode: true })),
              ...tagObj.adult.map(a => ({ ...a, category: 'Adult', folder: 'posters' })),
              ...tagObj.actors.map(ac => ({ ...ac, category: 'Actor', folder: 'persons' })),
              ...tagObj.directors.map(d => ({ ...d, category: 'Director', folder: 'persons' }))
            ];

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '20px'
              }}>
                {allTaggedItems.map(item => (
                  <div 
                    key={`${item.category}_${item.id}`}
                    onClick={() => {
                      if (item.isSeriesNode) {
                        navigateTo('series', item.series_tmdb_id || item.tmdb_id);
                      } else if (item.category === 'Actor' || item.category === 'Director') {
                        navigateTo('person', item.id);
                      } else {
                        navigateTo('movie', item.id);
                      }
                    }}
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                    onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{ aspectRatio: '2/3', position: 'relative', background: '#111' }}>
                      {item.poster_path ? (
                        <img 
                          src={`http://localhost:8000/media/images/${item.folder}${item.poster_path}`} 
                          alt={item.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                          🎬
                        </div>
                      )}
                      <span style={{
                        position: 'absolute',
                        bottom: '5px',
                        left: '5px',
                        fontSize: '9px',
                        fontWeight: '800',
                        color: '#fff',
                        background: 'rgba(0,0,0,0.8)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {item.category}
                      </span>
                    </div>
                    <div style={{ padding: '8px', fontSize: '12px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default LibraryView;
