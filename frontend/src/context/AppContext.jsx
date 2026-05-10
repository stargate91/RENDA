import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import en from '../locales/en';

export const AppContext = createContext();

const API_BASE = "http://localhost:8000";

// Simple translation helper
export const T = (key, params = {}) => {
  const keys = key.split('.');
  let value = en;
  for (const k of keys) {
    if (value && value[k]) value = value[k];
    else return key;
  }
  if (typeof value === 'string') {
    let result = value;
    for (const [p, val] of Object.entries(params)) {
      result = result.replace(`{{${p}}}`, val);
    }
    return result;
  }
  return value;
};

export const AppProvider = ({ children }) => {
  const [view, setView] = useState('dashboard');
  const [items, setItems] = useState({ manual: [], movies: [], series: [], extras: [], collisions: [] });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [settings, setSettings] = useState({ user_name: '', tmdb_api_key: '', tmdb_bearer_token: '', imdb_api_key: '' });
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('api');
  const [saveStatus, setSaveStatus] = useState('');
  const [imageStatus, setImageStatus] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [stats, setStats] = useState({ total_movies: 0, total_series: 0, total_episodes: 0, storage: '0 MB', unmatched: 0 });
  const [fullMetadata, setFullMetadata] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const wasActiveRef = useRef(false);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  useEffect(() => {
    if (settings.user_name === '' && !showWelcomeModal) {
      const checkName = async () => {
        try {
          const res = await fetch(`${API_BASE}/settings`);
          const data = await res.json();
          if (!data.user_name) setShowWelcomeModal(true);
        } catch (e) {}
      };
      checkName();
    }
  }, [settings.user_name, showWelcomeModal]);

  useEffect(() => {
    const int = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/image-status`);
        const data = await res.json();
        setImageStatus(data);
      } catch (e) {}
    }, 2000);
    return () => clearInterval(int);
  }, []);

  useEffect(() => {
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (view === 'discovery') fetchDiscovery();
    else if (view === 'settings') fetchSettings();
    else if (view === 'dashboard') fetchStats();
  }, [view]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE}/settings`);
      const data = await response.json();
      setSettings(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/stats`);
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const saveSettings = async () => {
    try {
      setSaveStatus('Saving...');
      await fetch(`${API_BASE}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setSaveStatus('Saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus('Error saving');
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`${API_BASE}/scan-status`);
      const data = await response.json();
      setProgress(data);

      if (data.active) {
        setLoading(true);
        wasActiveRef.current = true;
      } else if (wasActiveRef.current) {
        wasActiveRef.current = false;
        setLoading(false);
        fetchDiscovery();
      }
    } catch (error) {
      console.error("Progress fetch failed:", error);
    }
  };

  const fetchDiscovery = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/discovery`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Failed to fetch discovery items:", error);
    }
    setLoading(false);
  };

  const handleScan = async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const selectedPath = await ipcRenderer.invoke('select-folder');
      if (!selectedPath) return;

      setLoading(true);
      await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [selectedPath] })
      });
    } catch (error) {
      console.error("Scan failed:", error);
      setLoading(false);
    }
  };

  const fetchFullMetadata = async (itemId) => {
    try {
      const res = await fetch(`${API_BASE}/item/${itemId}/full-metadata`);
      const data = await res.json();
      if(data.error) {
        alert(data.error);
        return;
      }
      setFullMetadata(data);
      setShowMetadataModal(true);
    } catch (e) {
      console.error(e);
      alert("Failed to fetch full metadata");
    }
  };

  const wipeDatabase = async () => {
    if (window.confirm('Are you absolutely sure you want to clear the entire database? This cannot be undone.')) {
      setSaveStatus('Clearing database...');
      try {
        const res = await fetch(`${API_BASE}/database/clear`, { method: 'POST' });
        if (res.ok) {
          setSaveStatus('Database cleared successfully!');
        } else {
          setSaveStatus('Error clearing database');
        }
        setTimeout(() => setSaveStatus(''), 4000);
      } catch (e) {
        setSaveStatus('Error clearing database');
      }
    }
  };

  return (
    <AppContext.Provider value={{
      view, setView,
      items, setItems,
      loading, setLoading,
      progress, setProgress,
      settings, setSettings,
      showWelcomeModal, setShowWelcomeModal,
      settingsTab, setSettingsTab,
      saveStatus, setSaveStatus,
      imageStatus, setImageStatus,
      selectedItem, setSelectedItem,
      stats, setStats,
      fullMetadata, setFullMetadata,
      showMetadataModal, setShowMetadataModal,
      fetchDiscovery, fetchStats, fetchSettings,
      handleScan, fetchFullMetadata, saveSettings, wipeDatabase,
      T, API_BASE
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
