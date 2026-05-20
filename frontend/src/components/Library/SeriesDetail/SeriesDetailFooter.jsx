import React from 'react';
import { FolderOpen, RefreshCcw, Star } from 'lucide-react';
import { api } from '../../../services/api';

const SeriesDetailFooter = ({ data, openResolver, T }) => {
  return (
    <>
      {/* File Info */}
      {data.path && (
        <div className="detail-section" style={{ marginTop: '20px' }}>
          <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderOpen size={20} /> Folder
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                openResolver({
                  id: data.id,
                  title: data.title,
                  filename: data.filename || data.title,
                  type: 'series',
                  year: data.year
                });
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '11px',
                fontWeight: '600',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={e => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.4)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <RefreshCcw size={12} />
              {T('resolver.correct_match') || 'Párosítás javítása'}
            </button>
          </div>
          <div 
            className="file-path-display"
            onClick={() => data.path && api.revealInExplorer(data.path)}
            title="Click to reveal in file explorer"
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              wordBreak: 'break-all',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.color = 'var(--text-dim)';
            }}
          >
            {data.path}
          </div>
        </div>
      )}

      {/* External Links */}
      <div className="detail-section" style={{ marginTop: '20px' }}>
        <a
          className="external-link-btn tmdb"
          href={`https://www.themoviedb.org/tv/${data.series_tmdb_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Star size={14} /> View on TMDB
        </a>
      </div>
    </>
  );
};

export default SeriesDetailFooter;

