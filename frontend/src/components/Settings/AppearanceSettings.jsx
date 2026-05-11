import React from 'react';
import { Palette, Monitor, Sun, Moon, Eye } from 'lucide-react';
import CustomSelect from '../Forms/CustomSelect';

const AppearanceSettings = ({ settings, setSettings, T }) => {
  return (
    <div className="settings-card">
      <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
        <div className="section-label" style={{ marginTop: '0' }}><Palette size={14} /> {T('settings.appearance.theme_section')}</div>
        
        <div className="form-group split">
          <div className="form-group-info">
            <label>{T('settings.appearance.theme_label')}</label>
            <div className="input-hint">Select the visual identity of RENDA.</div>
          </div>
          <div className="form-group-input" style={{ width: '250px' }}>
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
      </div>

      <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', marginTop: '30px' }}>
        <div className="section-label" style={{ marginTop: '0' }}><Monitor size={14} /> {T('settings.appearance.interface_section')}</div>
        <div className="info-notice" style={{ display: 'flex', gap: '15px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
          <Eye size={18} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.5' }}>
            {T('settings.appearance.interface_desc')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
