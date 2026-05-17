import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Square, CheckSquare, Search, ArrowRight, Folder, Loader2, Edit3 } from 'lucide-react';
import { api } from '../../services/api';

const DiscoveryTable = ({ 
  items, activeTab, extraSubTab, searchQuery, 
  sortKey, setSortKey, sortDir, setSortDir, 
  loading, selectedItem, setSelectedItem,
  selectedIds, setSelectedIds, deleteDiscoveryItems,
  openResolver, openOverride,
  isBusy,
  T 
}) => {
  const [visibleLimit, setVisibleLimit] = useState(40);
  const sentinelRef = useRef(null);

  useEffect(() => {
    setVisibleLimit(40);
  }, [activeTab, extraSubTab, searchQuery]);
  const getFilteredRows = () => {
    let rows = activeTab === 'extras'
      ? (items.extras || []).filter(ex => ex.category === extraSubTab)
      : (items[activeTab] || []);
    
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(item => {
        const fn = (item.filename || '').toLowerCase();
        const pn = (activeTab === 'extras' ? (item.parent_name || '') : (item.planned_path || '')).toLowerCase();
        return fn.includes(q) || pn.includes(q);
      });
    }
    
    // Sort
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        let valA = (a[sortKey] || '').toString().toLowerCase();
        let valB = (b[sortKey] || '').toString().toLowerCase();
        if (sortKey === 'planned_path' && activeTab === 'extras') {
          valA = (a.parent_name || '').toLowerCase();
          valB = (b.parent_name || '').toLowerCase();
        }
        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    } else if (activeTab === 'collisions') {
      // Default grouping sort for collisions
      rows = [...rows].sort((a, b) => {
        const idA = a.collision_group_id || '';
        const idB = b.collision_group_id || '';
        return idA.localeCompare(idB);
      });
    }
    return rows;
  };

  const allRows = getFilteredRows();
  const rows = allRows.slice(0, visibleLimit);

  // Calculate collision group index mapping for zebra striping groups
  const groupColors = {};
  let groupCount = 0;
  rows.forEach(item => {
    if (item.collision_group_id && !groupColors[item.collision_group_id]) {
      groupColors[item.collision_group_id] = groupCount % 2 === 0 ? 'collision-group-even' : 'collision-group-odd';
      groupCount++;
    }
  });

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && allRows.length > visibleLimit) {
        setVisibleLimit(prev => prev + 40);
      }
    }, { threshold: 0.1 });

    if (sentinelRef.current) {
      observer.observe(sentinelRef.current);
    }

    return () => observer.disconnect();
  }, [allRows.length, visibleLimit]);
  const allSelected = rows.length > 0 && rows.every(r => selectedIds.includes(r.id));

  const toggleSelectAll = (e) => {
    e.stopPropagation();
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rows.map(r => r.id));
    }
  };

  const toggleSelectItem = (e, id) => {
    e.stopPropagation();
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th className="checkbox-col">
              <div className="checkbox-wrapper" onClick={toggleSelectAll}>
                {allSelected ? <CheckSquare size={18} className="checkbox-icon active" /> : <Square size={18} className="checkbox-icon" />}
              </div>
            </th>
            <th className="sortable-th" onClick={() => { setSortKey('filename'); setSortDir(sortKey === 'filename' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
              {T('discovery.table.name_mapping')} {sortKey === 'filename' && (sortDir === 'asc' ? '▲' : '▼')}
            </th>
            <th className="sortable-th" onClick={() => { setSortKey('planned_path'); setSortDir(sortKey === 'planned_path' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
              {T('discovery.table.planned_name')} {sortKey === 'planned_path' && (sortDir === 'asc' ? '▲' : '▼')}
            </th>
            <th className="cell-center sortable-th metadata-col">
              {activeTab === 'extras' ? (
                extraSubTab === 'metadata' ? '' : T('discovery.table.subcategory')
              ) : T('discovery.table.type')}
            </th>
            <th className="cell-center sortable-th status-col" onClick={() => { 
              const key = activeTab === 'extras' ? (extraSubTab === 'subtitle' || extraSubTab === 'audio' ? 'language' : 'extension') : 'status';
              setSortKey(key); 
              setSortDir(sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'); 
            }}>
              {activeTab === 'extras' ? (
                (extraSubTab === 'subtitle' || extraSubTab === 'audio') ? T('discovery.table.language') : 
                T('discovery.table.subtype')
              ) : T('discovery.table.status')} 
              {(sortKey === 'status' || sortKey === 'extension' || sortKey === 'language') && (sortDir === 'asc' ? ' ▲' : ' ▼')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => {
            const prevItem = index > 0 ? rows[index - 1] : null;
            // Ha a collision_group_id megváltozik, és mindkettő ütköző elem, akkor teszünk egy sep-et
            const isNewGroup = prevItem && 
                               prevItem.collision_group_id && 
                               item.collision_group_id && 
                               prevItem.collision_group_id !== item.collision_group_id;
            
            const groupClass = item.collision_group_id ? groupColors[item.collision_group_id] : '';
            const collisionClass = item.has_collision ? `collision-row ${groupClass}` : '';

            return (
              <React.Fragment key={item.id}>
                {isNewGroup && (
                  <tr className="collision-group-separator">
                    <td colSpan="5"></td>
                  </tr>
                )}
                <tr
                  className={`${selectedItem?.id === item.id ? 'selected' : ''} ${selectedIds.includes(item.id) ? 'checked' : ''} ${collisionClass}`}
                  onClick={() => setSelectedItem(item)}
                >
                  <td className="checkbox-col">
                    <div className="checkbox-wrapper" onClick={(e) => toggleSelectItem(e, item.id)}>
                      {selectedIds.includes(item.id) ? <CheckSquare size={18} className="checkbox-icon active" /> : <Square size={18} className="checkbox-icon" />}
                    </div>
                  </td>
                  <td>
                    <div className="original-name" title={item.filename}>{item.filename}</div>
                  </td>
                  <td>
                    <div className={`planned-name ${item.action === 'delete' ? 'delete-action' : ''}`} title={item.planned_path}>
                      <span className="arrow">➔</span>
                      {item.action === 'delete' ? (
                        <span className="delete-indicator" style={{ color: '#ff4d4d', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.5px' }}>
                          {T('discovery.table.will_delete')}
                        </span>
                      ) : item.planned_path ? (
                        <span className="planned-name-text" title={item.planned_path}>
                          {(() => {
                            const fullPath = item.planned_path;
                            const parts = fullPath.includes('\\') ? fullPath.split('\\') : fullPath.split('/');
                            return parts.pop();
                          })()}
                        </span>
                      ) : (
                        activeTab !== 'extras' && (
                          <button 
                            className="btn-link" 
                            onClick={(e) => { e.stopPropagation(); openResolver(item); }}
                            disabled={isBusy}
                          >
                            {T('discovery.table.pending_match')}
                          </button>
                        )
                      )}
                    </div>
                  </td>
                  <td className="cell-center metadata-col">
                    {activeTab === 'extras' ? (
                      extraSubTab === 'metadata' ? (
                        <span className="hide-on-hover">-</span>
                      ) : (
                        <span className="subtype-badge hide-on-hover">
                          {item.subtype && item.subtype.toLowerCase() !== 'other'
                            ? (item.subtype.charAt(0).toUpperCase() + item.subtype.slice(1).replace(/_/g, ' '))
                            : '-'}
                        </span>
                      )
                    ) : (
                      <span className={`badge badge-type hide-on-hover`}>{item.type}</span>
                    )}
                  </td>
                  <td className="cell-center status-col" style={{ position: 'relative' }}>
                    <div className="status-container hide-on-hover">
                      {activeTab !== 'extras' ? (
                        <span className={`status-badge ${(item.status || '').toLowerCase()}`}>
                          {item.status || T('discovery.table.unknown')}
                        </span>
                      ) : (
                        (extraSubTab === 'subtitle' || extraSubTab === 'audio') ? (
                          <span className="language-badge">
                            {item.language ? item.language.toUpperCase() : '-'}
                          </span>
                        ) : (
                          <span className="status-badge extras" style={{ textTransform: 'lowercase', fontFamily: 'Consolas, monospace', letterSpacing: '1px' }}>
                            {item.extension || '-'}
                          </span>
                        )
                      )}
                    </div>
                    
                    <div className="cell-actions">
                      <button className="action-pill reveal" onClick={(e) => { e.stopPropagation(); api.revealInExplorer(item.current_path); }} title={T('discovery.reveal_explorer')} disabled={isBusy}>
                        <Folder size={16} />
                      </button>
                      <button className="action-pill edit" onClick={(e) => { e.stopPropagation(); openOverride(item); }} title={T('modal.override.action')} disabled={isBusy}>
                        <Edit3 size={16} />
                      </button>
                      {activeTab !== 'extras' && (
                        <button className="action-pill resolve" onClick={(e) => { e.stopPropagation(); openResolver(item); }} title={T('modal.resolver.action')} disabled={isBusy}>
                          <Search size={16} />
                        </button>
                      )}
                      <button className="action-pill delete" onClick={(e) => { e.stopPropagation(); deleteDiscoveryItems(item.id, activeTab === 'extras' ? 'extras' : 'media'); }} title={T('common.delete')} disabled={isBusy}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '100px', color: '#666' }}>
                {T('discovery.no_items')}
              </td>
            </tr>
          )}
          {allRows.length > visibleLimit && (
            <tr ref={sentinelRef}>
              <td colSpan="5" style={{ textAlign: 'center', padding: '20px', opacity: 0.5 }}>
                <Loader2 size={20} className="spin" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DiscoveryTable;
