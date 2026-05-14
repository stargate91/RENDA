import React, { useState, useMemo } from 'react';
import { Search, X, Check, ArrowRight, FolderOpen, Film, Tv, FileText } from 'lucide-react';

const DryRunModal = ({ show, items, onClose, onConfirm, T }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all items that will be renamed
  const renamingItems = useMemo(() => {
    if (!items) return [];
    
    const combined = [];
    
    // Helper to add items
    const processList = (list, type, icon) => {
      if (!list) return;
      list.forEach(item => {
        if (item.planned_path && item.status !== 'RENAMED') {
          combined.push({
            id: item.id,
            original: (item.current_path || '').split(/[\\/]/).pop() || 'Unknown',
            planned: item.planned_path || 'Unknown',
            type: type,
            icon: icon
          });
        }
      });
    };

    processList(items.movies, 'Movie', <Film size={14} />);
    processList(items.series, 'Series', <Tv size={14} />);
    processList(items.extras, 'Extra', <FileText size={14} />);

    return combined;
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!searchQuery) return renamingItems;
    const lowerQ = searchQuery.toLowerCase();
    return renamingItems.filter(item => 
      (item.original || '').toLowerCase().includes(lowerQ) || 
      (item.planned || '').toLowerCase().includes(lowerQ)
    );
  }, [renamingItems, searchQuery]);

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container premium dry-run-modal" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '95vw', padding: 0 }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="title-icon-wrapper">
              <FolderOpen className="modal-icon" size={24} />
            </div>
            <div>
              <h2>{T('discovery.dry_run.title') || 'Organization Summary'}</h2>
              <p className="modal-subtitle">{T('discovery.dry_run.subtitle', { count: renamingItems.length }) || `Review ${renamingItems.length} items to be renamed and organized`}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '20px 25px' }}>
          <div className="pro-search-bar" style={{ marginBottom: '20px' }}>
            <Search size={16} className="icon" />
            <input 
              type="text" 
              placeholder={T('discovery.dry_run.search') || 'Search planned names...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dry-run-list" style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight: '5px' }}>
          {filteredItems.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-dim)' }}>
              {T('discovery.dry_run.no_results') || 'No items match your search.'}
            </div>
          ) : (
            <div className="dry-run-items">
              {filteredItems.map(item => (
                <div key={`${item.type}-${item.id}`} className="dry-run-item" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px',
                  padding: '12px 16px',
                  background: 'var(--bg-card)',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  border: '1px solid var(--border-light)'
                }}>
                  <div className="item-icon" style={{ color: 'var(--accent-blue)', opacity: 0.8 }}>
                    {item.icon}
                  </div>
                  <div className="item-details" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                    <div className="original-name" style={{ fontSize: '13px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      <span style={{ textDecoration: 'line-through' }}>{item.original}</span>
                    </div>
                    <div className="planned-name" style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.planned}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            {T('common.cancel')}
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            <Check size={18} />
            {T('discovery.organize_now')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DryRunModal;
