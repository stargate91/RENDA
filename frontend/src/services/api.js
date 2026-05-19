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
  getSettings: () => fetchJson('/api/settings'),
  
  updateSettings: (settings) => fetchJson('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  }),

  syncMetadataLanguage: () => fetchJson('/api/metadata/sync-language', { method: 'POST' }),

  getDiscoveryItems: () => fetchJson('/api/discovery'),

  getLibrary: () => fetchJson('/api/library'),

  getLibraryItemDetail: (itemId) => fetchJson(`/api/library/item/${itemId}`),

  getLibrarySeriesDetail: (seriesTmdbId) => fetchJson(`/api/library/series/${seriesTmdbId}`),

  getStats: () => fetchJson('/api/stats'),

  getScanStatus: () => fetchJson('/api/scan-status'),

  getImageStatus: () => fetchJson('/api/image-status'),

  resetImageStatus: () => fetchJson('/api/reset-image-status', { method: 'POST' }),

  triggerScan: (paths) => fetchJson('/api/scan', {
    method: 'POST',
    body: JSON.stringify({ paths }),
  }),

  getItemFullMetadata: (itemId) => fetchJson(`/api/item/${itemId}/full-metadata`),

  resetProgress: (itemId) => fetchJson(`/api/library/item/${itemId}/reset-progress`, { method: 'POST' }),

  retryItemImage: (itemId) => fetchJson(`/api/item/${itemId}/retry-image`, { method: 'POST' }),



  uploadPersonProfile: async (personId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/api/people/${personId}/upload-profile`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  },

  clearDatabase: (options) => fetchJson('/api/database/clear', {
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined,
  }),
  
  deleteItems: (itemIds, extraIds) => fetchJson('/api/discovery/delete', {
    method: 'POST',
    body: JSON.stringify({ item_ids: itemIds, extra_ids: extraIds }),
  }),

  updateMedia: (id, type, updates) => fetchJson('/api/media/update', {
    method: 'POST',
    body: JSON.stringify({ id, type, updates }),
  }),

  searchMetadata: (query, type, year, language) => {
    const params = new URLSearchParams({
      query: query,
      item_type: type,
      language: language || 'en-US'
    });
    if (year) params.append('year', year);
    return fetchJson(`/api/metadata/search?${params.toString()}`);
  },

  resolveMetadata: (itemId, tmdbId, type, season, episode, episodes, targets) => fetchJson('/api/metadata/resolve', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId, tmdb_id: tmdbId, item_type: type, season, episode, episodes, targets }),
  }),
  
  getTVSeasons: (tmdbId, language) => {
    const params = new URLSearchParams({ language: language || 'en-US' });
    return fetchJson(`/api/metadata/tv/${tmdbId}/seasons?${params.toString()}`);
  },

  getTVSeasonEpisodes: (tmdbId, seasonNumber, language) => {
    const params = new URLSearchParams({ language: language || 'en-US' });
    return fetchJson(`/api/metadata/tv/${tmdbId}/season/${seasonNumber}/episodes?${params.toString()}`);
  },

  revealInExplorer: (path) => fetchJson('/api/reveal', {
    method: 'POST',
    body: JSON.stringify({ path }),
  }),

  startRename: () => fetchJson('/api/rename/start', {
    method: 'POST'
  }),

  fetchHistory: () => fetchJson('/api/history'),

  undoRename: (batchId) => fetchJson(`/api/rename/undo/${batchId}`, {
    method: 'POST'
  }),

  getPeople: (search, role, sortBy) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (role) params.append('role', role);
    if (sortBy) params.append('sort_by', sortBy);
    return fetchJson(`/api/people?${params.toString()}`);
  },

  updatePersonStatus: (personId, updates) => fetchJson(`/api/people/${personId}/status`, {
    method: 'POST',
    body: JSON.stringify(updates),
  }),

  updatePersonProfile: (personId, profilePath) => fetchJson(`/api/people/${personId}/profile`, {
    method: 'POST',
    body: JSON.stringify({ profile_path: profilePath }),
  }),

  getPersonDetail: (personId) => fetchJson(`/api/people/${personId}`),
  
  searchPeopleTMDB: (query, language) => {
    const params = new URLSearchParams({ query });
    if (language) params.append('language', language);
    return fetchJson(`/api/people/search-tmdb?${params.toString()}`);
  },

  addPersonTMDB: (tmdbId) => fetchJson('/api/people/add-tmdb', {
    method: 'POST',
    body: JSON.stringify({ tmdb_id: tmdbId }),
  }),
  
  updateItemStatus: (itemId, updates) => fetchJson(`/api/item/${itemId}/status`, {
    method: 'POST',
    body: JSON.stringify(updates),
  }),
  
  bulkUpdateItemTags: (payload) => fetchJson('/api/media/bulk-tags', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  
  playMedia: (itemId) => fetchJson('/api/media/play', {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId })
  }),

  // Global Tags API
  getTags: () => fetchJson('/api/tags'),
  
  createTag: (tagData) => fetchJson('/api/tags', {
    method: 'POST',
    body: JSON.stringify(tagData)
  }),

  updateTag: (tagId, tagData) => fetchJson(`/api/tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify(tagData)
  }),

  deleteTag: (tagId) => fetchJson(`/api/tags/${tagId}`, {
    method: 'DELETE'
  }),

  // Trailer API (yt-dlp based)
  requestTrailerDownload: (trailerKey) => fetchJson(`/api/trailer/${trailerKey}`, {
    method: 'POST'
  }),

  getTrailerUrl: (trailerKey) => `${API_BASE}/api/trailer/${trailerKey}`,
};
