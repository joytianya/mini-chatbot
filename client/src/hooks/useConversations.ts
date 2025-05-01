import { useState, useCallback } from 'react';
import { Conversation, ChatState } from '../types';
import { storageService } from '../utils/storage';

export const useConversations = ({
  setDisplayMessages,
  setRequestMessages,
  setSessionHash,
  setActiveDocuments,
  setStreaming,
  setCurrentResponse,
  setReasoningText,
  setUserHasScrolled
}: {
  setDisplayMessages: (messages: ChatState['displayMessages']) => void;
  setRequestMessages: (messages: ChatState['requestMessages']) => void;
  setSessionHash: (hash: ChatState['sessionHash']) => void;
  setActiveDocuments: (docs: ChatState['activeDocuments']) => void;
  setStreaming: (streaming: ChatState['streaming']) => void;
  setCurrentResponse: (response: ChatState['currentResponse']) => void;
  setReasoningText: (text: ChatState['reasoningText']) => void;
  setUserHasScrolled: (scrolled: ChatState['userHasScrolled']) => void;
}) => {
  const [conversations, setConversations] = useState<Conversation[]>(storageService.getConversations());
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  const handleNewChat = useCallback(() => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      name: '新对话',
      messages: [],
      active: true,
      createdAt: new Date().toISOString(),
      activeDocuments: []
    };

    const updatedConvs = conversations.map(conv => ({
      ...conv,
      active: false
    }));

    setConversations([newConv, ...updatedConvs]);
    storageService.saveConversations([newConv, ...updatedConvs]);

    setDisplayMessages([]);
    setRequestMessages([]);
    setSessionHash('');
    setActiveDocuments([]);
    setStreaming(false);
    setCurrentResponse('');
    setReasoningText('');
    setUserHasScrolled(false);
  }, [
    conversations,
    setDisplayMessages,
    setRequestMessages,
    setSessionHash,
    setActiveDocuments,
    setStreaming,
    setCurrentResponse,
    setReasoningText,
    setUserHasScrolled
  ]);

  const handleConversationClick = useCallback((id: string) => {
    const updatedConvs = conversations.map(conv => ({
      ...conv,
      active: conv.id === id
    }));

    setConversations(updatedConvs);
    storageService.saveConversations(updatedConvs);

    const selectedConv = updatedConvs.find(conv => conv.id === id);
    if (selectedConv) {
      setDisplayMessages(selectedConv.messages);
      setActiveDocuments(selectedConv.activeDocuments || []);
    }
  }, [conversations, setDisplayMessages, setActiveDocuments]);

  const handleDeleteConversation = useCallback((id: string) => {
    const updatedConvs = conversations.filter(conv => conv.id !== id);
    setConversations(updatedConvs);
    storageService.saveConversations(updatedConvs);

    if (updatedConvs.length > 0) {
      handleConversationClick(updatedConvs[0].id);
    } else {
      handleNewChat();
    }
  }, [conversations, handleConversationClick, handleNewChat]);

  const handleClearAll = useCallback(() => {
    setConversations([]);
    storageService.saveConversations([]);
    handleNewChat();
  }, [handleNewChat]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarExpanded(prev => !prev);
  }, []);

  return {
    conversations,
    setConversations,
    isSidebarExpanded,
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll,
    handleToggleSidebar
  };
};

export type ConversationsState = ReturnType<typeof useConversations>;
export type ConversationsActions = ConversationsState;
