import React from 'react';
import HistoryView from './components/History/HistoryView';
import MetadataModal from './components/Modals/MetadataModal';
import WelcomeModal from './components/Modals/WelcomeModal';
import ConfirmModal from './components/Modals/ConfirmModal';
import ResolverModal from './components/Modals/ResolverModal';
import DiscoveryConsole from './components/Discovery/DiscoveryConsole';
import InspectorPanel from './components/Discovery/InspectorPanel';
import SettingsView from './components/Settings/SettingsView';
import DashboardView from './components/Dashboard/DashboardView';
import LibraryView from './components/Library/LibraryView';
import Layout from './components/Layout/Layout';
import { useGlobalDragDrop } from './hooks/useGlobalDragDrop';
import { useAppContext } from './context/AppContext';
import './index.css';

function App() {
  const {
    view, setView,
    items, loading,
    progress, settings, setSettings,
    showWelcomeModal, setShowWelcomeModal,
    settingsTab, setSettingsTab,
    imageStatus,
    selectedItem, setSelectedItem,
    stats, history, fetchHistory,
    fullMetadata, showMetadataModal, setShowMetadataModal,
    handleScan, handleDropScan, fetchFullMetadata, saveSettings, wipeDatabase, deleteDiscoveryItems, handleOrganizeLibrary, handleUndo,
    loadSession, isDragging,
    selectedIds, setSelectedIds,
    showResolverModal, setShowResolverModal,
    resolverItem, openResolver, resolveItem,
    T, availableLocales
  } = useAppContext();

  useGlobalDragDrop();

  const totalItems = (items?.manual?.length || 0) + (items?.movies?.length || 0) + (items?.series?.length || 0) + (items?.extras?.length || 0) + (items?.collisions?.length || 0);
  const showInspector = view === 'discovery' && totalItems > 0;

  return (
    <Layout 
      view={view} 
      setView={setView} 
      isDragging={isDragging} 
      progress={progress} 
      imageStatus={imageStatus}
      hasInspector={showInspector}
      T={T}
      inspector={
        showInspector ? (
          <div className="inspector-panel">
            <InspectorPanel selectedItem={selectedItem} fetchFullMetadata={fetchFullMetadata} openResolver={openResolver} T={T} />
          </div>
        ) : null
      }
    >
      {view === 'dashboard' && (
        <DashboardView settings={settings} stats={stats} T={T} />
      )}

      {view === 'discovery' && (
        <DiscoveryConsole 
          items={items}
          loading={loading}
          handleScan={handleScan}
          handleDropScan={handleDropScan}
          loadSession={loadSession}
          fetchFullMetadata={fetchFullMetadata}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          deleteDiscoveryItems={deleteDiscoveryItems}
          openResolver={openResolver}
          stats={stats}
          isDragging={isDragging}
          progress={progress}
          handleOrganizeLibrary={handleOrganizeLibrary}
          T={T}
        />
      )}

      {view === 'history' && (
        <HistoryView 
          history={history}
          fetchHistory={fetchHistory}
          handleUndo={handleUndo}
          loading={loading}
          T={T}
        />
      )}

      {view === 'settings' && (
        <SettingsView 
          settings={settings}
          setSettings={setSettings}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          T={T}
          availableLocales={availableLocales}
          wipeDatabase={wipeDatabase}
        />
      )}

      {view === 'library' && (
        <LibraryView T={T} />
      )}

      <ConfirmModal />
      
      <WelcomeModal 
        show={showWelcomeModal}
        settings={settings}
        setSettings={setSettings}
        saveSettings={saveSettings}
        setShowWelcomeModal={setShowWelcomeModal}
        T={T}
      />

      <MetadataModal 
        show={showMetadataModal} 
        metadata={fullMetadata} 
        onClose={() => setShowMetadataModal(false)} 
        T={T}
      />

      <ResolverModal 
        show={showResolverModal}
        item={resolverItem}
        onClose={() => setShowResolverModal(false)}
        onResolve={resolveItem}
        T={T}
      />
    </Layout>
  );
}

export default App;
