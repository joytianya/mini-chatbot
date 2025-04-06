// 导入必要的React组件和钩子
import React, { useState, useEffect } from 'react';
// 导入配置文件中的历史记录长度限制
import { maxHistoryLength, serverURL } from './Config';
// 导入组件
import Sidebar from './components/sidebar/Sidebar';
import ChatArea from './components/chat/ChatArea';
import Settings from './components/settings/Settings';
// 导入聊天逻辑钩子
import useChatLogic from './hooks/useChatLogic';
// 导入敏感信息演示组件
import SensitiveInfoDemo from './components/SensitiveInfoDemo';
// 导入错误边界组件
import ErrorBoundary from './components/ErrorBoundary';
import './Chat.css';
// 导入会话管理工具
import { handleReplyComplete } from './utils/sessionManager';

// 主聊天组件
function Chat() {
  const [showSettings, setShowSettings] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  // 使用自定义钩子获取所有聊天相关的状态和方法
  const {
    displayMessages,      // 显示的消息列表
    setDisplayMessages,   // 设置显示的消息列表
    input,               // 输入框的值
    setInput,            // 设置输入框的值
    selectedModel,       // 当前选择的模型
    setSelectedModel,    // 设置当前模型
    streaming,           // 是否正在流式响应
    currentResponse,     // 当前响应内容
    reasoningText,       // 推理过程文本
    isReasoning,         // 是否正在推理
    darkMode,            // 深色模式状态
    setDarkMode,         // 设置深色模式
    conversations,       // 对话列表
    setConversations,    // 设置对话列表
    isSidebarExpanded,   // 侧边栏是否展开
    chatContainerRef,    // 聊天容器的引用
    handleSubmit,        // 提交消息处理函数
    handleStop,          // 停止生成处理函数
    handleNewChat,       // 新建聊天处理函数
    handleConversationClick,    // 点击对话处理函数
    handleDeleteConversation,   // 删除对话处理函数
    handleClearAll,      // 清空所有对话处理函数
    handleExport,        // 导出对话处理函数
    handleRetry,         // 重试处理函数
    handleCopy,          // 复制文本处理函数
    handleEdit,          // 编辑消息处理函数
    handleScroll,        // 滚动处理函数
    scrollToBottom,      // 滚动到底部
    handleToggleSidebar, // 切换侧边栏
    formatTime,          // 时间格式化函数
    currentTurns,        // 当前对话轮次
    highlightedMessageId,// 高亮消息ID
    loadingHistory,      // 是否正在加载历史记录
    activeDocuments,     // 当前活动文档列表
    setActiveDocuments,  // 设置当前活动文档列表
    availableModels,     // 可用模型列表
    setAvailableModels,  // 可用模型列表的设置函数
    modelConfigs,        // 模型配置
    setModelConfigs,     // 设置模型配置的函数
    handleSettingsSave,  // 保存设置的函数
    getConfigForModel,   // 获取模型配置的函数
    sensitiveInfoProtectionEnabled, // 敏感信息保护开关
    toggleSensitiveInfoProtection,  // 切换敏感信息保护的函数
    toggleDarkMode,      // 切换深色模式
    sessionHash,         // 会话哈希值
    handleFileUpload     // 文件上传处理函数
  } = useChatLogic();
  
  // 添加一个调试日志，检查文件上传和模型选择状态
  useEffect(() => {
    console.log("当前选择的模型:", selectedModel);
    console.log("可用模型列表:", availableModels);
    console.log("活动文档:", activeDocuments);
  }, [selectedModel, availableModels, activeDocuments]);

  // 渲染主界面
  return (
    <ErrorBoundary>
      <div className={`chat-container ${darkMode ? 'dark-mode' : ''}`}>
        {/* 侧边栏组件 */}
        <Sidebar 
          isSidebarExpanded={isSidebarExpanded}
          handleNewChat={handleNewChat}
          conversations={conversations}
          handleConversationClick={handleConversationClick}
          handleDeleteConversation={handleDeleteConversation}
          streaming={streaming}
          handleClearAll={handleClearAll}
          handleExport={handleExport}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          availableModels={availableModels}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          handleSettingsSave={handleSettingsSave}
          sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
          toggleSensitiveInfoProtection={toggleSensitiveInfoProtection}
          handleToggleSidebar={handleToggleSidebar}
        />
        
        {/* 聊天区域 */}
        <div className="main-content">
          {/* 聊天区域组件 */}
          <ErrorBoundary>
            <ChatArea 
              displayMessages={displayMessages}
              setDisplayMessages={setDisplayMessages}
              currentResponse={currentResponse}
              reasoningText={reasoningText}
              isReasoning={isReasoning}
              streaming={streaming}
              darkMode={darkMode}
              chatContainerRef={chatContainerRef}
              handleScroll={handleScroll}
              handleRetry={handleRetry}
              handleCopy={handleCopy}
              handleEdit={handleEdit}
              formatTime={formatTime}
              highlightedMessageId={highlightedMessageId}
              loadingHistory={loadingHistory}
              activeDocuments={activeDocuments}
              setActiveDocuments={setActiveDocuments}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              handleStop={handleStop}
              selectedModel={selectedModel}
              setSelectedModel={setSelectedModel}
              modelOptions={availableModels}
              currentTurns={currentTurns}
              maxHistoryLength={maxHistoryLength}
              setDarkMode={setDarkMode}
              handleExport={handleExport}
              sessionHash={sessionHash}
              handleReplyComplete={handleReplyComplete}
              handleNewChat={handleNewChat}
              handleToggleSidebar={handleToggleSidebar}
              toggleDarkMode={toggleDarkMode}
              setShowFileUpload={setShowFileUpload}
              openSettings={() => setShowSettings(true)}
            />
          </ErrorBoundary>
        </div>
        
        {showSettings && (
          <Settings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            onSave={handleSettingsSave}
            modelConfigs={modelConfigs}
            availableModels={availableModels}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default Chat;