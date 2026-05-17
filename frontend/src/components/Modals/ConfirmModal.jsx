import React from 'react';
import { AlertTriangle, Info, CloudDownload } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const ConfirmModal = () => {
  const { confirmDialog, setConfirmDialog, T } = useAppContext();

  if (!confirmDialog.isOpen) return null;

  const handleConfirm = () => {
    if (confirmDialog.onConfirm) confirmDialog.onConfirm();
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const handleCancel = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
  };

  const isInfo = confirmDialog.type === 'info';
  const colorBase = isInfo ? '52, 152, 219' : '255, 60, 60';
  const Icon = isInfo ? CloudDownload : AlertTriangle;
  const iconColor = isInfo ? '#3498db' : 'var(--danger)';

  return (
    <div className="modal-overlay" style={{ animation: 'fade-in 0.3s ease' }}>
      <div className="modal-content" style={{ 
        textAlign: 'center', 
        background: 'linear-gradient(180deg, rgba(30, 30, 35, 0.95), rgba(15, 15, 20, 0.98))',
        backdropFilter: 'blur(30px)',
        border: `1px solid rgba(${colorBase}, 0.2)`,
        borderTop: `1px solid rgba(${colorBase}, 0.4)`,
        boxShadow: `0 30px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,0,0,0.5), 0 0 40px rgba(${colorBase}, 0.1) inset`,
        borderRadius: '24px',
        padding: '40px',
        maxWidth: '450px',
        animation: 'slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: `rgba(${colorBase}, 0.1)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto',
          border: `1px solid rgba(${colorBase}, 0.2)`
        }}>
          <Icon size={32} color={iconColor} />
        </div>
        <h2 style={{ color: '#fff', marginBottom: '15px', fontSize: '24px', fontWeight: '800', letterSpacing: '0.5px' }}>
          {confirmDialog.title}
        </h2>
        <p style={{ marginBottom: '35px', lineHeight: '1.6', color: 'var(--text-dim)', fontSize: '15px' }}>
          {confirmDialog.message}
        </p>
        <div className="modal-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button className="btn-secondary" style={{ flex: 1, padding: '14px', borderRadius: '12px' }} onClick={handleCancel}>
            {T('modal.confirm.cancel')}
          </button>
          <button 
            className={isInfo ? "btn-primary" : "btn-danger"} 
            style={{ 
              flex: 1, 
              padding: '14px', 
              borderRadius: '12px', 
              background: `rgba(${colorBase}, 0.15)`, 
              border: `1px solid rgba(${colorBase}, 0.3)`, 
              color: iconColor, 
              boxShadow: 'none' 
            }} 
            onClick={handleConfirm}
          >
            {T('modal.confirm.yes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
