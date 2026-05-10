import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import MetadataModal from './components/Modals/MetadataModal';
import DiscoveryConsole from './components/Discovery/DiscoveryConsole';
import InspectorPanel from './components/Discovery/InspectorPanel';
import Sidebar from './components/Navigation/Sidebar';
import GlobalProgress from './components/Navigation/GlobalProgress';
import FloatingActionBar from './components/Navigation/FloatingActionBar';
import ConfirmModal from './components/Modals/ConfirmModal';
import CustomSelect from './components/Forms/CustomSelect';
import { useAppContext } from './context/AppContext';
import './index.css';

const CASING_OPTIONS = [
  { value: 'title', label: 'Title Case' },
  { value: 'lower', label: 'Lower Case' },
  { value: 'upper', label: 'Upper Case' },
  { value: 'default', label: 'Original' },
];

const SEPARATOR_OPTIONS = [
  { value: 'space', label: 'Space' },
  { value: 'dot', label: 'Dot (.)' },
  { value: 'dash', label: 'Dash (-)' },
  { value: 'underscore', label: 'Underscore (_)' },
];

const PART_OPTIONS = [
  { value: 'Part', label: 'Part' },
  { value: 'CD', label: 'CD' },
  { value: 'Disc', label: 'Disc' },
  { value: 'Volume', label: 'Volume' },
  { value: 'Book', label: 'Book' },
];

const NUMBERING_OPTIONS = [
  { value: '1, 2, 3..', label: '1, 2, 3..' },
  { value: 'I, II, III..', label: 'I, II, III..' },
  { value: 'A, B, C..', label: 'A, B, C..' },
];

const METADATA_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hu', label: 'Hungarian' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ru', label: 'Russian' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'pl', label: 'Polish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
  { value: 'da', label: 'Danish' },
  { value: 'fi', label: 'Finnish' },
  { value: 'no', label: 'Norwegian' },
  { value: 'cs', label: 'Czech' },
  { value: 'sk', label: 'Slovak' },
  { value: 'ro', label: 'Romanian' },
  { value: 'tr', label: 'Turkish' },
  { value: 'ar', label: 'Arabic' },
  { value: 'th', label: 'Thai' },
  { value: 'uk', label: 'Ukrainian' },
  { value: 'el', label: 'Greek' },
  { value: 'bg', label: 'Bulgarian' },
  { value: 'hr', label: 'Croatian' },
  { value: 'sr', label: 'Serbian' },
];

const MOVIE_VARS = ['Title', 'OriginalTitle', 'Year', 'ReleaseDate', 'Director', 'Resolution', 'VideoCodec', 'AudioCodec', 'Channels', 'BitDepth', 'HDR', 'Source', 'Edition', 'PartType', 'Part', 'IMDBID', 'TMDBID', 'RatingIMDB', 'Collection', 'Custom'];
const TV_VARS = ['SeriesTitle', 'OriginalSeriesTitle', 'FirstAirYear', 'Season', 'Episode', 'EpisodeTitle', 'Resolution', 'VideoCodec', 'AudioCodec', 'Channels', 'BitDepth', 'HDR', 'SeriesStatus', 'SeriesType', 'Director', 'Networks', 'Custom', 'YearRange', 'Status'];

