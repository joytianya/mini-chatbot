import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { serverURL } from '../Config';
import { Upload } from './Upload';

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
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  
  // 使用这个状态跟踪用户是否正在与其他元素交互
  const [isInteractingWithOtherElements, setIsInteractingWithOtherElements] = useState(false);

  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    handleSubmit(e, isDeepResearch, isWebSearch);
    textareaRef.current.style.height = '32px';
    
    // 只在用户没有与其他元素交互时才自动聚焦
    if (!isInteractingWithOtherElements) {
      textareaRef.current.focus();
    }
  };

  // 只在初始渲染和没有与其他元素交互时聚焦文本输入框
  useEffect(() => {
    if (!isInteractingWithOtherElements && !streaming) {
      textareaRef.current?.focus();
    }
  }, [isInteractingWithOtherElements, streaming]);

  // 设置文本区域的高度
  const adjustTextareaHeight = (element) => {
    if (!element) return;
    element.style.height = '32px';
    element.style.height = Math.min(element.scrollHeight, 32) + 'px';
  };

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
          value={selectedModel || ''}
          onFocus={() => {
            // 当用户与下拉菜单交互时，阻止文本框自动聚焦
            setIsInteractingWithOtherElements(true);
          }}
          onBlur={() => {
            // 延迟一点时间再允许文本框聚焦，确保选择完成
            setTimeout(() => {
              setIsInteractingWithOtherElements(false);
            }, 200);
          }}
          onChange={(e) => {
            console.log('选择模型:', e.target.value);
            setSelectedModel(e.target.value);
          }}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
            backgroundColor: darkMode ? '#2d2d2d' : '#fff',
            fontSize: '14px',
            color: darkMode ? '#e0e0e0' : '#2c3e50',
            cursor: 'pointer',
            outline: 'none',
            minWidth: '150px',
            zIndex: 100
          }}
        >
          <option value="">选择模型</option>
          {Array.isArray(modelOptions) && modelOptions.map(model => (
            <option 
              key={model} 
              value={model}
              style={{
                backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                color: darkMode ? '#e0e0e0' : '#2c3e50',
                padding: '8px'
              }}
            >
              {model}
            </option>
          ))}
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
            onClick={(e) => {
              // 阻止按钮交互时文本框获取焦点
              setIsInteractingWithOtherElements(true);
              handleExport();
              // 操作完成后延迟恢复
              setTimeout(() => setIsInteractingWithOtherElements(false), 100);
            }}
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
            onClick={() => {
              // 阻止按钮交互时文本框获取焦点
              setIsInteractingWithOtherElements(true);
              setDarkMode(!darkMode);
              // 操作完成后延迟恢复
              setTimeout(() => setIsInteractingWithOtherElements(false), 100);
            }}
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
        onClick={() => {
          // 点击消息区域时临时阻止文本框获取焦点
          setIsInteractingWithOtherElements(true);
          setTimeout(() => setIsInteractingWithOtherElements(false), 300);
        }}
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
              onRetry={msg.role === 'assistant' ? () => {
                // 阻止重试操作时文本框获取焦点
                setIsInteractingWithOtherElements(true);
                handleRetry(msg, isDeepResearch, isWebSearch);
                setTimeout(() => setIsInteractingWithOtherElements(false), 100);
              } : null}
              onCopy={(text) => {
                // 阻止复制操作时文本框获取焦点
                setIsInteractingWithOtherElements(true);
                handleCopy(text);
                setTimeout(() => setIsInteractingWithOtherElements(false), 100);
              }}
              onEdit={msg.role === 'user' ? (newContent) => {
                // 编辑时阻止文本框获取焦点
                setIsInteractingWithOtherElements(true);
                handleEdit(msg, newContent, isDeepResearch, isWebSearch);
                setTimeout(() => setIsInteractingWithOtherElements(false), 100);
              } : null}
              isStreaming={false}
              id={msg.id}
              highlightedMessageId={highlightedMessageId}
              darkMode={darkMode}
              isWebSearch={isWebSearch}
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
                isWebSearch={isWebSearch}
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
                isWebSearch={isWebSearch}
              />
            )}
          </>
        )}
      </div>

      {/* 功能按钮区域 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px',
        padding: '8px 0',
        position: 'relative',
        backgroundColor: darkMode ? '#1a1a1a' : '#fff'
      }}>
        {/* 深度研究按钮 */}
        <button
          onClick={() => {
            // 阻止按钮交互时文本框获取焦点
            setIsInteractingWithOtherElements(true);
            setIsDeepResearch(!isDeepResearch);
            setTimeout(() => setIsInteractingWithOtherElements(false), 100);
          }}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: isDeepResearch ? '#4CAF50' : 'transparent',
            color: isDeepResearch ? '#fff' : (darkMode ? '#e0e0e0' : '#000'),
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span role="img" aria-label="research">🔬</span>
          深度研究
        </button>

        {/* 联网搜索按钮 */}
        <button
          onClick={() => {
            // 阻止按钮交互时文本框获取焦点
            setIsInteractingWithOtherElements(true);
            setIsWebSearch(!isWebSearch);
            setTimeout(() => setIsInteractingWithOtherElements(false), 100);
          }}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            backgroundColor: isWebSearch ? '#2196F3' : 'transparent',
            color: isWebSearch ? '#fff' : (darkMode ? '#e0e0e0' : '#000'),
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span role="img" aria-label="web-search">🌐</span>
          联网搜索
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
              // 阻止上传操作时文本框获取焦点
              setIsInteractingWithOtherElements(true);
              console.log('设置活动文档:', doc);
              setActiveDocument(doc);
              setTimeout(() => setIsInteractingWithOtherElements(false), 300);
            }}
          />
          
          <textarea
            ref={textareaRef}
            autoFocus={!isInteractingWithOtherElements && !streaming}
            value={input}
            onChange={(e) => {
              const cursorPosition = e.target.selectionStart;
              setInput(e.target.value);
              
              // 调整文本区域高度
              adjustTextareaHeight(e.target);
              
              // 保持光标位置
              requestAnimationFrame(() => {
                e.target.selectionStart = cursorPosition;
                e.target.selectionEnd = cursorPosition;
              });
            }}
            onFocus={() => {
              // 当文本框获得焦点时，如果正在与其他元素交互，不要让文本框保持焦点
              if (isInteractingWithOtherElements) {
                textareaRef.current.blur();
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!streaming || input.trim()) {
                  if (!activeDocument) {
                    console.log('无活动文档，使用普通聊天');
                  } else {
                    console.log('使用文档聊天，文档ID:', activeDocument.id);
                  }
                  handleSubmit(e, isDeepResearch, isWebSearch);
                  textareaRef.current.style.height = '32px';
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
              backgroundColor: darkMode ? '#2d2d2d' : '#fff',
              color: darkMode ? '#e0e0e0' : 'inherit',
              cursor: streaming ? 'not-allowed' : 'text',
              resize: 'none',
              height: '32px',
              maxHeight: '80px',
              overflowY: 'auto',
              lineHeight: '20px'
            }}
            placeholder={streaming ? '正在生成回复...' : '按 Enter 发送，Shift+Enter 换行'}
            disabled={streaming}
          />
          {streaming ? (
            <button 
              type="button" 
              onClick={() => {
                setIsInteractingWithOtherElements(true);
                handleStop();
                setTimeout(() => setIsInteractingWithOtherElements(false), 100);
              }}
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
              // 防止按钮点击时失去焦点
              onMouseDown={(e) => e.preventDefault()}
              disabled={streaming || !input.trim()}
              className="send-button"
              style={{ 
                padding: '12px 24px',
                backgroundColor: (streaming || !input.trim())
                  ? (darkMode ? '#444' : '#e0e0e0')
                  : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (streaming || !input.trim()) ? 'not-allowed' : 'pointer',
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