import { ModelConfig, Conversation, Document } from '../types';

export const storageService = {
  setItem: (key: string, value: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  getItem: (key: string) => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      
      try {
        return JSON.parse(item);
      } catch (parseError) {
        console.error(`Error parsing JSON from localStorage key ${key}:`, parseError);
        return null;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  },

  saveModelConfig: (config: ModelConfig) => {
    const configs = storageService.getItem('modelConfigs') || [];
    storageService.setItem('modelConfigs', [config, ...configs]);
  },

  saveEmbeddingConfig: (config: ModelConfig) => {
    storageService.setItem('embeddingConfigs', [config]);
  },

  saveActiveDocuments: (documents: Document[]) => {
    try {
      const conversations = storageService.getItem('conversations') || [];
      if (!Array.isArray(conversations)) {
        console.error('Conversations is not an array');
        return;
      }
      
      const currentConv = conversations.find((conv: Conversation) => 
        conv && typeof conv === 'object' && conv.active
      );
      
      if (currentConv) {
        currentConv.activeDocuments = documents;
        storageService.setItem('conversations', conversations);
      }
    } catch (error) {
      console.error('Error saving active documents:', error);
    }
  },

  saveConversations: (conversations: Conversation[]) => {
    try {
      if (!Array.isArray(conversations)) {
        console.error('Cannot save conversations: not an array');
        return;
      }
      
      // Filter out any invalid conversation objects
      const validConversations = conversations.filter(conv => 
        conv && typeof conv === 'object'
      );
      
      storageService.setItem('conversations', validConversations);
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  },

  getConversations: (): Conversation[] => {
    try {
      const conversations = storageService.getItem('conversations');
      return Array.isArray(conversations) ? conversations : [];
    } catch (error) {
      console.error('Error retrieving conversations:', error);
      return [];
    }
  },

  getModelConfigs: (): ModelConfig[] => {
    try {
      const configs = storageService.getItem('modelConfigs');
      return Array.isArray(configs) ? configs : [];
    } catch (error) {
      console.error('Error retrieving model configs:', error);
      return [];
    }
  },

  getEmbeddingConfig: (): ModelConfig | null => {
    try {
      const configs = storageService.getItem('embeddingConfigs');
      if (Array.isArray(configs) && configs.length > 0) {
        return configs[0];
      }
      return null;
    } catch (error) {
      console.error('Error retrieving embedding config:', error);
      return null;
    }
  }
};
