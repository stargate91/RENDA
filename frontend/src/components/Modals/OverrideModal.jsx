import React, { useState, useEffect } from 'react';
import { Settings, Globe, Hash, Film, Monitor, Volume2, Save, X, ChevronRight, Tag, ImageIcon, FileText, Layers } from 'lucide-react';
import { api } from '../../services/api';
import CustomSelect from '../Forms/CustomSelect';
import { METADATA_LANGUAGES, PART_OPTIONS, NUMBERING_OPTIONS } from '../../constants/settings';

const OverrideModal = ({ show, item, onClose, onSave, T }) => {
  const [updates, setUpdates] = useState({});
  const [saving, setSaving] = useState(false);
  const [parentOptions, setParentOptions] = useState([]);

  const editionOptions = [
    { value: 'none', label: 'None' },
    { value: 'theatrical', label: 'Theatrical' },
    { value: 'directors_cut', label: "Director's Cut" },
    { value: 'extended', label: 'Extended' },
    { value: 'unrated', label: 'Unrated' },
    { value: 'remastered', label: 'Remastered' },
    { value: 'special', label: 'Special Edition' },
    { value: 'ultimate', label: 'Ultimate' },
    { value: 'collectors', label: "Collector's" },
    { value: 'fan_edit', label: 'Fan Edit' }
  ];

  const sourceOptions = [
    { value: 'none', label: 'None' },
    { value: 'bluray', label: 'Blu-ray' },
    { value: 'web', label: 'WEB-DL' },
    { value: 'dvd', label: 'DVD' },
    { value: 'tv', label: 'TV' },
    { value: 'cam', label: 'CAM' }
  ];

  const audioTypeOptions = [
    { value: 'none', label: 'None' },
    { value: 'mono', label: 'Mono' },
    { value: 'stereo', label: 'Stereo' },
    { value: 'surround', label: 'Surround' },
    { value: 'dual_audio', label: 'Dual Audio' },
    { value: 'multi_audio', label: 'Multi Audio' }
  ];

  const mainTypeOptions = [
    { value: 'movie', label: 'Movie' },
    { value: 'episode', label: 'Episode' },
    { value: 'bonus', label: 'Bonus Video' }
  ];

  const subtypeOptionsMap = {
    video: [
      { value: 'trailer', label: 'Trailer' },
      { value: 'behind_the_scenes', label: 'Behind the Scenes' },
      { value: 'deleted_scenes', label: 'Deleted Scenes' },
      { value: 'featurette', label: 'Featurette' },
      { value: 'interview', label: 'Interview' },
      { value: 'short', label: 'Short Film' },
      { value: 'sample', label: 'Sample' },
      { value: 'other', label: 'Other' }
    ],
    audio: [
      { value: 'commentary', label: 'Commentary' },
      { value: 'isolated_score', label: 'Isolated Score' },
      { value: 'original_audio', label: 'Original Audio' },
      { value: 'other', label: 'Other' }
    ],
    subtitle: [
      { value: 'forced', label: 'Forced' },
      { value: 'full', label: 'Full' },
      { value: 'sdh', label: 'SDH' },
      { value: 'commentary', label: 'Commentary' },
      { value: 'other', label: 'Other' }
    ],
    image: [
      { value: 'poster', label: 'Poster' },
      { value: 'fanart', label: 'Fanart' },
      { value: 'banner', label: 'Banner' },
      { value: 'clearart', label: 'Clear Art' },
      { value: 'disc', label: 'Disc Art' },
      { value: 'thumb', label: 'Thumbnail' },
      { value: 'other', label: 'Other' }
    ]
  };

  useEffect(() => {
    const fetchParents = async () => {
      try {
        const response = await api.getDiscoveryItems();
        const movieItems = response.movies || [];
        const seriesItems = response.series || [];
        const all = [...movieItems, ...seriesItems];
        setParentOptions(all.map(i => ({
          value: i.id,
          label: i.filename || `${i.type === 'movie' ? 'Movie' : 'Series'}: ${i.tmdb_id || 'Unresolved'}`
        })));
      } catch (e) {
        console.error("Failed to fetch parent options", e);
      }
    };
    if (show) fetchParents();
  }, [show]);

  useEffect(() => {
    if (show && item) {
      // Determine if it's a main media file (movie or episode) or an extra
      const isActuallyMain = (item.type === 'movie' || item.type === 'episode' || (item.category === 'video' && !item.subtype));
      
      if (isActuallyMain) {
        setUpdates({
          item_type: item.type || 'movie',
          target_language: item.target_language || 'en',
          edition: item.edition || 'none',
          source: item.source || 'none',
          audio_type: item.audio_type || 'none',
          season: item.season || '',
          episode: item.episode || '',
          part: item.part || '',
          part_type: item.part_type || 'Part',
          part_style: item.part_style || 'arabic',
          main_type: item.type || 'movie'
        });
      } else {
        setUpdates({
          subtype: item.subtype || 'other',
          language: item.language || '',
          parent_id: item.parent_id || '',
          main_type: 'bonus'
        });
      }
    }
  }, [show, item]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const isActuallyMain = (item.type === 'movie' || item.type === 'episode' || (item.category === 'video' && !item.subtype));
      const type = (isActuallyMain && updates.main_type !== 'bonus') ? 'media' : 'extra';
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

  const isMainMedia = (item.type === 'movie' || item.type === 'episode' || (item.category === 'video' && !item.subtype));
  const category = (item.type === 'movie' || item.type === 'episode') ? 'video' : (item.category || 'other');
  const currentSubtypeOptions = subtypeOptionsMap[category] || [{ value: 'other', label: 'Other' }];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container override-modal premium" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="title-icon-wrapper">
              <Settings className="modal-icon" size={24} />
            </div>
            <div>
              <h2>{T('modal.override.title')}</h2>
              <p className="modal-subtitle">Configure specific parameters for {category}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="override-form-layout">
            <div className="editing-status-card">
              <div className="status-header">
                {category === 'audio' && <Volume2 size={14} />}
                {category === 'subtitle' && <FileText size={14} />}
                {category === 'image' && <ImageIcon size={14} />}
                {category === 'video' && <Film size={14} />}
                {category === 'metadata' && <Settings size={14} />}
                <span>Currently Editing: {category.toUpperCase()}</span>
              </div>
              <div className="filename-display">{item.filename}</div>
            </div>

            <div className="override-sections-stack">
              {isMainMedia && updates.item_type !== 'bonus' ? (
                <>
                  <div className="override-section-card">
                    <div className="section-header">
                      <Globe size={16} />
                      <h3>Core Classification</h3>
                    </div>
                    <div className="section-content grid-2">
                      <div className="field-group">
                        <label>Main Type</label>
                        <CustomSelect 
                          value={updates.item_type} 
                          options={mainTypeOptions} 
                          onChange={val => setUpdates({...updates, item_type: val})} 
                        />
                      </div>
                      <div className="field-group">
                        <label>Target Language</label>
                        <CustomSelect 
                          value={updates.target_language} 
                          options={METADATA_LANGUAGES} 
                          onChange={val => setUpdates({...updates, target_language: val})} 
                          searchable={true}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="override-section-card">
                    <div className="section-header">
                      <Monitor size={16} />
                      <h3>Technical Metadata</h3>
                    </div>
                    <div className="section-content grid-3">
                      <div className="field-group">
                        <label>Audio Type</label>
                        <CustomSelect value={updates.audio_type} options={audioTypeOptions} onChange={val => setUpdates({...updates, audio_type: val})} />
                      </div>
                      {updates.item_type === 'movie' && (
                        <>
                          <div className="field-group">
                            <label>Edition</label>
                            <CustomSelect value={updates.edition} options={editionOptions} onChange={val => setUpdates({...updates, edition: val})} />
                          </div>
                          <div className="field-group">
                            <label>Source</label>
                            <CustomSelect value={updates.source} options={sourceOptions} onChange={val => setUpdates({...updates, source: val})} />
                          </div>
                        </>
                      )}
                      {updates.item_type === 'episode' && (
                        <>
                          <div className="field-group">
                            <label>Season</label>
                            <input type="number" className="form-input" value={updates.season} onChange={e => setUpdates({...updates, season: e.target.value})} />
                          </div>
                          <div className="field-group">
                            <label>Episode</label>
                            <input type="number" className="form-input" value={updates.episode} onChange={e => setUpdates({...updates, episode: e.target.value})} />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="override-section-card">
                    <div className="section-header">
                      <Layers size={16} />
                      <h3>Multi-part Settings</h3>
                    </div>
                    <div className="section-content grid-3">
                      <div className="field-group">
                        <label>Part Keyword</label>
                        <CustomSelect 
                          value={updates.part_type} 
                          options={PART_OPTIONS} 
                          onChange={val => setUpdates({...updates, part_type: val})} 
                        />
                      </div>
                      <div className="field-group">
                        <label>Numbering Style</label>
                        <CustomSelect 
                          value={updates.part_style} 
                          options={NUMBERING_OPTIONS} 
                          onChange={val => setUpdates({...updates, part_style: val})} 
                        />
                      </div>
                      <div className="field-group">
                        <label>Part Number</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={updates.part} 
                          onChange={e => setUpdates({...updates, part: e.target.value})} 
                          placeholder="e.g. 1"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* EXTRA FILE / BONUS VIDEO LOGIC */}
                  {category === 'video' && (
                    <div className="override-section-card">
                      <div className="section-header">
                        <Monitor size={16} />
                        <h3>Classification</h3>
                      </div>
                      <div className="section-content">
                        <div className="field-group">
                          <label>Main Type</label>
                          <CustomSelect value={updates.item_type || updates.main_type} options={mainTypeOptions} onChange={val => setUpdates({...updates, item_type: val, main_type: val})} />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="override-section-card">
                    <div className="section-header">
                      <Tag size={16} />
                      <h3>Properties</h3>
                    </div>
                    <div className="section-content grid-2">
                      <div className="field-group">
                        <label>Sub Type</label>
                        <CustomSelect value={updates.subtype} options={subtypeOptionsMap.video} onChange={val => setUpdates({...updates, subtype: val})} />
                      </div>
                      {(category === 'audio' || category === 'subtitle') && updates.main_type !== 'bonus' && (
                        <div className="field-group">
                          <label>Language</label>
                          <CustomSelect 
                            value={updates.language} 
                            options={METADATA_LANGUAGES} 
                            onChange={val => setUpdates({...updates, language: val})} 
                            searchable={true}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="override-section-card">
                    <div className="section-header">
                      <ChevronRight size={16} />
                      <h3>Parent Association</h3>
                    </div>
                    <div className="section-content">
                      <div className="field-group">
                        <label>Parent Video</label>
                        <CustomSelect 
                          value={updates.parent_id} 
                          options={[{value: '', label: 'No Parent'}, ...parentOptions]} 
                          onChange={val => setUpdates({...updates, parent_id: val})} 
                          searchable={true}
                        />
                      </div>
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
