import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const useGlobalDragDrop = () => {
  const { isDragging, setIsDragging, handleDropScan } = useAppContext();

  useEffect(() => {
    // We use a ref-like approach to access current isDragging state inside listeners
    // without re-registering them on every state change
    let dragCounter = 0;

    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (dragCounter === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter = 0;
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        let paths;
        try {
          // Modern Electron approach
          const electron = window.require('electron');
          const webUtils = electron.webUtils;
          
          paths = Array.from(files).map(f => {
            if (webUtils && typeof webUtils.getPathForFile === 'function') {
              return webUtils.getPathForFile(f);
            }
            return f.path; // Fallback to deprecated .path
          }).filter(p => p);
        } catch (err) {
          console.error("Path extraction failed:", err);
          paths = Array.from(files).map(f => f.path).filter(p => p);
        }
        
        if (paths.length > 0) {
          console.log("Triggering drop scan for:", paths);
          handleDropScan(paths);
        } else {
          console.warn("No valid paths found in dropped files. If you are in a browser, drag & drop is not supported.");
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDropScan, setIsDragging]);

  return { isDragging };
};
