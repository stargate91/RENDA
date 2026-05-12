import React from 'react';
import { User, Globe, Search, Library, HardDrive } from 'lucide-react';
import CustomSelect from '../Forms/CustomSelect';
import { METADATA_LANGUAGES } from '../../constants/settings';
import Switch from './Switch';

const GeneralSettings = ({ settings, setSettings, T, availableLocales }) => {
  return (
    <div className="settings-card">

      <div className="section-label" style={{ marginTop: '0' }}><User size={14} /> {T('settings.appearance.theme_section') || 'IDENTITY & LOCALIZATION'}</div>
      
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

      <div className="section-label" style={{ marginTop: '40px' }}><Search size={14} /> METADATA PREFERENCES</div>

      <div className="form-group split">
        <div className="form-group-info">
          <label>{T('settings.general.meta_lang_label')}</label>
          <div className="input-hint">{T('settings.general.meta_lang_hint')}</div>
        </div>
        <div className="form-group-input" style={{ display: 'flex', flexDirection: 'row', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: 600 }}>{T('settings.general.primary')}</div>
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
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', marginTop: '4px', fontWeight: 600 }}>Fallback</div>
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
          <label>Include Adult Content</label>
          <div className="input-hint">Allow adult/pornographic results in metadata searches.</div>
        </div>
        <div className="form-group-input">
          <Switch 
            checked={settings.include_adult || false} 
            onChange={val => setSettings({ ...settings, include_adult: val })}
          />
        </div>
      </div>

      <div className="section-label" style={{ marginTop: '40px' }}><HardDrive size={14} /> LIBRARY & SCANNING</div>

      <div className="form-group split">
        <div className="form-group-info">
          <label>{T('settings.general.scan_dir_label')}</label>
          <div className="input-hint">{T('settings.general.scan_dir_hint')}</div>
        </div>
        <div className="form-group-input" style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <input
              type="text"
              className="form-input"
              value={settings.default_scan_dir || ''}
              onChange={e => setSettings({ ...settings, default_scan_dir: e.target.value })}
              placeholder="e.g. E:/downloads_torrent"
            />
          </div>
          <button 
            className="btn-secondary" 
            style={{ height: '45px', marginBottom: '2px' }}
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
          <label>Minimum Video Size (MB)</label>
          <div className="input-hint">Files smaller than this will be ignored during the scan (filters out samples/extras).</div>
        </div>
        <div className="form-group-input">
          <input
            type="number"
            className="form-input"
            value={settings.min_video_size_mb || 300}
            onChange={e => setSettings({ ...settings, min_video_size_mb: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
