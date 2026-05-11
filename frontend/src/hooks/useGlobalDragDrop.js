import { useEffect } from 'react';
import { useAppContext } from '../context/AppContext';

export const useGlobalDragDrop = () => {
  const { isDragging, setIsDragging, handleDropScan } = useAppContext();

  useEffect(() => {
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = 'copy';
      if (!isDragging) setIsDragging(true);
    };

    const handleDragEnter = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Only deactivate if we really leave the window
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        let paths = [];
        try {
          const electron = window.require('electron');
          const webUtils = electron.webUtils;
          
          paths = Array.from(files).map(f => {
            if (webUtils && webUtils.getPathForFile) {
              return webUtils.getPathForFile(f);
            }
            return f.path; // Fallback to deprecated .path
          }).filter(p => p);
        } catch (err) {
          console.error("Path extraction failed:", err);
          // Last resort fallback
          paths = Array.from(files).map(f => f.path).filter(p => p);
        }
        
        if (paths.length > 0) {
          handleDropScan(paths);
        } else {
          console.warn("No valid paths found in dropped files");
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
  }, [handleDropScan, setIsDragging, isDragging]);

  return { isDragging };
};
