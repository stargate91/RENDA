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
        background: 'rgba(22, 22, 28, 0.55)',
        backdropFilter: 'blur(25px) saturate(180%)',
        WebkitBackdropFilter: 'blur(25px) saturate(180%)',
        border: `1px solid rgba(${colorBase}, 0.18)`,
        borderTop: `1px solid rgba(${colorBase}, 0.35)`,
        boxShadow: `
          0 30px 60px rgba(0, 0, 0, 0.7),
          inset 0 1px 0 rgba(255, 255, 255, 0.08),
          0 0 40px rgba(${colorBase}, 0.06)
        `,
        borderRadius: '28px',
        padding: '45px 40px 40px 40px',
        maxWidth: '460px',
        animation: 'slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: `rgba(${colorBase}, 0.12)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 25px auto',
          border: `1px solid rgba(${colorBase}, 0.25)`,
          boxShadow: `0 0 20px rgba(${colorBase}, 0.15)`
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
            {confirmDialog.cancelText || T('modal.confirm.cancel')}
          </button>
          <button 
            className={isInfo ? "btn-primary" : "btn-danger"} 
            style={{ 
              flex: 1, 
              padding: '14px', 
              borderRadius: '12px', 
              background: `rgba(${colorBase}, 0.18)`, 
              border: `1px solid rgba(${colorBase}, 0.35)`, 
              color: '#fff', 
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: `0 4px 12px rgba(${colorBase}, 0.15)`
            }} 
            onClick={handleConfirm}
          >
            {confirmDialog.confirmText || T('modal.confirm.yes')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
