import React from 'react';
import { Clapperboard } from 'lucide-react';

const SeriesSeasonSelector = ({ seasons, activeSeasonNum, onSeasonChange, posterUrl, inLibrary, API_BASE }) => {
  return (
    <div className="season-selector-wrapper detail-section">
      <div className="detail-section-title" style={{ marginBottom: '15px' }}>Seasons</div>
      <div className="season-cards-scroll" style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '10px 4px' }}>
        {seasons.map(season => {
          const sPosterUrl = season.poster_path 
            ? `${API_BASE}/media/images/posters${season.poster_path}`
            : posterUrl;
          const isActive = activeSeasonNum === season.season_number;
          return (
            <div
              key={season.season_number}
              className={`season-card ${isActive ? 'active' : ''}`}
              onClick={() => onSeasonChange(season.season_number)}
              style={{
                minWidth: '120px',
                width: '120px',
                cursor: 'pointer',
                borderRadius: '12px',
                border: isActive ? '2px solid var(--accent-blue)' : '2px solid transparent',
                overflow: 'hidden',
                transition: 'transform 0.2s, border-color 0.2s',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                background: 'var(--bg-card)'
              }}
            >
              <div style={{ aspectRatio: '2/3', background: '#222' }}>
                {sPosterUrl ? (
                  <img src={sPosterUrl} alt={season.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                    <Clapperboard size={30} opacity={0.3} />
                  </div>
                )}
              </div>
              <div style={{ padding: '8px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold' }}>
                {season.title}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SeriesSeasonSelector;
