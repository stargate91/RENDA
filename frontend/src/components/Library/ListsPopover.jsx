import React, { useState, useEffect, useRef } from 'react';
import { X, Check, Plus } from 'lucide-react';
import { api } from '../../services/api';

const ListsPopover = ({ itemId, movieTitle, moviePoster, onClose, T }) => {
  const [lists, setLists] = useState([]);
  const [membershipIds, setMembershipIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState('#0088ff');
  const [isCreating, setIsCreating] = useState(false);
  const popoverRef = useRef(null);

  const colors = ['#0088ff', '#ff3c3c', '#00ff64', '#ffc832', '#a78bfa'];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [allLists, membership] = await Promise.all([
          api.getLists(),
          api.getItemMembership(itemId)
        ]);
        setLists(allLists || []);
        setMembershipIds(membership?.list_ids || []);
      } catch (e) {
        console.error("Failed to load list membership data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [itemId]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleToggle = async (listId, isCurrentlyMember) => {
    try {
      if (isCurrentlyMember) {
        if (String(itemId).startsWith('tmdb_')) {
          const tmdbId = parseInt(itemId.split('_')[1]);
          await api.removeFromListByTmdb(listId, tmdbId);
        } else {
          await api.removeFromListByMediaItem(listId, itemId);
        }
        setMembershipIds(prev => prev.filter(id => id !== listId));
      } else {
        const itemData = {
          title: movieTitle,
          poster_path: moviePoster,
          media_type: 'movie'
        };
        if (String(itemId).startsWith('tmdb_')) {
          itemData.tmdb_id = parseInt(itemId.split('_')[1]);
        } else {
          itemData.media_item_id = parseInt(itemId);
        }
        await api.addToList(listId, itemData);
        setMembershipIds(prev => [...prev, listId]);
      }
    } catch (e) {
      console.error("Failed to toggle list membership:", e);
    }
  };

  const handleCreateList = async (e) => {
    e.preventDefault();
    const name = newListName.trim();
    if (!name) return;

    try {
      const newList = await api.createList({
        name,
        color: newListColor,
        description: '',
        icon: 'ListVideo'
      });
      setLists(prev => [...prev, newList]);
      setNewListName('');
      setIsCreating(false);
    } catch (e) {
      console.error("Failed to create list:", e);
    }
  };

  return (
    <div 
      ref={popoverRef}
      style={{
        position: 'absolute',
        top: '40px',
        left: '0',
        zIndex: 1100,
        width: '280px',
        background: 'rgba(15, 15, 20, 0.95)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        padding: '16px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.9)' }}>
          {T('detail.lists.title') || 'Add to Lists'}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255, 255, 255, 0.4)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <X size={14} />
        </button>
      </div>

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

      {loading ? (
        <div style={{ padding: '20px 0', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.08)', borderTopColor: 'var(--accent-blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      ) : (
        <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {lists.length > 0 ? (
            lists.map(l => {
              const isChecked = membershipIds.includes(l.id);
              return (
                <div 
                  key={l.id}
                  onClick={() => handleToggle(l.id, isChecked)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: isChecked ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseOut={e => e.currentTarget.style.background = isChecked ? 'rgba(255, 255, 255, 0.03)' : 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: l.color || '#0088ff', boxShadow: `0 0 8px ${l.color || '#0088ff'}aa` }} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: isChecked ? '#fff' : 'rgba(255, 255, 255, 0.7)' }}>{l.name}</span>
                  </div>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '4px',
                    border: isChecked ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
                    backgroundColor: isChecked ? 'var(--accent-blue)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s'
                  }}>
                    {isChecked && <Check size={10} color="#fff" strokeWidth={3} />}
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', padding: '15px 0', fontStyle: 'italic' }}>
              {T('detail.lists.none') || 'No custom lists created.'}
            </div>
          )}
        </div>
      )}

      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

      {!isCreating ? (
        <button 
          onClick={() => setIsCreating(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px dashed rgba(255, 255, 255, 0.15)',
            borderRadius: '8px',
            color: 'rgba(255, 255, 255, 0.7)',
            padding: '8px',
            fontSize: '11px',
            fontWeight: '700',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            width: '100%'
          }}
          onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'; e.currentTarget.style.color = '#fff'; }}
          onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'; e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'; }}
        >
          <Plus size={12} /> {T('detail.lists.create_new') || 'Create New List'}
        </button>
      ) : (
        <form onSubmit={handleCreateList} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input 
            type="text"
            placeholder={T('detail.lists.new_placeholder') || 'Enter list name...'}
            value={newListName}
            onChange={e => setNewListName(e.target.value)}
            autoFocus
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none',
              width: '100%'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '4px' }}>
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewListColor(c)}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: c,
                    border: newListColor === c ? '2px solid #fff' : '1px solid rgba(0,0,0,0.3)',
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'transform 0.1s',
                    transform: newListColor === c ? 'scale(1.15)' : 'none'
                  }}
                />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                type="button"
                onClick={() => setIsCreating(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {T('common.cancel') || 'Cancel'}
              </button>
              <button 
                type="submit"
                disabled={!newListName.trim()}
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  color: '#3b82f6',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  opacity: newListName.trim() ? 1 : 0.5,
                }}
              >
                {T('common.create') || 'Create'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ListsPopover;
