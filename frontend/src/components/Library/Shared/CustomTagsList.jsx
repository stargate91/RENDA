import React, { useState, useEffect, useRef } from 'react';
import { Tag, Plus, X, Check } from 'lucide-react';
import { api } from '../../../services/api';
import { useAppContext } from '../../../context/AppContext';

const CustomTagsList = ({ tags, onAddTag, onRemoveTag }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [globalTags, setGlobalTags] = useState([]);
  const containerRef = useRef(null);
  const { T } = useAppContext();

  useEffect(() => {
    if (isEditing) {
      api.getTags().then(res => setGlobalTags(res || [])).catch(console.error);
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    };
    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSelectTag = (tagName) => {
    if (!tags.includes(tagName)) {
      onAddTag(tagName);
    }
    setIsEditing(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
      setNewTag('');
    }
    setIsEditing(false);
  };

  const availableTags = globalTags.filter(t => !tags.includes(t.name));
  const filteredTags = newTag.trim() 
    ? availableTags.filter(t => t.name.toLowerCase().includes(newTag.toLowerCase()))
    : availableTags;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '15px', position: 'relative' }}>
      {tags.map((tag) => {
        const globalTag = globalTags.find(t => t.name === tag);
        const tagColor = globalTag ? globalTag.color : '#a78bfa';
        
        return (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#fff',
              background: `linear-gradient(135deg, ${tagColor}33 0%, ${tagColor}11 100%)`,
              border: `1px solid ${tagColor}55`,
              padding: '4px 10px',
              borderRadius: '12px',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Tag size={12} color={tagColor} />
            {tag}
            <button
              onClick={() => onRemoveTag(tag)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                marginLeft: '2px',
                transition: 'color 0.15s ease',
              }}
              onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
              onMouseOut={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
            >
              <X size={12} />
            </button>
          </span>
        );
      })}

      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setIsEditing(!isEditing)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: '700',
            color: isEditing ? '#fff' : 'rgba(255, 255, 255, 0.6)',
            background: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.03)',
            border: isEditing ? '1px solid rgba(255, 255, 255, 0.4)' : '1px dashed rgba(255, 255, 255, 0.2)',
            padding: '4px 10px',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => {
            if (!isEditing) {
              e.currentTarget.style.color = '#fff';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            }
          }}
          onMouseOut={e => {
            if (!isEditing) {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }
          }}
        >
          {isEditing ? <X size={12} /> : <Plus size={12} />}
          {isEditing ? T('detail.tags.cancel') : T('detail.tags.add')}
        </button>

        {isEditing && (
          <div style={{
            position: 'absolute',
            top: '30px',
            left: 0,
            zIndex: 1000,
            width: '240px',
            background: '#18181b',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                type="text"
                placeholder={T('detail.tags.search_placeholder')}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                autoFocus
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  color: '#fff',
                  fontSize: '12px',
                  outline: 'none',
                  flex: 1,
                  transition: 'all 0.2s',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#3b82f6',
                  borderRadius: '8px',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Check size={14} />
              </button>
            </form>

            <div style={{ 
              maxHeight: '160px', 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '4px',
              paddingRight: '2px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: '800', color: 'rgba(255, 255, 255, 0.4)', padding: '4px 2px 2px 2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {T('detail.tags.available')}
              </div>
              {filteredTags.length > 0 ? (
                filteredTags.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTag(t.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      width: '100%',
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      padding: '6px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.background = 'none';
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: t.color || '#3b82f6' }} />
                    {t.name}
                  </button>
                ))
              ) : (
                <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', padding: '10px 4px', textAlign: 'center', fontStyle: 'italic' }}>
                  {newTag.trim() ? T('detail.tags.create_hint') : T('detail.tags.none_available')}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomTagsList;

