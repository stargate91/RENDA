import React, { useState } from 'react';
import { Monitor, Settings2, FolderTree, Plus, Info } from 'lucide-react';
import Switch from './Switch';
import CustomSelect from '../Forms/CustomSelect';

const ExtrasSettings = ({ settings, setSettings }) => {
  const [activeVarMenu, setActiveVarMenu] = useState(null);

  const insertVariable = (type, variable) => {
    const field = `extras_${type}_template`;
    const current = settings[field] || '';
    setSettings({ ...settings, [field]: `${current}{{${variable}}}` });
    setActiveVarMenu(null);
  };

  const extraTypes = [
    { label: 'Bonus Videos', id: 'video', vars: ['ParentName', 'SubCategory', 'ExtraCategory', 'Custom'] },
    { label: 'Subtitles', id: 'sub', vars: ['ParentName', 'SubCategory', 'ExtraCategory', 'Language', 'Custom'] },
    { label: 'Audio Tracks', id: 'audio', vars: ['ParentName', 'SubCategory', 'ExtraCategory', 'Language', 'Custom'] },
    { label: 'Images', id: 'img', vars: ['ParentName', 'SubCategory', 'ExtraCategory', 'Custom'] },
    { label: 'Metadatas', id: 'meta', vars: ['ParentName', 'Custom'] }
  ];

  return (
    <div className="settings-card">
      <div className="form-group" style={{ marginBottom: '30px' }}>
        <Switch 
          checked={settings.extras_enabled}
          onChange={val => setSettings({ ...settings, extras_enabled: val })}
          label="Enable Extras Handling"
        />
        <div className="input-hint" style={{ marginTop: '4px' }}>
          Automatically detect, rename and organize associated files like subtitles and artwork.
        </div>
      </div>

      <div style={{ opacity: settings.extras_enabled ? 1 : 0.4, pointerEvents: settings.extras_enabled ? 'all' : 'none', transition: 'all 0.3s ease' }}>
        <div className="section-label" style={{ marginTop: '0' }}><Monitor size={14} /> MONITORED EXTENSIONS</div>
        <div className="extensions-box" style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
          <div className="ext-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ width: '150px', fontSize: '13px', color: 'var(--text-dim)', fontWeight: '700' }}>Subtitles</div>
            <input className="form-input" style={{ flex: 1, height: '40px' }} value={settings.extras_sub_exts || ''} onChange={e => setSettings({ ...settings, extras_sub_exts: e.target.value })} />
          </div>
          <div className="ext-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ width: '150px', fontSize: '13px', color: 'var(--text-dim)', fontWeight: '700' }}>Audio Tracks</div>
            <input className="form-input" style={{ flex: 1, height: '40px' }} value={settings.extras_audio_exts || ''} onChange={e => setSettings({ ...settings, extras_audio_exts: e.target.value })} />
          </div>
          <div className="ext-row" style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
            <div style={{ width: '150px', fontSize: '13px', color: 'var(--text-dim)', fontWeight: '700' }}>Images</div>
            <input className="form-input" style={{ flex: 1, height: '40px' }} value={settings.extras_img_exts || ''} onChange={e => setSettings({ ...settings, extras_img_exts: e.target.value })} />
          </div>
          <div className="ext-row" style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ width: '150px', fontSize: '13px', color: 'var(--text-dim)', fontWeight: '700' }}>Metadatas</div>
            <input className="form-input" style={{ flex: 1, height: '40px' }} value={settings.extras_meta_exts || ''} onChange={e => setSettings({ ...settings, extras_meta_exts: e.target.value })} />
          </div>
        </div>

        <div className="section-label" style={{ marginTop: '40px' }}><Settings2 size={14} /> EXTRAS HANDLING</div>
        <div className="extras-table">
          {extraTypes.map(type => (
            <div key={type.id} className="form-group split" style={{ marginBottom: '20px', alignItems: 'center' }}>
              <div style={{ width: '150px', fontWeight: '800', fontSize: '13px', color: 'var(--text-main)' }}>{type.label}</div>
              <div style={{ width: '140px' }}>
                <CustomSelect 
                  value={settings[`extras_${type.id}_action`] || 'rename'}
                  onChange={val => setSettings({ ...settings, [`extras_${type.id}_action`]: val })}
                  options={[{ value: 'rename', label: 'Rename' }, { value: 'delete', label: 'Delete' }, { value: 'ignore', label: 'Ignore' }]}
                />
              </div>
              <div className="template-input-wrapper" style={{ flex: 1, position: 'relative' }}>
                <input 
                  className="form-input" 
                  value={settings[`extras_${type.id}_template`] || ''} 
                  onChange={e => setSettings({ ...settings, [`extras_${type.id}_template`]: e.target.value })}
                  disabled={settings[`extras_${type.id}_action`] !== 'rename'}
                  placeholder="{{ParentName}} - {{ExtraCategory}}"
                />
                <button className="template-btn" onClick={() => setActiveVarMenu(activeVarMenu === `e_${type.id}` ? null : `e_${type.id}`)}>
                  <Plus size={14} /> <span>Var</span>
                </button>
                {activeVarMenu === `e_${type.id}` && (
                  <div className="variable-dropdown">
                    <div className="dropdown-label">{type.label} Variables</div>
                    <div className="vars-grid">
                      {type.vars.map(v => (
                        <div key={v} className="var-item" onClick={() => insertVariable(type.id, v)}>{"{{"}{v}{"}}"}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="section-label" style={{ marginTop: '40px' }}><FolderTree size={14} /> EXTRAS FOLDER PLACEMENT</div>
        <div className="form-group split">
          <div className="form-group-info">
            <label>Folder Organization Mode</label>
            <div className="input-hint">Choose where to place associated extra files.</div>
          </div>
          <div className="form-group-input" style={{ justifyContent: 'flex-end', width: '250px' }}>
            <CustomSelect 
              value={settings.extras_folder_mode || 'subfolder'}
              onChange={val => setSettings({ ...settings, extras_folder_mode: val })}
              options={[
                { value: 'subfolder', label: "Single subfolder (e.g. 'Extras')" },
                { value: 'flat', label: 'Same folder as media' }
              ]}
            />
          </div>
        </div>

        {settings.extras_folder_mode === 'subfolder' && (
          <div className="form-group split" style={{ marginTop: '10px' }}>
            <div className="form-group-info">
              <label>Extras Folder Name</label>
              <div className="input-hint">The name of the directory where extras will be consolidated.</div>
            </div>
            <div className="form-group-input" style={{ width: '250px' }}>
              <input 
                type="text" 
                className="form-input" 
                value={settings.extras_subfolder_name || 'Extras'} 
                onChange={e => setSettings({ ...settings, extras_subfolder_name: e.target.value })}
                placeholder="e.g. Extras"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExtrasSettings;
