import React from 'react';
import { Clapperboard, Users, User } from 'lucide-react';

const MovieDetailCast = ({ directors, cast, onPersonClick, T, API_BASE }) => {
  return (
    <>
      {/* Directors */}
      {directors && directors.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            <Clapperboard size={20} /> {T('detail.directors')}
          </div>
          <div className="director-row">
            {directors.map(d => (
              <div 
                key={d.id} 
                className="director-card"
                onClick={() => onPersonClick && onPersonClick(d.id)}
                style={{ cursor: onPersonClick ? 'pointer' : 'default' }}
              >
                <div className="director-card-img">
                  {d.profile_path ? (
                    <img 
                      src={d.profile_path.startsWith('http') ? d.profile_path : `${API_BASE}/media/images/persons${d.profile_path}`} 
                      alt={d.name} 
                    />
                  ) : (
                    <div className="cast-card-img-placeholder">
                      <User size={20} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="director-card-name">{d.name}</div>
                  <div className="director-card-job">{d.job}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cast */}
      {cast && cast.length > 0 && (
        <div className="detail-section">
          <div className="detail-section-title">
            <Users size={20} /> {T('detail.cast')}
          </div>
          <div className="cast-scroll">
            {cast.map(c => (
              <div 
                key={c.id} 
                className="cast-card"
                onClick={() => onPersonClick && onPersonClick(c.id)}
                style={{ cursor: onPersonClick ? 'pointer' : 'default' }}
              >
                <div className="cast-card-img">
                  {c.profile_path ? (
                    <img 
                      src={c.profile_path.startsWith('http') ? c.profile_path : `${API_BASE}/media/images/persons${c.profile_path}`} 
                      alt={c.name} 
                    />
                  ) : (
                    <div className="cast-card-img-placeholder">
                      <User size={24} color="var(--text-muted)" />
                    </div>
                  )}
                </div>
                <div className="cast-card-name">{c.name}</div>
                {c.character && <div className="cast-card-character">{c.character}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MovieDetailCast;
