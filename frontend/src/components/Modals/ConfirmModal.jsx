import React from 'react';
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

  return (
    <div className="modal-overlay">
      <div className="modal-content danger-modal" style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#ff3c3c', marginBottom: '15px' }}>{confirmDialog.title}</h2>
        <p style={{ marginBottom: '25px', lineHeight: '1.5', color: '#ccc' }}>{confirmDialog.message}</p>
        <div className="modal-actions" style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={handleCancel}>{T('modal.confirm.cancel')}</button>
          <button className="btn-danger" onClick={handleConfirm}>{T('modal.confirm.yes')}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
