import { useState, useEffect, useRef, useCallback } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Define Props interface
interface MessageBubbleProps {
  id: string | number; // Assuming id can be string or number
  content: string;
  reasoningContent?: string | null;
  isUser: boolean;
  onRetry?: () => void;
  onCopy?: (content: string) => void;
  onEdit?: (newContent: string) => void; // Simplified onEdit: takes only new content
  isStreaming?: boolean;
  highlightedMessageId?: string | number | null;
  // darkMode prop is removed, Tailwind handles it
}

// Use named export for the component
export function MessageBubble({
  id,
  content,
  reasoningContent,
  isUser,
  onRetry,
  onCopy,
  onEdit,
  isStreaming = false,
  highlightedMessageId,
}: MessageBubbleProps): JSX.Element {
  const [showButtons, setShowButtons] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editValue, setEditValue] = useState<string>(content ?? '');
  
  // 从 localStorage 读取折叠状态，如果没有则默认展开
  const [isReasoningExpanded, setIsReasoningExpanded] = useState<boolean>(true);

  const reasoningContentRef = useRef<HTMLPreElement>(null);
  const editTextAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for textarea

  // Update editValue when content prop changes (and not currently editing)
  useEffect(() => {
    if (!isEditing) {
      setEditValue(content ?? '');
    }
  }, [content, isEditing]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing) {
      editTextAreaRef.current?.focus();
      // Auto-resize textarea (simple example, might need a library for complex cases)
      const textarea = editTextAreaRef.current;
      if (textarea) {
        textarea.style.height = 'auto'; // Reset height
        textarea.style.height = `${textarea.scrollHeight}px`; // Set to scroll height
      }
    }
  }, [isEditing]);

  // Configure marked (run only once)
  useEffect(() => {
    // Custom renderer for code blocks to integrate with SyntaxHighlighter
    const renderer = new marked.Renderer();
    // Ensure code block has appropriate class for styling/selection
    renderer.code = (code, language) => {
      const validLang = language || 'plaintext';
      // Use SyntaxHighlighter for rendering
      const highlightedCode = SyntaxHighlighter({
        children: code,
        style: dracula, // Use your preferred theme
        language: validLang,
        PreTag: 'div', // Use div instead of pre to avoid nesting pre tags
        customStyle: {
          margin: 0,
          padding: '1em', // Tailwind: p-4
          borderRadius: '0.375rem', // Tailwind: rounded-md
          fontSize: '0.875rem', // Tailwind: text-sm
          overflowX: 'auto', // Ensure horizontal scrolling
          backgroundColor: 'transparent' // Let parent handle background
        }
      });
      // Outer pre for semantics and styling container
      return `<pre class="code-block-wrapper bg-gray-800 dark:bg-gray-900 rounded-md overflow-x-auto">${highlightedCode}</pre>`;
    };

    marked.setOptions({
      renderer,
      gfm: true,
      breaks: true,
      pedantic: false,
      smartLists: true,
      smartypants: false,
      // highlight function is handled by the renderer now
    });
  }, []);

  // Safely render Markdown content
  const renderMarkdown = useCallback((text: string | null | undefined): JSX.Element | null => {
    if (!text) return null;
    const processedText = text.replace(/\n/g, '\n').trim(); // Basic processing
    const rawHtml = marked(processedText);
    // Ensure DOMPurify configuration is appropriate for your needs
    const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });
    // Tailwind classes for prose styling
    return <div className="prose prose-sm dark:prose-invert max-w-none break-words" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  }, []);

  // Scroll reasoning content when streaming
  useEffect(() => {
    if (isStreaming && reasoningContentRef.current) {
      const element = reasoningContentRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [reasoningContent, isStreaming]);

  const handleReasoningToggle = useCallback(() => {
    setIsReasoningExpanded(prev => !prev);
    // Note: localStorage usage might be better handled by parent state or context
  }, []);

  const handleEditClick = useCallback(() => {
    if (typeof onEdit === 'function') {
      setIsEditing(true);
    } else {
      console.warn('onEdit prop is not provided or not a function.');
    }
  }, [onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditValue(content ?? ''); // Reset to original content
  }, [content]);

  const handleSubmitEdit = useCallback((e?: React.FormEvent<HTMLFormElement> | React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    if (!editValue.trim()) return; // Prevent submitting empty content

    if (typeof onEdit === 'function') {
      onEdit(editValue);
      setIsEditing(false);
    }
  }, [editValue, onEdit]);

  // Handle textarea changes and auto-resize
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    // Auto-resize
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;
  };

  // Handle Ctrl+Enter to submit edit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmitEdit();
    }
    if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const bubbleClasses = `
    group relative mb-4 flex flex-col rounded-lg p-3 shadow-sm transition-colors duration-200
    ${isUser
      ? 'bg-blue-50 dark:bg-blue-900/30 self-end ml-10' // User bubble styles
      : 'bg-gray-100 dark:bg-gray-700/50 self-start mr-10' // Assistant bubble styles
    }
    ${id === highlightedMessageId ? 'ring-2 ring-indigo-500' : ''}
  `;

  const reasoningContainerClasses = `
    mb-2 overflow-hidden rounded border border-gray-300 dark:border-gray-600
    ${isReasoningExpanded ? 'max-h-[300px]' : 'max-h-10'} transition-all duration-300 ease-in-out
  `;
  // Tailwind scrollbar classes (might need tailwind-scrollbar plugin)
  const reasoningTextClasses = `
    max-h-[280px] overflow-y-auto whitespace-pre-wrap break-words p-2 font-mono text-xs
    bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300
    scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-500 scrollbar-track-transparent
  `;
  const buttonClasses = `
    flex items-center space-x-1 rounded px-1.5 py-0.5 text-xs
    text-gray-500 dark:text-gray-400
    hover:bg-gray-200 dark:hover:bg-gray-600
    focus:outline-none focus:ring-1 focus:ring-indigo-500
    transition-colors duration-150
  `;

  return (
    <div
      className={bubbleClasses}
      onMouseEnter={() => !isEditing && setShowButtons(true)} // Don't show hover buttons when editing
      onMouseLeave={() => setShowButtons(false)}
    >
      {/* Reasoning Content (Optional) */}
      {reasoningContent && (
        <div className={reasoningContainerClasses}>
          <button
            onClick={handleReasoningToggle}
            className="flex w-full items-center justify-between bg-gray-200 dark:bg-gray-700 px-2 py-1 text-left text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            <span className="flex items-center">
              <span className={`mr-1 transition-transform duration-200 ${isReasoningExpanded ? '' : '-rotate-90'}`}>🤔</span>
              思考过程
            </span>
            <span>{isReasoningExpanded ? '收起' : '展开'}</span>
          </button>
          {isReasoningExpanded && (
            // Use the Tailwind scrollbar classes here
            <pre ref={reasoningContentRef} className={reasoningTextClasses}>
              {reasoningContent}
            </pre>
          )}
        </div>
      )}

      {/* Main Message Content */}
      <div className="flex flex-col">
        {isEditing ? (
          <form onSubmit={handleSubmitEdit} className="flex flex-col space-y-2">
            <textarea
              ref={editTextAreaRef}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-2 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none overflow-hidden" // Basic styling, add more as needed
              value={editValue}
              onChange={handleTextAreaChange}
              onKeyDown={handleKeyDown}
              rows={3} // Initial rows, auto-resizing will adjust
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                className={buttonClasses + " bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"}
                onClick={handleCancelEdit}
              >
                取消
              </button>
              <button
                type="submit"
                className={buttonClasses + " bg-indigo-600 text-white hover:bg-indigo-700"}
              >
                提交
              </button>
            </div>
          </form>
        ) : (
          // Rendered Content
          <div className="message-text-container">
            {isUser ? <div className="whitespace-pre-wrap break-words text-sm text-gray-900 dark:text-gray-100">{content}</div> : renderMarkdown(content)}
          </div>
        )}
      </div>

      {/* Action Buttons (Show on hover when not editing, or always if isEditing state persists but UI doesn't reflect it) */}
      {/* Always show actions for user messages if onEdit is possible */}
      {(!isEditing && showButtons && !isStreaming || (isUser && onEdit)) && (
        <div className={`absolute -bottom-2 right-2 flex space-x-1 rounded bg-white dark:bg-gray-800 shadow-md p-0.5 transition-opacity duration-150 group-hover:opacity-100 ${showButtons || (isUser && onEdit) ? 'opacity-100' : 'opacity-0'}`}>
          {/* Edit Button - Only for User messages if onEdit provided */}
          {isUser && onEdit && (
            <button className={buttonClasses} onClick={handleEditClick} title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>编辑</span>
            </button>
          )}
          {/* Copy Button - Always show */}
          {onCopy && (
            <button className={buttonClasses} onClick={() => onCopy(content)} title="复制">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>复制</span>
            </button>
          )}
          {/* Retry Button - Only for Assistant messages */}
          {!isUser && onRetry && (
            <button className={buttonClasses} onClick={onRetry} title="重试">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              <span>重试</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
} 

// Add default export to match import in MessageList.jsx
export default MessageBubble;
