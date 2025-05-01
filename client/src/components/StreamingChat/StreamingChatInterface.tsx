import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../../types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './StreamingChat.css';

interface StreamingChatInterfaceProps {
  messages: Message[];
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isStreaming: boolean;
  thinkingProcess: string;
  isThinking: boolean;
  darkMode: boolean;
  handleStop?: () => void;
}

const StreamingChatInterface: React.FC<StreamingChatInterfaceProps> = ({
  messages,
  input,
  setInput,
  handleSubmit,
  isStreaming,
  thinkingProcess,
  isThinking,
  darkMode,
  handleStop
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, thinkingProcess]);

  // Handle scroll events to show/hide scroll button
  useEffect(() => {
    const handleScroll = () => {
      if (!chatContainerRef.current) return;
      
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isScrolledUp = scrollHeight - scrollTop - clientHeight > 100;
      setShowScrollButton(isScrolledUp);
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Render code blocks with syntax highlighting
  const renderContent = (content: string) => {
    return (
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <SyntaxHighlighter
                style={vscDarkPlus}
                language={match[1]}
                PreTag="div"
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <div className={`streaming-chat-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="streaming-chat-messages" ref={chatContainerRef}>
        {messages.map((message, index) => (
          <div 
            key={message.id || index} 
            className={`streaming-chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-header">
              <div className="message-avatar">
                {message.role === 'user' ? '👤' : '🤖'}
              </div>
              <div className="message-role">
                {message.role === 'user' ? 'You' : 'Assistant'}
              </div>
              {message.timestamp && (
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="message-content">
              {renderContent(message.content)}
            </div>
          </div>
        ))}

        {/* Thinking process display */}
        {isThinking && thinkingProcess && (
          <div className="streaming-chat-message assistant-message thinking-message">
            <div className="message-header">
              <div className="message-avatar">🧠</div>
              <div className="message-role">Thinking Process</div>
            </div>
            <div className="message-content thinking-content">
              {renderContent(thinkingProcess)}
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && !isThinking && (
          <div className="streaming-indicator">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form className="streaming-chat-input-container" onSubmit={handleSubmit}>
        <textarea
          className="streaming-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <div className="streaming-chat-buttons">
          {isStreaming ? (
            <button 
              type="button" 
              className="streaming-chat-stop-button"
              onClick={handleStop}
            >
              Stop
            </button>
          ) : (
            <button 
              type="submit" 
              className="streaming-chat-submit-button"
              disabled={!input.trim() || isStreaming}
            >
              Send
            </button>
          )}
        </div>
      </form>

      {/* Scroll to bottom button */}
      {showScrollButton && (
        <button 
          className="scroll-to-bottom-button"
          onClick={scrollToBottom}
        >
          ↓
        </button>
      )}
    </div>
  );
};

export default StreamingChatInterface;
