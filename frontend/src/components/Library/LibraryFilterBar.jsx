import React from 'react';
import { Tag, X } from 'lucide-react';

const LibraryFilterBar = ({
  uniqueTags = [],
  selectedTags = [],
  setSelectedTags,
  activeTab,
}) => {
  if (activeTab === 'tags' || uniqueTags.length === 0) {
    return null;
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexWrap: 'wrap', 
      alignItems: 'center', 
      gap: '8px', 
      marginBottom: '30px', 
      padding: '12px 18px', 
      background: 'rgba(255, 255, 255, 0.02)', 
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      borderRadius: '14px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)'
    }}>
      <span style={{ 
        fontSize: '13px', 
        color: 'var(--text-dim)', 
        marginRight: '6px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        fontWeight: '600'
      }}>
        <Tag size={14} color="#a78bfa" /> Filter by Tags:
      </span>
      {uniqueTags.map(tag => {
        const isSelected = selectedTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => {
              setSelectedTags(prev => 
                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
              );
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '11px',
              fontWeight: '700',
              color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.6)',
              background: isSelected 
                ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.25) 100%)' 
                : 'rgba(255, 255, 255, 0.03)',
              border: isSelected 
                ? '1px solid rgba(139, 92, 246, 0.5)' 
                : '1px solid rgba(255, 255, 255, 0.1)',
              padding: '5px 12px',
              borderRadius: '20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isSelected ? '0 4px 10px rgba(139, 92, 246, 0.15)' : 'none',
            }}
            onMouseOver={e => {
              if (!isSelected) {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
              }
            }}
            onMouseOut={e => {
              if (!isSelected) {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
              }
            }}
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.length > 0 && (
        <button
          onClick={() => setSelectedTags([])}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#ef4444',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <X size={12} /> Clear Filters
        </button>
      )}
    </div>
  );
};

export default LibraryFilterBar;
