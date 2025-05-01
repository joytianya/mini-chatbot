import React, { useState, useEffect } from 'react';
import { serverURL } from './Config';
import ChatBox from './components/chat/ChatBox';
import Sidebar from './components/sidebar/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import './Chat.css';

/**
 * SimplifiedChat - A streamlined chat interface component
 * This component handles:
 * - Conversation management
 * - Dark mode toggle
 * - Sidebar functionality
 */
function SimplifiedChat() {
  // State for UI
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // State for conversations
  const [conversations, setConversations] = useState(() => {
    // Initialize from localStorage if available
    try {
      const saved = localStorage.getItem('conversations');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  });
  
  // Get active conversation
  const activeConversation = conversations.find(conv => conv.active) || null;
  
  // Effect to update body class when dark mode changes
  useEffect(() => {
    document.body.classList.toggle('dark-mode', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  // Effect to save conversations to localStorage
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };
  
  // Toggle sidebar
  const handleToggleSidebar = () => {
    setIsSidebarExpanded(prev => !prev);
  };
  
  // Create a new chat
  const handleNewChat = () => {
    const newConv = {
      id: Date.now().toString(),
      name: '新对话',
      messages: [],
      active: true,
      createdAt: new Date().toISOString()
    };
    
    const updatedConvs = conversations.map(conv => ({
      ...conv,
      active: false
    }));
    
    setConversations([newConv, ...updatedConvs]);
  };
  
  // Handle clicking on a conversation
  const handleConversationClick = (id) => {
    const updatedConvs = conversations.map(conv => ({
      ...conv,
      active: conv.id === id
    }));
    
    setConversations(updatedConvs);
  };
  
  // Handle deleting a conversation
  const handleDeleteConversation = (id) => {
    const updatedConvs = conversations.filter(conv => conv.id !== id);
    setConversations(updatedConvs);
    
    if (updatedConvs.length > 0 && activeConversation?.id === id) {
      // If we deleted the active conversation, activate the first one
      const newActive = [...updatedConvs];
      newActive[0].active = true;
      setConversations(newActive);
    } else if (updatedConvs.length === 0) {
      // If no conversations left, create a new one
      handleNewChat();
    }
  };
  
  // Handle clearing all conversations
  const handleClearAll = () => {
    setConversations([]);
    handleNewChat();
  };
  
  // Handle updating messages in the active conversation
  const handleMessagesUpdate = (newMessages) => {
    if (!activeConversation) return;
    
    const updatedConvs = conversations.map(conv => {
      if (conv.active) {
        return {
          ...conv,
          messages: newMessages,
          // Update name based on first user message if this is a new conversation
          name: conv.messages.length === 0 && newMessages.length > 0 
            ? newMessages[0].content.substring(0, 20) + (newMessages[0].content.length > 20 ? '...' : '')
            : conv.name
        };
      }
      return conv;
    });
    
    setConversations(updatedConvs);
  };
  
  // If no conversations exist, create one
  useEffect(() => {
    if (conversations.length === 0) {
      handleNewChat();
    }
  }, [conversations.length]);
  
  return (
    <ErrorBoundary>
      <div className={`chat-container ${darkMode ? 'dark-mode' : ''}`}>
        {/* Sidebar */}
        <Sidebar 
          isSidebarExpanded={isSidebarExpanded}
          handleNewChat={handleNewChat}
          conversations={conversations}
          handleConversationClick={handleConversationClick}
          handleDeleteConversation={handleDeleteConversation}
          streaming={false}
          handleClearAll={handleClearAll}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          handleToggleSidebar={handleToggleSidebar}
        />
        
        {/* Main content area */}
        <div className="main-content">
          <div className="chat-header">
            <button 
              className="toggle-sidebar-btn"
              onClick={handleToggleSidebar}
            >
              ☰
            </button>
            <h2>{activeConversation?.name || '新对话'}</h2>
            <div className="header-actions">
              <button onClick={handleNewChat}>新对话</button>
              <button onClick={toggleDarkMode}>
                {darkMode ? '☀️' : '🌙'}
              </button>
            </div>
          </div>
          
          {/* Chat box */}
          <ErrorBoundary>
            <ChatBox 
              darkMode={darkMode}
              activeConversationId={activeConversation?.id}
              initialMessages={activeConversation?.messages || []}
              onNewMessage={handleMessagesUpdate}
            />
          </ErrorBoundary>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default SimplifiedChat;
