import React, { useState, useEffect } from 'react';
import ChatInterface from './components/ChatInterface';
import Sidebar from './components/Sidebar';
import PasteTest from './components/PasteTest';
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
  
  // DEBUG：启动时检查 localStorage 中的数据
  useEffect(() => {
    console.log('===== DEBUG：启动时检查 localStorage =====');
    
    // 检查原始 localStorage 数据
    const rawConversations = localStorage.getItem('mini-chatbot-conversations');
    const rawUIState = localStorage.getItem('mini-chatbot-ui-state');
    const rawAPISettings = localStorage.getItem('mini-chatbot-api-settings');
    
    console.log('原始 localStorage 数据:', { 
      conversationsExists: !!rawConversations, 
      uiStateExists: !!rawUIState, 
      apiSettingsExists: !!rawAPISettings 
    });
    
    // 使用 storageService 解析数据
    const conversations = storageService.getConversations();
    console.log('解析后的对话数据:', { 
      count: Object.keys(conversations).length,
      ids: Object.keys(conversations)
    });
    
    const uiState = storageService.getUIState();
    console.log('解析后的UI状态:', uiState);
    
    console.log('===== DEBUG 结束 =====');
  }, []);
  
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
    stopGenerating
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

  // 记录状态变化用于调试，但减少刷新次数
  useEffect(() => {
    console.log('App组件状态更新:', { 
      conversationId: currentConversationId,
      messagesCount: messages?.length || 0
    });
  }, [currentConversationId, messages?.length]);

  // 处理对话选择
  const handleSelectConversation = (conversationId) => {
    if (!conversationId) {
      console.error('App.jsx: 尝试选择会话但ID为空');
      return;
    }
    
    if (conversationId === currentConversationId) {
      console.log('App.jsx: 已经是当前对话，尝试强制重新加载消息');
      // 即使是当前对话，也尝试重新加载一次消息，解决可能的消息显示问题
      chatLogic.forceReloadConversation(conversationId);
      return;
    }
    
    try {
      console.log(`App.jsx: 切换到对话 ${conversationId}`);
      
      // 1. 验证目标对话是否存在
      const targetConversation = storageService.getConversation(conversationId);
      if (!targetConversation) {
        console.error(`App.jsx: 目标对话 ${conversationId} 不存在`);
        toast.error('该对话已不存在');
        return;
      }
      
      // 2. 更新currentConversationId状态
      console.log(`App.jsx: 设置当前对话ID从 ${currentConversationId} 到 ${conversationId}`);
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
        console.log(`App.jsx: 尝试强制重新加载对话 ${conversationId} 的消息`);
        chatLogic.forceReloadConversation(conversationId);
      }, 300);
      
      console.log(`App.jsx: 已完成对话切换到 ${conversationId}`);
    } catch (error) {
      console.error('切换对话时出错:', error);
      toast.error('切换对话时出错');
    }
  };

  // 处理新建对话
  const handleNewConversation = () => {
    console.log('App.jsx: 处理新建对话请求');
    
    // 创建新对话并获取新ID
    const newId = createNewConversation();
    
    // 确保立即清空消息数组，避免显示旧消息
    chatLogic.setMessages([]);
    
    // 强制重新加载确保UI更新，传入新ID确保加载正确的对话
    setTimeout(() => {
      if (chatLogic.forceReloadConversation) {
        console.log(`App.jsx: 强制重新加载新对话 ${newId}`);
        chatLogic.forceReloadConversation(newId);
      }
    }, 200); // 增加延迟时间确保UI更新完毕
    
    console.log(`App.jsx: 新对话创建完成，ID: ${newId}`);
    
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
            deepResearchEnabled={deepResearchEnabled}
            onToggleDeepResearch={toggleDeepResearch}
            directRequestEnabled={directRequestEnabled}
            onToggleDirectRequest={toggleDirectRequest}
            chatLogicProps={chatLogic}
          />
          
          <ChatArea
            messages={messages}
            onSendMessage={(content) => {
              let targetConversationId = currentConversationId;
              
              // 如果没有当前会话ID，先创建一个新会话，并使用消息内容作为标题
              if (!targetConversationId) {
                console.log('App.jsx: 没有当前对话ID，正在创建新对话');
                targetConversationId = createNewConversation(content);
                console.log(`App.jsx: 已创建新对话，ID: ${targetConversationId}, 使用内容作为标题`);
                
                // 确保UI状态更新，将新创建的对话ID设置为当前对话ID
                setCurrentConversationId(targetConversationId);
                
                // 不再使用 messageTools.ensureMessagesVisible，直接让 sendMessage 处理消息显示
                console.log('App.jsx: 将由sendMessage函数处理消息显示');
              } else {
                console.log(`App.jsx: 使用现有对话，ID: ${targetConversationId}`);
              }
              
              // 显示检查本地存储中是否存在该对话
              const existingConversation = storageService.getConversation(targetConversationId);
              console.log(`App.jsx: 发送消息前检查本地存储中的对话: `, 
                existingConversation ? `找到对话 ${targetConversationId}` : `对话 ${targetConversationId} 不存在`);
              
              // 使用获取到的（可能是新的）会话ID发送消息
              console.log(`App.jsx: 发送消息到对话 ${targetConversationId}，消息长度: ${content.length}`);
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
                console.log(`App.jsx: 已清空对话 ${currentConversationId} 的所有消息，保留原标题: "${updatedConversation.title}"`);
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
