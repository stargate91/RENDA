import React from 'react';
import MetadataModal from './components/Modals/MetadataModal';
import DiscoveryConsole from './components/Discovery/DiscoveryConsole';
import InspectorPanel from './components/Discovery/InspectorPanel';
import Sidebar from './components/Navigation/Sidebar';
import GlobalProgress from './components/Navigation/GlobalProgress';
import { useAppContext } from './context/AppContext';
import './index.css';

function App() {
  const {
    view, setView,
    items, loading,
    progress, settings, setSettings,
    showWelcomeModal, setShowWelcomeModal,
    settingsTab, setSettingsTab,
    saveStatus, imageStatus,
    selectedItem, setSelectedItem,
    stats, fullMetadata, showMetadataModal, setShowMetadataModal,
    handleScan, fetchFullMetadata, saveSettings, wipeDatabase,
    T
  } = useAppContext();

  return (
    <div className={`app-container ${view === 'discovery' ? 'has-inspector' : ''}`}>
      <Sidebar view={view} setView={setView} T={T} />

      <div className="main-content">
        <GlobalProgress progress={progress} T={T} />

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
          <DiscoveryConsole 
            items={items}
            loading={loading}
            handleScan={handleScan}
            fetchFullMetadata={fetchFullMetadata}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
          />
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
                      onClick={wipeDatabase}
                    >
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
          <InspectorPanel selectedItem={selectedItem} fetchFullMetadata={fetchFullMetadata} T={T} />
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

      <MetadataModal 
        show={showMetadataModal} 
        metadata={fullMetadata} 
        onClose={() => setShowMetadataModal(false)} 
      />

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
