import React from 'react';
import ChatInterface from './ChatInterface';
import '../styles/ChatArea.css';

function ChatArea({ 
  messages, 
  onSendMessage, 
  isLoading, 
  streamingResponse,
  onToggleSidebar,
  onClearMessages,
  webSearchEnabled,
  onStopGenerating
}) {
  return (
    <main className="chat-area">
      <div className="chat-container">
        <ChatInterface 
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          streamingResponse={streamingResponse}
          onToggleSidebar={onToggleSidebar}
          onClearMessages={onClearMessages}
          webSearchEnabled={webSearchEnabled}
          onStopGenerating={onStopGenerating}
        />
      </div>
    </main>
  );
}

export default ChatArea; 