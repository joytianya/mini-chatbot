import React, { useRef, useEffect } from 'react';
import './MessageInput.css'; // Keep specific input layout styles here

export function MessageInput({ 
  input, 
  setInput, 
  onSendMessage, 
  handleStop, // Add handleStop prop
  streaming, 
  selectedModel, 
  setSelectedModel, 
  modelOptions 
}) {
  const textareaRef = useRef(null);
  
  // 自动调整文本框高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height
      const scrollHeight = textarea.scrollHeight;
      // Set height based on content, capped at 200px
      textarea.style.height = `${Math.min(scrollHeight, 200)}px`; 
    }
  }, [input]); // Adjust height when input changes

  // 处理消息提交 (using the passed onSendMessage)
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (trimmedInput && !streaming) {
      onSendMessage(e); // Pass the event object if needed by the handler
      // Clearing input is handled by the parent component (ChatArea) via setInput
    }
  };

  // 处理按键事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !streaming) {
      e.preventDefault();
      handleFormSubmit(e);
    }
  };

  return (
    // Use input-area class from ChatArea.css for consistency
    <div className="input-area"> 
      {/* Feature buttons - Consider making these functional */}
      <div className="feature-buttons">
        <button className="feature-button">
          深度研究
        </button>
        <button className="feature-button">
          联网搜索
        </button>
        {/* Model Selector Dropdown */}
        {modelOptions && modelOptions.length > 0 && (
          <select 
            className="model-selector" 
            value={selectedModel} 
            onChange={(e) => setSelectedModel(e.target.value)}
            disabled={streaming}
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        )}
      </div>
      
      {/* Use input-container class from ChatArea.css */}
      <div className="input-container"> 
        <form onSubmit={handleFormSubmit} className="input-form">
          <textarea
            ref={textareaRef}
            className="message-input" // Use class from ChatArea.css
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="向 AI 发送消息..." // Updated placeholder
            disabled={streaming}
            rows={1}
            style={{ overflowY: 'auto' }} // Ensure scrollbar appears if needed
          />
          {streaming ? (
             <button 
              type="button" // Change to button type
              className="stop-button" // Add specific class for styling
              onClick={handleStop} // Call handleStop when clicked
            >
              停止
            </button>
          ) : (
            <button 
              type="submit" 
              className={`send-button ${input.trim() ? 'active' : ''}`} // Use class from ChatArea.css
              disabled={!input.trim()}
            >
              {/* Use SVG icon for send */}
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
