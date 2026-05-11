import React, { useState } from 'react';
import { Search, RefreshCw, FolderOpen, Loader2, Plus, Database } from 'lucide-react';
import DiscoveryTable from './DiscoveryTable';
import GlobalProgress from '../Navigation/GlobalProgress';
import OverrideModal from '../Modals/OverrideModal';

const DiscoveryConsole = ({ 
  items, loading, handleScan, handleDropScan, loadSession, 
  fetchFullMetadata, selectedItem, setSelectedItem,
  selectedIds, setSelectedIds, deleteDiscoveryItems,
  openResolver,
  stats, isDragging, T 
}) => {
  const [activeTab, setActiveTab] = useState('manual');
  const [extraSubTab, setExtraSubTab] = useState('video');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('filename');
  const [sortDir, setSortDir] = useState('asc');
  const [overrideModal, setOverrideModal] = useState({ show: false, item: null });

  const totalPending = (items?.manual?.length || 0) + (items?.movies?.length || 0) + (items?.series?.length || 0) + (items?.extras?.length || 0) + (items?.collisions?.length || 0);

  const getFilteredCount = (tab) => {
    if (tab === 'extras') return items?.extras?.length || 0;
    return items?.[tab]?.length || 0;
  };

  if (!loading && totalPending === 0 && searchQuery === '') {
    return (
      <div className="discovery-empty-state" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: 'calc(100vh - 120px)',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div className="empty-state-icon-wrapper" style={{ 
          position: 'relative', 
          width: '160px', 
          height: '160px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '40px'
        }}>
          <div className="icon-glow" style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--accent-blue)',
            borderRadius: '50%',
            opacity: 0.1,
            filter: 'blur(30px)',
            animation: 'pulse 4s infinite'
          }} />
          <div className="icon-glass" style={{
            position: 'relative',
            width: '100px',
            height: '100px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border-card)',
            borderRadius: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            transform: 'rotate(-5deg)'
          }}>
            <FolderOpen size={48} color="var(--accent-blue)" />
          </div>
        </div>

        <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '15px', letterSpacing: '-1px' }}>
          {T('discovery.empty.title')}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '16px', maxWidth: '550px', marginBottom: '45px', lineHeight: '1.6' }}>
          {T('discovery.empty.subtitle')}
        </p>
        
        <div className="empty-state-actions" style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button className="pro-empty-btn primary" onClick={handleScan} style={{
            background: 'var(--accent-gradient)',
            border: 'none',
            color: '#fff',
            padding: '16px 32px',
            borderRadius: '16px',
            fontWeight: '800',
            fontSize: '15px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            boxShadow: '0 10px 30px var(--accent-glow)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
          }}>
            <Plus size={20} />
            {T('discovery.empty.action_scan')}
          </button>
          
          {stats?.unmatched > 0 && (
            <button className="pro-empty-btn secondary" onClick={loadSession} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--border-card)',
              color: '#fff',
              padding: '16px 32px',
              borderRadius: '16px',
              fontWeight: '800',
              fontSize: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}>
              <Database size={20} className={loading ? 'spin' : ''} />
              {T('discovery.empty.action_resume', { count: stats?.unmatched || 0 })}
            </button>
          )}
        </div>
      </div>
    );
  }

  const openOverride = (item) => {
    setOverrideModal({ show: true, item });
  };

  return (
    <div className="discovery-pro-container">
      <div className="discovery-pro-header">
        {/* Row 1: Title & Global Actions */}
        <div className="header-main-row">
          <div className="title-block">
            <h1>{T('discovery.title')}</h1>
            <span className="badge-count">{totalPending}</span>
          </div>
          <div className="action-block">
            <button className="btn-icon" onClick={loadSession} title={T('discovery.refresh')}>
              <RefreshCw size={20} className={loading ? 'spin' : ''} />
            </button>
            <button className="btn-browse" onClick={handleScan}>
              <FolderOpen size={18} />
              {T('discovery.scan_now')}
            </button>
          </div>
        </div>

        {/* Row 2: Navigation & Search */}
        <div className="header-nav-row">
          <div className="nav-tabs">
            <button className={`nav-tab ${activeTab === 'manual' ? 'active' : ''}`} onClick={() => setActiveTab('manual')}>
              {T('discovery.tabs.manual')}
              <span className="count">{getFilteredCount('manual')}</span>
            </button>
            <button className={`nav-tab ${activeTab === 'movies' ? 'active' : ''}`} onClick={() => setActiveTab('movies')}>
              {T('discovery.tabs.movies')}
              <span className="count">{getFilteredCount('movies')}</span>
            </button>
            <button className={`nav-tab ${activeTab === 'series' ? 'active' : ''}`} onClick={() => setActiveTab('series')}>
              {T('discovery.tabs.series')}
              <span className="count">{getFilteredCount('series')}</span>
            </button>
            <button className={`nav-tab ${activeTab === 'extras' ? 'active' : ''}`} onClick={() => setActiveTab('extras')}>
              {T('discovery.tabs.extras')}
              <span className="count">{getFilteredCount('extras')}</span>
            </button>
            <button className={`nav-tab ${activeTab === 'collisions' ? 'active' : ''}`} onClick={() => setActiveTab('collisions')}>
              {T('discovery.tabs.collisions')}
              <span className="count">{getFilteredCount('collisions')}</span>
            </button>
          </div>
          
          <div className="pro-search-bar">
            <Search size={16} className="icon" />
            <input 
              type="text" 
              placeholder={T('discovery.search_placeholder')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Row 3: Sub-Nav for Extras */}
        {activeTab === 'extras' && (
          <div className="header-sub-row">
            <div className="sub-pills">
              <button className={`sub-pill ${extraSubTab === 'video' ? 'active' : ''}`} onClick={() => setExtraSubTab('video')}>{T('discovery.tabs.video')}</button>
              <button className={`sub-pill ${extraSubTab === 'subtitle' ? 'active' : ''}`} onClick={() => setExtraSubTab('subtitle')}>{T('discovery.tabs.subtitle')}</button>
              <button className={`sub-pill ${extraSubTab === 'audio' ? 'active' : ''}`} onClick={() => setExtraSubTab('audio')}>{T('discovery.tabs.audio')}</button>
              <button className={`sub-pill ${extraSubTab === 'image' ? 'active' : ''}`} onClick={() => setExtraSubTab('image')}>{T('discovery.tabs.image')}</button>
              <button className={`sub-pill ${extraSubTab === 'metadata' ? 'active' : ''}`} onClick={() => setExtraSubTab('metadata')}>{T('discovery.tabs.metadata')}</button>
            </div>
          </div>
        )}
      </div>

      <div className="discovery-table-wrapper">
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
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          deleteDiscoveryItems={deleteDiscoveryItems}
          openResolver={openResolver}
          openOverride={openOverride}
          T={T}
        />

        {selectedIds.length > 0 && (
          <div className="batch-bar">
            <div className="batch-info">
              {T('discovery.bulk.selected', { count: selectedIds.length })}
            </div>
            <div className="batch-actions">
              <button className="btn-danger" onClick={() => deleteDiscoveryItems(selectedIds, activeTab === 'extras' ? 'extras' : 'media')}>
                {T('discovery.bulk.delete')}
              </button>
            </div>
          </div>
        )}
      </div>

      <GlobalProgress T={T} />
      
      <OverrideModal 
        show={overrideModal.show} 
        item={overrideModal.item} 
        onClose={() => setOverrideModal({ show: false, item: null })}
        onSave={loadSession}
        T={T}
      />
    </div>
  );
};

export default DiscoveryConsole;
