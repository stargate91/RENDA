import React from 'react';
import { Trash2, Square, CheckSquare, Search, Settings } from 'lucide-react';

const DiscoveryTable = ({ 
  items, activeTab, extraSubTab, searchQuery, 
  sortKey, setSortKey, sortDir, setSortDir, 
  loading, selectedItem, setSelectedItem,
  selectedIds, setSelectedIds, deleteDiscoveryItems,
  openResolver, openOverride,
  T 
}) => {
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
    }
    return rows;
  };

  const rows = getFilteredRows();
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
            {activeTab === 'manual' && (
              <th className="cell-center sortable-th" onClick={() => { setSortKey('type'); setSortDir(sortKey === 'type' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                {T('discovery.table.type')} {sortKey === 'type' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
            {activeTab === 'extras' && (extraSubTab === 'subtitle' || extraSubTab === 'audio') && (
              <th className="cell-center sortable-th" onClick={() => { setSortKey('language'); setSortDir(sortKey === 'language' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                {T('discovery.table.language')} {sortKey === 'language' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
            {activeTab === 'extras' && extraSubTab !== 'metadata' && (
              <th className="cell-center sortable-th" onClick={() => { setSortKey('subtype'); setSortDir(sortKey === 'subtype' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                {T('discovery.table.subcategory')} {sortKey === 'subtype' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
            {activeTab !== 'extras' && (
              <th className="cell-center sortable-th" onClick={() => { setSortKey('status'); setSortDir(sortKey === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
                {T('discovery.table.status')} {sortKey === 'status' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map(item => (
            <tr
              key={item.id}
              className={`${selectedItem?.id === item.id ? 'selected' : ''} ${selectedIds.includes(item.id) ? 'checked' : ''}`}
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
                <div className="planned-name" title={item.planned_path}>
                  <span className="arrow">➔</span>
                  <span className="planned-name-text">
                    {item.planned_path && item.planned_path.length > item.extension?.length + 1 ? (
                      activeTab === 'extras' ? (
                        <>
                          {item.planned_path.split('/').pop().replace(new RegExp((item.extension || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '')}
                          {item.extension && <span className="extension-text">{item.extension.toLowerCase()}</span>}
                        </>
                      ) : (
                        item.planned_path
                      )
                    ) : (
                      <span className="pending-name">
                        {item.status === 'MATCHED' ? 'Enriching...' : 'Pending Match'}
                      </span>
                    )}
                  </span>
                </div>
              </td>
              {activeTab === 'manual' && (
                <td className="cell-center">
                  <span className={`badge badge-type hide-on-hover`}>{item.type}</span>
                </td>
              )}
              {activeTab === 'extras' && (extraSubTab === 'subtitle' || extraSubTab === 'audio') && (
                <td className="cell-center">
                  <span className="language-text hide-on-hover">
                    {item.language ? item.language.toUpperCase() : '-'}
                  </span>
                </td>
              )}
              {activeTab === 'extras' && extraSubTab !== 'metadata' && (
                <td className="cell-center">
                  <span className="subcategory-text hide-on-hover">
                    {item.subtype && item.subtype.toLowerCase() !== 'other'
                      ? (item.subtype.charAt(0).toUpperCase() + item.subtype.slice(1).replace(/_/g, ' '))
                      : '-'}
                  </span>
                </td>
              )}
              <td className="cell-center" style={{ position: 'relative' }}>
                {activeTab !== 'extras' && (
                  <span className={`status-badge ${(item.status || '').toLowerCase()} hide-on-hover`}>
                    {item.status || T('discovery.table.unknown')}
                  </span>
                )}
                
                <div className="row-actions">
                  <button 
                    className="action-btn edit" 
                    onClick={(e) => { e.stopPropagation(); openOverride(item); }}
                    title={T('modal.override.action') || 'Manual Override'}
                  >
                    <Settings size={16} />
                  </button>
                  {activeTab !== 'extras' && (
                    <button 
                      className="action-btn resolve" 
                      onClick={(e) => { e.stopPropagation(); openResolver(item); }}
                      title={T('modal.resolver.action')}
                    >
                      <Search size={16} />
                    </button>
                  )}
                  <button 
                    className="action-btn delete" 
                    onClick={(e) => { e.stopPropagation(); deleteDiscoveryItems(item.id, activeTab === 'extras' ? 'extras' : 'media'); }}
                    title={T('discovery.bulk.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && !loading && (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '100px', color: '#666' }}>
                {T('discovery.no_items')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DiscoveryTable;
