import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { serverURL } from '../Config';
import { Upload } from './Upload';  // 新增上传组件

const ChatArea = ({
  selectedModel,
  setSelectedModel,
  modelOptions,
  currentTurns,
  maxHistoryLength,
  darkMode,
  setDarkMode,
  handleExport,
  displayMessages,
  streaming,
  reasoningText,
  currentResponse,
  isReasoning,
  handleRetry,
  handleCopy,
  handleEdit,
  highlightedMessageId,
  chatContainerRef,
  handleScroll,
  loadingHistory,
  handleSubmit,
  input,
  setInput,
  handleStop,
  activeDocument,
  setActiveDocument,
  setDisplayMessages
}) => {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [isDeepResearch, setIsDeepResearch] = useState(false);  // 添加深度研究模式状态

  // 修改提交处理函数
  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    handleSubmit(e, isDeepResearch);
    // 重置高度并重新聚焦输入框
    textareaRef.current.style.height = '32px';
    textareaRef.current.focus();
  };

  // 初始聚焦文本输入框
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div style={{ 
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: darkMode ? '#1a1a1a' : '#fff'
    }}>
      {/* 头部区域 */}
      <div style={{
        padding: '12px 20px',
        borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        {/* 左侧：模型选择 */}
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
            backgroundColor: darkMode ? '#2d2d2d' : '#fff',
            fontSize: '14px',
            color: darkMode ? '#e0e0e0' : '#2c3e50',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          {/* 默认模型选项 */}
          {modelOptions.map(model => (
            <option 
              key={model} 
              value={model}
              style={{
                backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                color: darkMode ? '#e0e0e0' : '#2c3e50'
              }}
            >
              {model}
            </option>
          ))}
          {/* 从设置中获取的自定义模型 */}
          {window.chatSettings?.model_name && !modelOptions.includes(window.chatSettings.model_name) && (
            <option 
              key={window.chatSettings.model_name} 
              value={window.chatSettings.model_name}
              style={{
                backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                color: darkMode ? '#e0e0e0' : '#2c3e50'
              }}
            >
              {window.chatSettings.model_name}
            </option>
          )}
        </select>

        {/* 右侧：对话轮次和导出按钮 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div className="turns-counter" style={{ 
            color: currentTurns >= maxHistoryLength 
              ? '#ff4444' 
              : (darkMode ? '#e0e0e0' : '#666'),
            fontSize: '14px',
            padding: '6px 12px',
            backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
            borderRadius: '6px'
          }}>
            对话轮次: {currentTurns}/{maxHistoryLength}
          </div>
          
          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            style={{
              padding: '6px 12px',
              border: '1px solid ' + (darkMode ? '#444' : '#e0e0e0'),
              borderRadius: '6px',
              background: darkMode ? '#2d2d2d' : '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: darkMode ? '#e0e0e0' : '#666',
              fontSize: '14px'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            导出
          </button>
          
          {/* 深色模式切换按钮 */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              width: '30px',
              height: '30px',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              background: darkMode ? '#2d2d2d' : '#f5f5f5',
              cursor: 'pointer',
              color: darkMode ? '#e0e0e0' : '#666',
              fontSize: '16px'
            }}
            title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* 消息列表区域 */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: darkMode ? '#1a1a1a' : '#fff'
        }}
      >
        {/* 显示历史消息 */}
        {displayMessages.map((msg, index) => (
          msg.role !== 'system' && (
            <MessageBubble 
              key={msg.id || index}
              content={msg.content}
              reasoningContent={msg.reasoning_content}
              isUser={msg.role === 'user'}
              onRetry={msg.role === 'assistant' ? () => handleRetry(msg, isDeepResearch) : null}
              onCopy={handleCopy}
              onEdit={msg.role === 'user' ? (newContent) => handleEdit(msg, newContent) : null}
              isStreaming={false}
              id={msg.id}
              highlightedMessageId={highlightedMessageId}
              darkMode={darkMode}
            />
          )
        ))}

        {/* 显示正在生成的消息 */}
        {streaming && (
          <>
            {/* 显示推理过程 */}
            {reasoningText && (
              <MessageBubble 
                content={null}
                reasoningContent={reasoningText}
                isUser={false}
                isStreaming={isReasoning}
                onCopy={handleCopy}
                darkMode={darkMode}
              />
            )}
            {/* 显示回复内容 */}
            {currentResponse && (
              <MessageBubble 
                content={currentResponse}
                reasoningContent={null}
                isUser={false}
                isStreaming={true}
                onCopy={handleCopy}
                darkMode={darkMode}
              />
            )}
          </>
        )}
      </div>

      {/* 深度研究按钮 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        padding: '8px 0',
        position: 'relative',
        backgroundColor: darkMode ? '#1a1a1a' : '#fff'
      }}>
        <button
          onClick={() => setIsDeepResearch(!isDeepResearch)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            backgroundColor: isDeepResearch 
              ? (darkMode ? '#1e3a5f' : '#e3f2fd')
              : (darkMode ? '#2d2d2d' : '#f5f5f5'),
            color: isDeepResearch
              ? (darkMode ? '#fff' : '#1976d2')
              : (darkMode ? '#aaa' : '#666'),
            transition: 'all 0.3s ease',
            fontSize: '14px',
            fontWeight: isDeepResearch ? '500' : '400',
            boxShadow: isDeepResearch 
              ? (darkMode ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(25,118,210,0.1)')
              : 'none',
            transform: isDeepResearch ? 'translateY(-1px)' : 'none'
          }}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={isDeepResearch 
              ? (darkMode ? '#fff' : '#1976d2')
              : (darkMode ? '#aaa' : '#666')}
            strokeWidth="2"
            style={{
              transition: 'all 0.3s ease',
              transform: isDeepResearch ? 'rotate(180deg)' : 'none'
            }}
          >
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>
          </svg>
          深度研究
        </button>
      </div>

      {/* 输入区域 */}
      <div className="input-area" style={{ 
        padding: '10px 15px',
        backgroundColor: darkMode ? '#2d2d2d' : '#f8f9fa'
      }}>
        <form 
          onSubmit={handleFormSubmit}
          style={{ 
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start'
          }}
        >
          {/* 文件上传按钮 */}
          <Upload
            darkMode={darkMode}
            onUploadSuccess={(doc) => {
              console.log('设置活动文档:', doc);
              setActiveDocument(doc);
            }}
          />
          
          <textarea
            ref={textareaRef}
            autoFocus
            onBlur={() => {
              // 保证始终聚焦输入框
              setTimeout(() => {
                textareaRef.current.focus();
              }, 0);
            }}
            value={input}
            onChange={(e) => {
              const cursorPosition = e.target.selectionStart;
              setInput(e.target.value);
              e.target.style.height = '32px';
              const height = Math.min(e.target.scrollHeight, 32);
              e.target.style.height = height + 'px';
              // 恢复光标位置
              requestAnimationFrame(() => {
                e.target.selectionStart = cursorPosition;
                e.target.selectionEnd = cursorPosition;
              });
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!streaming || input.trim()) {  // 允许在streaming时发送新消息
                  if (!activeDocument) {
                    console.log('无活动文档，使用普通聊天');
                  } else {
                    console.log('使用文档聊天，文档ID:', activeDocument.id);
                  }
                  const cursorPosition = e.target.selectionStart;
                  handleSubmit(e, isDeepResearch);
                  e.target.style.height = '32px';
                  // 恢复光标位置
                  requestAnimationFrame(() => {
                    e.target.selectionStart = cursorPosition;
                    e.target.selectionEnd = cursorPosition;
                  });
                  // 重新聚焦输入框
                  textareaRef.current.focus();
                }
              }
            }}
            style={{ 
              flex: 1, 
              padding: '6px 12px',
              borderRadius: '8px',
              border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
              fontSize: '14px',
              outline: 'none',
              transition: 'border-color 0.2s, height 0.2s',
              backgroundColor: darkMode ? '#2d2d2d' : '#fff',  // 移除streaming时的背景色变化
              color: darkMode ? '#e0e0e0' : 'inherit',
              cursor: 'text',  // 移除streaming时的cursor变化
              resize: 'none',
              height: '32px',
              maxHeight: '80px',
              overflowY: 'auto',
              lineHeight: '20px'
            }}
            placeholder={streaming ? '正在生成回复...' : '按 Enter 发送，Shift+Enter 换行'}
          />
          {streaming ? (
            <button 
              type="button" 
              onClick={handleStop}
              style={{ 
                padding: '12px 24px',
                backgroundColor: darkMode ? '#ef5350' : '#ef5350',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'background-color 0.2s'
              }}
            >
              停止
            </button>
          ) : (
            <button 
              type="submit"
              // 阻止按钮点击时夺走焦点
              onMouseDown={(e) => e.preventDefault()}
              disabled={streaming}
              className="send-button"
              style={{ 
                padding: '12px 24px',
                backgroundColor: streaming 
                  ? (darkMode ? '#444' : '#e0e0e0')
                  : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: streaming ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                transition: 'background-color 0.2s'
              }}
            >
              发送
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default ChatArea;
