import React, { useState, useEffect } from 'react';
import { Settings, Globe, Hash, Film, Monitor, Volume2, Save, X, ChevronRight, Tag } from 'lucide-react';
import { api } from '../../services/api';
import CustomSelect from '../Forms/CustomSelect';

const OverrideModal = ({ show, item, onClose, onSave, T }) => {
  const [updates, setUpdates] = useState({});
  const [saving, setSaving] = useState(false);

  const editionOptions = [
    { value: 'none', label: 'None' },
    { value: 'theatrical', label: 'Theatrical' },
    { value: 'directors_cut', label: "Director's Cut" },
    { value: 'extended', label: 'Extended' },
    { value: 'unrated', label: 'Unrated' },
    { value: 'remastered', label: 'Remastered' }
  ];

  const sourceOptions = [
    { value: 'none', label: 'None' },
    { value: 'bluray', label: 'Blu-ray' },
    { value: 'web', label: 'WEB-DL' },
    { value: 'dvd', label: 'DVD' },
    { value: 'tv', label: 'TV' }
  ];

  const subtypeOptions = [
    { value: 'trailer', label: 'Trailer' },
    { value: 'sample', label: 'Sample' },
    { value: 'behind_the_scenes', label: 'Behind the Scenes' },
    { value: 'deleted_scenes', label: 'Deleted Scenes' },
    { value: 'featurette', label: 'Featurette' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (show && item) {
      if (item.category === 'video' || item.type === 'movie' || item.type === 'series' || item.type === 'episode') {
        setUpdates({
          target_language: item.target_language || '',
          edition: item.edition || 'none',
          source: item.source || 'none',
          audio_type: item.audio_type || 'none',
          season: item.season || '',
          episode: item.episode || ''
        });
      } else {
        // Extra
        setUpdates({
          subtype: item.subtype || 'other',
          language: item.language || ''
        });
      }
    }
  }, [show, item]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const type = (item.category === 'video' || item.type === 'movie' || item.type === 'series' || item.type === 'episode') ? 'media' : 'extra';
      await api.updateMedia(item.id, type, updates);
      onSave();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!show || !item) return null;

  const isMedia = (item.category === 'video' || item.type === 'movie' || item.type === 'series' || item.type === 'episode');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container override-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <Settings className="modal-icon" size={20} />
            <h2>{T('modal.override.title')}</h2>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="override-form">
            <div className="item-preview-mini">
              <div className="mini-label">Editing:</div>
              <div className="mini-val">{item.filename}</div>
            </div>

            <div className="form-sections-grid">
              {isMedia ? (
                <>
                  <div className="form-section">
                    <h3><Globe size={16} /> {T('modal.override.localization')}</h3>
                    <div className="field">
                      <label>Target Language (ISO)</label>
                      <input 
                        type="text" 
                        value={updates.target_language} 
                        onChange={e => setUpdates({...updates, target_language: e.target.value})} 
                        placeholder="e.g. en, hu, de"
                        className="form-input"
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3><Tag size={16} /> {T('modal.override.media_info')}</h3>
                    <div className="field">
                      <label>Edition</label>
                      <CustomSelect 
                        value={updates.edition} 
                        options={editionOptions} 
                        onChange={val => setUpdates({...updates, edition: val})} 
                      />
                    </div>
                    <div className="field">
                      <label>Source</label>
                      <CustomSelect 
                        value={updates.source} 
                        options={sourceOptions} 
                        onChange={val => setUpdates({...updates, source: val})} 
                      />
                    </div>
                  </div>

                  <div className="form-section">
                    <h3><Hash size={16} /> {T('modal.override.tv_params')}</h3>
                    <div className="field-row">
                      <div className="field">
                        <label>Season</label>
                        <input type="number" className="form-input" value={updates.season} onChange={e => setUpdates({...updates, season: e.target.value})} />
                      </div>
                      <div className="field">
                        <label>Episode</label>
                        <input type="number" className="form-input" value={updates.episode} onChange={e => setUpdates({...updates, episode: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-section">
                    <h3><Tag size={16} /> {T('modal.override.extra_info')}</h3>
                    <div className="field">
                      <label>Subtype</label>
                      <CustomSelect 
                        value={updates.subtype} 
                        options={subtypeOptions} 
                        onChange={val => setUpdates({...updates, subtype: val})} 
                      />
                    </div>
                    <div className="field">
                      <label>Language</label>
                      <input 
                        type="text" 
                        value={updates.language} 
                        onChange={e => setUpdates({...updates, language: e.target.value})} 
                        placeholder="e.g. en, hu"
                        className="form-input"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>{T('common.cancel')}</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <span className="spinner" /> : <Save size={18} />}
            {T('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverrideModal;
