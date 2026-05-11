import React, { useState } from 'react';
import { Settings, Filter, Folder, Trash2, Plus, Layout, Library, Layers } from 'lucide-react';
import Switch from './Switch';
import { MOVIE_VARS, TV_VARS, SERIES_VARS, SEASON_VARS } from '../../constants/settings';

const FolderSettings = ({ settings, setSettings, T }) => {
  const [activeVarMenu, setActiveVarMenu] = useState(null);

  const insertVariable = (field, variable) => {
    const current = settings[field] || '';
    setSettings({ ...settings, [field]: `${current}{{${variable}}}` });
    setActiveVarMenu(null);
  };

  return (
    <div className="settings-card">
      <div className="form-group" style={{ marginBottom: '30px' }}>
        <Switch 
          checked={settings.folder_organization_enabled}
          onChange={val => setSettings({ ...settings, folder_organization_enabled: val })}
          label="Enable Directory Organization & Sorting"
        />
        <div className="input-hint" style={{ marginLeft: '50px', marginTop: '4px' }}>
          When enabled, RENDA will automatically create directory structures and move your files based on your rules.
        </div>
      </div>

      <div style={{ opacity: settings.folder_organization_enabled ? 1 : 0.4, pointerEvents: settings.folder_organization_enabled ? 'all' : 'none', transition: 'all 0.3s ease' }}>
        <div className="section-label" style={{ marginTop: '0' }}><Settings size={14} /> CORE LOGIC</div>
        
        <div className="form-group split">
          <div className="form-group-info">
            <label>Central Library Mode</label>
            <div className="input-hint">Move processed files to a dedicated media library root.</div>
          </div>
          <div className="form-group-input" style={{ justifyContent: 'flex-end' }}>
            <Switch 
              checked={settings.folder_move_to_library}
              onChange={val => setSettings({ ...settings, folder_move_to_library: val })}
              label=""
            />
          </div>
        </div>

        {settings.folder_move_to_library && (
          <div className="form-group">
            <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Library Root Path</label>
            <div className="template-input-wrapper">
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
                style={{ height: '45px' }}
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
        )}

        <div className="section-label" style={{ marginTop: '40px' }}><Filter size={14} /> AUTOMATIC SORTING</div>
        <div className="form-group split">
          <div className="form-group-info">
            <label>Sort by Media Type</label>
            <div className="input-hint">Create separate root folders for Movies and TV Shows.</div>
          </div>
          <div className="form-group-input" style={{ justifyContent: 'flex-end' }}>
            <Switch 
              checked={settings.folder_sort_by_type}
              onChange={val => setSettings({ ...settings, folder_sort_by_type: val })}
              label=""
            />
          </div>
        </div>

        {settings.folder_sort_by_type && (
          <div className="form-group split" style={{ marginTop: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>Movies Root Name</label>
              <input
                type="text"
                className="form-input"
                value={settings.folder_movies_name || ''}
                onChange={e => setSettings({ ...settings, folder_movies_name: e.target.value })}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '13px', color: '#888', marginBottom: '8px', display: 'block' }}>TV Shows Root Name</label>
              <input
                type="text"
                className="form-input"
                value={settings.folder_series_name || ''}
                onChange={e => setSettings({ ...settings, folder_series_name: e.target.value })}
              />
            </div>
          </div>
        )}

        <div className="section-label" style={{ marginTop: '40px' }}><Folder size={14} /> FOLDER NAMING TEMPLATES</div>

        <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
          <div className="template-row">
            <Switch 
              checked={settings.folder_create_movie_subdir}
              onChange={val => setSettings({ ...settings, folder_create_movie_subdir: val })}
              label="Individual Movie Folders"
            />
            {settings.folder_create_movie_subdir && (
              <div className="template-input-wrapper" style={{ marginTop: '15px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings.folder_movie_template || ''}
                  onChange={e => setSettings({ ...settings, folder_movie_template: e.target.value })}
                  placeholder="{{Title}} ({{Year}})"
                />
                <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_movie' ? null : 'f_movie')}>
                   <Plus size={14} /> <span>Var</span>
                </button>
                {activeVarMenu === 'f_movie' && (
                  <div className="variable-dropdown">
                    <div className="dropdown-label">Movie Folder Variables</div>
                    <div className="vars-grid">
                      {MOVIE_VARS.map(v => (
                        <div key={v} className="var-item" onClick={() => insertVariable('folder_movie_template', v)}>{"{{"}{v}{"}}"}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="template-row" style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Switch 
              checked={settings.folder_create_collection_dir}
              onChange={val => setSettings({ ...settings, folder_create_collection_dir: val })}
              label="Group Movies into Collections"
            />
            {settings.folder_create_collection_dir && (
              <div className="template-input-wrapper" style={{ marginTop: '15px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings.folder_collection_template || ''}
                  onChange={e => setSettings({ ...settings, folder_collection_template: e.target.value })}
                  placeholder="{{Collection}}"
                />
                <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_coll' ? null : 'f_coll')}>
                   <Plus size={14} /> <span>Var</span>
                </button>
                {activeVarMenu === 'f_coll' && (
                  <div className="variable-dropdown" style={{ width: '250px' }}>
                    <div className="dropdown-label">Collection Variables</div>
                    <div className="var-item" onClick={() => insertVariable('folder_collection_template', 'Collection')}>{"{{Collection}}"}</div>
                    <div className="var-item" onClick={() => insertVariable('folder_collection_template', 'Custom')}>{"{{Custom}}"}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', marginTop: '20px' }}>
          <div className="template-row">
            <Switch 
              checked={settings.folder_create_show_dir}
              onChange={val => setSettings({ ...settings, folder_create_show_dir: val })}
              label="Individual Show Folders"
            />
            {settings.folder_create_show_dir && (
              <div className="template-input-wrapper" style={{ marginTop: '15px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings.folder_show_template || ''}
                  onChange={e => setSettings({ ...settings, folder_show_template: e.target.value })}
                  placeholder="{{SeriesTitle}}"
                />
                <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_show' ? null : 'f_show')}>
                   <Plus size={14} /> <span>Var</span>
                </button>
                {activeVarMenu === 'f_show' && (
                  <div className="variable-dropdown">
                    <div className="dropdown-label">Show Folder Variables</div>
                    <div className="vars-grid">
                      {SERIES_VARS.map(v => (
                        <div key={v} className="var-item" onClick={() => insertVariable('folder_show_template', v)}>{"{{"}{v}{"}}"}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="template-row" style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Switch 
              checked={settings.folder_create_season_dir}
              onChange={val => setSettings({ ...settings, folder_create_season_dir: val })}
              label="Organize into Season subfolders"
            />
            {settings.folder_create_season_dir && (
              <div className="template-input-wrapper" style={{ marginTop: '15px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings.folder_season_template || ''}
                  onChange={e => setSettings({ ...settings, folder_season_template: e.target.value })}
                  placeholder="Season {{SeasonNumber}}"
                />
                <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_season' ? null : 'f_season')}>
                   <Plus size={14} /> <span>Var</span>
                </button>
                {activeVarMenu === 'f_season' && (
                  <div className="variable-dropdown">
                    <div className="dropdown-label">Season Folder Variables</div>
                    <div className="vars-grid">
                      {SEASON_VARS.map(v => (
                        <div key={v} className="var-item" onClick={() => insertVariable('folder_season_template', v)}>{"{{"}{v}{"}}"}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="template-row" style={{ marginTop: '25px', paddingTop: '25px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Switch 
              checked={settings.folder_create_episode_dir}
              onChange={val => setSettings({ ...settings, folder_create_episode_dir: val })}
              label="Create Individual Episode Folders"
            />
            {settings.folder_create_episode_dir && (
              <div className="template-input-wrapper" style={{ marginTop: '15px', position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  value={settings.folder_episode_template || ''}
                  onChange={e => setSettings({ ...settings, folder_episode_template: e.target.value })}
                  placeholder="{{SeriesTitle}} - S{{SeasonNumber}}E{{EpisodeNumber}}"
                />
                <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === 'f_ep' ? null : 'f_ep')}>
                   <Plus size={14} /> <span>Var</span>
                </button>
                {activeVarMenu === 'f_ep' && (
                  <div className="variable-dropdown">
                    <div className="dropdown-label">Episode Folder Variables</div>
                    <div className="vars-grid">
                      {TV_VARS.map(v => (
                        <div key={v} className="var-item" onClick={() => insertVariable('folder_episode_template', v)}>{"{{"}{v}{"}}"}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="section-label" style={{ marginTop: '40px' }}><Trash2 size={14} /> POST-RENAME ACTIONS</div>
        <div className="form-group split">
          <div className="form-group-info">
            <label>Cleanup Empty Folders</label>
            <div className="input-hint">Remove source directories if they become empty after processing.</div>
          </div>
          <div className="form-group-input" style={{ justifyContent: 'flex-end' }}>
            <Switch 
              checked={settings.folder_remove_empty}
              onChange={val => setSettings({ ...settings, folder_remove_empty: val })}
              label=""
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FolderSettings;
