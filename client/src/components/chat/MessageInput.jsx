import React, { useState, useRef, useEffect } from 'react';
import './MessageInput.css';

export function MessageInput({ onSendMessage, streaming }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  
  // 自动调整文本框高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }, [message]);

  // 处理消息提交
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (trimmedMessage && !streaming) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };

  // 处理按键事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="input-container">
      <div className="feature-buttons">
        <button className="feature-button">
          深度研究
        </button>
        <button className="feature-button">
          联网搜索
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="input-form">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="向 AI 发送消息"
          disabled={streaming}
          rows={1}
        />
        <button 
          type="submit" 
          className={`send-button ${message.trim() && !streaming ? 'active' : ''}`}
          disabled={!message.trim() || streaming}
        >
          发送
        </button>
      </form>
    </div>
  );
} 