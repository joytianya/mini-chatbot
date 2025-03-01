import React, { useState, useEffect } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const MessageBubble = ({ 
  content, 
  reasoningContent, 
  isUser, 
  onRetry, 
  onCopy,
  onEdit, 
  isStreaming,
  id,
  highlightedMessageId,
  darkMode  // 添加 darkMode prop
}) => {
  const [showButtons, setShowButtons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content || '');
  
  // 从 localStorage 读取折叠状态，如果没有则默认展开
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(() => {
    const saved = localStorage.getItem('reasoningExpanded');
    return saved === null ? true : JSON.parse(saved);
  });

  // 处理折叠/展开点击
  const handleReasoningClick = () => {
    const newState = !isReasoningExpanded;
    setIsReasoningExpanded(newState);
    localStorage.setItem('reasoningExpanded', JSON.stringify(newState));
  };

  // 处理消息点击
  const handleMessageClick = () => {
    setShowButtons(!showButtons);
  };

  // 配置 marked 选项
  useEffect(() => {
    marked.setOptions({
      breaks: true,      // 支持 GitHub 风格的换行
      gfm: true,        // 启用 GitHub 风格的 Markdown
      headerIds: false,  // 禁用标题 ID
      mangle: false,    // 禁用链接编码
      smartLists: true, // 优化列表渲染
      xhtml: false      // 使用简单的 HTML
    });
  }, []);

  // 安全地渲染 Markdown
  const renderMarkdown = (text) => {
    if (!text) return '';
    // 预处理文本，移除多余空行
    const processedText = text
      .replace(/\n{3,}/g, '\n\n')  // 将3个以上空行替换为2个
      .replace(/^\s+|\s+$/g, '')   // 移除首尾空白
      .replace(/\n\s*\n/g, '\n\n') // 标准化空行
      .trim();
    
    const rawHtml = marked(processedText);
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  };

  return (
    <div 
      className={`message-bubble ${isUser ? 'user' : ''}`} 
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px 16px',
        borderRadius: '12px',
        backgroundColor: darkMode 
          ? (isUser ? '#1e3a5f' : '#2d2d2d')  // 深色模式背景
          : (isUser ? '#e3f2fd' : '#fff'),     // 浅色模式背景
        color: darkMode ? '#e0e0e0' : 'inherit',  // 深色模式文字颜色
        boxShadow: darkMode 
          ? '0 1px 2px rgba(0,0,0,0.3)' 
          : '0 1px 2px rgba(0,0,0,0.1)',
        maxWidth: '85%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        position: 'relative',
        transition: 'all 0.3s ease',
        transform: id === highlightedMessageId ? 'scale(1.02)' : 'scale(1)',
        cursor: 'pointer'
      }}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* 推理内容部分 */}
      {reasoningContent && (
        <div 
          className="reasoning-bubble"
          style={{
            padding: '8px 12px',
            backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',  // 深色模式背景
            borderRadius: '8px',
            fontSize: '14px',
            color: darkMode ? '#aaaaaa' : '#666',  // 深色模式文字颜色
            cursor: 'pointer',
            userSelect: 'text'
          }}
          onClick={handleReasoningClick}
        >
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontWeight: 500 }}>
              {isStreaming ? '思考中...' : '思考过程'}
            </span>
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
              style={{
                transform: isReasoningExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.3s ease'
              }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
          {isReasoningExpanded && (
            <div style={{ 
              marginTop: '8px',
              whiteSpace: 'pre-wrap'
            }}>
              <div className="markdown-content">
                {renderMarkdown(reasoningContent)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 消息内容部分 */}
      <div style={{ 
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {isEditing ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxWidth: '85%',
            width: '500px',
            margin: '0 auto'
          }}>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
                backgroundColor: darkMode ? '#1a1a1a' : '#fff',
                color: darkMode ? '#e0e0e0' : 'inherit',
                minHeight: '100px',
                width: '100%',
                resize: 'vertical',
                fontSize: '14px',
                lineHeight: '1.5',
                outline: 'none',
                boxShadow: darkMode 
                  ? '0 2px 4px rgba(0,0,0,0.2)'
                  : '0 2px 4px rgba(0,0,0,0.05)',
                transition: 'border-color 0.2s'
              }}
              autoFocus
            />
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditValue(content);
                }}
                style={{
                  padding: '8px 16px',
                  border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
                  borderRadius: '6px',
                  background: darkMode ? '#2d2d2d' : '#fff',
                  color: darkMode ? '#e0e0e0' : '#666',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  onEdit(editValue);
                  setIsEditing(false);
                }}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#1976d2',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                提交
              </button>
            </div>
          </div>
        ) : (
          <>
            <div 
              onClick={handleMessageClick}
              style={{ 
                whiteSpace: 'pre-wrap',
                cursor: 'pointer',
                color: darkMode ? '#e0e0e0' : 'inherit'
              }}
            >
              <div className="markdown-content">
                {renderMarkdown(content)}
              </div>
            </div>

            {/* 操作按钮 */}
            {!isStreaming && (showButtons || isEditing) && (
              <div style={{
                display: 'flex',
                gap: '8px',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                marginTop: '4px'
              }}>
                {/* 复制按钮 - 对所有消息显示 */}
                <button
                  onClick={() => onCopy && onCopy(content)}
                  style={{
                    border: 'none',
                    background: 'none',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: darkMode ? '#aaaaaa' : '#666666'
                  }}
                  title="复制"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  复制
                </button>

                {/* 重试按钮 - 仅对 AI 消息显示 */}
                {!isUser && onRetry && (
                  <button
                    onClick={onRetry}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: darkMode ? '#aaaaaa' : '#666666'
                    }}
                    title="重试"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2v6h-6"/>
                      <path d="M3 12a9 9 0 0115-6.7L21 8"/>
                      <path d="M3 22v-6h6"/>
                      <path d="M21 12a9 9 0 01-15 6.7L3 16"/>
                    </svg>
                    重试
                  </button>
                )}

                {/* 编辑按钮 - 仅对用户消息显示 */}
                {isUser && onEdit && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '4px 8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      color: darkMode ? '#aaaaaa' : '#666666'
                    }}
                    title="编辑"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    编辑
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MessageBubble; 