import React, { useState, useEffect, useCallback } from 'react';
import { Search, Film, Tv, ShieldAlert, Loader2, User, Clapperboard } from 'lucide-react';
import { api } from '../../services/api';

const LibraryView = ({ T }) => {
  const [data, setData] = useState({ movies: [], series: [], adult: [], counts: { movies: 0, series: 0, adult: 0 } });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('movies');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSeriesId, setCurrentSeriesId] = useState(null);
  const [currentSeason, setCurrentSeason] = useState(null);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setCurrentSeriesId(null);
    setCurrentSeason(null);
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

  const visibleTabs = [
    { id: 'movies', label: T('discovery.tabs.movies'), icon: <Film size={18} />, count: data.counts.movies },
    { id: 'series', label: T('discovery.tabs.series'), icon: <Tv size={18} />, count: data.counts.series },
    { id: 'adult', label: 'Adult', icon: <ShieldAlert size={18} />, count: data.counts.adult },
    { id: 'actors', label: 'Actors', icon: <User size={18} />, count: data.counts.actors || 0 },
    { id: 'directors', label: 'Directors', icon: <Clapperboard size={18} />, count: data.counts.directors || 0 }
  ].filter(tab => tab.count > 0);

  const currentItems = data[activeTab] || [];
  let filteredItems = currentItems.filter(item => 
    item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  let renderItems = filteredItems;
  let viewMode = 'grid'; // grid (posters) or list (episodes)
  
  if (activeTab === 'series') {
    if (!currentSeriesId) {
      // Show unique series
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
            series_id_key: sid // Store the computed key
          });
        }
      });
      renderItems = Array.from(seriesMap.values());
    } else if (currentSeason === null) {
      // Show seasons for the selected series
      const seasonMap = new Map();
      filteredItems.forEach(item => {
        const itemSid = item.series_tmdb_id || item.series_title || item.title || `unknown_${item.id}`;
        if (itemSid === currentSeriesId) {
          const snum = item.season_number != null ? item.season_number : 1;
          if (!seasonMap.has(snum)) {
            seasonMap.set(snum, {
              ...item,
              id: `season_${snum}`,
              displayTitle: item.season_title || `Season ${snum}`,
              displayPoster: item.poster_path,
              displayPosterFolder: 'posters',
              isSeasonNode: true,
              season_num_key: snum
            });
          }
        }
      });
      // Sort seasons
      renderItems = Array.from(seasonMap.values()).sort((a, b) => a.season_num_key - b.season_num_key);
    } else {
      // Show episodes for selected season
      renderItems = filteredItems.filter(item => {
        const itemSid = item.series_tmdb_id || item.series_title || item.title || `unknown_${item.id}`;
        const snum = item.season_number != null ? item.season_number : 1;
        return itemSid === currentSeriesId && snum === currentSeason;
      }).map(item => ({
        ...item,
        displayTitle: item.episode_title || item.title,
        displayPoster: item.still_path || item.backdrop_path,
        displayPosterFolder: item.still_path ? 'stills' : 'backdrops',
        isEpisodeNode: true
      })).sort((a, b) => (a.episode_number || 0) - (b.episode_number || 0));
      viewMode = 'episodes';
    }
  } else {
    // Movies / Adult / Actors / Directors flat map
    renderItems = filteredItems.map(item => ({
      ...item,
      displayTitle: item.title,
      displayPoster: item.displayPoster || item.poster_path,
      displayPosterFolder: item.displayPosterFolder || 'posters'
    }));
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

      {activeTab === 'series' && currentSeriesId && (
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
          <button onClick={() => { setCurrentSeason(null); setCurrentSeriesId(null); }} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
            ← All Series
          </button>
          {currentSeason !== null && (
            <button onClick={() => setCurrentSeason(null)} className="btn-secondary" style={{ padding: '8px 16px', borderRadius: '8px' }}>
              ← All Seasons
            </button>
          )}
        </div>
      )}

      {renderItems.length > 0 ? (
        <div className="library-grid" style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'episodes' ? 'repeat(auto-fill, minmax(250px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '30px'
        }}>
          {renderItems.map(item => (
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
              if (item.isSeriesNode) setCurrentSeriesId(item.series_id_key);
              else if (item.isSeasonNode) setCurrentSeason(item.season_num_key);
              else if (item.type !== 'actor' && item.type !== 'director') {
                // Handle episode click or movie click (play or details)
                api.revealFile(item.path);
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
      ) : (
        <div className="library-empty" style={{ 
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
          height: '400px', color: 'var(--text-dim)' 
        }}>
          <Film size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
          <p>{searchQuery ? 'No results for your search' : 'Your collection is empty'}</p>
        </div>
      )}
    </div>
  );
};

export default LibraryView;
