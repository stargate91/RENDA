import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import './index.css';
import en from './locales/en';

const API_BASE = "http://localhost:8000";

// Simple translation helper
const T = (key, params = {}) => {
  const keys = key.split('.');
  let value = en;
  for (const k of keys) {
    if (value && value[k]) {
      value = value[k];
    } else {
      return key; // Fallback to key if not found
    }
  }

  if (typeof value === 'string') {
    let result = value;
    for (const [p, val] of Object.entries(params)) {
      result = result.replace(`{{${p}}}`, val);
    }
    return result;
  }
  return value;
};

function App() {
  const [view, setView] = useState('dashboard'); // 'dashboard' or 'discovery'
  const [items, setItems] = useState({ manual: [], movies: [], series: [], extras: [], collisions: [] });
  const [activeTab, setActiveTab] = useState('manual');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null); // {active, current, total, phase, start_time}
  const [settings, setSettings] = useState({ user_name: '', tmdb_api_key: '', tmdb_bearer_token: '', imdb_api_key: '' });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');
  const [saveStatus, setSaveStatus] = useState('');
  const [imageStatus, setImageStatus] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [extraSubTab, setExtraSubTab] = useState('video');
  const [stats, setStats] = useState({ total_movies: 0, total_series: 0, total_episodes: 0, storage: '0 MB', unmatched: 0 });
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc'); // 'asc' | 'desc'
  const [searchQuery, setSearchQuery] = useState('');
  const [fullMetadata, setFullMetadata] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [metadataTab, setMetadataTab] = useState('technical');
  const wasActiveRef = useRef(false);

  const fetchFullMetadata = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE}/item/${itemId}/full-metadata`);
      const data = await res.json();
      if(data.error) {
        alert(data.error);
        return;
      }
      setFullMetadata(data);
      setMetadataTab('technical');
      setShowMetadataModal(true);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch full metadata");
    }
  };

  useEffect(() => {
    if (activeTab === 'extras') {
      setExtraSubTab('video');
    }
    setSortKey(null);
    setSortDir('asc');
    setSearchQuery('');
  }, [activeTab]);

  useEffect(() => {
    setImageIndex(0);
  }, [selectedItem]);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  useEffect(() => {
    if (settings.user_name === '' && !showWelcomeModal) {
      // Check if we really have no name after fetch
      const checkName = async () => {
        const res = await fetch('http://localhost:8000/settings');
        const data = await res.json();
        if (!data.user_name) {
          setShowWelcomeModal(true);
        }
      };
      checkName();
    }
  }, [settings.user_name]);

  useEffect(() => {
    const int = setInterval(async () => {
      try {
        const res = await fetch('http://localhost:8000/image-status');
        const data = await res.json();
        setImageStatus(data);
      } catch (e) { }
    }, 2000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    // Folyamatosan figyeljük a háttérfolyamatokat
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === 'discovery') {
      fetchDiscovery();
    } else if (view === 'settings') {
      fetchSettings();
    } else if (view === 'dashboard') {
      fetchStats();
    }
  }, [view]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings`);
      const data = await response.json();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaveStatus('Saving...');
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus('Error saving');
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`${API_BASE}/scan-status`);
      const data = await response.json();
      setProgress(data);

      // Ha aktív a folyamat, tartsuk bekapcsolva a loading-ot a gomboknál
      if (data.active) {
        setLoading(true);
        wasActiveRef.current = true;
      } else if (wasActiveRef.current) {
        // Scan transition: active → idle — frissítsük a listákat
        wasActiveRef.current = false;
        setLoading(false);
        fetchDiscovery();
      }
    } catch (error) {
      console.error("Progress fetch failed:", error);
    }
  };

  const calculateETA = () => {
    if (!progress || !progress.active || progress.current < 2) return "Estimating time...";
    const elapsed = (Date.now() / 1000) - progress.start_time;
    const itemsPerSec = progress.current / elapsed;
    const remainingItems = progress.total - progress.current;
    const remainingSecs = remainingItems / itemsPerSec;

    if (remainingSecs < 1) return "Finishing...";
    const mins = Math.floor(remainingSecs / 60);
    const secs = Math.floor(remainingSecs % 60);
    return mins > 0 ? `${mins}m ${secs}s left` : `${secs}s left`;
  };

  const fetchDiscovery = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/discovery`);
      const data = await response.json();
      setItems(data);

      // Auto-switch to first non-empty tab if manual is empty
      if (data.manual.length === 0) {
        if (data.movies.length > 0) setActiveTab('movies');
        else if (data.series.length > 0) setActiveTab('series');
      }
    } catch (error) {
      console.error("Failed to fetch discovery items:", error);
    }
    setLoading(false);
  };

  const handleScan = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const selectedPath = await ipcRenderer.invoke('select-folder');
      if (!selectedPath) return;

      setLoading(true);
      await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [selectedPath] })
      });
    } catch (error) {
      console.error("Scan failed:", error);
      setLoading(false);
    }
  };

  const getWeightedPercent = () => {
    if (!progress || !progress.active) return 0;
    const { phase, current, total } = progress;
    const subPercent = total > 0 ? (current / total) : 0;

    switch (phase) {
      case 'collecting':
        return Math.round(subPercent * 10); // 0-10%
      case 'probing':
        return Math.round(10 + (subPercent * 20)); // 10-30%
      case 'enriching':
        return Math.round(30 + (subPercent * 30)); // 30-60%
      case 'resolving':
        return Math.round(60 + (subPercent * 40)); // 60-100%
      default:
        return 0;
    }
  };

  const percent = getWeightedPercent();

  return (
    <div className={`app-container ${view === 'discovery' ? 'has-inspector' : ''}`}>
      <div className="sidebar">
        <div className="logo">RENDA</div>
        <div className={`nav-item ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>{T('sidebar.dashboard')}</div>
        <div className={`nav-item ${view === 'discovery' ? 'active' : ''}`} onClick={() => setView('discovery')}>{T('sidebar.discovery')}</div>
        <div className="nav-item">{T('sidebar.library')}</div>
        <div className="nav-item">{T('sidebar.history')}</div>
        <div className={`nav-item ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>{T('sidebar.settings')}</div>
      </div>

      <div className="main-content">
        {progress && progress.active && (
          <div className="global-activity-bar">
            <div className="activity-info">
              <span className="pulse-dot"></span>
              <span className="activity-phase">{T(`phases.${progress.phase}`) || progress.phase}</span>
              <span className="activity-percent">{percent}%</span>
              <span className="activity-eta">{calculateETA()}</span>
            </div>
            <div className="activity-progress-bg">
              <div className="activity-progress-fill" style={{ width: `${percent}%` }}></div>
            </div>
          </div>
        )}

        {view === 'dashboard' && (
          <>
            <div className="header">
              <h1>{T('dashboard.welcome', { name: settings.user_name || 'User' })}</h1>
              <p>{T('dashboard.subtitle')}</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">{T('dashboard.stats.total_movies')}</div>
                <div className="stat-value">{(stats.total_movies || 0).toLocaleString()}</div>
                <div className="stat-sub">{T('dashboard.stats.movies_sub')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{T('dashboard.stats.tv_series')}</div>
                <div className="stat-value">{(stats.total_series || 0).toLocaleString()}</div>
                <div className="stat-sub">{(stats.total_episodes || 0).toLocaleString()} {T('dashboard.stats.episodes_sub')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{T('dashboard.stats.storage_used')}</div>
                <div className="stat-value">{stats.storage || '0 MB'}</div>
                <div className="stat-sub">{T('dashboard.stats.storage_sub')}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">{T('dashboard.stats.unmatched')}</div>
                <div className="stat-value">{(stats.unmatched || 0).toLocaleString()}</div>
                <div className="stat-sub">{T('dashboard.stats.unmatched_sub')}</div>
              </div>
            </div>
          </>
        )}

        {view === 'discovery' && (
          <div className="discovery-view">
            <div className="discovery-header">
              <div className="header-text">
                <h1>{T('discovery.title')}</h1>
                <p>{T('discovery.found_items', { count: items.manual.length + items.movies.length + items.series.length + items.extras.length })}</p>
              </div>
              <div className="discovery-actions">
                <button className="btn-primary" onClick={handleScan} disabled={loading}>
                  {loading ? 'Processing...' : 'Scan Now'}
                </button>
              </div>
            </div>

            <div className="tabs">
              <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
                {T('discovery.tabs.manual')} <span className="tab-count">{items.manual.length}</span>
              </button>
              <button className={`tab-btn ${activeTab === 'movies' ? 'active' : ''}`} onClick={() => setActiveTab('movies')}>
                {T('discovery.tabs.movies')} <span className="tab-count">{items.movies.length}</span>
              </button>
              <button className={`tab-btn ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}>
                {T('discovery.tabs.series')} <span className="tab-count">{items.series.length}</span>
              </button>
              <button className={`tab-btn ${activeTab === 'extras' ? 'active' : ''}`} onClick={() => setActiveTab('extras')}>
                {T('discovery.tabs.extras')} <span className="tab-count">{items.extras.length}</span>
              </button>
              {items.collisions?.length > 0 && (
                <button className={`tab-btn ${activeTab === 'collisions' ? 'active' : ''} collision-tab`} onClick={() => setActiveTab('collisions')}>
                  {T('discovery.tabs.collisions')} <span className="tab-count">{items.collisions.length}</span>
                </button>
              )}
            </div>

            {activeTab === 'extras' && (
              <div className="sub-tabs">
                {[
                  { id: 'video', label: 'Bonus Video' },
                  { id: 'subtitle', label: 'Subtitles' },
                  { id: 'audio', label: 'Audio Tracks' },
                  { id: 'image', label: 'Images' },
                  { id: 'metadata', label: 'Metadatas' }
                ].map(sub => {
                  const count = items.extras.filter(ex => ex.category === sub.id).length;
                  return (
                    <button
                      key={sub.id}
                      className={`sub-tab-btn ${extraSubTab === sub.id ? 'active' : ''}`}
                      onClick={() => setExtraSubTab(sub.id)}
                    >
                      {sub.label} <span className="sub-tab-count">{count}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="search-bar">
              <span className="search-icon"><Search size={16} /></span>
              <input
                type="text"
                className="search-input"
                placeholder={T('discovery.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearchQuery('')}>
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="sortable-th" onClick={() => { setSortKey(sortKey === 'filename' && sortDir === 'asc' ? 'filename' : 'filename'); setSortDir(sortKey === 'filename' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                      {T('discovery.table.name_mapping')} {sortKey === 'filename' && (sortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="sortable-th" onClick={() => { setSortKey(sortKey === 'planned_path' && sortDir === 'asc' ? 'planned_path' : 'planned_path'); setSortDir(sortKey === 'planned_path' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                      {T('discovery.table.planned_name')} {sortKey === 'planned_path' && (sortDir === 'asc' ? '▲' : '▼')}
                    </th>
                    {activeTab === 'manual' && (
                      <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'type' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('type'); }}>
                        {T('discovery.table.type')} {sortKey === 'type' && (sortDir === 'asc' ? '▲' : '▼')}
                      </th>
                    )}
                    {activeTab === 'extras' && (extraSubTab === 'subtitle' || extraSubTab === 'audio') && (
                      <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'language' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('language'); }}>
                        {T('discovery.table.language')} {sortKey === 'language' && (sortDir === 'asc' ? '▲' : '▼')}
                      </th>
                    )}
                    {activeTab === 'extras' && extraSubTab !== 'metadata' && (
                      <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'subtype' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('subtype'); }}>
                        {T('discovery.table.subcategory')} {sortKey === 'subtype' && (sortDir === 'asc' ? '▲' : '▼')}
                      </th>
                    )}
                    {activeTab !== 'extras' && (
                      <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('status'); }}>
                        {T('discovery.table.status')} {sortKey === 'status' && (sortDir === 'asc' ? '▲' : '▼')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let rows = activeTab === 'extras'
                      ? (items.extras || []).filter(ex => ex.category === extraSubTab)
                      : (items[activeTab] || []);
                    
                    // Search filter
                    if (searchQuery) {
                      const q = searchQuery.toLowerCase();
                      rows = rows.filter(item => {
                        const fn = (item.filename || '').toLowerCase();
                        const pn = (activeTab === 'extras' ? (item.parent_name || '') : (item.planned_path || '')).toLowerCase();
                        return fn.includes(q) || pn.includes(q);
                      });
                    }
                    
                    // Sort
                    if (sortKey) {
                      rows = [...rows].sort((a, b) => {
                        let valA = (a[sortKey] || '').toString().toLowerCase();
                        let valB = (b[sortKey] || '').toString().toLowerCase();
                        if (sortKey === 'planned_path' && activeTab === 'extras') {
                          valA = (a.parent_name || '').toLowerCase();
                          valB = (b.parent_name || '').toLowerCase();
                        }
                        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
                        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
                        return 0;
                      });
                    }
                    
                    return rows.map(item => (
                    <tr
                      key={item.id}
                      className={selectedItem?.id === item.id ? 'selected' : ''}
                      onClick={() => setSelectedItem(item)}
                    >
                      <td>
                        <div className="original-name" title={item.filename}>{item.filename}</div>
                      </td>
                      <td>
                        <div className="planned-name" title={item.planned_path}>
                          <span className="arrow">➔</span>
                          <span className="planned-name-text">
                            {item.planned_path ? (
                              activeTab === 'extras' ? (
                                <>
                                  {item.planned_path.split('/').pop().replace(new RegExp((item.extension || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '')}
                                  {item.extension && <span className="extension-text">{item.extension.toLowerCase()}</span>}
                                </>
                              ) : (
                                item.planned_path
                              )
                            ) : '-'}
                          </span>
                        </div>
                      </td>
                      {activeTab === 'manual' && (
                        <td className="cell-center">
                          <span className={`badge badge-type`}>{item.type}</span>
                        </td>
                      )}
                      {activeTab === 'extras' && (extraSubTab === 'subtitle' || extraSubTab === 'audio') && (
                        <td className="cell-center">
                          <span className="language-text">
                            {item.language ? item.language.toUpperCase() : '-'}
                          </span>
                        </td>
                      )}
                      {activeTab === 'extras' && extraSubTab !== 'metadata' && (
                        <td className="cell-center">
                          <span className="subcategory-text">
                            {item.subtype && item.subtype.toLowerCase() !== 'other'
                              ? (item.subtype.charAt(0).toUpperCase() + item.subtype.slice(1).replace(/_/g, ' '))
                              : '-'}
                          </span>
                        </td>
                      )}
                      {activeTab !== 'extras' && (
                        <td className="cell-center">
                          <span className={`status-badge ${(item.status || '').toLowerCase()}`}>
                            {item.status || 'UNKNOWN'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ));
                  })()}
                  {(!items[activeTab] || items[activeTab].length === 0) && !loading && (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#666' }}>
                        No items in this category.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'settings' && (
          <div className="settings-view">
            <div className="header">
              <h1>Settings</h1>
              <p>Configure RENDA parameters and external integrations.</p>
            </div>

            <div className="tabs">
              <button className={`tab-btn ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>General</button>
              <button className={`tab-btn ${settingsTab === 'api' ? 'active' : ''}`} onClick={() => setSettingsTab('api')}>API Keys</button>
              <button className={`tab-btn ${settingsTab === 'advanced' ? 'active' : ''}`} onClick={() => setSettingsTab('advanced')}>Advanced</button>
            </div>

            {settingsTab === 'api' && (
              <div className="settings-card">
                <div className="settings-section-header">
                  <h3>External Metadata Providers</h3>
                  <p className="settings-desc">Provide API keys to fetch rich metadata and artwork for your media.</p>
                </div>

                <div className="form-group">
                  <label>TMDB API Key (v3 auth)</label>
                  <input
                    type="password"
                    className="form-input"
                    value={settings.tmdb_api_key || ''}
                    onChange={e => setSettings({ ...settings, tmdb_api_key: e.target.value })}
                    placeholder="Enter your TMDB API key"
                  />
                  <div className="input-hint">Used for standard API requests.</div>
                </div>

                <div className="form-group">
                  <label>TMDB Bearer Token (v4 auth)</label>
                  <input
                    type="password"
                    className="form-input"
                    value={settings.tmdb_bearer_token || ''}
                    onChange={e => setSettings({ ...settings, tmdb_bearer_token: e.target.value })}
                    placeholder="Enter your TMDB API Read Access Token"
                  />
                  <div className="input-hint">Required for identifying movies and TV shows accurately. Longer than the v3 key.</div>
                </div>

                <div className="form-group">
                  <label>IMDb / OMDB API Key (Optional)</label>

                  <input
                    type="password"
                    className="form-input"
                    value={settings.imdb_api_key || ''}
                    onChange={e => setSettings({ ...settings, imdb_api_key: e.target.value })}
                    placeholder="Enter your OMDB API key"
                  />
                  <div className="input-hint">Used as a fallback for missing ratings.</div>
                </div>

                <div className="form-actions">
                  <button className="btn-primary" onClick={saveSettings}>Save Settings</button>
                  {saveStatus && !saveStatus.includes('lear') && <span className="save-status">{saveStatus}</span>}
                </div>
              </div>
            )}

            {settingsTab === 'advanced' && (
              <div className="settings-card">
                <div className="settings-section-header">
                  <h3>Danger Zone</h3>
                  <p className="settings-desc">Destructive actions and low-level system operations.</p>
                </div>

                <div className="form-group" style={{ border: '1px solid rgba(255, 60, 60, 0.3)', padding: '20px', borderRadius: '12px', background: 'rgba(255, 60, 60, 0.05)' }}>
                  <label style={{ color: '#ff3c3c', fontSize: '16px' }}>Factory Reset Database</label>
                  <p className="settings-desc" style={{ marginBottom: '15px' }}>This will permanently delete all scanned files, libraries, matches, and history from RENDA. Your physical media files on the hard drive will <b>not</b> be affected. Your API keys and settings will be preserved.</p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <button
                      className="btn-primary"
                      style={{ background: '#ff3c3c', boxShadow: '0 4px 15px rgba(255, 60, 60, 0.2)' }}
                      onClick={async () => {
                        if (window.confirm('Are you absolutely sure you want to clear the entire database? This cannot be undone.')) {
                          setSaveStatus('Clearing database...');
                          try {
                            const res = await fetch('http://localhost:8000/database/clear', { method: 'POST' });
                            if (res.ok) {
                              setSaveStatus('Database cleared successfully!');
                            } else {
                              setSaveStatus('Error clearing database');
                            }
                            setTimeout(() => setSaveStatus(''), 4000);
                          } catch (e) {
                            setSaveStatus('Error clearing database');
                          }
                        }
                      }}>
                      Wipe Database
                    </button>
                    {saveStatus && saveStatus.includes('lear') && <span className="save-status" style={{ color: saveStatus.includes('Error') ? '#ff3c3c' : '#00ff64' }}>{saveStatus}</span>}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {view === 'discovery' && (
        <div className="inspector-panel">
          {selectedItem ? (
            <>
              <div className="inspector-header">
                <h2 style={{ margin: 0, fontSize: '20px' }}>{T('inspector.details')}</h2>
              </div>

              {selectedItem.images && selectedItem.images.length > 0 && selectedItem.status?.toLowerCase() !== 'multiple' && selectedItem.status?.toLowerCase() !== 'no_match' && (
                <div className="inspector-carousel">
                  <div className="carousel-container" onClick={() => setImageIndex((imageIndex + 1) % selectedItem.images.length)}>
                    <img
                      className="inspector-poster"
                      src={`${API_BASE}${selectedItem.images[imageIndex].path}`}
                      alt="Media"
                    />
                    {selectedItem.images[imageIndex].type !== 'poster' && (
                      <div className="carousel-type-badge">
                        {selectedItem.images[imageIndex].type.toUpperCase()}
                      </div>
                    )}
                    {selectedItem.images.length > 1 && (
                      <div className="carousel-dots">
                        {selectedItem.images.map((_, i) => (
                          <div key={i} className={`dot ${i === imageIndex ? 'active' : ''}`} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="inspector-card">
                <div className="inspector-item">
                  <div className="inspector-label">{T('inspector.path')}</div>
                  <div className="inspector-value code" style={{ color: '#ffffff' }}>
                    {selectedItem.path || `${selectedItem.folder}/${selectedItem.filename}`}
                  </div>
                </div>
                <div className="inspector-item">
                  <div className="inspector-label">{T('inspector.planned')}</div>
                  <div className="inspector-value" style={{ color: '#00ff64' }}>{selectedItem.planned_path || '-'}</div>
                </div>
              </div>

              {activeTab !== 'extras' && (
                <div className="inspector-card">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <div className="inspector-item">
                      <div className="inspector-label">{T('inspector.resolution')}</div>
                      <div className="inspector-value">{selectedItem.resolution || '-'}</div>
                    </div>
                    <div className="inspector-item">
                      <div className="inspector-label">{T('inspector.duration')}</div>
                      <div className="inspector-value">
                        {selectedItem.duration ? `${Math.floor(selectedItem.duration / 60)}m` : '-'}
                      </div>
                    </div>
                    <div className="inspector-item">
                      <div className="inspector-label">{T('inspector.codecs')}</div>
                      <div className="inspector-value">
                        {selectedItem.video_codec ? `${selectedItem.video_codec.toUpperCase()}` : '-'}
                        {selectedItem.audio_codec ? ` / ${selectedItem.audio_codec.toUpperCase()}` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="inspector-actions">
                <button className="btn-secondary" onClick={() => fetchFullMetadata(selectedItem.id)}>
                  {T('inspector.check_metadata')}
                </button>
              </div>
            </>
          ) : (
            <div className="inspector-empty">
              <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.2 }}>🔍</div>
              <p>{T('inspector.select_item')}</p>
            </div>
          )}
        </div>
      )}

      {showWelcomeModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h1>{T('setup.title')}</h1>
            <p>{T('setup.subtitle')}</p>
            <input
              type="text"
              className="welcome-input"
              placeholder={T('setup.input_placeholder')}
              value={settings.user_name}
              onChange={(e) => setSettings({ ...settings, user_name: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') { saveSettings(); setShowWelcomeModal(false); } }}
            />
            <button className="btn-primary btn-full" onClick={() => { saveSettings(); setShowWelcomeModal(false); }}>
              {T('setup.button')}
            </button>
          </div>
        </div>
      )}

      {showMetadataModal && fullMetadata && (
        <div className="modal-overlay" onClick={() => setShowMetadataModal(false)}>
          <div className="modal-content metadata-modal" onClick={e => e.stopPropagation()}>
            <div className="metadata-modal-header">
              <h2>{fullMetadata.filename}</h2>
              <button className="metadata-close-btn" onClick={() => setShowMetadataModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="metadata-tabs">
              {[
                { id: 'technical', label: 'Technical' },
                { id: 'guessit', label: 'Guessit' },
                { id: 'overrides', label: 'Overrides' },
                { id: 'matches', label: `API Matches (${fullMetadata.matches?.length || 0})` },
                { id: 'api_raw', label: 'Raw JSON' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`metadata-tab ${metadataTab === tab.id ? 'active' : ''}`}
                  onClick={() => setMetadataTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            
            <div className="metadata-scroll-container">
              {metadataTab === 'technical' && (
                <div className="metadata-section">
                  <div className="metadata-grid">
                    {Object.entries(fullMetadata.technical).filter(([key]) => key !== 'audio_streams').map(([key, val]) => (
                      <div key={key} className="metadata-grid-item">
                        <span className="metadata-key">{key.replace(/_/g, ' ')}</span>
                        <span className="metadata-val">{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</span>
                      </div>
                    ))}
                  </div>
                  {fullMetadata.technical.audio_streams && fullMetadata.technical.audio_streams.length > 0 && (
                    <>
                      <div className="metadata-match-subheader" style={{marginTop: '20px'}}>Audio Streams</div>
                      <div className="metadata-code-block">
                        {JSON.stringify(fullMetadata.technical.audio_streams, null, 2)}
                      </div>
                    </>
                  )}
                </div>
              )}

              {metadataTab === 'guessit' && (
                <div className="metadata-section">
                  <div className="metadata-grid">
                    {Object.entries(fullMetadata.guessit).map(([key, val]) => (
                      <div key={key} className="metadata-grid-item">
                        <span className="metadata-key">{key.replace(/_/g, ' ')}</span>
                        <span className="metadata-val">{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metadataTab === 'overrides' && (
                <div className="metadata-section">
                  <div className="metadata-grid">
                    {fullMetadata.overrides && Object.entries(fullMetadata.overrides).map(([key, val]) => (
                      <div key={key} className="metadata-grid-item">
                        <span className="metadata-key">{key.replace(/_/g, ' ')}</span>
                        <span className="metadata-val">{val !== null && val !== undefined && val !== '' ? String(val) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {metadataTab === 'matches' && (
                <div className="metadata-section">
                  {fullMetadata.matches && fullMetadata.matches.length > 0 ? (
                    fullMetadata.matches.map((m, idx) => (
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

              {metadataTab === 'api_raw' && (
                <div className="metadata-section">
                  {fullMetadata.matches && fullMetadata.matches.length > 0 ? (
                    fullMetadata.matches.map((m, idx) => (
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
      )}

      {imageStatus && imageStatus.active && (
        <div className="bg-process-indicator">
          <div className="progress-circle-container">
            <svg viewBox="0 0 36 36" className="circular-chart">
              <path className="circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path className="circle"
                strokeDasharray={`${imageStatus.total > 0 ? (imageStatus.completed / imageStatus.total) * 100 : 0}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="progress-text">
              {Math.round(imageStatus.total > 0 ? (imageStatus.completed / imageStatus.total) * 100 : 0)}%
            </div>
          </div>
          <span>Syncing {imageStatus.pending} images...</span>
        </div>
      )}
    </div>
  );
}

export default App;
