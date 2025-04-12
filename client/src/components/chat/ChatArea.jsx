import React, { useRef, useEffect, memo } from 'react';
import MessageList from './MessageList';
import { MessageInput } from './MessageInput';
import ChatHeader from './ChatHeader';
import '../ChatArea.css';

const ChatArea = ({
  displayMessages,
  setDisplayMessages,
  currentResponse,
  reasoningText,
  isReasoning,
  streaming,
  darkMode,
  chatContainerRef,
  handleScroll,
  handleRetry,
  handleCopy,
  handleEdit,
  formatTime,
  highlightedMessageId,
  loadingHistory,
  activeDocuments,
  setActiveDocuments,
  input,
  setInput,
  handleSubmit,
  handleStop,
  selectedModel,
  setSelectedModel,
  modelOptions,
  currentTurns,
  maxHistoryLength,
  setDarkMode,
  handleExport,
  sessionHash,
  handleReplyComplete,
  handleNewChat,
  handleToggleSidebar,
  toggleDarkMode,
  setShowFileUpload,
  openSettings
}) => {
  // 会话哈希引用，用于跟踪会话变化
  const lastSessionRef = useRef(sessionHash);
  
  // 监听会话哈希变化
  useEffect(() => {
    if (lastSessionRef.current !== sessionHash) {
      console.log('ChatArea: 会话哈希已更改', {
        之前: lastSessionRef.current,
        当前: sessionHash
      });
    }
    // 更新会话哈希引用
    return () => {
      lastSessionRef.current = sessionHash;
    };
  }, [sessionHash]);
  
  // 监听流式响应结束
  useEffect(() => {
    if (!streaming && currentResponse) {
      // 检查流式响应是否已结束
      const lastAssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: currentResponse,
        reasoning_content: reasoningText,
        timestamp: Date.now(),
        sessionHash
      };

      // 会话结束后的消息保存处理
      if (typeof handleReplyComplete === 'function') {
        handleReplyComplete(lastAssistantMessage, lastSessionRef.current);
      }
    }
  }, [streaming, currentResponse, reasoningText, sessionHash, handleReplyComplete]);

  // 移除文档
  const handleDeleteDocument = (docId) => {
    setActiveDocuments(prevDocs => {
      const newDocs = prevDocs.filter(doc => doc.id !== docId);
      
      // 更新localStorage中的activeDocuments
      const savedConversations = localStorage.getItem('conversations');
      if (savedConversations) {
        const conversations = JSON.parse(savedConversations);
        const updatedConversations = conversations.map(conv => {
          if (conv.active) {
            return {
              ...conv,
              activeDocuments: newDocs
            };
          }
          return conv;
        });
        localStorage.setItem('conversations', JSON.stringify(updatedConversations));
      }
      
      return newDocs;
    });
  };

  return (
    <div className="chat-area">
      <ChatHeader 
        handleToggleSidebar={handleToggleSidebar}
        handleNewChat={handleNewChat}
        handleExport={handleExport}
        toggleDarkMode={toggleDarkMode}
        darkMode={darkMode}
        currentTurns={currentTurns}
        activeDocuments={activeDocuments}
        handleDeleteDocument={handleDeleteDocument}
        setShowFileUpload={setShowFileUpload}
        openSettings={openSettings}
      />
      
      <div 
        className="chat-messages" 
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {loadingHistory && (
          <div className="loading-history">
            <div className="loading-spinner"></div>
            <span>加载更多消息...</span>
          </div>
        )}
        
        <MessageList 
          displayMessages={displayMessages}
          currentResponse={currentResponse}
          reasoningText={reasoningText}
          isReasoning={isReasoning}
          streaming={streaming}
          highlightedMessageId={highlightedMessageId}
          handleRetry={handleRetry}
          handleCopy={handleCopy}
          handleEdit={handleEdit}
          darkMode={darkMode}
          formatTime={formatTime}
        />
      </div>
      
      <MessageInput 
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        handleStop={handleStop}
        streaming={streaming}
        selectedModel={selectedModel}
        modelOptions={modelOptions || []}
        setSelectedModel={setSelectedModel}
      />
    </div>
  );
};

// 使用 React.memo 包裹组件
export default memo(ChatArea);
