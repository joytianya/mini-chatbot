import React, { useRef, useEffect, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import MessageBubble from '../MessageBubble';

const MessageListComponent = ({
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
}) => {
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
          id={message.id || message.timestamp} // Pass id
          content={message.content}
          reasoningContent={message.reasoning_content} // Pass reasoning content
          isUser={message.role === 'user'}
          isStreaming={false} // Existing messages are not streaming
          highlightedMessageId={highlightedMessageId} // Pass highlighted ID
          onRetry={() => handleRetry(message)} // Pass message to retry handler
          onCopy={handleCopy} // Pass copy handler
          onEdit={handleEdit}
          darkMode={darkMode}
          formatTime={formatTime}
        />
      ))}
      {streaming && (
        <MessageBubble
          key="streaming-message"
          id="streaming-message" // Unique key/id for streaming bubble
          content={currentResponse}
          reasoningContent={reasoningText}
          isUser={false} // Streaming response is always assistant
          isStreaming={true} // Indicate streaming
          // No retry/copy/edit for streaming message
          darkMode={darkMode}
          formatTime={formatTime}
        />
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

// 使用 React.memo 包裹组件
const MemoizedMessageList = memo(MessageListComponent);

export default MemoizedMessageList;
