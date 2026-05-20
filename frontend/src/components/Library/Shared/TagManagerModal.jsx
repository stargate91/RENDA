import React, { useState, useEffect } from 'react';
import { Tag, X, Plus, Check } from 'lucide-react';
import { api } from '../../../services/api';
import { useAppContext } from '../../../context/AppContext';

export const TagsManagerView = ({ tags = [], searchQuery = '', navigateTo, onTagsChanged }) => {
  const { T, confirmAction } = useAppContext();
  const [expandedTag, setExpandedTag] = useState(null);
  const [globalTags, setGlobalTags] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('#a78bfa');

  const fetchGlobalTags = async () => {
    try {
      const res = await api.getTags();
      setGlobalTags(res || []);
    } catch (e) { 
      console.error(e); 
    }
  };

  useEffect(() => {
    fetchGlobalTags();
  }, []);

  const handleCreate = async () => {
    try {
      await api.createTag({ name: T('library.new_tag_prefix') + ' ' + Math.floor(Math.random() * 100), color: '#3b82f6' });
      fetchGlobalTags();
      if (onTagsChanged) onTagsChanged();
    } catch (e) { 
      alert(T('alerts.create_tag_failed')); 
    }
  };

  const handleUpdate = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.updateTag(id, { name: editName, color: editColor });
      setEditingId(null);
      fetchGlobalTags();
      if (onTagsChanged) onTagsChanged();
    } catch (e) { 
      alert(T('alerts.update_tag_failed')); 
    }
  };

  const handleDeleteClick = (id, e) => {
    if (e) e.stopPropagation();
    confirmAction(
      T('alerts.delete_tag_title'),
      T('alerts.delete_tag_msg'),
      async () => {
        try {
          await api.deleteTag(id);
          fetchGlobalTags();
          if (expandedTag && globalTags.find(t => t && t.id === id)?.name === expandedTag) {
            setExpandedTag(null);
          }
          if (onTagsChanged) onTagsChanged();
        } catch (err) { 
          alert(T('alerts.delete_tag_failed')); 
        }
      }
    );
  };

  const startEditing = (tagItem, e) => {
    e.stopPropagation();
    setEditingId(tagItem.id);
    setEditName(tagItem.name);
    setEditColor(tagItem.color || '#a78bfa');
  };

  try {
    // Strict Array checks to prevent runtime crashes (White/Black Screen of Death)
    const safeGlobalTags = Array.isArray(globalTags) ? globalTags.filter(t => t && typeof t === 'object') : [];
    const safeLocalTags = Array.isArray(tags) ? tags.filter(t => t && typeof t === 'object') : [];

    // Merge global tags with local usage data
    const mergedTags = safeGlobalTags.map(gt => {
      const local = safeLocalTags.find(t => t && (t.name || '') === (gt.name || '')) || { 
        total_count: 0, movies: [], series: [], adult: [], actors: [], directors: [] 
      };
      return { ...local, ...gt, color: gt.color || '#a78bfa' }; // fallback color injected here
    });

    const filteredTags = mergedTags.filter(tagItem =>
      tagItem && (tagItem.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '25px', animation: 'fadeIn 0.4s ease-out' }}>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button
            onClick={handleCreate}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
            }}
          >
            <Plus size={16} /> {T('library.create_tag')}
          </button>
        </div>

        {filteredTags.length === 0 ? (
          <div className="library-empty" style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
            height: '300px', color: 'var(--text-dim)' 
          }}>
            <Tag size={64} style={{ opacity: 0.1, marginBottom: '20px' }} />
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
              {T('library.no_tags_found')}
            </h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '14px', maxWidth: '300px', textAlign: 'center' }}>
              {searchQuery ? T('library.no_tags_matching', { query: searchQuery }) : T('library.no_tags_yet')}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {filteredTags.map(tagItem => {
              if (!tagItem) return null;
              const isExpanded = expandedTag === tagItem.name;
              const isEditingThis = editingId === tagItem.id;

              return (
                <div 
                  key={tagItem.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: isExpanded ? `1px solid ${tagItem.color}88` : '1px solid var(--border-card)',
                    borderRadius: '16px',
                    padding: '20px',
                    cursor: isEditingThis ? 'default' : 'pointer',
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    boxShadow: isExpanded ? `0 10px 30px ${tagItem.color}22` : 'none',
                    transform: isExpanded && !isEditingThis ? 'translateY(-4px)' : 'none',
                    position: 'relative',
                  }}
                  onClick={() => !isEditingThis && setExpandedTag(isExpanded ? null : tagItem.name)}
                  onMouseOver={e => {
                    if (!isExpanded && !isEditingThis) {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseOut={e => {
                    if (!isExpanded && !isEditingThis) {
                      e.currentTarget.style.borderColor = 'var(--border-card)';
                      e.currentTarget.style.transform = 'none';
                    }
                  }}
                >
                  
                  {/* Actions Top Right */}
                  {!isEditingThis && (
                    <div style={{ position: 'absolute', top: '15px', right: '15px', display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={(e) => startEditing(tagItem, e)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '5px' }}
                        title={T('library.edit_tag')}
                      >
                        ✎
                      </button>
                      <button 
                        onClick={(e) => handleDeleteClick(tagItem.id, e)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: '5px' }}
                        title={T('library.delete_tag')}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}

                  {isEditingThis ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }} onClick={e => e.stopPropagation()}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '5px', display: 'block' }}>{T('library.tag_name_label')}</label>
                        <input 
                          type="text" 
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                          style={{
                            width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dim)', marginBottom: '5px', display: 'block' }}>{T('library.color_label')}</label>
                        <input 
                          type="color" 
                          value={editColor}
                          onChange={e => setEditColor(e.target.value)}
                          style={{
                            width: '100%', height: '40px', background: 'none', border: 'none', cursor: 'pointer'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                        <button onClick={(e) => handleUpdate(tagItem.id, e)} style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                          {T('library.save')}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', padding: '8px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}>
                          {T('library.cancel')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: `linear-gradient(135deg, ${tagItem.color}33 0%, ${tagItem.color}11 100%)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: `1px solid ${tagItem.color}55`
                          }}>
                            <Tag size={16} color={tagItem.color} />
                          </div>
                          <span style={{ fontSize: '18px', fontWeight: '800', color: '#fff', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {tagItem.name}
                          </span>
                        </div>
                      </div>

                      <span style={{
                        fontSize: '11px', fontWeight: '800', color: '#fff',
                        background: `rgba(255, 255, 255, 0.05)`, border: `1px solid rgba(255, 255, 255, 0.1)`,
                        padding: '3px 8px', borderRadius: '20px', display: 'inline-block', marginBottom: '15px'
                      }}>
                        {tagItem.total_count === 1 ? T('library.tagged_item_singular') : T('library.tagged_item_plural', { count: tagItem.total_count })}
                      </span>

                      {/* Counts Breakdown pills */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px', color: 'var(--text-dim)' }}>
                        {tagItem.movies?.length > 0 && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>🎬 {tagItem.movies.length}</span>}
                        {tagItem.series?.length > 0 && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>📺 {tagItem.series.length}</span>}
                        {tagItem.adult?.length > 0 && <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>🔞 {tagItem.adult.length}</span>}
                        {((tagItem.actors?.length || 0) + (tagItem.directors?.length || 0)) > 0 && (
                          <span style={{ background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '8px' }}>
                            👥 {(tagItem.actors?.length || 0) + (tagItem.directors?.length || 0)}
                          </span>
                        )}
                      </div>

                      <div style={{ marginTop: '12px', fontSize: '11px', color: tagItem.color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isExpanded ? T('library.click_collapse') : T('library.click_show_tagged')}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Expanded tag list */}
        {expandedTag && (
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '25px',
            animation: 'slideDown 0.3s ease-out',
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Tag size={20} color="#a78bfa" /> {T('library.items_tagged_with', { tag: expandedTag })}
            </h3>

            {(() => {
              const tagObj = mergedTags.find(t => t && t.name === expandedTag);
              if (!tagObj) return null;

              const allTaggedItems = [
                ...(tagObj.movies || []).filter(m => m && typeof m === 'object').map(m => ({ ...m, category: 'Movie', folder: 'posters' })),
                ...(tagObj.series || []).filter(s => s && typeof s === 'object').map(s => ({ ...s, category: 'Series', folder: 'posters', isSeriesNode: true })),
                ...(tagObj.adult || []).filter(a => a && typeof a === 'object').map(a => ({ ...a, category: 'Adult', folder: 'posters' })),
                ...(tagObj.actors || []).filter(ac => ac && typeof ac === 'object').map(ac => ({ ...ac, category: 'Actor', folder: 'persons' })),
                ...(tagObj.directors || []).filter(d => d && typeof d === 'object').map(d => ({ ...d, category: 'Director', folder: 'persons' }))
              ];

              if (allTaggedItems.length === 0) {
                return <div style={{ color: 'var(--text-dim)' }}>{T('library.no_tagged_items_yet')}</div>;
              }

              return (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: '20px'
                }}>
                  {allTaggedItems.filter(item => item && item.id).map(item => (
                    <div 
                      key={`${item.category}_${item.id}`}
                      onClick={() => {
                        if (item.isSeriesNode) {
                          navigateTo('series', item.series_tmdb_id || item.tmdb_id);
                        } else if (item.category === 'Actor' || item.category === 'Director') {
                          navigateTo('person', item.id);
                        } else {
                          navigateTo('movie', item.id);
                        }
                      }}
                      style={{
                        background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                      }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <div style={{ aspectRatio: '2/3', position: 'relative', background: '#111' }}>
                        {item.poster_path ? (
                          <img 
                            src={`http://localhost:8000/media/images/${item.folder}${item.poster_path}`} 
                            alt={item.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444' }}>
                            🎬
                          </div>
                        )}
                        <span style={{
                          position: 'absolute', bottom: '5px', left: '5px', fontSize: '9px', fontWeight: '800',
                          color: '#fff', background: 'rgba(0,0,0,0.8)', padding: '2px 6px', borderRadius: '4px'
                        }}>
                          {item.category}
                        </span>
                      </div>
                      <div style={{ padding: '8px', fontSize: '12px', fontWeight: '700', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.title}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  } catch (err) {
    console.error("TagsManagerView render error:", err);
    return (
      <div style={{
        padding: '25px',
        color: '#ff4d4f',
        background: 'rgba(255, 77, 79, 0.05)',
        border: '1px solid rgba(255, 77, 79, 0.2)',
        borderRadius: '16px',
        fontFamily: 'monospace'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', fontWeight: '700' }}>Failed to render Tags Manager</h3>
        <p style={{ margin: '0 0 10px 0', fontWeight: '600' }}>{err.message}</p>
        <pre style={{
          fontSize: '11px',
          background: 'rgba(0, 0, 0, 0.3)',
          padding: '15px',
          borderRadius: '8px',
          overflow: 'auto',
          maxHeight: '300px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          color: '#ff7875'
        }}>{err.stack}</pre>
      </div>
    );
  }
};

export const BulkTagModal = ({ T, selectedItemIds = [], currentItems = [], onClose, onApply }) => {
  const [globalTags, setGlobalTags] = useState([]);
  const [tagStates, setTagStates] = useState({}); // tagId -> 0 (none), 1 (add), 2 (remove)
  const [newTagInput, setNewTagInput] = useState('');

  useEffect(() => {
    api.getTags().then(tags => {
      setGlobalTags(tags || []);
    });
  }, []);

  useEffect(() => {
    if (globalTags.length === 0 || selectedItemIds.length === 0) return;
    
    // Compute initial tag states based on selected items
    const selectedMedia = [];
    selectedItemIds.forEach(id => {
      if (typeof id === 'string' && id.startsWith('series_')) {
        const sid = id.replace('series_', '');
        const matches = currentItems.filter(item => String(item.series_tmdb_id) === sid);
        selectedMedia.push(...matches);
      } else {
        const item = currentItems.find(i => i.id === id);
        if (item) selectedMedia.push(item);
      }
    });

    const counts = {};
    globalTags.forEach(tag => counts[tag.name] = 0);

    selectedMedia.forEach(item => {
      if (item.custom_tags) {
        item.custom_tags.forEach(tName => {
          if (counts[tName] !== undefined) counts[tName]++;
        });
      }
    });

    const initStates = {};
    globalTags.forEach(tag => {
      initStates[tag.name] = 0; // Default: Keep
    });
    setTagStates(initStates);
  }, [globalTags, selectedItemIds, currentItems]);

  const cycleState = (tagName) => {
    setTagStates(prev => ({
      ...prev,
      [tagName]: (prev[tagName] + 1) % 3
    }));
  };

  const handleApply = () => {
    const addTags = [];
    const removeTags = [];
    Object.keys(tagStates).forEach(t => {
      if (tagStates[t] === 1) addTags.push(t);
      else if (tagStates[t] === 2) removeTags.push(t);
    });
    
    if (newTagInput.trim()) {
      addTags.push(newTagInput.trim());
    }
    
    onApply(addTags, removeTags);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'radial-gradient(circle at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(35, 35, 45, 0.98) 0%, rgba(15, 15, 20, 0.98) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '24px', padding: '30px', width: '420px', maxWidth: '90%',
        boxShadow: '0 0 0 1px rgba(139, 92, 246, 0.1), 0 40px 80px rgba(0,0,0,0.8)',
        transform: 'scale(1)',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '22px', color: '#fff', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: '800' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '8px', borderRadius: '12px', display: 'flex' }}>
            <Tag size={20} color="#a78bfa" />
          </div>
          {T('library.bulk_manage_tags') || 'Bulk Manage Tags'}
        </h2>

        <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {globalTags.map(tag => {
            const state = tagStates[tag.name] || 0;
            const bgColors = ['rgba(255,255,255,0.05)', 'rgba(76, 175, 80, 0.15)', 'rgba(244, 67, 54, 0.15)'];
            const borderColors = ['rgba(255,255,255,0.1)', '#4CAF50', '#F44336'];
            const icons = [null, <Check size={14} color="#4CAF50" />, <X size={14} color="#F44336" />];
            const labels = ['Keep', 'Add', 'Remove'];

            return (
              <div
                key={tag.id}
                onClick={() => cycleState(tag.name)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 16px', borderRadius: '12px',
                  background: bgColors[state], border: `1px solid ${borderColors[state]}`,
                  cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: tag.color || '#fff' }} />
                  <span style={{ color: '#fff', fontWeight: '600', fontSize: '14px' }}>{tag.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: '700', color: borderColors[state] }}>
                  {labels[state]} {icons[state]}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-dim)', fontWeight: '700', marginBottom: '8px', display: 'block' }}>
            {T('library.new_tag_label') || 'NEW TAG (OPTIONAL)'}
          </label>
          <input
            type="text"
            value={newTagInput}
            onChange={e => setNewTagInput(e.target.value)}
            placeholder={T('library.new_tag_placeholder') || 'Enter tag name...'}
            style={{
              width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
              padding: '12px', borderRadius: '12px', color: '#fff', outline: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleApply}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #3b82f6 100%)', color: '#fff',
              fontWeight: '700', cursor: 'pointer'
            }}
          >
            {T('library.apply_changes') || 'Apply Changes'}
          </button>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: '700', cursor: 'pointer'
            }}
          >
            {T('library.cancel') || 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TagsManagerView;

