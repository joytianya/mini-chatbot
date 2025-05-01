import { useState, useCallback, useEffect } from 'react';
import { apiService } from '../services/api';
import { storageService } from '../utils/storage';
import { Message, Conversation, ModelConfig, Document } from '../types';

const useChatCore = () => {
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
  const [requestMessages, setRequestMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [activeDocuments, setActiveDocuments] = useState<Document[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>({
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0
  });

  useEffect(() => {
    const savedMessages = storageService.getItem('messages');
    if (savedMessages) {
      setDisplayMessages(JSON.parse(savedMessages));
    }

    const savedConversations = storageService.getItem('conversations');
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }

    const savedModelConfig = storageService.getItem('modelConfig');
    if (savedModelConfig) {
      setModelConfig(JSON.parse(savedModelConfig));
    }

    const savedActiveDocuments = storageService.getItem('activeDocuments');
    if (savedActiveDocuments) {
      setActiveDocuments(JSON.parse(savedActiveDocuments));
    }
  }, []);

  const addMessage = useCallback((message: Message) => {
    setDisplayMessages(prev => [...prev, message]);
    storageService.setItem('messages', JSON.stringify([...displayMessages, message]));
  }, [displayMessages]);

  const updateMessage = useCallback((message: Message) => {
    setDisplayMessages(prev => 
      prev.map(m => m.id === message.id ? message : m)
    );
    storageService.setItem('messages', JSON.stringify(
      displayMessages.map(m => m.id === message.id ? message : m)
    ));
  }, [displayMessages]);

  const deleteMessage = useCallback((id: string) => {
    setDisplayMessages(prev => prev.filter(m => m.id !== id));
    storageService.setItem('messages', JSON.stringify(
      displayMessages.filter(m => m.id !== id)
    ));
  }, [displayMessages]);

  const addConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => [...prev, conversation]);
    storageService.setItem('conversations', JSON.stringify([...conversations, conversation]));
  }, [conversations]);

  const updateConversation = useCallback((conversation: Conversation) => {
    setConversations(prev => 
      prev.map(c => c.id === conversation.id ? conversation : c)
    );
    storageService.setItem('conversations', JSON.stringify(
      conversations.map(c => c.id === conversation.id ? conversation : c)
    ));
  }, [conversations]);

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => prev.filter(c => c.id !== id));
    storageService.setItem('conversations', JSON.stringify(
      conversations.filter(c => c.id !== id)
    ));
  }, [conversations]);

  const addActiveDocument = useCallback((document: Document) => {
    setActiveDocuments(prev => [...prev, document]);
    storageService.setItem('activeDocuments', JSON.stringify([...activeDocuments, document]));
  }, [activeDocuments]);

  const removeActiveDocument = useCallback((id: string) => {
    setActiveDocuments(prev => prev.filter(d => d.id !== id));
    storageService.setItem('activeDocuments', JSON.stringify(
      activeDocuments.filter(d => d.id !== id)
    ));
  }, [activeDocuments]);

  const updateModelConfig = useCallback((config: ModelConfig) => {
    setModelConfig(config);
    storageService.setItem('modelConfig', JSON.stringify(config));
  }, []);

  return {
    displayMessages,
    setDisplayMessages,
    requestMessages,
    setRequestMessages,
    streaming,
    setStreaming,
    activeDocuments,
    setActiveDocuments,
    conversations,
    setConversations,
    modelConfig,
    setModelConfig,
    addMessage,
    updateMessage,
    deleteMessage,
    addConversation,
    updateConversation,
    deleteConversation,
    addActiveDocument,
    removeActiveDocument,
    updateModelConfig
    loadingHistory,
    setLoadingHistory
  };
};

export type ChatCoreState = ReturnType<typeof useChatCore>;
export type ChatCoreActions = ChatCoreState;
