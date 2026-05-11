import React from 'react';
import GeneralSettings from './GeneralSettings';
import NamingSettings from './NamingSettings';
import FolderSettings from './FolderSettings';
import ExtrasSettings from './ExtrasSettings';
import ApiSettings from './ApiSettings';
import AppearanceSettings from './AppearanceSettings';
import AdvancedSettings from './AdvancedSettings';

const SettingsView = ({ 
  settings, 
  setSettings, 
  settingsTab, 
  setSettingsTab, 
  T, 
  availableLocales,
  wipeDatabase 
}) => {
  const tabs = [
    { id: 'general', label: T('settings.tabs.general') },
    { id: 'naming', label: T('settings.tabs.naming') },
    { id: 'folders', label: T('settings.tabs.folders') },
    { id: 'extras', label: T('settings.tabs.extras') },
    { id: 'api', label: T('settings.tabs.api') },
    { id: 'appearance', label: T('settings.tabs.appearance') },
    { id: 'advanced', label: T('settings.tabs.advanced') },
  ];

  const renderTabContent = () => {
    switch (settingsTab) {
      case 'general':
        return <GeneralSettings settings={settings} setSettings={setSettings} T={T} availableLocales={availableLocales} />;
      case 'naming':
        return <NamingSettings settings={settings} setSettings={setSettings} T={T} />;
      case 'folders':
        return <FolderSettings settings={settings} setSettings={setSettings} T={T} />;
      case 'extras':
        return <ExtrasSettings settings={settings} setSettings={setSettings} />;
      case 'api':
        return <ApiSettings settings={settings} setSettings={setSettings} T={T} />;
      case 'appearance':
        return <AppearanceSettings settings={settings} setSettings={setSettings} T={T} />;
      case 'advanced':
        return <AdvancedSettings wipeDatabase={wipeDatabase} T={T} />;
      default:
        return null;
    }
  };

  return (
    <div className="settings-view">
      <div className="settings-pro-frame">
        <div className="settings-pro-header">
          <div className="header-text">
            <h1>{T('settings.title')}</h1>
            <p>{T('settings.subtitle')}</p>
          </div>
          
          <div className="settings-tabs">
            {tabs.map(tab => (
              <button 
                key={tab.id}
                className={`settings-tab-btn ${settingsTab === tab.id ? 'active' : ''}`} 
                onClick={() => setSettingsTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-pro-body">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
