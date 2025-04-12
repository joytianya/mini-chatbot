import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
  darkMode,
  isWebSearch
}) => {
  const [showButtons, setShowButtons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(content || '');
  
  // 从 localStorage 读取折叠状态，如果没有则默认展开
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(() => {
    return true; // 默认始终展开
  });

  // 当content prop变化时更新编辑框的值
  useEffect(() => {
    setEditValue(content || '');
  }, [content]);

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
      xhtml: false,     // 使用简单的 HTML
      highlight: (code, lang) => {
        // 使用 SyntaxHighlighter 进行代码高亮
        try {
          return SyntaxHighlighter({
            children: code,
            language: lang || 'javascript',
            style: dracula,
            customStyle: {
              margin: 0,
              padding: '1em',
              borderRadius: '6px',
              fontSize: '14px'
            }
          }).props.children;
        } catch (error) {
          console.error('代码高亮出错:', error);
          return code;
        }
      }
    });

    // 自定义处理代码块渲染
    const renderer = new marked.Renderer();
    renderer.code = (code, lang) => {
      return `<pre class="code-block"><code class="language-${lang || 'javascript'}">${code}</code></pre>`;
    };
    marked.use({ renderer });
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

  // 思考过程内容的ref
  const reasoningContentRef = useRef(null);

  // 监听思考内容变化，自动滚动到底部
  useEffect(() => {
    if (reasoningContentRef.current && isStreaming) {
      const element = reasoningContentRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [reasoningContent, isStreaming]);

  // 渲染推理内容
  const renderReasoningContent = () => {
    if (!reasoningContent) return null;

    return (
      <div className="thinking-process" data-state={isReasoningExpanded ? "open" : "closed"} data-dark={darkMode}>
        <button className="thinking-header" onClick={handleReasoningClick}>
          <span className="thinking-icon" style={{
            transform: isReasoningExpanded ? 'none' : 'rotate(-90deg)'
          }}>🤔</span>
          <span className="thinking-title">思考过程</span>
        </button>
        <div className="thinking-content">
          <pre className="thinking-text" ref={reasoningContentRef}>
            {reasoningContent}
          </pre>
        </div>
      </div>
    );
  };

  // 渲染消息内容
  const renderContent = () => {
    // 如果是用户消息，直接显示文本内容
    if (isUser) {
      return (
        <div className="user-message-content">
          {content}
        </div>
      );
    } else {
      // 如果是助手消息，使用Markdown渲染
      return renderMarkdown(content);
    }
  };

  // 处理编辑提交
  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!editValue.trim()) return;
    
    // 传递完整的消息对象，包含id
    if (typeof onEdit === 'function') {
      try {
        // 直接传递编辑内容，让父组件处理查找消息ID等工作
        onEdit(editValue);
        setIsEditing(false);
      } catch (error) {
        console.error('提交编辑时出错:', error);
        alert('提交编辑失败，请重试');
      }
    }
  };
  
  // 修改编辑按钮的点击处理器
  const handleEditClick = () => {
    if (typeof onEdit !== 'function') {
      console.error('编辑功能不可用: onEdit不是函数');
      return;
    }
    setIsEditing(true);
    setEditValue(content || '');
  };

  return (
    <div 
      className={`message-bubble ${isUser ? 'user' : 'assistant'} ${darkMode ? 'dark' : ''} ${id === highlightedMessageId ? 'highlighted' : ''}`}
      onMouseEnter={() => setShowButtons(true)}
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* 推理内容部分 */}
      {renderReasoningContent()}

      {/* 消息内容部分 */}
      <div className="message-main-content">
        {isEditing ? (
          <div className="message-edit-area">
            <textarea
              className="message-edit-textarea"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
            <div className="message-edit-actions">
              <button
                className="message-edit-button cancel"
                onClick={() => {
                  setIsEditing(false);
                  setEditValue(content);
                }}
              >
                取消
              </button>
              <button
                className="message-edit-button submit"
                onClick={handleSubmitEdit}
              >
                提交
              </button>
            </div>
          </div>
        ) : (
          <>
            <div 
              className="message-text-container"
              onClick={handleMessageClick}
            >
              <div className="markdown-content">
                {renderContent()}
              </div>
            </div>

            {/* 操作按钮 */}
            {!isStreaming && (showButtons || isEditing) && (
              <div className={`message-actions ${isUser ? 'user' : 'assistant'}`}>
                {/* 复制按钮 - 对所有消息显示 */}
                <button
                  className="message-action-button"
                  onClick={() => onCopy && onCopy(content)}
                  title="复制"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                  </svg>
                  <span>复制</span>
                </button>

                {/* 重试按钮 - 仅对 AI 消息显示 */}
                {!isUser && onRetry && (
                  <button
                    className="message-action-button"
                    onClick={() => onRetry()}
                    title="重试"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 2v6h-6"/>
                      <path d="M3 12a9 9 0 0115-6.7L21 8"/>
                      <path d="M3 22v-6h6"/>
                      <path d="M21 12a9 9 0 01-15 6.7L3 16"/>
                    </svg>
                    <span>重试</span>
                  </button>
                )}

                {/* 编辑按钮 - 仅对用户消息显示 */}
                {isUser && onEdit && !isEditing && (
                  <button
                    className="message-action-button"
                    onClick={() => handleEditClick()}
                    title="编辑"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    <span>编辑</span>
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
