import React, { useState, useEffect, useRef } from 'react';
import { maxHistoryLength, serverURL } from './Config';
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import Settings from './components/settings/Settings';
import SensitiveInfoDemo from './components/SensitiveInfoDemo';
import ErrorBoundary from './components/ErrorBoundary';
import './Chat.css';

// 导入 useChatLogic
import useChatLogic from './hooks/useChatLogic';

// 提供一个备用实现，以防导入失败
const fallbackChatLogic = () => ({
  displayMessages: [],
  setDisplayMessages: () => {},
  input: '',
  setInput: () => {},
  requestMessages: [],
  setRequestMessages: () => {},
  currentResponse: '',
  setCurrentResponse: () => {},
  reasoningText: '',
  setReasoningText: () => {},
  isReasoning: false,
  setIsReasoning: () => {}
});

/**
 * Main Chat component
 * Handles the overall chat interface and functionality
 */
function Chat() {
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [error, setError] = useState(null);
  const chatContainerRef = useRef(null);
  
  // 安全地使用 chat logic
  const [chatState, setChatState] = useState({});
  
  // 在组件挂载时初始化 chat logic
  useEffect(() => {
    try {
      // 尝试使用导入的 useChatLogic
      const state = useChatLogic();
      if (state && typeof state === 'object') {
        setChatState(state);
      } else {
        console.warn('useChatLogic 返回了无效的状态，使用备用实现');
        setChatState(fallbackChatLogic());
      }
    } catch (err) {
      console.error('Error using chat logic:', err);
      setError('初始化聊天失败。请刷新页面或访问诊断页面。');
      setChatState(fallbackChatLogic());
    }
  }, []);
  
  // Destructure with safe defaults to prevent errors
  const {
    // Messages and input
    displayMessages = [],
    setDisplayMessages = () => {},
    input = '',
    setInput = () => {},
    requestMessages = [],
    setRequestMessages = () => {},
    currentResponse = '',
    setCurrentResponse = () => {},
    reasoningText = '',
    setReasoningText = () => {},
    isReasoning = false,
    setIsReasoning = () => {},
    
    // UI state
    darkMode = false,
    setDarkMode = () => {},
    toggleDarkMode = () => {},
    isSidebarExpanded = true,
    handleToggleSidebar = () => {},
    
    // Conversations
    conversations = [],
    setConversations = () => {},
    handleNewChat = () => {},
    handleConversationClick = () => {},
    handleDeleteConversation = () => {},
    handleClearAll = () => {},
    handleExport = () => {},
    
    // Message actions
    handleSubmit = () => {},
    handleStop = () => {},
    handleRetry = () => {},
    handleCopy = () => {},
    handleEdit = () => {},
    handleScroll = () => {},
    scrollToBottom = () => {},
    
    // Model settings
    selectedModel = '',
    setSelectedModel = () => {},
    availableModels = [],
    setAvailableModels = () => {},
    modelConfigs = [],
    setModelConfigs = () => {},
    handleSettingsSave = () => {},
    getConfigForModel = () => null,
    
    // Other features
    streaming = false,
    setStreaming = () => {},
    formatTime = () => '',
    currentTurns = 0,
    highlightedMessageId = null,
    loadingHistory = false,
    activeDocuments = [],
    setActiveDocuments = () => {},
    sensitiveInfoProtectionEnabled = false,
    toggleSensitiveInfoProtection = () => {},
    sessionHash = '',
    handleFileUpload = () => {}
  } = chatState;
  
  // Log initialization for debugging
  useEffect(() => {
    console.log('Chat component initialized');
    // Only log if these values exist to prevent errors
    if (selectedModel) console.log('Selected model:', selectedModel);
    if (Array.isArray(availableModels)) console.log('Available models:', availableModels);
    if (typeof handleFileUpload === 'function') console.log('File upload handler is ready');
  }, [selectedModel, availableModels, handleFileUpload]);
  
  // Render the chat interface
  return (
    <ErrorBoundary>
      <div className={`chat-container ${darkMode ? 'dark-mode' : ''}`}>
        {/* Show error message if initialization failed */}
        {error && (
          <div className="error-message">
            {error}
            <button onClick={() => setError(null)}>Close</button>
          </div>
        )}
        
        {/* Sidebar component */}
        <Sidebar
          conversations={conversations}
          onNewChat={handleNewChat}
          onSelectConversation={handleConversationClick}
          onDeleteConversation={handleDeleteConversation}
          onClearAll={handleClearAll}
          onExport={handleExport}
          darkMode={darkMode}
          onToggleDarkMode={toggleDarkMode}
          streaming={streaming}
          isSidebarExpanded={isSidebarExpanded}
          onToggleSidebar={handleToggleSidebar}
          onShowSettings={() => setShowSettings(true)}
          onShowFileUpload={() => setShowFileUpload(true)}
        />
        
        {/* Chat area component */}
        <ChatArea
          messages={displayMessages}
          input={input}
          setInput={setInput}
          onSubmit={handleSubmit}
          onStop={handleStop}
          onRetry={handleRetry}
          onCopy={handleCopy}
          onEdit={handleEdit}
          onScroll={handleScroll}
          currentResponse={currentResponse}
          reasoningText={reasoningText}
          isReasoning={isReasoning}
          streaming={streaming}
          darkMode={darkMode}
          chatContainerRef={chatContainerRef}
          formatTime={formatTime}
          highlightedMessageId={highlightedMessageId}
          sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
          onToggleSensitiveInfoProtection={toggleSensitiveInfoProtection}
        />
        
        {/* Settings dialog */}
        {showSettings && (
          <Settings
            onClose={() => setShowSettings(false)}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            availableModels={availableModels}
            modelConfigs={modelConfigs}
            setModelConfigs={setModelConfigs}
            onSave={handleSettingsSave}
            darkMode={darkMode}
          />
        )}
        
        {/* Sensitive information protection demo */}
        {sensitiveInfoProtectionEnabled && (
          <SensitiveInfoDemo darkMode={darkMode} />
        )}
        
        {/* File upload dialog */}
        {showFileUpload && (
          <div className="file-upload-modal">
            <div className="file-upload-content">
              <h2>Upload File</h2>
              <input
                type="file"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                    setShowFileUpload(false);
                  }
                }}
              />
              <button onClick={() => setShowFileUpload(false)}>Close</button>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default Chat;