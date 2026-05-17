import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
const localeFiles = import.meta.glob('../locales/*.js', { eager: true });
const locales = {};
export const availableLocales = [];

for (const path in localeFiles) {
  const code = path.match(/\/([a-z]{2})\.js$/)[1];
  const dict = localeFiles[path].default;
  locales[code] = dict;
  availableLocales.push({
    value: code,
    label: dict._lang_name || code.toUpperCase()
  });
}

export const AppContext = createContext();

// Simple translation helper
export const T = (key, params = {}, currentLang = 'en') => {
  const keys = key.split('.');
  let value = locales[currentLang] || locales['en'];
  
  for (const k of keys) {
    if (value && value[k]) value = value[k];
    else {
      // Fallback to English if key missing
      value = locales['en'];
      for (const f of keys) {
        if (value && value[f]) value = value[f];
        else return key;
      }
      break;
    }
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

import { api } from '../services/api';

const DEFAULT_SETTINGS = {
  user_name: '', 
  tmdb_api_key: '', tmdb_bearer_token: '', imdb_api_key: '',
  ui_language: 'en',
  default_scan_dir: '',
  primary_metadata_language: 'en',
  fallback_metadata_language: 'none',
  min_video_size_mb: 300,
  naming_filename_casing: 'title',
  naming_word_separator: 'space',
  naming_movie_template: '{{Title}} ({{Year}}) {{Resolution}}',
  naming_episode_template: '{{ShowTitle}} - S{{Season}}E{{Episode}} - {{EpisodeTitle}}',
  naming_part_keyword: 'Part',
  naming_numbering_style: '1, 2, 3..',
  naming_inner_separator: 'space',
  naming_custom_tag: 'default',
  folder_organization_enabled: true,
  folder_move_to_library: true,
  folder_library_path: '',
  folder_sort_by_type: true,
  folder_movies_name: 'Movies',
  folder_series_name: 'TV Shows',
  folder_create_movie_subdir: true,
  folder_movie_template: '{{Title}} ({{Year}})',
  folder_create_collection_dir: true,
  folder_collection_template: '{{Collection}}',
  folder_create_show_dir: true,
  folder_show_template: '{{ShowTitle}} ({{YearRange}})',
  folder_create_season_dir: true,
  folder_season_template: 'Season {{Season}}',
  folder_create_episode_dir: false,
  folder_episode_template: '{{ShowTitle}} - {{Season}}{{Episode}}',
  folder_remove_empty: true,
  extras_enabled: true,
  extras_sub_exts: '.srt, .sub, .ass, .ssa, .vtt',
  extras_audio_exts: '.mka, .ac3, .dts, .mp3, .flac, .wav, .m4a',
  extras_img_exts: '.jpg, .jpeg, .png, .gif, .bmp, .webp',
  extras_meta_exts: '.nfo, .xml, .txt',
  extras_video_action: 'rename',
  extras_video_template: '{{ParentName}}-{{SubCategory}}',
  extras_sub_action: 'rename',
  extras_sub_template: '{{ParentName}}.{{Language}}',
  extras_audio_action: 'rename',
  extras_audio_template: '{{ParentName}}.{{Language}}',
  extras_img_action: 'rename',
  extras_img_template: '{{SubCategory}}',
  extras_meta_action: 'rename',
  extras_meta_template: '{{ParentName}}',
  extras_folder_mode: 'subfolder',
  ui_theme: 'dark_pro',
  include_adult: false,
};

export const AppProvider = ({ children }) => {
  const [view, setView] = useState('dashboard');
  const [items, setItems] = useState({ manual: [], movies: [], series: [], extras: [], collisions: [] });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [initialSettings, setInitialSettings] = useState(null);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general');
  const [saveStatus, setSaveStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [imageStatus, setImageStatus] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]); // Array of IDs being selected for bulk actions
  const [stats, setStats] = useState({ total_movies: 0, total_series: 0, total_episodes: 0, storage: '0 MB', drive_count: 0, unmatched: 0 });
  const [fullMetadata, setFullMetadata] = useState(null);
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [showResolverModal, setShowResolverModal] = useState(false);
  const [resolverItem, setResolverItem] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null });
  const wasActiveRef = useRef(false);
  const scanTriggeredRef = useRef(false);

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  useEffect(() => {
    if (settings.user_name === '' && !showWelcomeModal) {
      const checkName = async () => {
        try {
          const data = await api.getSettings();
          if (!data.user_name) setShowWelcomeModal(true);
        } catch (e) {}
      };
      checkName();
    }
  }, [settings.user_name, showWelcomeModal]);

  useEffect(() => {
    const int = setInterval(async () => {
      try {
        const data = await api.getImageStatus();
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
    if (initialSettings && settings) {
      const isDirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
      
      if (isDirty) {
        setIsSettingsDirty(true);
      } else {
        setIsSettingsDirty(false);
      }
    }
  }, [settings, initialSettings]);

  useEffect(() => {
    if (view === 'settings') fetchSettings();
    else if (view === 'dashboard') fetchStats();
    
    if (view !== 'discovery') setSelectedItem(null);
  }, [view]);

  const loadSession = () => fetchDiscovery();

  const fetchSettings = async () => {
    try {
      const data = await api.getSettings();
      
      const normalizedData = { ...DEFAULT_SETTINGS };
      for (const key in data) {
        if (data[key] !== null && data[key] !== undefined) {
          normalizedData[key] = data[key];
        }
      }

      setSettings(normalizedData);
      setInitialSettings(JSON.parse(JSON.stringify(normalizedData)));
      setIsSettingsDirty(false);
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    }
  };

  const fetchDiscovery = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getDiscoveryItems();
      if (data.error) throw new Error(data.error);
      setItems(data);
    } catch (error) {
      console.error("Discovery fetch failed:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = React.useCallback(async () => {
    try {
      const data = await api.getStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  }, []);

  const saveSettings = async () => {
    try {
      setSaveStatus('Saving...');
      await api.updateSettings(settings);
      setSaveStatus('Saved successfully!');
      
      const langChanged = initialSettings.primary_metadata_language !== settings.primary_metadata_language || 
                          initialSettings.fallback_metadata_language !== settings.fallback_metadata_language;
      
      setInitialSettings(JSON.parse(JSON.stringify(settings)));
      setIsSettingsDirty(false);
      setTimeout(() => setSaveStatus(''), 3000);
      
      // Dinamikusan újratöltjük a discovery elemeket a háttérben, hogy a formázás azonnal frissüljön
      await fetchDiscovery();

      if (langChanged) {
        setConfirmDialog({
          isOpen: true,
          type: 'info',
          title: "Sync Missing Metadata?",
          message: "Language settings have changed. Do you want to download missing metadata and images for the newly selected language(s)?",
          confirmText: "Sync Now",
          cancelText: "Skip",
          onConfirm: () => {
            api.syncMetadataLanguage().catch(console.error);
          }
        });
      }
      
    } catch (error) {
      console.error("Failed to save settings:", error);
      setSaveStatus('Error saving');
    }
  };

  const resetSettings = () => {
    if (initialSettings) {
      setSettings({ ...initialSettings });
    }
  };

  const fetchProgress = React.useCallback(async () => {
    try {
      const data = await api.getScanStatus();
      
      setProgress(prev => {
        // Prevent overwriting local fake progress (like wiping) with inactive backend status
        if (prev?.phase === 'wiping' && !data.active) {
          return prev;
        }
        return data;
      });

      if (data.active) {
        setLoading(true);
        wasActiveRef.current = true;
      } else {
        if (wasActiveRef.current || scanTriggeredRef.current) {
          await fetchDiscovery();
          wasActiveRef.current = false;
          scanTriggeredRef.current = false;
          fetchStats();
        }
        setLoading(false);
      }
    } catch (error) {
      console.error("Progress fetch failed:", error);
    }
  }, [fetchDiscovery, fetchStats]);

  const handleDropScan = React.useCallback(async (paths) => {
    if (!paths || paths.length === 0) return;
    if (progress?.active) {
      console.warn("Scan ignored: A task is already in progress.");
      return;
    }
    try {
      setLoading(true);
      setView('discovery');
      scanTriggeredRef.current = true;
      await api.triggerScan(paths);
      setTimeout(() => {
        fetchProgress();
      }, 500);
    } catch (error) {
      console.error("Drop scan failed:", error);
      setLoading(false);
      scanTriggeredRef.current = false;
    }
  }, [fetchProgress]);

  const handleScan = React.useCallback(async () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const selectedPath = await ipcRenderer.invoke('select-folder', settings.default_scan_dir || null);
      if (!selectedPath) return;
      handleDropScan([selectedPath]);
    } catch (error) {
      console.error("Scan failed:", error);
    }
  }, [settings.default_scan_dir, handleDropScan]);

  const fetchFullMetadata = async (itemId) => {
    try {
      const data = await api.getItemFullMetadata(itemId);
      if(data.error) {
        alert(data.error);
        return;
      }
      setFullMetadata(data);
      setShowMetadataModal(true);
    } catch (e) {
      console.error(e);
      alert(T('alerts.metadata_failed'));
    }
  };
  
  const openResolver = (item) => {
    setResolverItem(item);
    setShowResolverModal(true);
  };
  
  const resolveItem = async (itemId, tmdbId, type, season, episode, episodes, targets) => {
    try {
      setLoading(true);
      await api.resolveMetadata(itemId, tmdbId, type, season, episode, episodes, targets);
      setShowResolverModal(false);
      await fetchDiscovery();
      fetchStats();
    } catch (e) {
      console.error(e);
      alert(T('alerts.resolve_failed'));
    } finally {
      setLoading(false);
    }
  };

  const confirmAction = (title, message, onConfirm) => {
    setConfirmDialog({ isOpen: true, title, message, onConfirm });
  };

  const wipeDatabase = async () => {
    confirmAction(
      T('alerts.wipe_db_title'),
      T('alerts.wipe_db_msg'),
      async () => {
        setSaveStatus(T('settings.status.saving'));
        try {
          setProgress({ active: true, phase: 'wiping', current: 0, total: 100, start_time: Date.now() / 1000 });
          
          let currentProgress = 0;
          const fakeProgress = setInterval(() => {
            // Aszimptotikusan közelít 95%-hoz, így sosem akad meg teljesen, de hagy időt a valódi befejezésnek
            const remaining = 95 - currentProgress;
            currentProgress += Math.max(remaining * 0.15, 0.5); 
            const displayProgress = Math.min(Math.round(currentProgress), 99);
            setProgress(p => p ? { ...p, current: displayProgress } : p);
          }, 200);

          const res = await api.clearDatabase();
          if (res && res.status === "error") {
            throw new Error(res.message || "Wipe failed");
          }
          
          clearInterval(fakeProgress);
          setProgress(p => p ? { ...p, current: 100 } : p);
          
          setTimeout(() => {
            setProgress(null);
            setItems({ manual: [], movies: [], series: [], extras: [], collisions: [] });
            setStats({ total_movies: 0, total_series: 0, total_episodes: 0, storage: '0 MB', unmatched: 0 });
            setSaveStatus(T('settings.status.saved'));
          }, 500);

        } catch (e) {
          setProgress(null);
          setSaveStatus(T('settings.status.error'));
        }
        setTimeout(() => setSaveStatus(''), 3000);
      }
    );
  };

  const deleteDiscoveryItems = async (ids, type = 'media') => {
    const isBulk = Array.isArray(ids);
    const idList = isBulk ? ids : [ids];
    
    if (loading) return;

    confirmAction(
      T(isBulk ? 'alerts.bulk_delete_title' : 'alerts.delete_title'),
      T(isBulk ? 'alerts.bulk_delete_msg' : 'alerts.delete_msg', { count: idList.length }),
      async () => {
        try {
          setLoading(true);
          const itemIds = type !== 'extras' ? idList : [];
          const extraIds = type === 'extras' ? idList : [];
          await api.deleteItems(itemIds, extraIds);
          setSelectedIds([]);
          setSelectedItem(null);
          await fetchDiscovery();
          fetchStats();
        } catch (e) {
          console.error("Delete failed:", e);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleOrganizeLibrary = async () => {
    try {
      setLoading(true);
      const res = await api.startRename();
      if (res.status === 'success') {
        // We don't need to do much, the progress polling will take over
        fetchProgress();
      } else {
        alert(res.message || "Failed to start organization");
      }
    } catch (e) {
      console.error("Organize failed:", e);
      alert("An error occurred while starting the organization process.");
    } finally {
      setLoading(false);
    }
  };

  const [history, setHistory] = useState([]);
  const fetchHistory = async () => {
    try {
      const data = await api.fetchHistory();
      setHistory(data);
    } catch (e) {
      console.error("Fetch history failed:", e);
    }
  };

  const handleUndo = async (batchId) => {
    confirmAction(
      T('alerts.undo_title'),
      T('alerts.undo_msg'),
      async () => {
        try {
          setLoading(true);
          const res = await api.undoRename(batchId);
          if (res.status === 'success') {
            await fetchHistory();
            await fetchDiscovery();
            fetchStats();
          } else {
            alert(res.message || "Undo failed");
          }
        } catch (e) {
          console.error("Undo failed:", e);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  const handleResetImageStatus = async () => {
    try {
      await api.resetImageStatus();
      const status = await api.getImageStatus();
      setImageStatus(status);
    } catch (e) {
      console.error("Failed to reset image status:", e);
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
      isDragging, setIsDragging,
      imageStatus, setImageStatus,
      selectedItem, setSelectedItem,
      selectedIds, setSelectedIds,
      stats, setStats,
      history, setHistory,
      fullMetadata, setFullMetadata,
      showMetadataModal, setShowMetadataModal,
      showResolverModal, setShowResolverModal,
      resolverItem, setResolverItem,
      confirmDialog, setConfirmDialog, confirmAction,
      isSettingsDirty, resetSettings,
      loadSession,
      fetchDiscovery, fetchStats, fetchSettings, fetchHistory,
      handleScan, handleDropScan, fetchFullMetadata, saveSettings, wipeDatabase, deleteDiscoveryItems,
      handleOrganizeLibrary, handleUndo, handleResetImageStatus,
      openResolver, resolveItem,
      isSidebarCollapsed, setIsSidebarCollapsed,
      T: (key, params) => T(key, params, settings.ui_language || 'en'),
      availableLocales
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
