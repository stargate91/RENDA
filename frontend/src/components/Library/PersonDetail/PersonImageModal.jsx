import React, { useRef } from 'react';
import { Upload, Link } from 'lucide-react';

const PersonImageModal = ({
  data,
  updatingProfile,
  onClose,
  onSelectImage,
  onCustomUpload,
  onCustomUrl,
  T,
  API_BASE
}) => {
  const fileInputRef = useRef(null);

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: '#121318',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          width: '90%',
          maxWidth: '640px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#fff' }}>{T('detail.choose_profile')}</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>{T('detail.select_portrait', { name: data.name })}</p>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
        </div>

        {/* Custom Upload Actions */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '12px' }}>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={onCustomUpload} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={updatingProfile !== null}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', color: '#3b82f6', fontWeight: '600', cursor: updatingProfile ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)')}
            onMouseOut={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)')}
          >
            {updatingProfile === 'upload' ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(59,130,246,0.3)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Upload size={16} />}
            {T('detail.upload_file')}
          </button>
          <button 
            onClick={onCustomUrl}
            disabled={updatingProfile !== null}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', color: '#fff', fontWeight: '600', cursor: updatingProfile ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
            onMouseOver={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)')}
            onMouseOut={e => !updatingProfile && (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)')}
          >
            {updatingProfile === 'url' ? <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> : <Link size={16} />}
            {T('detail.set_url')}
          </button>
        </div>

        {/* Grid Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '16px' }}>
            {data.images && data.images.map((img, idx) => {
              const isCurrent = data.profile_path === img;
              const isUpdating = updatingProfile === img;
              const imageUrl = img.startsWith('http')
                ? img
                : `${API_BASE}/media/images/persons${img}`;
              
              return (
                <div 
                  key={idx}
                  style={{
                    position: 'relative',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    aspectRatio: '2/3',
                    width: '100%',
                    cursor: isUpdating ? 'default' : 'pointer',
                    border: `3px solid ${isCurrent ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'}`,
                    transition: 'all 0.2s',
                    transform: isCurrent ? 'scale(0.98)' : 'none',
                    boxShadow: isCurrent ? '0 0 12px rgba(64, 169, 255, 0.4)' : 'none'
                  }}
                  onClick={() => !isUpdating && onSelectImage(img)}
                  className="modal-image-card"
                >
                  <img 
                    src={imageUrl} 
                    alt="" 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      opacity: isCurrent ? 1 : 0.75,
                      transition: 'opacity 0.2s'
                    }} 
                  />
                  
                  {/* Hover state overlay */}
                  <div 
                    className="modal-image-hover"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      background: 'rgba(0,0,0,0.3)',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                  />

                  {/* Selected Badge */}
                  {isCurrent && (
                    <div style={{ position: 'absolute', top: '8px', right: '8px', background: 'var(--accent-blue)', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700' }}>
                      ✓
                    </div>
                  )}

                  {/* Spinner overlay if saving */}
                  {isUpdating && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: '20px', height: '20px', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        .modal-image-card {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .modal-image-card:hover {
          border-color: var(--accent-blue) !important;
          transform: translateY(-4px) scale(1.02) !important;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4), 0 0 12px rgba(64, 169, 255, 0.25) !important;
        }
        .modal-image-card:hover img {
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );
};

export default PersonImageModal;
