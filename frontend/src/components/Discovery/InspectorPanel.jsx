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
      <div className="inspector-empty">
        <div className="empty-icon-wrapper">
          <div className="empty-pulse"></div>
          <div className="empty-icon-inner">🔍</div>
        </div>
        <h3>{T('inspector.details')}</h3>
        <p>{T('inspector.select_item')}</p>
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
              className="inspector-poster"
              src={`${API_BASE}${selectedItem.images[imageIndex].path}`}
              alt={T('inspector.media_alt')}
            />
            {selectedItem.images[imageIndex].type !== 'poster' && (
              <div className="carousel-type-badge">
                {selectedItem.images[imageIndex].type.toUpperCase()}
              </div>
            )}
            {selectedItem.images.length > 1 && (
              <div className="carousel-dots">
                {selectedItem.images.map((_, i) => (
                  <div key={i} className={`dot ${i === imageIndex ? 'active' : ''}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="inspector-card">
        <div className="inspector-item">
          <div className="inspector-label">{T('inspector.path')}</div>
          <div className="inspector-value code" style={{ color: '#ffffff' }}>
            {selectedItem.path || `${selectedItem.folder}/${selectedItem.filename}`}
          </div>
        </div>
        <div className="inspector-item">
          <div className="inspector-label">{T('inspector.planned')}</div>
          <div className="inspector-value" style={{ color: '#00ff64' }}>{selectedItem.planned_path || '-'}</div>
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

      <div className="inspector-actions">
        <button className="btn-secondary" style={{ flex: 1 }} onClick={() => fetchFullMetadata(selectedItem.id)}>
          {T('inspector.check_metadata')}
        </button>
        <button className="btn-secondary" style={{ width: '45px', padding: '0', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }} onClick={() => openOverride(selectedItem)} title={T('modal.override.action')}>
          <Settings size={18} />
        </button>
      </div>
    </>
  );
};

export default InspectorPanel;
