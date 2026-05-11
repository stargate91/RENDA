export const API_BASE = "http://localhost:8000";

const fetchJson = async (url, options = {}) => {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

export const api = {
  getSettings: () => fetchJson('/settings'),
  
  updateSettings: (settings) => fetchJson('/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  getDiscoveryItems: () => fetchJson('/discovery'),

  getStats: () => fetchJson('/stats'),

  getScanStatus: () => fetchJson('/scan-status'),

  triggerScan: (paths) => fetchJson('/scan', {
    method: 'POST',
    body: JSON.stringify({ paths }),
  }),

  getImageStatus: () => fetchJson('/image-status'),

  getItemFullMetadata: (itemId) => fetchJson(`/item/${itemId}/full-metadata`),

  clearDatabase: () => fetchJson('/database/clear', {
    method: 'POST',
  }),
  
  deleteItems: (itemIds, extraIds) => fetchJson('/discovery/delete', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds, extra_ids: extraIds }),
  }),

  updateMedia: (id, type, updates) => fetchJson('/media/update', {
    method: 'POST',
    body: JSON.stringify({ id, type, updates }),
  }),

  searchMetadata: (query, type, year, language) => 
    fetchJson(`/metadata/search?query=${encodeURIComponent(query)}&item_type=${type}&year=${year || ''}&language=${language || 'en-US'}`),

  resolveMetadata: (itemId, tmdbId, type, season, episode) => fetchJson('/metadata/resolve', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId, tmdb_id: tmdbId, item_type: type, season, episode }),
  }),
};
