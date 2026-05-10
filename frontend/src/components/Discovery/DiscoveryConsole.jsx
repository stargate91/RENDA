import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import DiscoveryTable from './DiscoveryTable';
import en from '../../locales/en';

const T = (key, params = {}) => {
  const keys = key.split('.');
  let value = en;
  for (const k of keys) {
    if (value && value[k]) value = value[k];
    else return key;
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

const DiscoveryConsole = ({ items, loading, handleScan, fetchFullMetadata, selectedItem, setSelectedItem }) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [extraSubTab, setExtraSubTab] = useState('video');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-switch to first non-empty tab if manual is empty upon load
  useEffect(() => {
    if (items && items.manual && items.manual.length === 0 && activeTab === 'manual') {
      if (items.movies && items.movies.length > 0) setActiveTab('movies');
      else if (items.series && items.series.length > 0) setActiveTab('series');
    }
  }, [items]);

  useEffect(() => {
    if (activeTab === 'extras') {
      setExtraSubTab('video');
    }
    setSortKey(null);
    setSortDir('asc');
    setSearchQuery('');
  }, [activeTab]);

  return (
    <div className="discovery-view">
      <div className="discovery-header">
        <div className="header-text">
          <h1>{T('discovery.title')}</h1>
          <p>{T('discovery.found_items', { count: (items.manual?.length || 0) + (items.movies?.length || 0) + (items.series?.length || 0) + (items.extras?.length || 0) })}</p>
        </div>
        <div className="discovery-actions">
          <button className="btn-primary" onClick={handleScan} disabled={loading}>
            {loading ? 'Processing...' : 'Scan Now'}
          </button>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
          {T('discovery.tabs.manual')} <span className="tab-count">{items.manual?.length || 0}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'movies' ? 'active' : ''}`} onClick={() => setActiveTab('movies')}>
          {T('discovery.tabs.movies')} <span className="tab-count">{items.movies?.length || 0}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}>
          {T('discovery.tabs.series')} <span className="tab-count">{items.series?.length || 0}</span>
        </button>
        <button className={`tab-btn ${activeTab === 'extras' ? 'active' : ''}`} onClick={() => setActiveTab('extras')}>
          {T('discovery.tabs.extras')} <span className="tab-count">{items.extras?.length || 0}</span>
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
            const count = (items.extras || []).filter(ex => ex.category === sub.id).length;
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

      <DiscoveryTable 
        items={items}
        activeTab={activeTab}
        extraSubTab={extraSubTab}
        searchQuery={searchQuery}
        sortKey={sortKey}
        setSortKey={setSortKey}
        sortDir={sortDir}
        setSortDir={setSortDir}
        loading={loading}
        fetchFullMetadata={fetchFullMetadata}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        T={T}
      />
    </div>
  );
};

export default DiscoveryConsole;
