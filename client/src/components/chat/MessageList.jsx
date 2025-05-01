import React, { useRef, useEffect, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import MessageBubble from '../MessageBubble';

/**
 * 消息列表组件 - 显示聊天消息
 * 包括用户消息和助手消息
 */

const MessageListComponent = ({
  // 消息相关属性
  displayMessages = [],  // 显示的消息列表
  currentResponse = '',  // 当前正在生成的响应
  reasoningText = '',    // 推理过程文本
  isReasoning = false,   // 是否正在推理
  streaming = false,     // 是否正在流式响应
  
  // 交互相关属性
  highlightedMessageId = null, // 高亮消息ID
  handleRetry = () => {},      // 重试处理函数
  handleCopy = () => {},       // 复制处理函数
  handleEdit = () => {},       // 编辑处理函数
  
  // 外观相关属性
  darkMode = false,            // 深色模式
  formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString() // 时间格式化函数
}) => {
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  // 添加错误处理状态
  const [error, setError] = useState(null);
  
  // 安全地处理消息列表
  const safeDisplayMessages = Array.isArray(displayMessages) ? displayMessages : [];
  
  // 安全地过滤和映射消息
  const renderMessages = () => {
    try {
      return safeDisplayMessages
        .filter(msg => {
          // 防御性检查
          if (!msg || typeof msg !== 'object') return false;
          // 过滤掉系统消息
          return msg.role !== 'system';
        })
        .map(message => {
          // 防御性检查消息属性
          const id = message.id || message.timestamp || Date.now();
          const content = typeof message.content === 'string' ? message.content : '';
          const reasoningContent = message.reasoning_content || '';
          const isUser = message.role === 'user';
          
          return (
            <MessageBubble
              key={id}
              id={id}
              content={content}
              reasoningContent={reasoningContent}
              isUser={isUser}
              isStreaming={false}
              highlightedMessageId={highlightedMessageId}
              onRetry={() => {
                try {
                  if (typeof handleRetry === 'function') {
                    handleRetry(message);
                  }
                } catch (err) {
                  console.error('重试时出错:', err);
                  setError('重试失败');
                }
              }}
              onCopy={(text) => {
                try {
                  if (typeof handleCopy === 'function') {
                    handleCopy(text);
                  }
                } catch (err) {
                  console.error('复制时出错:', err);
                  setError('复制失败');
                }
              }}
              onEdit={(id, newContent) => {
                try {
                  if (typeof handleEdit === 'function') {
                    handleEdit(id, newContent);
                  }
                } catch (err) {
                  console.error('编辑时出错:', err);
                  setError('编辑失败');
                }
              }}
              darkMode={darkMode}
              formatTime={formatTime}
            />
          );
        });
    } catch (err) {
      console.error('渲染消息列表时出错:', err);
      setError('渲染消息列表失败');
      return <div className="error-message">消息加载失败</div>;
    }
  };
  
  return (
    <div className="messages-container">
      {/* 显示错误提示（如果有） */}
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}
      
      {/* 渲染消息列表 */}
      {renderMessages()}
      {/* 流式消息气泡 */}
      {streaming && (() => {
        try {
          return (
            <MessageBubble
              key="streaming-message"
              id="streaming-message"
              content={typeof currentResponse === 'string' ? currentResponse : ''}
              reasoningContent={isReasoning && typeof reasoningText === 'string' ? reasoningText : ''}
              isUser={false}
              isStreaming={true}
              darkMode={darkMode}
              formatTime={typeof formatTime === 'function' ? formatTime : (timestamp) => new Date(timestamp).toLocaleTimeString()}
            />
          );
        } catch (err) {
          console.error('流式消息渲染错误:', err);
          return <div className="error-message">流式消息加载失败</div>;
        }
      })()}
      <div ref={messagesEndRef} />
    </div>
  );
};

// 使用 React.memo 包裹组件
const MemoizedMessageList = memo(MessageListComponent);

export default MemoizedMessageList;
