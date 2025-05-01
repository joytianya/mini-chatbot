import React, { useRef, useEffect, useState } from 'react';
import './MessageInput.css'; // 保留特定的输入布局样式

/**
 * 消息输入组件 - 处理用户输入和消息发送
 * 简化接口并添加错误处理
 */

export function MessageInput({ 
  // 基本输入属性
  input = '', 
  setInput = () => {}, 
  onSendMessage = () => {}, 
  handleStop = () => {}, 
  
  // 状态属性
  streaming = false, 
  
  // 模型相关属性（简化）
  selectedModel = '', 
  setSelectedModel = () => {}, 
  modelOptions = [] 
}) {
  // 添加错误处理状态
  const [error, setError] = useState(null);
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

  // 显示错误提示（如果有）
  useEffect(() => {
    if (error) {
      console.error('消息输入错误:', error);
      // 3秒后自动清除错误
      const timer = setTimeout(() => setError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 安全地处理消息提交
  const handleFormSubmit = (e) => {
    e?.preventDefault();
    
    try {
      const trimmedInput = input?.trim() || '';
      
      if (!trimmedInput) {
        return; // 空输入不处理
      }
      
      if (streaming) {
        return; // 正在流式响应时不处理新消息
      }
      
      if (typeof onSendMessage === 'function') {
        onSendMessage(e);
      } else {
        console.warn('未提供 onSendMessage 函数');
        setError('无法发送消息');
      }
    } catch (err) {
      console.error('发送消息时出错:', err);
      setError('发送消息失败: ' + (err.message || '未知错误'));
    }
  };

  // 安全地处理按键事件
  const handleKeyDown = (e) => {
    try {
      if (e?.key === 'Enter' && !e?.shiftKey && !streaming) {
        e.preventDefault();
        handleFormSubmit(e);
      }
    } catch (err) {
      console.error('处理按键事件时出错:', err);
      setError('处理按键事件失败');
    }
  };
  
  // 安全地处理停止生成
  const handleStopGeneration = () => {
    try {
      if (typeof handleStop === 'function') {
        handleStop();
      } else {
        console.warn('未提供 handleStop 函数');
        setError('无法停止生成');
      }
    } catch (err) {
      console.error('停止生成时出错:', err);
      setError('停止生成失败');
    }
  };

  return (
    <div className="input-area">
      {/* 错误提示 */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {/* 简化功能按钮区域 */}
      <div className="feature-buttons">
        {/* 只保留模型选择器（如果有选项） */}
        {Array.isArray(modelOptions) && modelOptions.length > 0 && (
          <select 
            className="model-selector" 
            value={selectedModel || ''} 
            onChange={(e) => {
              try {
                if (typeof setSelectedModel === 'function') {
                  setSelectedModel(e.target.value);
                }
              } catch (err) {
                console.error('选择模型时出错:', err);
                setError('选择模型失败');
              }
            }}
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
      
      {/* 输入区域 */}
      <div className="input-container"> 
        <form onSubmit={handleFormSubmit} className="input-form">
          <textarea
            ref={textareaRef}
            className="message-input"
            value={input || ''}
            onChange={(e) => {
              try {
                if (typeof setInput === 'function') {
                  setInput(e.target.value);
                }
              } catch (err) {
                console.error('设置输入时出错:', err);
                setError('设置输入失败');
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            disabled={streaming}
            rows={1}
            style={{ overflowY: 'auto' }}
          />
          
          {/* 根据流式状态显示不同按钮 */}
          {streaming ? (
            <button 
              type="button"
              className="stop-button"
              onClick={handleStopGeneration}
              title="停止生成"
            >
              停止
            </button>
          ) : (
            <button 
              type="submit" 
              className={`send-button ${(input || '').trim() ? 'active' : ''}`}
              disabled={!(input || '').trim()}
              title="发送消息"
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </form>
      </div>
      
      {/* 底部提示信息 */}
      <div className="input-footer">
        <small>按 Enter 发送消息，按 Shift+Enter 换行</small>
      </div>
    </div>
  );
}
