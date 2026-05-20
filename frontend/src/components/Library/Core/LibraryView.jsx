import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Film, Tv, ShieldAlert, User, Clapperboard, Settings, Plus, X, Tag, Check } from 'lucide-react';
import { api } from '../../../services/api';
import MovieDetailView from '../MovieDetail/MovieDetailView';
import SeriesDetailView from '../SeriesDetail/SeriesDetailView';
import PersonDetailView from '../PersonDetail/PersonDetailView';
import LibraryFilterBar from './LibraryFilterBar';
import LibraryGrid from './LibraryGrid';
import TagsManagerView, { BulkTagModal } from '../Shared/TagManagerModal';
import PeopleManagerModal from '../Shared/PeopleManagerModal';
import { useAppContext } from '../../../context/AppContext';
import '../../../styles/components/library.css';

const LibraryView = ({ T }) => {
  const [data, setData] = useState({ movies: [], series: [], adult: [], counts: { movies: 0, series: 0, adult: 0 } });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(42);
  const [detailItemId, setDetailItemId] = useState(null);
  const [detailSeriesTmdbId, setDetailSeriesTmdbId] = useState(null);
  const [detailPersonId, setDetailPersonId] = useState(null);
  const [navigationStack, setNavigationStack] = useState([]);
  const { pendingDetailId, setPendingDetailId } = useAppContext();

  // Drawer state for performer drawer manager modal
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // If navigated here from Dashboard with a pending TMDB detail to open
  useEffect(() => {
    if (pendingDetailId) {
      setDetailItemId(pendingDetailId);
      setPendingDetailId(null);
    }
  }, [pendingDetailId]);

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

  const handleOpenDrawer = () => {
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
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
      // Always show Actors and Directors tabs so users can manage them even before organizing media
      return true;
    }
    return tab.count > 0;
  });

  const currentItems = data[activeTab] || [];
  const mediaItemsForBulk = React.useMemo(
    () => [...(data.movies || []), ...(data.series || []), ...(data.adult || [])],
    [data.movies, data.series, data.adult]
  );

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
      <div className="library-view-container" style={{ padding: '30px', opacity: 0.85 }}>
        <style>{`
          @keyframes skeleton-shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          .skeleton-pulse {
            background: linear-gradient(90deg, #18181b 25%, #27272a 37%, #18181b 63%);
            background-size: 200% 100%;
            animation: skeleton-shimmer 1.5s infinite linear;
          }
        `}</style>
        
        {/* Header Skeleton */}
        <header className="library-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div className="header-left" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="skeleton-pulse" style={{ width: '240px', height: '38px', borderRadius: '10px' }} />
            <div className="skeleton-pulse" style={{ width: '160px', height: '18px', borderRadius: '6px', marginTop: '6px' }} />
          </div>
          <div className="header-right">
            <div className="skeleton-pulse" style={{ width: '280px', height: '40px', borderRadius: '12px' }} />
          </div>
        </header>

        {/* Tab Row Skeleton */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
          <div className="skeleton-pulse" style={{ width: '130px', height: '44px', borderRadius: '12px' }} />
          <div className="skeleton-pulse" style={{ width: '130px', height: '44px', borderRadius: '12px' }} />
          <div className="skeleton-pulse" style={{ width: '130px', height: '44px', borderRadius: '12px' }} />
        </div>

        {/* Grid Skeletons */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '30px'
        }}>
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="skeleton-pulse" style={{
                width: '100%',
                aspectRatio: '2/3',
                borderRadius: '20px',
                border: '1px solid rgba(255,255,255,0.03)'
              }} />
              <div className="skeleton-pulse" style={{ width: '75%', height: '16px', borderRadius: '4px' }} />
              <div className="skeleton-pulse" style={{ width: '40%', height: '12px', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="library-view-container" style={{ padding: '30px' }}>
      <style>{`
        @keyframes staggerFadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
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

          {(activeTab === 'movies' || activeTab === 'series' || activeTab === 'adult') && (
            <button 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedItemIds([]);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                borderRadius: '12px',
                border: isSelectionMode ? '1px solid var(--accent-blue)' : '1px solid var(--border-card)',
                background: isSelectionMode ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                color: isSelectionMode ? 'var(--accent-blue)' : '#fff',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '14px',
                transition: 'all 0.2s ease',
              }}
            >
              <Check size={16} />
              {isSelectionMode ? T('library.exit_selection_mode') || 'Exit Selection' : T('library.select_items') || 'Select Items'}
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
      <LibraryFilterBar
        uniqueTags={uniqueTags}
        selectedTags={selectedTags}
        setSelectedTags={setSelectedTags}
        activeTab={activeTab}
      />

      {activeTab === 'tags' ? (
        <TagsManagerView 
          tags={data.tags || []} 
          searchQuery={searchQuery}
          navigateTo={navigateTo}
          onTagsChanged={fetchLibrary}
        />
      ) : renderItems.length > 0 ? (
        <LibraryGrid
          renderItems={renderItems}
          visibleCount={visibleCount}
          triggerRef={triggerRef}
          isSelectionMode={isSelectionMode}
          selectedItemIds={selectedItemIds}
          setSelectedItemIds={setSelectedItemIds}
          navigateTo={navigateTo}
          T={T}
          viewMode={viewMode}
        />
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

      {/* Floating Action Bar */}
      {selectedItemIds.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 20, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(139, 92, 246, 0.3)',
          zIndex: 100,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#fff' }}>
            {selectedItemIds.length} {selectedItemIds.length === 1 ? 'item selected' : 'items selected'}
          </span>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255, 255, 255, 0.15)' }} />
          <button
            onClick={() => setIsBulkTagModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px',
              border: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', color: '#fff',
              cursor: 'pointer', fontWeight: '700', fontSize: '13px', transition: 'transform 0.2s',
              boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
            }}
          >
            <Tag size={14} /> {T('library.manage_tags') || 'Manage Tags'}
          </button>
          <button
            onClick={() => { setIsSelectionMode(false); setSelectedItemIds([]); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.15)', background: 'rgba(255, 255, 255, 0.05)',
              color: 'rgba(255, 255, 255, 0.8)', cursor: 'pointer', fontWeight: '700', fontSize: '13px'
            }}
          >
            <X size={14} /> {T('library.cancel') || 'Cancel'}
          </button>
        </div>
      )}

      {isBulkTagModalOpen && (
        <BulkTagModal
          T={T}
          selectedItemIds={selectedItemIds}
          currentItems={mediaItemsForBulk}
          onClose={() => setIsBulkTagModalOpen(false)}
          onApply={async (addTags, removeTags) => {
            const finalItemIds = [];
            selectedItemIds.forEach(id => {
              if (typeof id === 'string' && id.startsWith('series_')) {
                const tmdbIdStr = id.replace('series_', '');
                const matches = mediaItemsForBulk.filter(item => String(item.series_tmdb_id) === tmdbIdStr);
                matches.forEach(m => { if (!finalItemIds.includes(m.id)) finalItemIds.push(m.id); });
              } else {
                if (!finalItemIds.includes(id)) finalItemIds.push(id);
              }
            });

            try {
              await api.bulkUpdateItemTags({ item_ids: finalItemIds, add_tags: addTags, remove_tags: removeTags });
              await fetchLibrary();
              setIsBulkTagModalOpen(false);
              setIsSelectionMode(false);
              setSelectedItemIds([]);
            } catch (err) { 
              console.error(err); 
            }
          }}
        />
      )}

      <PeopleManagerModal
        activeTab={activeTab}
        isDrawerOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        navigateTo={navigateTo}
        T={T}
      />
    </div>
  );
};

export default LibraryView;

