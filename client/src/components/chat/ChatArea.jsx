import React, { useRef, useEffect, useState, memo } from 'react';
import MessageList from './MessageList';
import { MessageInput } from './MessageInput';
import ChatHeader from './ChatHeader';
import '../ChatArea.css';

/**
 * 聊天区域组件 - 显示消息列表和输入框
 * 简化接口以适应新的 Chat 组件
 */
const ChatArea = ({
  // 消息相关
  messages = [],          // 显示的消息列表
  input = '',             // 输入框的值
  setInput = () => {},    // 设置输入框的值
  onSubmit = () => {},    // 提交消息的处理函数
  onStop = () => {},      // 停止生成的处理函数
  onRetry = () => {},     // 重试的处理函数
  onCopy = () => {},      // 复制文本的处理函数
  onEdit = () => {},      // 编辑消息的处理函数
  onScroll = () => {},    // 滚动处理函数
  
  // 状态相关
  currentResponse = '',   // 当前响应内容
  reasoningText = '',     // 推理过程文本
  isReasoning = false,    // 是否正在推理
  streaming = false,      // 是否正在流式响应
  darkMode = false,       // 深色模式状态
  
  // 引用和格式化
  chatContainerRef = null, // 聊天容器的引用
  formatTime = () => '',   // 时间格式化函数
  
  // 其他功能
  highlightedMessageId = null, // 高亮消息ID
  sensitiveInfoProtectionEnabled = false, // 敏感信息保护开关
  onToggleSensitiveInfoProtection = () => {} // 切换敏感信息保护的函数
}) => {
  // 简化实现，移除不必要的状态跟踪和效果
  
  // 添加错误处理状态
  const [error, setError] = useState(null);
  
  // 处理可能的错误
  useEffect(() => {
    if (error) {
      console.error('ChatArea 错误:', error);
      // 5秒后自动清除错误
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  
  // 安全地处理消息列表
  const safeMessages = Array.isArray(messages) ? messages : [];
  
  // 处理复制消息内容
  const handleCopyMessage = (content) => {
    try {
      if (typeof onCopy === 'function') {
        onCopy(content);
      } else {
        // 如果没有提供 onCopy 函数，则使用默认实现
        navigator.clipboard.writeText(content)
          .then(() => console.log('已复制到剪贴板'))
          .catch(err => {
            console.error('复制失败:', err);
            setError('复制失败: ' + err.message);
          });
      }
    } catch (err) {
      console.error('处理复制时出错:', err);
      setError('复制操作失败');
    }
  };
  
  // 安全地处理消息提交
  const handleMessageSubmit = (e) => {
    try {
      if (typeof onSubmit === 'function') {
        onSubmit(e);
      } else {
        console.warn('未提供 onSubmit 函数');
      }
    } catch (err) {
      console.error('提交消息时出错:', err);
      setError('发送消息失败');
    }
  };
  
  // 安全地处理停止生成
  const handleStopGeneration = () => {
    try {
      if (typeof onStop === 'function') {
        onStop();
      } else {
        console.warn('未提供 onStop 函数');
      }
    } catch (err) {
      console.error('停止生成时出错:', err);
      setError('停止生成失败');
    }
  };

  return (
    <div className="chat-area">
      {/* 简化的聊天头部 */}
      <div className="chat-header">
        <div className="header-left">
          <button className="icon-button" onClick={() => window.history.back()}>
            <span>返回</span>
          </button>
        </div>
        <div className="header-title">
          <h2>智能助手</h2>
        </div>
        <div className="header-right">
          {sensitiveInfoProtectionEnabled !== undefined && (
            <button 
              className={`icon-button ${sensitiveInfoProtectionEnabled ? 'active' : ''}`}
              onClick={() => {
                try {
                  if (typeof onToggleSensitiveInfoProtection === 'function') {
                    onToggleSensitiveInfoProtection();
                  }
                } catch (err) {
                  console.error('切换敏感信息保护时出错:', err);
                  setError('切换敏感信息保护失败');
                }
              }}
              title={sensitiveInfoProtectionEnabled ? '关闭敏感信息保护' : '开启敏感信息保护'}
            >
              <span>{sensitiveInfoProtectionEnabled ? '🔒' : '🔓'}</span>
            </button>
          )}
        </div>
      </div>
      
      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}
      
      {/* 聊天消息区域 */}
      <div 
        className="chat-messages" 
        ref={chatContainerRef}
        onScroll={typeof onScroll === 'function' ? onScroll : undefined}
      >
        <MessageList 
          displayMessages={safeMessages}
          currentResponse={currentResponse}
          reasoningText={reasoningText}
          isReasoning={isReasoning}
          streaming={streaming}
          highlightedMessageId={highlightedMessageId}
          handleRetry={onRetry}
          handleCopy={handleCopyMessage}
          handleEdit={onEdit}
          darkMode={darkMode}
          formatTime={formatTime}
        />
      </div>
      
      {/* 消息输入区域 */}
      <MessageInput 
        input={input}
        setInput={setInput}
        onSendMessage={handleMessageSubmit}
        handleStop={handleStopGeneration}
        streaming={streaming}
        selectedModel="" // 简化模型选择
        setSelectedModel={() => {}}
        modelOptions={[]} // 简化模型选项
      />
    </div>
  );
};

// 使用 React.memo 包裹组件
export default memo(ChatArea);
