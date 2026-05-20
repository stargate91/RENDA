import React, { useState } from 'react';
import { Trash2, Cpu, ShieldAlert, CheckSquare, Square } from 'lucide-react';

const AdvancedSettings = ({ wipeDatabase, T }) => {
  const [options, setOptions] = useState({
    discovery: true,
    library: true,
    tags: true,
    history: true,
    all: true
  });

  const handleToggle = (key) => {
    setOptions(prev => {
      const next = { ...prev };
      if (key === 'all') {
        const newVal = !prev.all;
        next.all = newVal;
        next.discovery = newVal;
        next.library = newVal;
        next.tags = newVal;
        next.history = newVal;
      } else {
        next[key] = !prev[key];
        // If all sub-options are checked, 'all' is true, else false
        next.all = next.discovery && next.library && next.tags && next.history;
      }
      return next;
    });
  };

  const handleWipe = () => {
    // If no option is selected, return
    if (!options.discovery && !options.library && !options.tags && !options.history && !options.all) {
      return;
    }
    // Pass selected options to wipeDatabase context function
    wipeDatabase(options);
  };

  const isAnySelected = options.discovery || options.library || options.tags || options.history || options.all;

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
        background: 'rgba(255, 30, 30, 0.02)', 
        border: '1px solid rgba(255, 60, 60, 0.15)', 
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 10px 40px rgba(255, 0, 0, 0.03)',
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
          background: 'radial-gradient(circle, rgba(255, 0, 0, 0.05) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div className="section-label" style={{ marginTop: '0', color: '#ff4d4d', fontWeight: '900', letterSpacing: '2px' }}>
          <ShieldAlert size={16} /> DANGER ZONE
        </div>

        <div style={{ marginTop: '20px' }}>
          <label style={{ color: '#fff', fontSize: '20px', fontWeight: '800', marginBottom: '10px', display: 'block' }}>
            {T('settings.advanced.wipe_label')}
          </label>
          <div className="input-hint" style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.6', marginBottom: '25px' }}>
            {T('settings.advanced.wipe_hint')}
          </div>

          {/* Selective Options Checklist */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px', 
            background: 'rgba(0,0,0,0.2)', 
            padding: '20px', 
            borderRadius: '12px', 
            border: '1px solid rgba(255, 255, 255, 0.05)',
            marginBottom: '30px',
            maxWidth: '650px'
          }}>
            {/* All Checkbox */}
            <div 
              onClick={() => handleToggle('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: options.all ? 'rgba(255, 77, 77, 0.1)' : 'transparent',
                border: `1px solid ${options.all ? 'rgba(255, 77, 77, 0.3)' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                if (!options.all) e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
              }}
              onMouseOut={e => {
                if (!options.all) e.currentTarget.style.background = 'transparent';
              }}
            >
              {options.all ? <CheckSquare size={18} color="#ff4d4d" /> : <Square size={18} color="rgba(255,255,255,0.3)" />}
              <div>
                <div style={{ color: options.all ? '#ff4d4d' : '#fff', fontWeight: '700', fontSize: '14px' }}>Wipe Everything (All database data)</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>Wipe all media, library items, custom tags and historical logs. Local physical media files and settings are preserved.</div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.08)', margin: '4px 0' }} />

            {/* Option: Discovery */}
            <div 
              onClick={() => handleToggle('discovery')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {options.discovery ? <CheckSquare size={18} color="rgba(255,255,255,0.8)" /> : <Square size={18} color="rgba(255,255,255,0.2)" />}
              <div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>Scanned & Discovery Files</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>Clear physical files found in your folders that haven't been compiled into the library yet, including active matches.</div>
              </div>
            </div>

            {/* Option: Library */}
            <div 
              onClick={() => handleToggle('library')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {options.library ? <CheckSquare size={18} color="rgba(255,255,255,0.8)" /> : <Square size={18} color="rgba(255,255,255,0.2)" />}
              <div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>Organized Library & Performers</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>Clear the organized Movie, Series, Episode and Actor/Director catalog.</div>
              </div>
            </div>

            {/* Option: Tags */}
            <div 
              onClick={() => handleToggle('tags')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {options.tags ? <CheckSquare size={18} color="rgba(255,255,255,0.8)" /> : <Square size={18} color="rgba(255,255,255,0.2)" />}
              <div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>Custom Tags</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>Delete all custom pre-created library tags and dissociate them from media items and performers.</div>
              </div>
            </div>

            {/* Option: History */}
            <div 
              onClick={() => handleToggle('history')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              {options.history ? <CheckSquare size={18} color="rgba(255,255,255,0.8)" /> : <Square size={18} color="rgba(255,255,255,0.2)" />}
              <div>
                <div style={{ color: '#fff', fontWeight: '600', fontSize: '13px' }}>Operation History & Watch Logs</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', marginTop: '2px' }}>Clear renaming history logs, action batches, and playback watch counts.</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            className="danger-btn-pro"
            onClick={handleWipe}
            disabled={!isAnySelected}
            style={{
              background: isAnySelected 
                ? 'linear-gradient(135deg, #ff4d4d 0%, #cc0000 100%)' 
                : 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              color: isAnySelected ? '#fff' : 'rgba(255,255,255,0.2)',
              padding: '16px 36px',
              borderRadius: '12px',
              fontWeight: '800',
              fontSize: '15px',
              cursor: isAnySelected ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: isAnySelected ? '0 8px 25px rgba(255, 60, 60, 0.25)' : 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onMouseOver={e => {
              if (isAnySelected) {
                e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                e.currentTarget.style.boxShadow = '0 12px 35px rgba(255, 60, 60, 0.45)';
              }
            }}
            onMouseOut={e => {
              if (isAnySelected) {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 60, 60, 0.25)';
              }
            }}
          >
            <Trash2 size={18} /> {T('settings.advanced.wipe_btn')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSettings;
