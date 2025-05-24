import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import { useUIState } from './hooks/useUIState';
import { useChatLogic } from './hooks/useChatLogic';
import './styles/App.css';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import ChatArea from './components/ChatArea';
import TestBackendConnection from './components/TestBackendConnection';
import DirectOpenRouterTest from './components/DirectOpenRouterTest';
import storageService from './services/storageService';
// 导入消息显示测试工具
import messageTools from './test-messages';

function App() {
  // 添加测试模式状态
  const [isTestMode, setIsTestMode] = useState(false);
  // 添加直接API测试模式状态
  const [isDirectAPITestMode, setIsDirectAPITestMode] = useState(false);
  // 添加组件已加载状态
  const [isLoaded, setIsLoaded] = useState(false);
  
  const {
    conversations,
    currentConversationId,
    setCurrentConversationId,
    createNewConversation,
    deleteConversation,
    renameConversation,
    isSidebarOpen,
    toggleSidebar,
    webSearchEnabled,
    toggleWebSearch,
    deepResearchEnabled,
    toggleDeepResearch,
    directRequestEnabled,
    toggleDirectRequest,
    setConversations
  } = useUIState();
  
  // 组件加载完成后标记为已加载
  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // 使用useRef保存错误和加载状态，避免无限循环
  const lastErrorRef = React.useRef(null);
  const handleError = React.useCallback((error) => {
    if (error !== lastErrorRef.current) {
      console.error('聊天错误:', error);
      lastErrorRef.current = error;
    }
  }, []);

  const chatLogic = useChatLogic(
    currentConversationId,
    webSearchEnabled,
    deepResearchEnabled,
    directRequestEnabled,
    handleError,
    null // 移除loading回调函数，避免不必要的日志
  );

  const { 
    messages, 
    sendMessage, 
    isLoading, 
    apiSettings, 
    updateApiSettings,
    streamingResponse,
    forceReloadConversation,
    clearAllConversations,
    stopGenerating,
    resetApiConfig,
    isConfigLoaded
  } = chatLogic;

  // 切换测试模式
  const toggleTestMode = () => {
    setIsTestMode(prev => !prev);
    // 切换到测试模式时，关闭直接API测试模式
    if (!isTestMode) {
      setIsDirectAPITestMode(false);
    }
  };

  // 切换直接API测试模式
  const toggleDirectAPITestMode = () => {
    setIsDirectAPITestMode(prev => !prev);
    // 切换到直接API测试模式时，关闭普通测试模式
    if (!isDirectAPITestMode) {
      setIsTestMode(false);
    }
  };

  // 处理对话选择
  const handleSelectConversation = (conversationId) => {
    if (!conversationId) {
      console.error('App.jsx: 尝试选择会话但ID为空');
      return;
    }
    
    if (conversationId === currentConversationId) {
      // 即使是当前对话，也尝试重新加载一次消息，解决可能的消息显示问题
      chatLogic.forceReloadConversation(conversationId);
      return;
    }
    
    try {
      // 1. 验证目标对话是否存在
      const targetConversation = storageService.getConversation(conversationId);
      if (!targetConversation) {
        console.error(`App.jsx: 目标对话 ${conversationId} 不存在`);
        toast.error('该对话已不存在');
        return;
      }
      
      // 2. 更新currentConversationId状态
      setCurrentConversationId(conversationId);
      
      // 3. 更新localStorage中的UI状态以保持一致性
      storageService.saveUIState({
        currentConversationId: conversationId,
        isSidebarOpen,
        webSearchEnabled,
        deepResearchEnabled,
        directRequestEnabled
      });
      
      // 4. 额外确认 - 先清空消息数组，然后在短暂延时后强制重新加载一次消息
      chatLogic.setMessages([]); // 先清空消息，避免显示上一个对话的内容
      
      setTimeout(() => {
        chatLogic.forceReloadConversation(conversationId);
      }, 300);
      
    } catch (error) {
      console.error('切换对话时出错:', error);
      toast.error('切换对话时出错');
    }
  };

  // 处理新建对话
  const handleNewConversation = () => {
    // 创建新对话并获取新ID
    const newId = createNewConversation();
    
    // 确保立即清空消息数组，避免显示旧消息
    chatLogic.setMessages([]);
    
    // 强制重新加载确保UI更新，传入新ID确保加载正确的对话
    setTimeout(() => {
      if (chatLogic.forceReloadConversation) {
        chatLogic.forceReloadConversation(newId);
      }
    }, 200); // 增加延迟时间确保UI更新完毕
    
    return newId;
  };

  // 处理删除对话
  const handleDeleteConversation = (conversationId) => {
    if (window.confirm('确定要删除这个对话吗？')) {
      deleteConversation(conversationId);
    }
  };

  // 处理重命名对话
  const handleRenameConversation = (conversationId, newTitle) => {
    renameConversation(conversationId, newTitle);
  };

  return (
    <div className="app-container">
      <Toaster position="top-right" />
      
      <div className="mode-toggle-container">
        <button 
          className={`mode-toggle-button ${isTestMode ? 'test-mode' : 'chat-mode'}`}
          onClick={toggleTestMode}
        >
          {isTestMode ? '返回聊天' : '后端测试'}
        </button>
        <button 
          className={`mode-toggle-button ${isDirectAPITestMode ? 'direct-test-mode' : 'chat-mode'}`}
          onClick={toggleDirectAPITestMode}
        >
          {isDirectAPITestMode ? '返回聊天' : '直连API测试'}
        </button>
      </div>
      
      {isTestMode ? (
        <TestBackendConnection />
      ) : isDirectAPITestMode ? (
        <DirectOpenRouterTest />
      ) : (
        <>
          <Sidebar
            conversations={conversations}
            setConversations={setConversations}
            currentConversationId={currentConversationId}
            onSelectConversation={handleSelectConversation}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            isOpen={isSidebarOpen}
            apiSettings={apiSettings}
            onUpdateApiSettings={updateApiSettings}
            webSearchEnabled={webSearchEnabled}
            onToggleWebSearch={toggleWebSearch}
            directRequestEnabled={directRequestEnabled}
            onToggleDirectRequest={toggleDirectRequest}
            chatLogicProps={chatLogic}
            resetApiConfig={resetApiConfig}
          />
          
          <ChatArea
            messages={messages}
            onSendMessage={(content) => {
              let targetConversationId = currentConversationId;
              
              // 如果没有当前会话ID，先创建一个新会话，并使用消息内容作为标题
              if (!targetConversationId) {
                targetConversationId = createNewConversation(content);
                // 确保UI状态更新，将新创建的对话ID设置为当前对话ID
                setCurrentConversationId(targetConversationId);
              }
              
              // 使用获取到的（可能是新的）会话ID发送消息
              sendMessage(content, null, {
                webSearchEnabled,
                deepResearchEnabled,
                directRequest: directRequestEnabled,
                // 确保将消息保存到正确的（可能是新建的）对话中
                conversationIdToSave: targetConversationId 
              });
            }}
            isLoading={isLoading}
            streamingResponse={streamingResponse}
            onToggleSidebar={toggleSidebar}
            onClearMessages={() => {
              if (messages.length > 0 && window.confirm('确定要清空当前对话吗？')) {
                // 获取当前对话以保留其标题和其他元数据
                const currentConversation = storageService.getConversation(currentConversationId);
                // 保留ID和标题，但清空消息
                const updatedConversation = {
                  id: currentConversationId,
                  title: currentConversation?.title || '新对话', // 保留原始标题
                  messages: [],
                  createdAt: currentConversation?.createdAt || new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };
                chatLogic.setMessages([]);
                storageService.saveConversationNow(currentConversationId, updatedConversation);
              }
            }}
            webSearchEnabled={webSearchEnabled}
            onStopGenerating={stopGenerating}
          />
        </>
      )}
    </div>
  );
}

export default App;
