import React from 'react';
import LibraryCard from './LibraryCard';

const LibraryGrid = ({
  renderItems = [],
  visibleCount = 42,
  triggerRef,
  isSelectionMode = false,
  selectedItemIds = [],
  setSelectedItemIds,
  navigateTo,
  T,
  viewMode = 'grid',
}) => {
  return (
    <>
      <div 
        className="library-grid" 
        style={{
          display: 'grid',
          gridTemplateColumns: viewMode === 'episodes' ? 'repeat(auto-fill, minmax(250px, 1fr))' : 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '30px'
        }}
      >
        {renderItems.slice(0, visibleCount).map((item, index) => {
          const targetTmdbId = item.series_tmdb_id || item.tmdb_id;
          const itemIdToSelect = item.id || (targetTmdbId ? `series_${targetTmdbId}` : null);
          const itemIsSelected = isSelectionMode && itemIdToSelect && selectedItemIds.includes(itemIdToSelect);

          const handleSelect = () => {
            if (!itemIdToSelect) return;
            setSelectedItemIds(prev => 
              prev.includes(itemIdToSelect) 
                ? prev.filter(i => i !== itemIdToSelect) 
                : [...prev, itemIdToSelect]
            );
          };

          return (
            <LibraryCard
              key={item.id}
              item={item}
              index={index}
              isSelectionMode={isSelectionMode}
              itemIsSelected={itemIsSelected}
              onSelect={handleSelect}
              onNavigate={navigateTo}
              T={T}
              viewMode={viewMode}
            />
          );
        })}
      </div>
      {renderItems.length > visibleCount && (
        <div ref={triggerRef} style={{ height: '10px', margin: '20px 0' }} />
      )}
    </>
  );
};

export default LibraryGrid;
