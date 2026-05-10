import React from 'react';

const DiscoveryTable = ({ items, activeTab, extraSubTab, searchQuery, sortKey, setSortKey, sortDir, setSortDir, loading, selectedItem, setSelectedItem, T }) => {
  return (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th className="sortable-th" onClick={() => { setSortKey(sortKey === 'filename' && sortDir === 'asc' ? 'filename' : 'filename'); setSortDir(sortKey === 'filename' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
              {T('discovery.table.name_mapping')} {sortKey === 'filename' && (sortDir === 'asc' ? '▲' : '▼')}
            </th>
            <th className="sortable-th" onClick={() => { setSortKey(sortKey === 'planned_path' && sortDir === 'asc' ? 'planned_path' : 'planned_path'); setSortDir(sortKey === 'planned_path' && sortDir === 'asc' ? 'desc' : 'asc'); }}>
              {T('discovery.table.planned_name')} {sortKey === 'planned_path' && (sortDir === 'asc' ? '▲' : '▼')}
            </th>
            {activeTab === 'manual' && (
              <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'type' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('type'); }}>
                {T('discovery.table.type')} {sortKey === 'type' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
            {activeTab === 'extras' && (extraSubTab === 'subtitle' || extraSubTab === 'audio') && (
              <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'language' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('language'); }}>
                {T('discovery.table.language')} {sortKey === 'language' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
            {activeTab === 'extras' && extraSubTab !== 'metadata' && (
              <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'subtype' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('subtype'); }}>
                {T('discovery.table.subcategory')} {sortKey === 'subtype' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
            {activeTab !== 'extras' && (
              <th className="cell-center sortable-th" onClick={() => { setSortDir(sortKey === 'status' && sortDir === 'asc' ? 'desc' : 'asc'); setSortKey('status'); }}>
                {T('discovery.table.status')} {sortKey === 'status' && (sortDir === 'asc' ? '▲' : '▼')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {(() => {
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
            
            return rows.map(item => (
            <tr
              key={item.id}
              className={selectedItem?.id === item.id ? 'selected' : ''}
              onClick={() => setSelectedItem(item)}
            >
              <td>
                <div className="original-name" title={item.filename}>{item.filename}</div>
              </td>
              <td>
                <div className="planned-name" title={item.planned_path}>
                  <span className="arrow">➔</span>
                  <span className="planned-name-text">
                    {item.planned_path ? (
                      activeTab === 'extras' ? (
                        <>
                          {item.planned_path.split('/').pop().replace(new RegExp((item.extension || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'), '')}
                          {item.extension && <span className="extension-text">{item.extension.toLowerCase()}</span>}
                        </>
                      ) : (
                        item.planned_path
                      )
                    ) : '-'}
                  </span>
                </div>
              </td>
              {activeTab === 'manual' && (
                <td className="cell-center">
                  <span className={`badge badge-type`}>{item.type}</span>
                </td>
              )}
              {activeTab === 'extras' && (extraSubTab === 'subtitle' || extraSubTab === 'audio') && (
                <td className="cell-center">
                  <span className="language-text">
                    {item.language ? item.language.toUpperCase() : '-'}
                  </span>
                </td>
              )}
              {activeTab === 'extras' && extraSubTab !== 'metadata' && (
                <td className="cell-center">
                  <span className="subcategory-text">
                    {item.subtype && item.subtype.toLowerCase() !== 'other'
                      ? (item.subtype.charAt(0).toUpperCase() + item.subtype.slice(1).replace(/_/g, ' '))
                      : '-'}
                  </span>
                </td>
              )}
              {activeTab !== 'extras' && (
                <td className="cell-center">
                  <span className={`status-badge ${(item.status || '').toLowerCase()}`}>
                    {item.status || 'UNKNOWN'}
                  </span>
                </td>
              )}
            </tr>
          ));
          })()}
          {(!items[activeTab] || items[activeTab].length === 0) && !loading && (
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
