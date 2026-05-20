import React from 'react';
import { Film, Eye, EyeOff } from 'lucide-react';

const PersonMoviesSection = ({ 
  movies, 
  showMissingMovies, 
  onToggleShowMissing, 
  onMovieClick, 
  T, 
  API_BASE 
}) => {
  if (!movies || movies.length === 0) return null;

  const displayedMovies = showMissingMovies 
    ? movies 
    : movies.filter(m => m.in_library);
  const totalMoviesCount = movies.length;
  const libraryMoviesCount = movies.filter(m => m.in_library).length;
  const missingMoviesCount = totalMoviesCount - libraryMoviesCount;

  return (
    <div className="detail-section" style={{ animation: 'fadeIn 0.4s ease-out' }}>
      <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Film size={20} /> {T('detail.movies_library_status', { library: libraryMoviesCount, total: totalMoviesCount })}
        </div>
        
        {missingMoviesCount > 0 && (
          <button 
            onClick={onToggleShowMissing}
            style={{
              marginLeft: 'auto',
              background: showMissingMovies ? 'rgba(76, 175, 80, 0.15)' : 'rgba(255, 255, 255, 0.04)',
              border: showMissingMovies ? '1px solid rgba(76, 175, 80, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
              color: showMissingMovies ? '#4CAF50' : 'var(--text-dim)',
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
              if (!showMissingMovies) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
              if (!showMissingMovies) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
            }}
          >
            {showMissingMovies ? (
              <>
                <Eye size={12} /> {T('detail.hide_missing')}
              </>
            ) : (
              <>
                <EyeOff size={12} /> {T('detail.show_missing', { count: missingMoviesCount })}
              </>
            )}
          </button>
        )}
      </div>
      <div className="info-grid" style={{ transition: 'all 0.3s ease' }}>
        {displayedMovies.length === 0 ? (
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
            {T('detail.no_movies_library')}
          </div>
        ) : (
          displayedMovies.map(movie => {
            const posterUrl = movie.poster_path 
              ? (movie.in_library 
                  ? `${API_BASE}/media/images/posters${movie.poster_path}`
                  : `https://image.tmdb.org/t/p/w185${movie.poster_path}`)
              : null;

            return (
              <div 
                key={movie.id} 
                className="info-card"
                style={{ 
                  display: 'flex', 
                  gap: '16px', 
                  cursor: 'pointer', 
                  alignItems: 'center',
                  opacity: movie.in_library ? 1 : 0.65,
                  border: movie.in_library ? '1px solid rgba(76, 175, 80, 0.2)' : '1px solid rgba(255, 255, 255, 0.04)',
                  background: movie.in_library ? 'rgba(76, 175, 80, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  if (movie.in_library) {
                    onMovieClick(movie.library_item_id);
                  } else {
                    onMovieClick('tmdb_' + movie.id);
                  }
                }}
                onMouseOver={e => {
                  if (movie.in_library) {
                    e.currentTarget.style.background = 'rgba(76, 175, 80, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(76, 175, 80, 0.4)';
                  } else {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={e => {
                  if (movie.in_library) {
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
                      <Film size={16} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: '700', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#fff' }}>
                    {movie.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {movie.year ? `${movie.year} • ` : ''}{movie.job}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                    {movie.rating > 0 && (
                      <span style={{ fontSize: '11px', color: 'var(--accent-yellow)', fontWeight: '700' }}>
                        ★ {movie.rating.toFixed(1)}
                      </span>
                    )}
                    {movie.in_library ? (
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

export default PersonMoviesSection;
