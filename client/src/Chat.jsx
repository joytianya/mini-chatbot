// 导入必要的React组件和钩子
import React, { useState, useEffect, useRef } from 'react';
// 导入配置文件中的模型选项和历史记录长度限制
import { modelOptions, maxHistoryLength, serverURL } from './Config';
// 导入侧边栏和聊天区域组件
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
// 导入聊天逻辑钩子
import { useChatLogic } from './ChatLogic';
import axios from 'axios';

// 主聊天组件
function Chat() {
  // 使用自定义钩子获取所有聊天相关的状态和方法
  const {
    displayMessages,      // 显示的消息列表
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
    activeDocument,      // 当前活动文档
    setActiveDocument    // 设置当前活动文档
  } = useChatLogic();

  // 文件上传相关状态
  const [files, setFiles] = React.useState([]);

  // 渲染主界面
  return (
    <div className="main-container" style={{
      display: 'flex',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden'
    }}>
      {/* 侧边栏组件 */}
      <Sidebar 
        isSidebarExpanded={isSidebarExpanded}
        handleNewChat={handleNewChat}
        conversations={conversations}
        handleConversationClick={handleConversationClick}
        handleDeleteConversation={handleDeleteConversation}
        streaming={streaming}
        handleClearAll={handleClearAll}
        formatTime={formatTime}
        darkMode={darkMode}
      />

      {/* 聊天区域组件 */}
      <ChatArea 
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        modelOptions={modelOptions}
        currentTurns={currentTurns}
        maxHistoryLength={maxHistoryLength}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        handleExport={handleExport}
        displayMessages={displayMessages}
        streaming={streaming}
        reasoningText={reasoningText}
        currentResponse={currentResponse}
        isReasoning={isReasoning}
        handleRetry={handleRetry}
        handleCopy={handleCopy}
        handleEdit={handleEdit}
                      highlightedMessageId={highlightedMessageId}
        chatContainerRef={chatContainerRef}
        handleScroll={handleScroll}
        loadingHistory={loadingHistory}
        handleSubmit={handleSubmit}
        input={input}
        setInput={setInput}
        handleStop={handleStop}
        activeDocument={activeDocument}
        setActiveDocument={setActiveDocument}
      />

      {/* 全局样式表 */}
      <style>
        {`
  /* 加载动画旋转效果 */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* 鼠标悬停时显示删除按钮 */
  .conversation-item:hover .delete-button {
    visibility: visible !important;
  }
        `}
      </style>
    </div>
  );
}

// 导出Chat组件
export default Chat; 