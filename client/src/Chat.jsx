// 导入必要的React组件和钩子
import React, { useState, useEffect, useRef } from 'react';
// 导入配置文件中的历史记录长度限制
import { maxHistoryLength, serverURL } from './Config';
// 导入侧边栏和聊天区域组件
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { Settings } from './components/Settings';
// 导入聊天逻辑钩子
import { useChatLogic } from './ChatLogic';
import axios from 'axios';
// 导入敏感信息演示组件
import SensitiveInfoDemo from './components/SensitiveInfoDemo';
// 导入错误边界组件
import ErrorBoundary from './components/ErrorBoundary';
import './Chat.css';

// 主聊天组件
function Chat() {
  const [showSettings, setShowSettings] = useState(false);
  
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
    formatTime,          // 时间格式化函数
    currentTurns,        // 当前对话轮次
    highlightedMessageId,// 高亮消息ID
    loadingHistory,      // 是否正在加载历史记录
    sendChatRequest,     // 发送普通聊天请求
    sendDocumentChatRequest,  // 发送文档聊天请求
    activeDocuments,      // 当前活动文档列表
    setActiveDocuments,    // 设置当前活动文档列表
    handleToggleSidebar,  // 添加这一行
    availableModels,     // 可用模型列表
    setAvailableModels,   // 可用模型列表的设置函数
    setModelConfigs,      // 设置模型配置的函数
    getConfigForModel,    // 获取模型配置的函数
    sensitiveInfoProtectionEnabled, // 敏感信息保护开关
    toggleSensitiveInfoProtection,   // 切换敏感信息保护的函数
    editingTitle,
    setEditingTitle,
    editingTitleValue,
    setEditingTitleValue,
    displayLimit,
    sentMessageId,
    abortController,
    userHasScrolled,
    handleDeleteChat,
    handleSelectChat,
    handleTitleEdit,
    handleTitleChange,
    handleTitleSave,
    handleTitleCancel,
    handleFileUpload,
    sessionHash         // 添加会话哈希值
  } = useChatLogic();

  // 文件上传相关状态
  const [files, setFiles] = React.useState([]);

  // 处理设置面板的显示和隐藏
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // 保存模型配置
  const saveModelConfigs = (settings) => {
    const { configs, modelNames, embeddingConfigs } = settings;
    
    // 保存模型配置
    setModelConfigs(configs);
    localStorage.setItem('modelConfigs', JSON.stringify(configs));
    
    // 保存 embedding 配置
    if (embeddingConfigs) {
      localStorage.setItem('embeddingConfigs', JSON.stringify(embeddingConfigs));
    }
    
    // 如果有配置，自动选择第一个模型
    if (configs.length > 0 && configs[0].model_name) {
      setSelectedModel(configs[0].model_name);
    }
    
    // 更新可用模型列表
    const updatedModels = modelNames || configs
      .map(config => config.model_name)
      .filter(name => name && name.trim() !== '');
    
    setAvailableModels(updatedModels);
    localStorage.setItem('availableModels', JSON.stringify(updatedModels));
  };

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
          handleSettingsSave={saveModelConfigs}
          sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
          toggleSensitiveInfoProtection={toggleSensitiveInfoProtection}
          formatTime={formatTime}
          handleToggleSidebar={handleToggleSidebar}
          editingTitle={editingTitle}
          editingTitleValue={editingTitleValue}
          onTitleEdit={handleTitleEdit}
          onTitleChange={handleTitleChange}
          onTitleSave={handleTitleSave}
          onTitleCancel={handleTitleCancel}
        />
        
        {/* 聊天区域 */}
        <div className="main-content">
          {/* 敏感信息演示组件 - 仅在没有对话时显示 */}
          {/* {displayMessages.length <= 1 && sensitiveInfoProtectionEnabled && (
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <SensitiveInfoDemo darkMode={darkMode} />
            </div>
          )} */}
          
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
              sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
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
              handleFileUpload={handleFileUpload}
              sessionHash={sessionHash}
            />
          </ErrorBoundary>
        </div>
        
        {showSettings && (
          <Settings
            isOpen={showSettings}
            onClose={toggleSettings}
            darkMode={darkMode}
            initialSettings={{
              modelConfigs: JSON.parse(localStorage.getItem('modelConfigs') || '[]'),
              embeddingConfigs: JSON.parse(localStorage.getItem('embeddingConfigs') || '[]')
            }}
            onSave={saveModelConfigs}
            sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
            toggleSensitiveInfoProtection={toggleSensitiveInfoProtection}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

// 导出Chat组件
export default Chat; 

const ModelSelector = ({ models, selectedModel, onModelChange, disabled }) => {
  return (
    <select
      value={selectedModel}
      onChange={(e) => onModelChange(e.target.value)}
      disabled={disabled}
      style={{
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ddd',
        backgroundColor: disabled ? '#f5f5f5' : 'white'
      }}
    >
      {(models || []).map((model) => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
}; 