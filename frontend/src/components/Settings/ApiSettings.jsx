import React from 'react';
import { Database, KeyRound, ShieldCheck, Info, ExternalLink, HelpCircle } from 'lucide-react';

const ApiSettings = ({ settings, setSettings, T }) => {
  return (
    <div className="settings-card">
      <div className="privacy-notice-card" style={{ 
        background: 'rgba(0, 136, 255, 0.05)', 
        border: '1px solid rgba(0, 136, 255, 0.2)', 
        padding: '20px', 
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <div className="privacy-icon" style={{ 
          background: 'rgba(0, 136, 255, 0.1)', 
          padding: '12px', 
          borderRadius: '50%',
          color: 'var(--accent-blue)'
        }}>
          <ShieldCheck size={28} />
        </div>
        <div className="privacy-text" style={{ fontSize: '14px', lineHeight: '1.5' }}>
          <strong style={{ display: 'block', marginBottom: '2px', color: 'var(--accent-blue)' }}>{T('settings.api.privacy_title')}</strong>
          <span style={{ color: 'var(--text-dim)' }}>{T('settings.api.privacy_text')}</span>
        </div>
      </div>

      <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
        <div className="section-label" style={{ marginTop: '0' }}><Database size={14} /> {T('settings.api.tmdb_label')}</div>
        
        <div className="form-group split" style={{ marginBottom: '20px' }}>
          <div className="form-group-info">
            <label>{T('settings.api.tmdb_key_v3')}</label>
            <div className="input-hint">The Movie Database API Key.</div>
          </div>
          <div className="form-group-input" style={{ width: '350px' }}>
            <input
              type="password"
              className="form-input"
              value={settings.tmdb_api_key || ''}
              onChange={e => setSettings({ ...settings, tmdb_api_key: e.target.value })}
              placeholder="e.g. f1055eab900ebbd..."
            />
          </div>
        </div>

        <div className="form-group split">
          <div className="form-group-info">
            <label>{T('settings.api.tmdb_token_v4')}</label>
            <div className="input-hint">Read Access Token (v4 auth).</div>
          </div>
          <div className="form-group-input" style={{ width: '350px' }}>
            <input
              type="password"
              className="form-input"
              value={settings.tmdb_bearer_token || ''}
              onChange={e => setSettings({ ...settings, tmdb_bearer_token: e.target.value })}
              placeholder="Read Access Token..."
            />
          </div>
        </div>

        <div className="setup-guide-card" style={{ marginTop: '25px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--text-main)', fontSize: '13px', fontWeight: '800' }}>
            <HelpCircle size={14} color="var(--accent-blue)" /> {T('settings.api.tmdb_guide_title')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>01</span>
              <span>Create an account at <a href="https://themoviedb.org" target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>themoviedb.org <ExternalLink size={10} style={{ display: 'inline' }} /></a></span>
            </div>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>02</span>
              <span>Go to Settings &gt; API from your profile.</span>
            </div>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>03</span>
              <span>Click 'Create' and select 'Developer'.</span>
            </div>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>04</span>
              <span>Copy the 'API Key (v3)' or 'Read Access Token' here.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '25px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', marginTop: '30px' }}>
        <div className="section-label" style={{ marginTop: '0' }}><KeyRound size={14} /> {T('settings.api.omdb_label')}</div>
        
        <div className="form-group split">
          <div className="form-group-info">
            <label>{T('settings.api.omdb_key')}</label>
            <div className="input-hint">Used for IMDb ratings and secondary metadata.</div>
          </div>
          <div className="form-group-input" style={{ width: '350px' }}>
            <input
              type="password"
              className="form-input"
              value={settings.imdb_api_key || ''}
              onChange={e => setSettings({ ...settings, imdb_api_key: e.target.value })}
              placeholder="e.g. 1dabf98c"
            />
          </div>
        </div>

        <div className="setup-guide-card" style={{ marginTop: '25px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: 'var(--text-main)', fontSize: '13px', fontWeight: '800' }}>
            <HelpCircle size={14} color="var(--accent-blue)" /> {T('settings.api.omdb_guide_title')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>01</span>
              <span>Go to <a href="http://omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer" style={{ color: '#fff', textDecoration: 'underline' }}>omdbapi.com <ExternalLink size={10} style={{ display: 'inline' }} /></a></span>
            </div>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>02</span>
              <span>Choose 'FREE' and enter your email.</span>
            </div>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>03</span>
              <span>Check your inbox and click the activation link.</span>
            </div>
            <div className="guide-step" style={{ fontSize: '12px', color: 'var(--text-dim)', display: 'flex', gap: '10px' }}>
              <span style={{ color: 'var(--accent-blue)', fontWeight: '900' }}>04</span>
              <span>Copy the key provided in the email here.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiSettings;
