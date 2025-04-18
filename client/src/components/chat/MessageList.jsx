import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import MessageBubble from '../MessageBubble';

export function MessageList({
  displayMessages,
  currentResponse,
  reasoningText,
  isReasoning,
  streaming,
  highlightedMessageId,
  handleRetry,
  handleCopy,
  handleEdit,
  darkMode,
  formatTime
}) {
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages]);

  return (
    <div className="messages-container">
      {displayMessages.filter(msg => msg.role !== 'system').map((message) => (
        <MessageBubble
          key={message.id || message.timestamp}
          message={message}
          highlighted={message.id === highlightedMessageId}
          onRetry={handleRetry}
          onCopy={handleCopy}
          onEdit={handleEdit}
          darkMode={darkMode}
          formatTime={formatTime}
        />
      ))}
      {streaming && (
        <MessageBubble
          key="streaming-message"
          message={{
            role: 'assistant',
            content: currentResponse,
            reasoning_content: reasoningText,
            timestamp: Date.now(),
          }}
          isStreaming={true}
          isReasoning={isReasoning}
          darkMode={darkMode}
          formatTime={formatTime}
        />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default MessageList; 