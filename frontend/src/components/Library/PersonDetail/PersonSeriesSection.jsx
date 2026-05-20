import React from 'react';
import { Tv, Eye, EyeOff } from 'lucide-react';

const PersonSeriesSection = ({ 
  series, 
  showMissingSeries, 
  onToggleShowMissing, 
  onSeriesClick, 
  T, 
  API_BASE 
}) => {
  if (!series || series.length === 0) return null;

  const displayedSeries = showMissingSeries 
    ? series 
    : series.filter(s => s.in_library);
  const totalSeriesCount = series.length;
  const librarySeriesCount = series.filter(s => s.in_library).length;
  const missingSeriesCount = totalSeriesCount - librarySeriesCount;

  return (
    <div className="detail-section" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Tv size={20} /> {T('detail.series_library_status', { library: librarySeriesCount, total: totalSeriesCount })}
        </div>
        
        {missingSeriesCount > 0 && (
          <button 
            onClick={onToggleShowMissing}
            style={{
              marginLeft: 'auto',
              background: showMissingSeries ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: showMissingSeries ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: showMissingSeries ? '#4CAF50' : 'var(--text-dim)',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(8px)',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.15)';
              if (!showMissingSeries) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              if (!showMissingSeries) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {showMissingSeries ? (
              <>
                <Eye size={12} /> {T('detail.hide_missing')}
              </>
            ) : (
              <>
                <EyeOff size={12} /> {T('detail.show_missing', { count: missingSeriesCount })}
              </>
            )}
          </button>
        )}
      </div>
      <div className="info-grid" style={{ transition: 'all 0.3s ease' }}>
        {displayedSeries.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            color: 'rgba(255,255,255,0.3)', 
            fontSize: '13px', 
            fontStyle: 'italic', 
            padding: '24px 16px',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(255,255,255,0.05)',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            {T('detail.no_series_library')}
          </div>
        ) : (
          displayedSeries.map(show => {
            const posterUrl = show.poster_path 
              ? (show.in_library 
                  ? `${API_BASE}/media/images/posters${show.poster_path}`
                  : `https://image.tmdb.org/t/p/w185${show.poster_path}`)
              : null;

            return (
              <div 
                key={show.id} 
                className="info-card"
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  cursor: 'pointer', 
                  alignItems: 'center',
                  opacity: show.in_library ? 1 : 0.65,
                  border: show.in_library ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                  background: show.in_library ? 'rgba(76, 175, 80, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  if (show.in_library) {
                    onSeriesClick(show.library_series_tmdb_id);
                  } else {
                    onSeriesClick('tmdb_' + show.id);
                  }
                }}
                onMouseOver={e => {
                  if (show.in_library) {
                    e.currentTarget.style.background = 'rgba(76, 175, 80, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                  } else {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={e => {
                  if (show.in_library) {
                    e.currentTarget.style.background = 'rgba(76, 175, 80, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.2)';
                  } else {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                  }
                  e.currentTarget.style.transform = 'none';
                }}
              >
                <div style={{ width: '48px', height: '72px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.05)' }}>
                  {posterUrl ? (
                    <img src={posterUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Tv size={16} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                    {show.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {show.year ? `${show.year} • ` : ''}{show.job}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {show.rating > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: '700' }}>
                        ★ {show.rating.toFixed(1)}
                      </span>
                    )}
                    {show.in_library ? (
                      <span style={{ fontSize: '10px', color: '#4CAF50', background: 'rgba(76, 175, 80, 0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: '700' }}>
                        ✓ {T('detail.in_library')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.03)', padding: '1px 5px', borderRadius: '4px' }}>
                        {T('detail.missing')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PersonSeriesSection;
