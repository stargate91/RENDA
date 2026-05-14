import React from 'react';
import { CheckCircle2, AlertCircle, RotateCcw, X, ArrowRight, FileText, Film, Tv } from 'lucide-react';

const ActionSummaryModal = ({ show, summary, onClose, onUndo, T }) => {
  if (!show || !summary) return null;

  const { success_count, failed_count, batch_id } = summary;
  const total = success_count + failed_count;

  return (
    <div className="modal-overlay">
      <div className="modal-container premium summary-modal" style={{ width: '500px' }}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="title-icon-wrapper" style={{ background: failed_count > 0 ? 'var(--accent-orange-gradient)' : 'var(--accent-green-gradient)' }}>
              {failed_count > 0 ? <AlertCircle className="modal-icon" size={24} /> : <CheckCircle2 className="modal-icon" size={24} />}
            </div>
            <div>
              <h2>{T('modal.summary.title') || 'Organization Complete'}</h2>
              <p className="modal-subtitle">{T('modal.summary.subtitle', { count: total }) || `Processed ${total} items successfully`}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body" style={{ padding: '30px', textAlign: 'center' }}>
          <div className="summary-stats" style={{ display: 'flex', justifyContent: 'center', gap: '40px', marginBottom: '30px' }}>
            <div className="stat-item">
              <div className="stat-value" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-green)' }}>{success_count}</div>
              <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Successful</div>
            </div>
            {failed_count > 0 && (
              <div className="stat-item">
                <div className="stat-value" style={{ fontSize: '32px', fontWeight: '800', color: 'var(--accent-red)' }}>{failed_count}</div>
                <div className="stat-label" style={{ color: 'var(--text-dim)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Failed</div>
              </div>
            )}
          </div>

          <p style={{ color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '20px' }}>
            {T('modal.summary.message') || 'Your library has been reorganized according to your templates. You can view the full details in the History tab.'}
          </p>

          {batch_id && (
            <button 
              className="btn-secondary" 
              onClick={() => onUndo(batch_id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '12px' }}
            >
              <RotateCcw size={18} />
              {T('modal.summary.undo_now') || 'Undo This Operation Immediately'}
            </button>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onClose} style={{ minWidth: '120px' }}>
            {T('common.done') || 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionSummaryModal;
