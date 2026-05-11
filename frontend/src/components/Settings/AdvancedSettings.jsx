import React from 'react';
import { Trash2, AlertTriangle, Cpu, ShieldAlert } from 'lucide-react';

const AdvancedSettings = ({ wipeDatabase, T }) => {
  return (
    <div className="settings-card">
      <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
        <div className="section-label" style={{ marginTop: '0' }}><Cpu size={14} /> SYSTEM ENGINE</div>
        <div className="input-hint" style={{ color: 'var(--text-dim)', fontSize: '13px', lineHeight: '1.6' }}>
          {T('settings.advanced.desc')}
        </div>
      </div>

      <div className="danger-zone-card" style={{ 
        marginTop: '40px', 
        padding: '35px', 
        background: 'rgba(255, 30, 30, 0.03)', 
        border: '1px solid rgba(255, 60, 60, 0.2)', 
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 40px rgba(255, 0, 0, 0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background glow */}
        <div style={{ 
          position: 'absolute', 
          top: '-20%', 
          right: '-10%', 
          width: '300px', 
          height: '300px', 
          background: 'radial-gradient(circle, rgba(255, 0, 0, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="section-label" style={{ marginTop: '0', color: '#ff4d4d', fontWeight: '900', letterSpacing: '2px' }}>
          <ShieldAlert size={16} /> DANGER ZONE
        </div>
        
        <div className="form-group split" style={{ border: 'none', padding: '0', alignItems: 'center', marginTop: '20px' }}>
          <div className="form-group-info" style={{ maxWidth: '60%' }}>
            <label style={{ color: '#fff', fontSize: '20px', fontWeight: '800', marginBottom: '10px', display: 'block' }}>
              {T('settings.advanced.wipe_label')}
            </label>
            <div className="input-hint" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.6' }}>
              {T('settings.advanced.wipe_hint')}
            </div>
          </div>

          <div className="form-group-input" style={{ justifyContent: 'center', flex: 1 }}>
            <button
              className="danger-btn-pro"
              onClick={wipeDatabase}
              style={{
                background: 'linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)',
                border: 'none',
                color: '#fff',
                padding: '16px 32px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '15px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: '0 8px 25px rgba(255, 60, 60, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseOver={e => {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 60, 60, 0.5)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 60, 60, 0.3)';
              }}
            >
              <Trash2 size={18} /> {T('settings.advanced.wipe_btn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
