import React, { useState, useEffect, useCallback } from 'react';
import { ListVideo, Plus, Trash2, Search, Play, FolderOpen, Heart, Sparkles, X, Eye } from 'lucide-react';
import { api, API_BASE } from '../../services/api';
import { useAppContext } from '../../context/AppContext';
import ManualResolverModal from './ManualResolverModal';
import '../../styles/components/lists.css';

const ListsView = ({ T }) => {
  const { setPendingDetailId, setView } = useAppContext();
  const [lists, setLists] = useState([]);
  const [activeListId, setActiveListId] = useState(null);
  const [activeListDetails, setActiveListDetails] = useState(null);
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResolverModal, setShowResolverModal] = useState(false);

  const handleItemsUpdated = (updatedItems) => {
    setActiveListDetails(prev => ({
      ...prev,
      items: updatedItems
    }));
    
    // Recalculate up to 4 sample posters from the updated items
    const newPosters = updatedItems
      .filter(item => item.poster_path)
      .slice(0, 4)
      .map(item => item.poster_path);

    // Update lists counts and posters in sidebar
    setLists(prev => prev.map(l => {
      if (l.id === activeListId) {
        return { 
          ...l, 
          item_count: updatedItems.length,
          sample_posters: newPosters
        };
      }
      return l;
    }));
  };
  
  // Modal states
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');
  const [newListColor, setNewListColor] = useState('#0088ff');
  const [creatingList, setCreatingList] = useState(false);

  const colors = [
    { name: 'Neon Blue', value: '#0088ff' },
    { name: 'Neon Pink', value: '#e91e63' },
    { name: 'Emerald', value: '#00ff64' },
    { name: 'Amber', value: '#ffc832' },
    { name: 'Purple Glow', value: '#a78bfa' }
  ];

  // Fetch all lists
  const fetchLists = useCallback(async (selectId = null) => {
    setLoadingLists(true);
    try {
      const data = await api.getLists();
      setLists(data || []);
      
      // Auto-select list if none active or requested
      if (data && data.length > 0) {
        if (selectId) {
          setActiveListId(selectId);
        } else if (!activeListId || !data.some(l => l.id === activeListId)) {
          setActiveListId(data[0].id);
        }
      } else {
        setActiveListId(null);
        setActiveListDetails(null);
      }
    } catch (e) {
      console.error("Failed to fetch custom lists:", e);
    } finally {
      setLoadingLists(false);
    }
  }, [activeListId]);

  // Fetch active list details
  useEffect(() => {
    if (!activeListId) {
      setActiveListDetails(null);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const details = await api.getListDetails(activeListId);
        setActiveListDetails(details);
      } catch (e) {
        console.error(`Failed to fetch details for list ${activeListId}:`, e);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [activeListId]);

  useEffect(() => {
    fetchLists();
  }, []);

  const handleCreateList = async (e) => {
    e.preventDefault();
    if (!newListName.trim() || creatingList) return;

    setCreatingList(true);
    try {
      const res = await api.createList({
        name: newListName.trim(),
        description: newListDesc.trim(),
        color: newListColor,
        icon: 'ListVideo'
      });
      
      // Reset form & close modal
      setNewListName('');
      setNewListDesc('');
      setNewListColor('#0088ff');
      setShowCreateModal(false);
      
      // Refresh lists and select the newly created list
      await fetchLists(res.id);
    } catch (e) {
      console.error("Failed to create custom list:", e);
    } finally {
      setCreatingList(false);
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm("Are you sure you want to permanently delete this list? This cannot be undone.")) return;

    try {
      await api.deleteList(listId);
      await fetchLists();
    } catch (e) {
      console.error(`Failed to delete custom list ${listId}:`, e);
    }
  };

  const handleRemoveItem = async (listId, itemId) => {
    try {
      await api.removeFromList(listId, itemId);
      
      // Update local state for immediate response
      if (activeListDetails && activeListDetails.id === listId) {
        setActiveListDetails(prev => ({
          ...prev,
          items: prev.items.filter(item => item.id !== itemId)
        }));
      }
      
      // Refresh list count in lists sidebar
      setLists(prev => prev.map(l => {
        if (l.id === listId) {
          return { ...l, item_count: Math.max(0, l.item_count - 1) };
        }
        return l;
      }));
    } catch (e) {
      console.error(`Failed to remove item ${itemId} from list ${listId}:`, e);
    }
  };

  const handleMovieClick = (item) => {
    if (item.media_item_id) {
      setPendingDetailId(item.media_item_id);
    } else {
      setPendingDetailId('tmdb_' + item.tmdb_id);
    }
    setView('library');
  };

  return (
    <div className="lists-view-container animate-fade-in">
      {/* Sidebar Panel */}
      <div className="lists-sidebar-panel">
        <div className="lists-sidebar-header">
          <h2>{T('sidebar.lists') || 'My Lists'}</h2>
          <button className="create-list-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
          </button>
        </div>

        <div className="lists-cards-scroll">
          {loadingLists ? (
            <div className="lists-loading">
              <div className="spinner" />
            </div>
          ) : lists.length > 0 ? (
            lists.map(l => {
              const isActive = activeListId === l.id;
              return (
                <div 
                  key={l.id} 
                  className={`list-card-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveListId(l.id)}
                  style={isActive ? { '--active-color': l.color, '--active-color-glow': `${l.color}22` } : {}}
                >
                  <div className="list-card-collage">
                    {l.sample_posters && l.sample_posters.length > 0 ? (
                      <div className={`collage-grid collage-${Math.min(4, l.sample_posters.length)}`}>
                        {l.sample_posters.slice(0, 4).map((p, idx) => (
                          <img key={idx} src={`https://image.tmdb.org/t/p/w92${p}`} alt="" />
                        ))}
                      </div>
                    ) : (
                      <div className="collage-placeholder" style={{ background: `linear-gradient(135deg, ${l.color}33 0%, ${l.color}05 100%)` }}>
                        <ListVideo size={24} style={{ color: l.color }} />
                      </div>
                    )}
                  </div>
                  
                  <div className="list-card-meta">
                    <h3 className="list-title-text">
                      {l.name === 'Watchlist' ? (T('dashboard.watchlist.add') || 'Watchlist') : l.name}
                    </h3>
                    <p className="list-desc-text">
                      {l.name === 'Watchlist' ? (T('detail.watchlist.desc') || 'Your default system watchlist.') : (l.description || 'No description')}
                    </p>
                    <span className="list-count-badge" style={{ backgroundColor: `${l.color}22`, color: l.color }}>
                      {l.item_count} items
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="lists-sidebar-empty">
              <Sparkles size={32} />
              <p>No lists yet. Create your first collection!</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Details Panel */}
      <div className="lists-main-panel">
        {loadingDetails ? (
          <div className="lists-details-loading">
            <div className="spinner" />
          </div>
        ) : activeListDetails ? (
          <div className="active-list-container">
            {/* Header Area */}
            <div className="active-list-header-card" style={{ '--list-theme': activeListDetails.color }}>
              <div className="active-list-glow" style={{ background: `radial-gradient(ellipse at top left, ${activeListDetails.color}33, transparent 50%)` }} />
              
              <div className="active-list-meta-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="active-list-dot" style={{ backgroundColor: activeListDetails.color, boxShadow: `0 0 12px ${activeListDetails.color}` }} />
                  <span className="active-list-category">
                    {activeListDetails.name === 'Watchlist' ? (T('library.watchlist') || 'Watchlist') : 'Custom Collection'}
                  </span>
                </div>
                <h1 className="active-list-title">
                  {activeListDetails.name === 'Watchlist' ? (T('dashboard.watchlist.add') || 'Watchlist') : activeListDetails.name}
                </h1>
                <p className="active-list-desc">
                  {activeListDetails.name === 'Watchlist' ? (T('detail.watchlist.desc') || 'Your default system watchlist.') : (activeListDetails.description || 'Add films to this premium custom collection directly from the movie detail view.')}
                </p>
                
                <div className="active-list-stats">
                  <span>Created {new Date(activeListDetails.created_at).toLocaleDateString()}</span>
                  <span className="divider">•</span>
                  <span>{activeListDetails.items?.length || 0} items</span>
                </div>
              </div>

              <div className="active-list-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <button className="manual-resolver-btn" onClick={() => setShowResolverModal(true)}>
                  <Plus size={16} /> Add Titles
                </button>
                {activeListDetails.name !== 'Watchlist' && (
                  <button className="delete-list-btn-text" onClick={() => handleDeleteList(activeListDetails.id)}>
                    <Trash2 size={16} /> Delete List
                  </button>
                )}
              </div>
            </div>

            {/* Movie Grid Area */}
            <div className="list-movies-section">
              {activeListDetails.items && activeListDetails.items.length > 0 ? (
                <div className="list-movie-grid">
                  {activeListDetails.items.map(item => {
                    const isVirtual = !item.media_item_id;
                    const posterUrl = item.poster_path 
                      ? (isVirtual 
                          ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
                          : `${API_BASE}/media/images/posters${item.poster_path}`)
                      : null;
                      
                    return (
                      <div key={item.id} className="list-movie-card">
                        <div className="movie-card-poster-wrapper" onClick={() => handleMovieClick(item)}>
                          {posterUrl ? (
                            <img src={posterUrl} alt={item.title} className="movie-card-poster-img" />
                          ) : (
                            <div className="movie-card-poster-fallback">
                              <span>{item.title}</span>
                            </div>
                          )}
                          
                          {/* Floating badges */}
                          <div className="movie-card-badge-row">
                            {item.media_type === 'tv' && (
                              <span className="card-badge tv-badge">Series</span>
                            )}
                            {isVirtual ? (
                              <span className="card-badge virtual-badge">Virtual</span>
                            ) : (
                              <span className="card-badge physical-badge">In Library</span>
                            )}
                          </div>

                          {/* Hover Play/View overlay */}
                          <div className="movie-card-hover-overlay">
                            <span className="view-details-glow-btn">
                              <Eye size={18} /> View Details
                            </span>
                          </div>
                        </div>

                        <div className="movie-card-bottom-info">
                          <h4 className="movie-card-title" onClick={() => handleMovieClick(item)}>{item.title}</h4>
                          <button 
                            className="movie-card-remove-btn" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveItem(activeListDetails.id, item.id);
                            }}
                            title="Remove from list"
                          >
                            <X size={14} /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="list-movies-empty">
                  <FolderOpen size={48} />
                  <h3>This list is empty</h3>
                  <p>Browse titles in the Library or Discovery, click on a detail page, and toggle the Lists button to add them here!</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="lists-main-empty">
            <Sparkles size={48} />
            <h2>No List Selected</h2>
            <p>Select a custom list from the sidebar or click '+' to create a new one.</p>
          </div>
        )}
      </div>

      {/* Create New List Modal */}
      {showCreateModal && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-container glassmorphic animate-zoom-in">
            <div className="custom-modal-header">
              <h3>Create Custom List</h3>
              <button className="close-modal-btn" onClick={() => setShowCreateModal(false)}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleCreateList} className="custom-modal-body">
              <div className="form-group">
                <label>List Name</label>
                <input 
                  type="text" 
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  placeholder="e.g., Sci-Fi Classics, Friday Night Movie"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea 
                  value={newListDesc}
                  onChange={e => setNewListDesc(e.target.value)}
                  placeholder="Enter a description for this collection..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>Color Theme</label>
                <div className="color-selector-grid">
                  {colors.map(c => (
                    <button 
                      key={c.value}
                      type="button"
                      className={`color-dot-btn ${newListColor === c.value ? 'selected' : ''}`}
                      style={{ '--dot-color': c.value }}
                      onClick={() => setNewListColor(c.value)}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="custom-modal-actions">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="modal-submit-btn" disabled={!newListName.trim() || creatingList}>
                  {creatingList ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Resolver Modal */}
      {showResolverModal && activeListDetails && (
        <ManualResolverModal 
          listDetails={activeListDetails}
          onClose={() => setShowResolverModal(false)}
          onItemsUpdated={handleItemsUpdated}
          T={T}
        />
      )}
    </div>
  );
};

export default ListsView;