const Switch = ({ checked, onChange, label, sublabel }) => (
  <div className="switch-container" onClick={() => onChange(!checked)}>
    <div className={`switch-track ${checked ? 'active' : ''}`}>
      <div className="switch-thumb" />
    </div>
    <div className="switch-labels">
      <div className="switch-label">{label}</div>
      {sublabel && <div className="switch-sublabel">{sublabel}</div>}
    </div>
  </div>
);

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
    handleScan, handleDropScan, fetchFullMetadata, saveSettings, wipeDatabase,
    loadSession, isDragging, setIsDragging,
    T, availableLocales
  } = useAppContext();

  const [activeVarMenu, setActiveVarMenu] = useState(null); // 'movie' or 'tv'

  const insertVariable = (type, variable) => {
    const field = type === 'movie' ? 'naming_movie_template' : 'naming_episode_template';
    const current = settings[field] || '';
    setSettings({ ...settings, [field]: `${current}{{${variable}}}` });
    setActiveVarMenu(null);
  };

  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDragging) setIsDragging(true);
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only deactivate if we really leave the window
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        let paths = [];
        try {
          const electron = window.require('electron');
          const webUtils = electron.webUtils;
          
          paths = Array.from(files).map(f => {
            if (webUtils && webUtils.getPathForFile) {
              return webUtils.getPathForFile(f);
            }
            return f.path; // Fallback to deprecated .path
          }).filter(p => p);
        } catch (err) {
          console.error("Path extraction failed:", err);
          // Last resort fallback
          paths = Array.from(files).map(f => f.path).filter(p => p);
        }
        
        if (paths.length > 0) {
          handleDropScan(paths);
        } else {
          console.warn("No valid paths found in dropped files");
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDropScan, setIsDragging, isDragging]);

  return (
    <div className={`app-container ${view === 'discovery' ? 'has-inspector' : ''}`}>
      <Sidebar view={view} setView={setView} T={T} />

      <div className={`main-content ${isDragging ? 'dragging' : ''}`}>
        {isDragging && (
          <div className="global-drop-overlay">
            <div className="drop-content">
              <Upload size={64} />
              <h2>Drop to Scan</h2>
              <p>Release to start discovery</p>
            </div>
          </div>
        )}
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
            handleDropScan={handleDropScan}
            loadSession={loadSession}
            fetchFullMetadata={fetchFullMetadata}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            stats={stats}
            isDragging={isDragging}
          />
        )}

        {view === 'settings' && (
          <div className="settings-view">
            <div className="settings-container">
              <div className="header">
                <h1>{T('settings.title')}</h1>
                <p>{T('settings.subtitle')}</p>
              </div>

              <div className="tabs">
                <button className={`tab-btn ${settingsTab === 'general' ? 'active' : ''}`} onClick={() => setSettingsTab('general')}>{T('settings.tabs.general')}</button>
                <button className={`tab-btn ${settingsTab === 'naming' ? 'active' : ''}`} onClick={() => setSettingsTab('naming')}>{T('settings.tabs.naming')}</button>
                <button className={`tab-btn ${settingsTab === 'folders' ? 'active' : ''}`} onClick={() => setSettingsTab('folders')}>{T('settings.tabs.folders')}</button>
                <button className={`tab-btn ${settingsTab === 'extras' ? 'active' : ''}`} onClick={() => setSettingsTab('extras')}>{T('settings.tabs.extras')}</button>
                <button className={`tab-btn ${settingsTab === 'api' ? 'active' : ''}`} onClick={() => setSettingsTab('api')}>{T('settings.tabs.api')}</button>
                <button className={`tab-btn ${settingsTab === 'appearance' ? 'active' : ''}`} onClick={() => setSettingsTab('appearance')}>{T('settings.tabs.appearance')}</button>
                <button className={`tab-btn ${settingsTab === 'advanced' ? 'active' : ''}`} onClick={() => setSettingsTab('advanced')}>{T('settings.tabs.advanced')}</button>
              </div>
              {settingsTab === 'general' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>{T('settings.general.title')}</h3>
                    <p className="settings-desc">{T('settings.general.desc')}</p>
                  </div>

                  <div className="form-group split">
                    <div className="form-group-info">
                      <label>{T('settings.general.user_name_label')}</label>
                      <div className="input-hint">{T('settings.general.user_name_hint')}</div>
                    </div>
                    <div className="form-group-input">
                      <input
                        type="text"
                        className="form-input"
                        value={settings.user_name || ''}
                        onChange={e => setSettings({ ...settings, user_name: e.target.value })}
                        placeholder="e.g. Levi"
                      />
                    </div>
                  </div>

                  <div className="form-group split">
                    <div className="form-group-info">
                      <label>{T('settings.general.ui_lang_label')}</label>
                      <div className="input-hint">{T('settings.general.ui_lang_hint')}</div>
                    </div>
                    <div className="form-group-input">
                      <CustomSelect 
                        value={settings.ui_language || 'en'} 
                        onChange={val => setSettings({ ...settings, ui_language: val })}
                        options={availableLocales}
                      />
                    </div>
                  </div>

                  <div className="form-group split">
                    <div className="form-group-info">
                      <label>{T('settings.general.scan_dir_label')}</label>
                      <div className="input-hint">{T('settings.general.scan_dir_hint')}</div>
                    </div>
                    <div className="form-group-input" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ flex: 1 }}
                        value={settings.default_scan_dir || ''}
                        onChange={e => setSettings({ ...settings, default_scan_dir: e.target.value })}
                        placeholder="e.g. E:/downloads_torrent"
                      />
                      <button 
                        className="btn-secondary" 
                        onClick={async () => {
                          const { ipcRenderer } = window.require('electron');
                          const path = await ipcRenderer.invoke('select-folder', settings.default_scan_dir || null);
                          if (path) setSettings({ ...settings, default_scan_dir: path });
                        }}
                      >
                        {T('settings.general.browse')}
                      </button>
                    </div>
                  </div>

                  <div className="form-group split">
                    <div className="form-group-info">
                      <label>{T('settings.general.meta_lang_label')}</label>
                      <div className="input-hint">{T('settings.general.meta_lang_hint')}</div>
                    </div>
                    <div className="form-group-input" style={{ flexDirection: 'row', gap: '15px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', fontWeight: 600 }}>{T('settings.general.primary')}</div>
                        <CustomSelect 
                          value={settings.primary_metadata_language || 'en'} 
                          onChange={val => {
                            const updates = { ...settings, primary_metadata_language: val };
                            if (settings.fallback_metadata_language === val) updates.fallback_metadata_language = 'none';
                            setSettings(updates);
                          }}
                          options={METADATA_LANGUAGES}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '12px', color: '#888', marginBottom: '5px', display: 'block' }}>Fallback</label>
                        <CustomSelect 
                          value={settings.fallback_metadata_language || 'none'} 
                          onChange={val => setSettings({ ...settings, fallback_metadata_language: val })}
                          options={[
                            { value: 'none', label: 'None (Disable)' },
                            ...METADATA_LANGUAGES.filter(l => l.value !== (settings.primary_metadata_language || 'en'))
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-group split">
                    <div className="form-group-info">
                      <label>Minimum Video Size (MB)</label>
                      <div className="input-hint">Files smaller than this will be ignored during the scan (filters out samples/extras).</div>
                    </div>
                    <div className="form-group-input">
                      <input
                        type="number"
                        className="form-input"
                        value={settings.min_video_size_mb || 500}
                        onChange={e => setSettings({ ...settings, min_video_size_mb: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'naming' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>Naming Templates & Styles</h3>
                    <p className="settings-desc">Define how your files and folders should be named and structured.</p>
                  </div>

                  <div className="section-label">GLOBAL FILENAME STYLING</div>
                  <div className="form-group split" style={{ marginBottom: '30px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Filename Casing</label>
                      <CustomSelect 
                        value={settings.naming_filename_casing || 'title'} 
                        onChange={val => setSettings({ ...settings, naming_filename_casing: val })}
                        options={CASING_OPTIONS}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Word Separator</label>
                      <CustomSelect 
                        value={settings.naming_word_separator || 'space'} 
                        onChange={val => setSettings({ ...settings, naming_word_separator: val })}
                        options={SEPARATOR_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className="section-label">MOVIE NAMING TEMPLATE</div>
                  <div className="form-group">
                    <div className="form-group-info" style={{ marginBottom: '10px' }}>
                      <label>Movie Template</label>
                    </div>
                    <div className="form-group-input" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={settings.naming_movie_template || ''}
                        onChange={e => setSettings({ ...settings, naming_movie_template: e.target.value })}
                        style={{ paddingRight: '40px' }}
                      />
                      <button 
                        className="template-btn" 
                        title="Insert Variable"
                        onClick={() => setActiveVarMenu(activeVarMenu === 'movie' ? null : 'movie')}
                      >
                        {"{}"}
                      </button>
                      
                      {activeVarMenu === 'movie' && (
                        <div className="variable-dropdown">
                          {MOVIE_VARS.map(v => (
                            <div key={v} className="var-item" onClick={() => insertVariable('movie', v)}>{"{{"}{v}{"}}"}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="section-label" style={{ marginTop: '30px' }}>TV EPISODE NAMING TEMPLATE</div>
                  <div className="form-group">
                    <div className="form-group-info" style={{ marginBottom: '10px' }}>
                      <label>Episode Template</label>
                    </div>
                    <div className="form-group-input" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="form-input"
                        value={settings.naming_episode_template || ''}
                        onChange={e => setSettings({ ...settings, naming_episode_template: e.target.value })}
                        style={{ paddingRight: '40px' }}
                      />
                      <button 
                        className="template-btn" 
                        title="Insert Variable"
                        onClick={() => setActiveVarMenu(activeVarMenu === 'tv' ? null : 'tv')}
                      >
                        {"{}"}
                      </button>

                      {activeVarMenu === 'tv' && (
                        <div className="variable-dropdown">
                          {TV_VARS.map(v => (
                            <div key={v} className="var-item" onClick={() => insertVariable('tv', v)}>{"{{"}{v}{"}}"}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="section-label" style={{ marginTop: '30px' }}>MULTI-PART FORMATTING</div>
                  <div className="form-group split">
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Part Keyword</label>
                      <CustomSelect 
                        value={settings.naming_part_keyword || 'Part'} 
                        onChange={val => setSettings({ ...settings, naming_part_keyword: val })}
                        options={PART_OPTIONS}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Numbering Style</label>
                      <CustomSelect 
                        value={settings.naming_numbering_style || '1, 2, 3..'} 
                        onChange={val => setSettings({ ...settings, naming_numbering_style: val })}
                        options={NUMBERING_OPTIONS}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Inner Separator</label>
                      <CustomSelect 
                        value={settings.naming_inner_separator || 'space'} 
                        onChange={val => setSettings({ ...settings, naming_inner_separator: val })}
                        options={SEPARATOR_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className="section-label" style={{ marginTop: '30px' }}>CUSTOM GLOBAL VARIABLE</div>
                  <div className="form-group">
                    <div className="form-group-info" style={{ marginBottom: '10px' }}>
                      <label>Custom Tag Value ({"{{Custom}}"})</label>
                    </div>
                    <div className="form-group-input">
                      <input
                        type="text"
                        className="form-input"
                        value={settings.naming_custom_tag || 'default'}
                        onChange={e => setSettings({ ...settings, naming_custom_tag: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === 'folders' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>Directory Organization</h3>
                    <p className="settings-desc">Manage how and where RENDA moves your processed media files.</p>
                  </div>

                  <div className="form-group">
                    <Switch 
                      checked={settings.folder_organization_enabled}
                      onChange={val => setSettings({ ...settings, folder_organization_enabled: val })}
                      label="Enable Folder Organization"
                    />
                  </div>

                  <div style={{ opacity: settings.folder_organization_enabled ? 1 : 0.4, pointerEvents: settings.folder_organization_enabled ? 'all' : 'none' }}>
                    <div className="section-label">CORE LOGIC</div>
                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_move_to_library}
                        onChange={val => setSettings({ ...settings, folder_move_to_library: val })}
                        label="Move files to a central library (Recommended)"
                      />
                    </div>

                    <div className="form-group">
                      <label>Library Root Path</label>
                      <div className="form-group-input" style={{ flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="form-input"
                          style={{ flex: 1 }}
                          value={settings.folder_library_path || ''}
                          onChange={e => setSettings({ ...settings, folder_library_path: e.target.value })}
                          placeholder="e.g. E:/media"
                        />
                        <button 
                          className="btn-secondary" 
                          onClick={async () => {
                            const { ipcRenderer } = window.require('electron');
                            const path = await ipcRenderer.invoke('select-folder', settings.folder_library_path || null);
                            if (path) setSettings({ ...settings, folder_library_path: path });
                          }}
                        >
                          Browse
                        </button>
                      </div>
                    </div>

                    <div className="section-label" style={{ marginTop: '30px' }}>AUTOMATIC SORTING</div>
                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_sort_by_type}
                        onChange={val => setSettings({ ...settings, folder_sort_by_type: val })}
                        label="Automatically sort by type (Movies / TV Shows subfolders)"
                      />
                    </div>

                    <div className="form-group split">
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Movies Subfolder</label>
                        <input
                          type="text"
                          className="form-input"
                          value={settings.folder_movies_name || ''}
                          onChange={e => setSettings({ ...settings, folder_movies_name: e.target.value })}
                          disabled={!settings.folder_sort_by_type}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>TV Shows Subfolder</label>
                        <input
                          type="text"
                          className="form-input"
                          value={settings.folder_series_name || ''}
                          onChange={e => setSettings({ ...settings, folder_series_name: e.target.value })}
                          disabled={!settings.folder_sort_by_type}
                        />
                      </div>
                    </div>

                    <div className="section-label" style={{ marginTop: '40px' }}>FOLDER NAMING TEMPLATES</div>
                    <div className="input-hint" style={{ marginBottom: '20px' }}>
                      Click the {"{}"} button on the right side of a template field to browse and insert available variables.
                    </div>

                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_create_movie_subdir}
                        onChange={val => setSettings({ ...settings, folder_create_movie_subdir: val })}
                        label="Create subfolder for each Movie"
                      />
                      {settings.folder_create_movie_subdir && (
                        <div style={{ marginTop: '15px' }}>
                          <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Movie Folder Template</label>
                          <div className="form-group-input" style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={settings.folder_movie_template || ''}
                              onChange={e => setSettings({ ...settings, folder_movie_template: e.target.value })}
                              style={{ paddingRight: '40px' }}
                            />
                            <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_movie' ? null : 'f_movie')}>{"{}"}</button>
                            {activeVarMenu === 'f_movie' && (
                              <div className="variable-dropdown">
                                {MOVIE_VARS.map(v => (
                                  <div key={v} className="var-item" onClick={() => {
                                    const current = settings.folder_movie_template || '';
                                    setSettings({ ...settings, folder_movie_template: `${current}{{${v}}}` });
                                    setActiveVarMenu(null);
                                  }}>{"{{"}{v}{"}}"}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_create_collection_dir}
                        onChange={val => setSettings({ ...settings, folder_create_collection_dir: val })}
                        label="Create Collection (Box Set) Folder"
                      />
                      {settings.folder_create_collection_dir && (
                        <div style={{ marginTop: '15px' }}>
                          <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Collection Folder Template</label>
                          <div className="form-group-input" style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={settings.folder_collection_template || ''}
                              onChange={e => setSettings({ ...settings, folder_collection_template: e.target.value })}
                              style={{ paddingRight: '40px' }}
                            />
                            <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_coll' ? null : 'f_coll')}>{"{}"}</button>
                            {activeVarMenu === 'f_coll' && (
                              <div className="variable-dropdown">
                                <div className="var-item" onClick={() => { setSettings({ ...settings, folder_collection_template: (settings.folder_collection_template || '') + '{{Collection}}' }); setActiveVarMenu(null); }}>{"{{Collection}}"}</div>
                                <div className="var-item" onClick={() => { setSettings({ ...settings, folder_collection_template: (settings.folder_collection_template || '') + '{{Custom}}' }); setActiveVarMenu(null); }}>{"{{Custom}}"}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_create_show_dir}
                        onChange={val => setSettings({ ...settings, folder_create_show_dir: val })}
                        label="Create root folder for each Show"
                      />
                      {settings.folder_create_show_dir && (
                        <div style={{ marginTop: '15px' }}>
                          <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Show Folder Template</label>
                          <div className="form-group-input" style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={settings.folder_show_template || ''}
                              onChange={e => setSettings({ ...settings, folder_show_template: e.target.value })}
                              style={{ paddingRight: '40px' }}
                            />
                            <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_show' ? null : 'f_show')}>{"{}"}</button>
                            {activeVarMenu === 'f_show' && (
                              <div className="variable-dropdown">
                                {TV_VARS.map(v => (
                                  <div key={v} className="var-item" onClick={() => {
                                    const current = settings.folder_show_template || '';
                                    setSettings({ ...settings, folder_show_template: `${current}{{${v}}}` });
                                    setActiveVarMenu(null);
                                  }}>{"{{"}{v}{"}}"}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_create_season_dir}
                        onChange={val => setSettings({ ...settings, folder_create_season_dir: val })}
                        label="Create Season subfolders"
                      />
                      {settings.folder_create_season_dir && (
                        <div style={{ marginTop: '15px' }}>
                          <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Season Folder Template</label>
                          <div className="form-group-input" style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={settings.folder_season_template || ''}
                              onChange={e => setSettings({ ...settings, folder_season_template: e.target.value })}
                              style={{ paddingRight: '40px' }}
                            />
                            <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_season' ? null : 'f_season')}>{"{}"}</button>
                            {activeVarMenu === 'f_season' && (
                              <div className="variable-dropdown">
                                {['Season', 'SeasonAirYear', 'ShowTitle', 'Custom'].map(v => (
                                  <div key={v} className="var-item" onClick={() => {
                                    const current = settings.folder_season_template || '';
                                    setSettings({ ...settings, folder_season_template: `${current}{{${v}}}` });
                                    setActiveVarMenu(null);
                                  }}>{"{{"}{v}{"}}"}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_create_episode_dir}
                        onChange={val => setSettings({ ...settings, folder_create_episode_dir: val })}
                        label="Create Episode Folder"
                      />
                      {settings.folder_create_episode_dir && (
                        <div style={{ marginTop: '15px' }}>
                          <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Episode Folder Template</label>
                          <div className="form-group-input" style={{ position: 'relative' }}>
                            <input
                              type="text"
                              className="form-input"
                              value={settings.folder_episode_template || ''}
                              onChange={e => setSettings({ ...settings, folder_episode_template: e.target.value })}
                              style={{ paddingRight: '40px' }}
                            />
                            <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_ep' ? null : 'f_ep')}>{"{}"}</button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="section-label" style={{ marginTop: '40px' }}>POST-RENAME ACTIONS</div>
                    <div className="form-group">
                      <Switch 
                        checked={settings.folder_remove_empty}
                        onChange={val => setSettings({ ...settings, folder_remove_empty: val })}
                        label="Remove empty folders after moving files"
                      />
                    </div>
                  </div>
                </div>
              )}
              {settingsTab === 'extras' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>Extras Settings</h3>
                    <p className="settings-desc">Configure how RENDA handles non-video files like subtitles, audio tracks, and artwork.</p>
                  </div>

                  <div className="form-group">
                    <Switch 
                      checked={settings.extras_enabled}
                      onChange={val => setSettings({ ...settings, extras_enabled: val })}
                      label="Enable Extras Handling"
                    />
                  </div>

                  <div style={{ opacity: settings.extras_enabled ? 1 : 0.4, pointerEvents: settings.extras_enabled ? 'all' : 'none' }}>
                    <div className="section-label">MONITORED EXTENSIONS</div>
                    <div className="extensions-box" style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                      <div className="ext-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ width: '120px', fontSize: '13px', fontWeight: '600' }}>Subtitles:</div>
                        <input className="form-input" style={{ flex: 1, fontSize: '12px' }} value={settings.extras_sub_exts || ''} onChange={e => setSettings({ ...settings, extras_sub_exts: e.target.value })} />
                      </div>
                      <div className="ext-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ width: '120px', fontSize: '13px', fontWeight: '600' }}>Audio Tracks:</div>
                        <input className="form-input" style={{ flex: 1, fontSize: '12px' }} value={settings.extras_audio_exts || ''} onChange={e => setSettings({ ...settings, extras_audio_exts: e.target.value })} />
                      </div>
                      <div className="ext-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <div style={{ width: '120px', fontSize: '13px', fontWeight: '600' }}>Images:</div>
                        <input className="form-input" style={{ flex: 1, fontSize: '12px' }} value={settings.extras_img_exts || ''} onChange={e => setSettings({ ...settings, extras_img_exts: e.target.value })} />
                      </div>
                      <div className="ext-row" style={{ display: 'flex', alignItems: 'center' }}>
                        <div style={{ width: '120px', fontSize: '13px', fontWeight: '600' }}>Metadata / NFO:</div>
                        <input className="form-input" style={{ flex: 1, fontSize: '12px' }} value={settings.extras_meta_exts || ''} onChange={e => setSettings({ ...settings, extras_meta_exts: e.target.value })} />
                      </div>
                    </div>

                    <div className="section-label" style={{ marginTop: '30px' }}>EXTRAS HANDLING</div>
                    <div className="extras-table">
                      {[
                        { label: 'Video Clips', id: 'video' },
                        { label: 'Subtitles', id: 'sub' },
                        { label: 'Audio Tracks', id: 'audio' },
                        { label: 'Images / Posters', id: 'img' },
                        { label: 'Metadata / NFO', id: 'meta' }
                      ].map(type => (
                        <div key={type.id} className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '15px' }}>
                          <div style={{ width: '120px', fontWeight: '600', fontSize: '13px' }}>{type.label}</div>
                          <div style={{ width: '120px' }}>
                            <CustomSelect 
                              value={settings[`extras_${type.id}_action`] || 'rename'}
                              onChange={val => setSettings({ ...settings, [`extras_${type.id}_action`]: val })}
                              options={[{ value: 'rename', label: 'Rename' }, { value: 'delete', label: 'Delete' }, { value: 'ignore', label: 'Ignore' }]}
                            />
                          </div>
                          <div className="form-group-input" style={{ flex: 1, position: 'relative' }}>
                            <input 
                              className="form-input" 
                              value={settings[`extras_${type.id}_template`] || ''} 
                              onChange={e => setSettings({ ...settings, [`extras_${type.id}_template`]: e.target.value })}
                              disabled={settings[`extras_${type.id}_action`] !== 'rename'}
                              style={{ paddingRight: '40px' }}
                            />
                            <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === `e_${type.id}` ? null : `e_${type.id}`)}>{"{}"}</button>
                            {activeVarMenu === `e_${type.id}` && (
                              <div className="variable-dropdown">
                                {['ParentName', 'ExtraCategory', 'Language', 'Resolution', 'Custom'].map(v => (
                                  <div key={v} className="var-item" onClick={() => {
                                    const field = `extras_${type.id}_template`;
                                    setSettings({ ...settings, [field]: (settings[field] || '') + `{{${v}}}` });
                                    setActiveVarMenu(null);
                                  }}>{"{{"}{v}{"}}"}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="section-label" style={{ marginTop: '30px' }}>EXTRAS FOLDER PLACEMENT</div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ width: '120px', fontWeight: '600', fontSize: '13px' }}>Folder Mode:</div>
                      <div style={{ width: '250px' }}>
                        <CustomSelect 
                          value={settings.extras_folder_mode || 'subfolder'}
                          onChange={val => setSettings({ ...settings, extras_folder_mode: val })}
                          options={[
                            { value: 'subfolder', label: "Single 'Extras' folder" },
                            { value: 'flat', label: 'Place next to media' }
                          ]}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {settingsTab === 'api' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>API Configuration</h3>
                    <p className="settings-desc">Connect your library to the world's largest media databases for automatic posters, ratings, and details.</p>
                  </div>

                  <div className="privacy-notice">
                    <div className="privacy-icon">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 15V17M6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21ZM16 11V7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7V11H16Z" stroke="#0088ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="privacy-text">
                      <strong>{T('settings.api.privacy_title')}</strong> {T('settings.api.privacy_text')}
                    </div>
                  </div>

                  <div className="section-label" style={{ marginTop: '40px' }}>{T('settings.api.tmdb_label')}</div>
                  
                  <div className="form-group">
                    <label>{T('settings.api.tmdb_key_v3')}</label>
                    <div className="form-group-input">
                      <input
                        type="password"
                        className="form-input"
                        value={settings.tmdb_api_key || ''}
                        onChange={e => setSettings({ ...settings, tmdb_api_key: e.target.value })}
                        placeholder="e.g. f1055eab900ebbd..."
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>{T('settings.api.tmdb_token_v4')}</label>
                    <div className="form-group-input">
                      <input
                        type="password"
                        className="form-input"
                        value={settings.tmdb_bearer_token || ''}
                        onChange={e => setSettings({ ...settings, tmdb_bearer_token: e.target.value })}
                        placeholder="e.g. eyJhbGciOiJIUzI1NiJ9..."
                      />
                    </div>
                  </div>

                  <div className="setup-guide">
                    <h4>{T('settings.api.tmdb_guide_title')}</h4>
                    <ol>
                      <li>{T('settings.api.tmdb_guide_step1', { url: 'themoviedb.org' })}</li>
                      <li>{T('settings.api.tmdb_guide_step2')}</li>
                      <li>{T('settings.api.tmdb_guide_step3')}</li>
                      <li>{T('settings.api.tmdb_guide_step4')}</li>
                    </ol>
                  </div>

                  <div className="section-label" style={{ marginTop: '50px' }}>{T('settings.api.omdb_label')}</div>
                  
                  <div className="form-group">
                    <label>{T('settings.api.omdb_key')}</label>
                    <div className="form-group-input">
                      <input
                        type="password"
                        className="form-input"
                        value={settings.imdb_api_key || ''}
                        onChange={e => setSettings({ ...settings, imdb_api_key: e.target.value })}
                        placeholder="e.g. 1dabf98c"
                      />
                    </div>
                  </div>

                  <div className="setup-guide">
                    <h4>{T('settings.api.omdb_guide_title')}</h4>
                    <ol>
                      <li>{T('settings.api.omdb_guide_step1', { url: 'omdbapi.com/apikey.aspx' })}</li>
                      <li>{T('settings.api.omdb_guide_step2')}</li>
                      <li>{T('settings.api.omdb_guide_step3')}</li>
                      <li>{T('settings.api.omdb_guide_step4')}</li>
                    </ol>
                  </div>
                </div>
              )}

              {settingsTab === 'appearance' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>{T('settings.appearance.title')}</h3>
                    <p className="settings-desc">{T('settings.appearance.desc')}</p>
                  </div>

                  <div className="section-label">{T('settings.appearance.theme_section')}</div>
                  
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ width: '150px', fontWeight: '600' }}>{T('settings.appearance.theme_label')}</div>
                    <div style={{ width: '250px' }}>
                      <CustomSelect 
                        value={settings.ui_theme || 'dark_pro'}
                        onChange={val => setSettings({ ...settings, ui_theme: val })}
                        options={[
                          { value: 'dark_pro', label: T('settings.appearance.themes.dark') },
                          { value: 'light', label: T('settings.appearance.themes.light'), disabled: true },
                          { value: 'amoled', label: T('settings.appearance.themes.amoled'), disabled: true }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="section-label" style={{ marginTop: '50px' }}>{T('settings.appearance.interface_section')}</div>
                  <div className="info-text-dim" style={{ fontSize: '13px', color: '#666', fontStyle: 'italic' }}>
                    {T('settings.appearance.interface_desc')}
                  </div>
                </div>
              )}
              {settingsTab === 'advanced' && (
                <div className="settings-card">
                  <div className="settings-section-header">
                    <h3>{T('settings.advanced.title')}</h3>
                    <p className="settings-desc">{T('settings.advanced.desc')}</p>
                  </div>

                  <div className="form-group split danger-zone">
                    <div className="form-group-info">
                      <label style={{ color: '#ff3c3c' }}>{T('settings.advanced.wipe_label')}</label>
                      <div className="input-hint">{T('settings.advanced.wipe_hint')}</div>
                    </div>

                    <div className="form-group-input flex-end">
                      <button
                        className="btn-primary danger-btn"
                        onClick={wipeDatabase}
                      >
                        {T('settings.advanced.wipe_btn')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FloatingActionBar />

      {view === 'discovery' && (
        <div className="inspector-panel">
          <InspectorPanel selectedItem={selectedItem} fetchFullMetadata={fetchFullMetadata} T={T} />
        </div>
      )}

      <ConfirmModal />

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
        T={T}
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
