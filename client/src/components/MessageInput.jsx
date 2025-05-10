import React, { useRef, useEffect, useState } from 'react';
import '../styles/MessageInput.css';

const MessageInput = ({ value, onChange, onSubmit, isLoading, placeholder, onStopGenerating, autoFocus }) => {
  const textareaRef = useRef(null);
  const [isPasting, setIsPasting] = useState(false);
  const prevLoadingRef = useRef(isLoading);

  // 自动聚焦（如果设置了autoFocus属性）
  useEffect(() => {
    if (autoFocus && textareaRef.current && !isLoading) {
      textareaRef.current.focus();
      console.log('初始化时自动聚焦到输入框');
    }
  }, [autoFocus]);

  // Auto-resize textarea as content grows
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [value]);

  // 监听isLoading状态变化，当AI回答完成后自动聚焦输入框
  useEffect(() => {
    // 检测isLoading从true变为false的情况，表示AI刚刚完成回答
    if (prevLoadingRef.current === true && isLoading === false) {
      // AI回答完成，将焦点设置到输入框
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          console.log('AI回答完成，自动聚焦到输入框');
        }
      }, 100); // 短暂延迟确保DOM已更新
    }
    // 更新前一次的加载状态引用
    prevLoadingRef.current = isLoading;
  }, [isLoading]);

  // Handle Enter key to submit (Shift+Enter for new line)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  // Handle paste event
  const handlePaste = (e) => {
    // 不要阻止默认粘贴行为
    // 默认的粘贴行为会自动触发onChange事件，更新输入值
    
    // 只添加视觉反馈
    setIsPasting(true);
    console.log('粘贴事件触发');
    
    // 移除视觉反馈
    setTimeout(() => setIsPasting(false), 500);
  };

  return (
    <form className="message-input-container" onSubmit={onSubmit}>
      <div className="message-input-wrapper">
        <textarea
          ref={textareaRef}
          className={`message-input ${isPasting ? 'pasting' : ''}`}
          value={value}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          disabled={isLoading}
          rows={1}
        />
        {isLoading ? (
          <button 
            type="button" // Important: type="button" prevents form submission
            className="stop-button" 
            onClick={onStopGenerating}
            aria-label="Stop generating"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            </svg>
          </button>
        ) : (
        <button 
          type="submit" 
          className="send-button"
          disabled={!value.trim() || isLoading}
            aria-label="Send message"
        >
            {/* Send Icon SVG */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
        </button>
        )}
      </div>
      <div className="input-footer">
        <span className="input-tip">按 Enter 发送，Shift+Enter 换行，支持粘贴内容</span>
      </div>
    </form>
  );
};

export default MessageInput;
