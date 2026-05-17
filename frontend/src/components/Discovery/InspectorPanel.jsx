import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../services/api';
import { Search, Settings } from 'lucide-react';

const InspectorPanel = ({ selectedItem, fetchFullMetadata, openResolver, openOverride, T }) => {
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    setImageIndex(0);
  }, [selectedItem]);

  if (!selectedItem) {
    return (
      <div className="inspector-empty" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100%',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div className="empty-icon-wrapper" style={{ 
          position: 'relative', 
          width: '120px', 
          height: '120px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginBottom: '30px'
        }}>
          {/* Subtle glow behind the icon */}
          <div style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'var(--accent-blue)', 
            borderRadius: '50%', 
            opacity: 0.1, 
            filter: 'blur(20px)',
            animation: 'inspector-pulse 3s infinite'
          }}></div>
          
          <div style={{ 
            position: 'relative', 
            width: '80px', 
            height: '80px', 
            background: 'rgba(255,255,255,0.03)', 
            border: '1px solid var(--border-card)', 
            borderRadius: '24px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            transform: 'rotate(-5deg)'
          }}>
            <Search size={32} color="var(--accent-blue)" style={{ opacity: 0.8 }} />
          </div>
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '8px', color: '#fff' }}>
          {T('inspector.details')}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: '1.6', opacity: 0.7 }}>
          {T('inspector.select_item')}
        </p>
      </div>
    );
  }

  const hasTechnicalData = selectedItem.resolution || selectedItem.duration || selectedItem.video_codec || selectedItem.audio_codec;

  return (
    <>
      <div className="inspector-header">
        <h2 style={{ margin: 0, fontSize: '20px' }}>{T('inspector.details')}</h2>
      </div>

      {selectedItem.images && selectedItem.images.length > 0 && selectedItem.status?.toLowerCase() !== 'multiple' && selectedItem.status?.toLowerCase() !== 'no_match' && (
        <div className="inspector-carousel">
          <div className="carousel-container" onClick={() => setImageIndex((imageIndex + 1) % selectedItem.images.length)}>
            <img
              key={imageIndex}
              className="inspector-poster"
              src={`${API_BASE}${selectedItem.images[imageIndex].path}`}
              alt={T('inspector.media_alt')}
              style={{ animation: 'fadeIn 0.3s ease' }}
            />
            {selectedItem.images.length > 1 && (
              <>
                <div className="carousel-counter">
                  {imageIndex + 1} / {selectedItem.images.length}
                </div>
                <div className="carousel-dots">
                  {selectedItem.images.map((_, i) => (
                    <div
                      key={i}
                      className={`dot ${i === imageIndex ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setImageIndex(i); }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="inspector-card">
        <div className="inspector-item">
          <div className="inspector-label">{T('inspector.path')}</div>
          <div className="inspector-value code" style={{ color: '#ffffff', wordBreak: 'break-all', fontSize: '11px' }}>
            {selectedItem.path || `${selectedItem.folder}/${selectedItem.filename}`}
          </div>
        </div>
        <div className="inspector-item">
          <div className="inspector-label">{T('inspector.planned')}</div>
          <div className="inspector-value" style={{ 
            color: selectedItem.action === 'delete' ? '#ff4d4d' : '#00ff64', 
            fontWeight: selectedItem.action === 'delete' ? 'bold' : 'normal',
            wordBreak: 'break-all',
            opacity: (selectedItem.planned_path && selectedItem.planned_path !== selectedItem.filename) || (selectedItem.status === 'matched' || selectedItem.status === 'renamed' || selectedItem.status === 'organized') || selectedItem.action === 'delete' ? 1 : 0.5
          }}>
            {selectedItem.action === 'delete' 
              ? T('discovery.table.will_delete')
              : (selectedItem.planned_path && selectedItem.planned_path !== selectedItem.filename) 
                ? selectedItem.planned_path 
                : selectedItem.filename}
          </div>
        </div>
      </div>

      {hasTechnicalData && (
        <div className="inspector-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="inspector-item">
              <div className="inspector-label">{T('inspector.resolution')}</div>
              <div className="inspector-value">{selectedItem.resolution || '-'}</div>
            </div>
            <div className="inspector-item">
              <div className="inspector-label">{T('inspector.duration')}</div>
              <div className="inspector-value">
                {selectedItem.duration ? `${Math.floor(selectedItem.duration / 60)}${T('units.m')}` : '-'}
              </div>
            </div>
            <div className="inspector-item">
              <div className="inspector-label">{T('inspector.codecs')}</div>
              <div className="inspector-value">
                {selectedItem.video_codec ? `${selectedItem.video_codec.toUpperCase()}` : '-'}
                {selectedItem.audio_codec ? ` / ${selectedItem.audio_codec.toUpperCase()}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="inspector-actions" style={{ display: 'flex', gap: '0' }}>
        <button className="btn-secondary" style={{ width: '100%', fontWeight: '800' }} onClick={() => fetchFullMetadata(selectedItem.id)}>
          {T('inspector.check_metadata')}
        </button>
      </div>
    </>
  );
};

export default InspectorPanel;
