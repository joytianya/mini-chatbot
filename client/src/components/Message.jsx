import React, { useState } from 'react';
import DOMPurify from 'dompurify';
import '../styles/Message.css';

const Message = ({ role, content, reasoning, timestamp }) => {
  const [showReasoning, setShowReasoning] = useState(false);
  const isUser = role === 'user';
  
  // Format timestamp if available
  const formattedTime = timestamp 
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : '';

  // Function to safely render HTML content with code highlighting
  const createMarkup = (content) => {
    if (!content) return { __html: '' };
    
    // Basic markdown-like processing for code blocks
    let processedContent = content;
    
    // Replace ```language code ``` with <pre><code> blocks
    processedContent = processedContent.replace(
      /```(\w*)\n([\s\S]*?)```/g, 
      '<pre><code class="language-$1">$2</code></pre>'
    );
    
    // Replace inline `code` with <code> tags
    processedContent = processedContent.replace(
      /`([^`]+)`/g, 
      '<code>$1</code>'
    );

    // Sanitize HTML to prevent XSS
    return { __html: DOMPurify.sanitize(processedContent) };
  };

  return (
    <div className={`message ${isUser ? 'user-message' : 'bot-message'}`}>
      <div className="message-avatar">
        {isUser ? (
          <div className="user-avatar">U</div>
        ) : (
          <div className="bot-avatar">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
              <line x1="9" y1="9" x2="9.01" y2="9"></line>
              <line x1="15" y1="9" x2="15.01" y2="9"></line>
            </svg>
          </div>
        )}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{isUser ? '用户' : 'Mini Chatbot'}</span>
          {timestamp && <span className="message-time">{formattedTime}</span>}
        </div>
        
        {!isUser && reasoning && (
          <div className="reasoning-section">
            <button 
              className="toggle-reasoning" 
              onClick={() => setShowReasoning(!showReasoning)}
            >
              {showReasoning ? '隐藏思考过程' : '显示思考过程'}
            </button>
            
            {showReasoning && (
              <div className="reasoning-content">
                <div 
                  className="reasoning-text" 
                  dangerouslySetInnerHTML={createMarkup(reasoning)}
                />
              </div>
            )}
          </div>
        )}
        
        <div 
          className="message-text" 
          dangerouslySetInnerHTML={createMarkup(content)}
        />
      </div>
    </div>
  );
};

export default Message;
