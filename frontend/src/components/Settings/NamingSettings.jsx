import React, { useState } from 'react';
import { Plus, Tag, Film, Monitor, Hash, CaseSensitive, Type } from 'lucide-react';
import CustomSelect from '../Forms/CustomSelect';
import { CASING_OPTIONS, SEPARATOR_OPTIONS, MOVIE_VARS, TV_VARS, PART_OPTIONS, NUMBERING_OPTIONS } from '../../constants/settings';

const NamingSettings = ({ settings, setSettings, T }) => {
  const [activeVarMenu, setActiveVarMenu] = useState(null);

  const insertVariable = (type, variable) => {
    const field = type === 'movie' ? 'naming_movie_template' : 'naming_episode_template';
    const current = settings[field] || '';
    setSettings({ ...settings, [field]: `${current}{{${variable}}}` });
    setActiveVarMenu(null);
  };

  return (
    <div className="settings-card">
      <div className="section-label" style={{ marginTop: 0 }}><CaseSensitive size={14} /> GLOBAL FILENAME STYLING</div>
      <div className="form-group split">
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

      <div className="section-label" style={{ marginTop: '40px' }}><Film size={14} /> MOVIE NAMING TEMPLATE</div>
      <div className="form-group">
        <div className="form-group-input" style={{ position: 'relative', maxWidth: '100%' }}>
          <div className="template-input-wrapper">
            <input
              type="text"
              className="form-input"
              value={settings.naming_movie_template || ''}
              onChange={e => setSettings({ ...settings, naming_movie_template: e.target.value })}
              placeholder="{{Title}} ({{Year}})"
            />
            <button 
              className="template-btn" 
              title="Insert Variable"
              onClick={() => setActiveVarMenu(activeVarMenu === 'movie' ? null : 'movie')}
            >
              <Plus size={16} />
              <span>Var</span>
            </button>
          </div>
          
          {activeVarMenu === 'movie' && (
            <div className="variable-dropdown">
              <div className="dropdown-label">Available Movie Variables</div>
              <div className="vars-grid">
                {MOVIE_VARS.map(v => (
                  <div key={v} className="var-item" onClick={() => insertVariable('movie', v)}>{"{{"}{v}{"}}"}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section-label" style={{ marginTop: '40px' }}><Monitor size={14} /> TV EPISODE NAMING TEMPLATE</div>
      <div className="form-group">
        <div className="form-group-input" style={{ position: 'relative', maxWidth: '100%' }}>
          <div className="template-input-wrapper">
            <input
              type="text"
              className="form-input"
              value={settings.naming_episode_template || ''}
              onChange={e => setSettings({ ...settings, naming_episode_template: e.target.value })}
              placeholder="{{ShowTitle}} - S{{Season}}E{{Episode}}"
            />
            <button 
              className="template-btn" 
              title="Insert Variable"
              onClick={() => setActiveVarMenu(activeVarMenu === 'tv' ? null : 'tv')}
            >
              <Plus size={16} />
              <span>Var</span>
            </button>
          </div>

          {activeVarMenu === 'tv' && (
            <div className="variable-dropdown">
              <div className="dropdown-label">Available Episode Variables</div>
              <div className="vars-grid">
                {TV_VARS.map(v => (
                  <div key={v} className="var-item" onClick={() => insertVariable('tv', v)}>{"{{"}{v}{"}}"}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="section-label" style={{ marginTop: '40px' }}><Hash size={14} /> MULTI-PART FORMATTING</div>
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

      <div className="section-label" style={{ marginTop: '40px' }}><Tag size={14} /> CUSTOM GLOBAL VARIABLE</div>
      <div className="form-group split">
        <div className="form-group-info">
          <label>Custom Tag Value ({"{{Custom}}"})</label>
          <div className="input-hint">This value will be inserted wherever you use the {"{{Custom}}"} tag in your templates.</div>
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
  );
};

export default NamingSettings;
