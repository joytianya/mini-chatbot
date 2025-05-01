import { useState, useCallback, useEffect } from 'react';
import { Document } from '../types';
import { storageService } from '../utils/storage';

/**
 * Custom hook for managing UI state
 * Includes robust error handling to prevent JSON parsing errors
 */
export const useUIState = () => {
  // Initialize with empty array to prevent undefined errors
  const [activeDocuments, setActiveDocuments] = useState<Document[]>([]);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // Load active documents from storage on mount
  useEffect(() => {
    try {
      // Get conversations with extra safety checks
      const conversations = storageService.getConversations();
      
      // Double-check that conversations is an array
      if (!Array.isArray(conversations)) {
        console.warn('Conversations is not an array, using empty documents');
        return;
      }
      
      // Find the active conversation with thorough validation
      const currentConv = conversations.find(conv => 
        conv && typeof conv === 'object' && conv.active === true
      );
      
      // Validate that activeDocuments is an array
      if (currentConv && 'activeDocuments' in currentConv) {
        const docs = currentConv.activeDocuments;
        if (Array.isArray(docs)) {
          setActiveDocuments(docs);
        }
      }
    } catch (error) {
      console.error('Error loading activeDocuments:', error);
      // Keep the default empty array on error
    }
  }, []);

  // Toggle sidebar visibility
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev);
  }, []);
  
  // Save active documents to storage when they change
  useEffect(() => {
    try {
      if (activeDocuments.length > 0) {
        storageService.saveActiveDocuments(activeDocuments);
      }
    } catch (error) {
      console.error('Error saving activeDocuments:', error);
    }
  }, [activeDocuments]);

  return {
    activeDocuments,
    setActiveDocuments,
    isSidebarExpanded,
    setIsSidebarExpanded,
    handleToggleSidebar
  };
};

export type UIState = ReturnType<typeof useUIState>;
