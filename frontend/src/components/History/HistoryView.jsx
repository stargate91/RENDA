import React, { useEffect } from 'react';
import { RotateCcw, Clock, CheckCircle2, AlertCircle, Calendar, Hash } from 'lucide-react';

const HistoryView = ({ history, fetchHistory, handleUndo, loading, T }) => {
  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <div className="history-container" style={{ padding: '40px' }}>
      <div className="history-header" style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '800', marginBottom: '10px' }}>
          {T('history.title')}
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '15px' }}>
          {T('history.subtitle')}
        </p>
      </div>

      <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {history.length === 0 ? (
          <div className="empty-history" style={{ 
            padding: '100px 20px', 
            textAlign: 'center',
            background: 'var(--bg-card)',
            borderRadius: '24px',
            border: '1px solid var(--border-card)'
          }}>
            <Clock size={48} style={{ color: 'var(--text-dim)', opacity: 0.2, marginBottom: '20px' }} />
            <p style={{ color: 'var(--text-dim)' }}>{T('history.empty')}</p>
          </div>
        ) : (
          history.map(batch => (
            <div key={batch.id} className="history-card" style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}>
              <div className="batch-main" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div className="status-icon" style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: batch.status === 'completed' ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 159, 64, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {batch.status === 'completed' ? (
                    <CheckCircle2 size={24} color="var(--success)" />
                  ) : (
                    <AlertCircle size={24} color="#ff9f40" />
                  )}
                </div>
                
                <div className="batch-info">
                  <div className="batch-name" style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>
                    {batch.name}
                  </div>
                  <div className="batch-meta" style={{ display: 'flex', gap: '15px', color: 'var(--text-dim)', fontSize: '13px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Calendar size={14} />
                      {new Date(batch.created_at).toLocaleString()}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Hash size={14} />
                      {T('history.items_count', { count: batch.success_count })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="batch-actions">
                <button 
                  className="btn-undo" 
                  onClick={() => handleUndo(batch.id)}
                  disabled={loading}
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-card)',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    fontSize: '13px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <RotateCcw size={16} />
                  {T('history.undo_action')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;
