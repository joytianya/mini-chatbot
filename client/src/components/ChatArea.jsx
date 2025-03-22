import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { serverURL } from '../Config';
import { Upload } from './Upload';
import { unmaskSensitiveInfo, updateGlobalSensitiveInfoMap, clearSensitiveInfoMap, ensureGlobalMapExists } from '../utils/SensitiveInfoMasker';
import SensitiveInfoEditor from './SensitiveInfoEditor';
import { toast } from 'react-toastify';
import './ChatArea.css';

// 敏感信息处理的消息组件
const SensitiveMessageWrapper = ({ message, isHighlighted, sensitiveInfoProtectionEnabled, darkMode, onEditStateChange, sessionHash }) => {
  const [showOriginal, setShowOriginal] = useState(false);
  
  // 获取要显示的内容
  const getDisplayContent = (message) => {
    if (!message || !message.content) {
      return '';
    }
    
    // 如果是用户消息且有原始内容，根据显示状态返回原始内容或掩码内容
    if (sensitiveInfoProtectionEnabled && message.role === 'user' && message.originalContent) {
      return showOriginal ? message.originalContent : message.content;
    }
    
    if (sensitiveInfoProtectionEnabled && message.role === 'assistant') {
      // 检查内容中是否包含掩码标识符
      const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
      const contentHasMasks = message.content && possibleMaskPatterns.some(pattern => pattern.test(message.content));
      
      if (contentHasMasks) {
        // 如果要显示原始掩码内容
        if (showOriginal) {
          return message.originalContent || message.content;
        }
        
        // 如果已经有原始内容，直接返回
        if (message.originalContent) {
          return message.originalContent;
        }
        
        // 使用缓存的反映射结果
        if (message.unmappedContent) {
          return message.unmappedContent;
        }
        
        // 尝试反映射，优先使用消息自带的映射表
        let result = message.content;
        if (message.sensitiveMap && Object.keys(message.sensitiveMap).length > 0) {
          result = unmaskSensitiveInfo(message.content, message.sensitiveMap, sessionHash);
        }
        
        // 如果消息自带映射表未能反映射，尝试使用会话映射表
        if (result === message.content && sessionHash && window.currentSensitiveInfoMap && window.currentSensitiveInfoMap[sessionHash]) {
          result = unmaskSensitiveInfo(message.content, window.currentSensitiveInfoMap[sessionHash], sessionHash);
        }
        
        // 如果会话映射表未能反映射，尝试使用全局映射表
        if (result === message.content) {
          result = unmaskSensitiveInfo(message.content, {}, sessionHash);
        }
        
        // 缓存反映射结果
        message.unmappedContent = result;
        return result;
      }
      
      // 如果没有掩码标识符，返回原始内容
      return message.originalContent || message.content;
    }
    
    // 默认情况下，返回原始内容或消息内容
    return message.originalContent || message.content;
  };
  
  // 获取处理后的消息对象
  const getProcessedMessage = () => {
    return {
      ...message,
      content: getDisplayContent(message)
    };
  };
  
  // 切换显示原始/掩码信息
  const toggleDisplay = () => {
    setShowOriginal(!showOriginal);
  };
  
  // 处理复制消息内容
  const handleCopy = (content) => {
    try {
      // 复制到剪贴板
      navigator.clipboard.writeText(content)
        .then(() => {
          toast.success('内容已复制到剪贴板');
        })
        .catch(err => {
          console.error('复制失败:', err);
          toast.error('复制失败');
        });
    } catch (error) {
      console.error('处理复制时出错:', error);
      toast.error('复制失败');
    }
  };
  
  return (
    <div className="sensitive-message-wrapper">
      <MessageBubble 
        content={getDisplayContent(message)}
        reasoningContent={message.reasoning_content}
        isUser={message.role === 'user'}
        onRetry={message.role === 'assistant' ? () => {
          setShowOriginal(false);
          if (message.onRetry) {
            message.onRetry();
          } else {
            console.warn('onRetry function is not defined for this message');
          }
        } : null}
        onCopy={() => handleCopy(getDisplayContent(message))}
        onEdit={message.role === 'user' ? (newContent) => {
          // 通知父组件编辑状态开始
          if (onEditStateChange) onEditStateChange(true);
          
          // 调用原始的编辑函数
          if (message.onEdit) message.onEdit(newContent);
          
          // 编辑完成后通知父组件
          setTimeout(() => {
            if (onEditStateChange) onEditStateChange(false);
          }, 100);
        } : null}
        isStreaming={message.isStreaming}
        id={message.id}
        highlightedMessageId={isHighlighted ? message.id : null}
        darkMode={darkMode}
        isWebSearch={message.isWebSearch}
      />
      
      {/* 调试信息 - 仅在开发环境显示 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          fontSize: '10px', 
          color: darkMode ? '#888' : '#aaa', 
          marginTop: '4px',
          padding: '4px',
          backgroundColor: darkMode ? '#222' : '#f8f8f8',
          borderRadius: '4px'
        }}>
          敏感信息保护: {sensitiveInfoProtectionEnabled ? '开启' : '关闭'} | 
          角色: {message.role} | 
          有敏感映射: {message.sensitiveMap ? '是' : '否'} | 
          映射数量: {message.sensitiveMap ? Object.keys(message.sensitiveMap).length : 0} |
          有原始内容: {message.originalContent ? '是' : '否'}
        </div>
      )}
      
      {/* 敏感信息切换按钮 */}
      {sensitiveInfoProtectionEnabled && (message.isMasked || message.originalContent || message.sensitiveMap) && (
        <button 
          className="toggle-sensitive-info"
          onClick={toggleDisplay}
          style={{
            marginTop: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            backgroundColor: darkMode ? '#444' : '#f0f0f0',
            color: darkMode ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          {message.role === 'user' 
            ? (showOriginal ? '显示原始内容' : '显示掩码内容') 
            : (showOriginal ? '显示掩码内容' : '显示反映射内容')}
        </button>
      )}
      
      {/* AI消息反映射按钮 - 放宽条件，只要是AI消息且敏感信息保护开启就显示 */}
      {sensitiveInfoProtectionEnabled && message.role === 'assistant' && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          marginTop: '8px',
          gap: '8px'
        }}>
          <button 
            className="unmask-sensitive-info"
            onClick={() => {
              if (sensitiveInfoProtectionEnabled && message.role === 'assistant') {
                // 检查消息是否包含敏感信息
                const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
                const contentHasMasks = message.content && possibleMaskPatterns.some(pattern => pattern.test(message.content));
                
                // 切换显示状态
                setShowOriginal(!showOriginal);
                
                // 通知父组件编辑状态已更改
                if (onEditStateChange) {
                  onEditStateChange();
                }
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: darkMode ? '#2a5885' : '#e1f5fe',
              color: darkMode ? '#fff' : '#0277bd',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {showOriginal ? (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                  <line x1="3" y1="3" x2="21" y2="21"></line>
                </>
              ) : (
                <>
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </>
              )}
            </svg>
            {showOriginal ? '关闭反映射结果' : '显示反映射结果'}
          </button>
          
          <button 
            className="copy-unmasked-content"
            onClick={() => {
              // 如果消息有原始内容，直接复制原始内容
              if (message.originalContent) {
                handleCopy(message.originalContent);
                return;
              }
              
              // 检查消息是否包含敏感信息
              const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
              const contentHasMasks = message.content && possibleMaskPatterns.some(pattern => pattern.test(message.content));
              
              if (contentHasMasks) {
                // 使用getDisplayContent函数获取反映射后的内容
                const unmaskContent = getDisplayContent(message);
                handleCopy(unmaskContent);
              } else {
                handleCopy(message.content);
              }
            }}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              backgroundColor: darkMode ? '#37474f' : '#f5f5f5',
              color: darkMode ? '#e0e0e0' : '#424242',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
            </svg>
            复制反映射内容
          </button>
        </div>
      )}
    </div>
  );
};

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
  input = '',
  setInput,
  handleStop,
  activeDocuments,
  setActiveDocuments,
  setDisplayMessages,
  sensitiveInfoProtectionEnabled,
  handleFileUpload,
  sessionHash
}) => {
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  
  // 使用这个状态跟踪用户是否正在与其他元素交互
  const [isInteractingWithOtherElements, setIsInteractingWithOtherElements] = useState(false);
  // 添加状态跟踪用户是否正在编辑消息
  const [isEditingMessage, setIsEditingMessage] = useState(false);
  // 添加状态跟踪输入框是否聚焦
  const [inputFocused, setInputFocused] = useState(false);
  // 添加状态跟踪流式消息的 ID
  const [streamingMessageId] = useState(() => Date.now().toString());
  // 本地输入状态，如果外部 input 未提供
  const [localInput, setLocalInput] = useState('');

  // 添加敏感信息编辑器相关状态
  const [showSensitiveEditor, setShowSensitiveEditor] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null);
  // 添加标记是否正在编辑敏感信息的状态
  const [isEditingSensitiveInfo, setIsEditingSensitiveInfo] = useState(false);

  // 使用外部 input 或本地 input
  const currentInput = input || localInput;
  const updateInput = setInput || setLocalInput;

  // 当用户提交表单时隐藏敏感信息编辑器
  const handleFormSubmit = async (e) => {
    e?.preventDefault();
    if (!currentInput.trim() || streaming) return;

    // 隐藏敏感信息编辑器
    setShowSensitiveEditor(false);

    if (handleSubmit) {
      handleSubmit(e, isDeepResearch, isWebSearch);
    }
    
    if (textareaRef.current) {
      textareaRef.current.style.height = '32px';
    }
    
    // 只在用户没有与其他元素交互时才自动聚焦
    if (!isInteractingWithOtherElements && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // 处理文件上传成功
  const handleUploadSuccess = (uploadedFiles) => {
    console.log('文件上传成功:', uploadedFiles);
    
    // 更新活动文档列表
    setActiveDocuments(prevDocs => {
      const newDocs = [...prevDocs, ...uploadedFiles];
      
      // 保存到当前会话
      const updatedHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]')
        .map(conv => {
          if (conv.active) {
            return {
              ...conv,
              activeDocuments: newDocs
            };
          }
          return conv;
        });
      
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      return newDocs;
    });
    
    // 关闭上传对话框
    setShowSensitiveEditor(false);
  };

  // 处理文件删除
  const handleFileDelete = (docId) => {
    console.log('删除文件:', docId);
    
    // 更新活动文档列表
    setActiveDocuments(prevDocs => {
      const newDocs = prevDocs.filter(doc => doc.document_id !== docId);
      
      // 保存到当前会话
      const updatedHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]')
        .map(conv => {
          if (conv.active) {
            return {
              ...conv,
              activeDocuments: newDocs
            };
          }
          return conv;
        });
      
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      return newDocs;
    });
  };

  // 处理敏感信息编辑器保存
  const handleEditorSave = (originalFile, processedFile, sensitiveMap) => {
    console.log('编辑器保存:', originalFile, processedFile, sensitiveMap);
    
    // 更新全局敏感信息映射表
    if (sensitiveMap && Object.keys(sensitiveMap).length > 0) {
      const sessionHash = localStorage.getItem('sessionHash');
      updateGlobalSensitiveInfoMap(sensitiveMap, sessionHash);
      
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
      } catch (error) {
        console.error('保存全局映射表到localStorage时出错:', error);
      }
    }
    
    // 更新活动文档列表
    setActiveDocuments(prevDocs => {
      // 查找是否已存在相同ID的文档
      const existingDocIndex = prevDocs.findIndex(doc => 
        doc.document_id === originalFile.document_id
      );
      
      let newDocs;
      if (existingDocIndex >= 0) {
        // 更新现有文档
        newDocs = [...prevDocs];
        newDocs[existingDocIndex] = {
          ...newDocs[existingDocIndex],
          ...originalFile,
          processed_file: processedFile
        };
      } else {
        // 添加新文档
        newDocs = [...prevDocs, {
          ...originalFile,
          processed_file: processedFile
        }];
      }
      
      // 保存到当前会话
      const updatedHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]')
        .map(conv => {
          if (conv.active) {
            return {
              ...conv,
              activeDocuments: newDocs
            };
          }
          return conv;
        });
      
      localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      return newDocs;
    });
    
    // 关闭编辑器
    setShowSensitiveEditor(false);
  };

  // 处理敏感信息编辑器关闭
  const handleEditorClose = () => {
    setShowSensitiveEditor(false);
    // 编辑器关闭后，重置编辑状态
    setIsEditingSensitiveInfo(false);
    
    // 延迟一段时间后重置交互状态并聚焦到输入框
    setTimeout(() => {
      setIsInteractingWithOtherElements(false);
      // 确保文本输入框获取焦点
      if (textareaRef.current) {
        console.log('敏感信息编辑器关闭，聚焦到输入框');
        textareaRef.current.focus();
      }
    }, 300);
  };

  // 处理敏感信息编辑器获取焦点
  const handleEditorFocus = () => {
    console.log('敏感信息编辑器获取焦点');
    setIsEditingSensitiveInfo(true);
    // 设置正在与其他元素交互，防止输入框获取焦点
    setIsInteractingWithOtherElements(true);
    // 确保文本输入框失去焦点
    if (textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  // 处理敏感信息编辑器失去焦点
  const handleEditorBlur = () => {
    console.log('敏感信息编辑器失去焦点');
    // 延迟重置状态，避免焦点切换过快导致闪烁
    setTimeout(() => {
      // 只有在敏感信息编辑器已关闭的情况下才重置状态
      if (!showSensitiveEditor) {
        console.log('敏感信息编辑器已关闭，重置状态');
        setIsEditingSensitiveInfo(false);
        // 只有在编辑器完全关闭后才允许输入框获取焦点
        setIsInteractingWithOtherElements(false);
        
        // 确保文本输入框获取焦点
        if (textareaRef.current) {
          console.log('敏感信息编辑器失去焦点且已关闭，聚焦到输入框');
          textareaRef.current.focus();
        }
      }
    }, 300);
  };

  // 自动聚焦到输入框
  useEffect(() => {
    // 如果正在与其他元素交互，不自动聚焦
    if (isInteractingWithOtherElements) {
      return;
    }

    // 如果正在编辑敏感信息，不自动聚焦
    if (isEditingSensitiveInfo || showSensitiveEditor) {
      return;
    }

    // 如果正在编辑消息，不自动聚焦
    if (isEditingMessage) {
      return;
    }

    // 如果正在流式传输，不自动聚焦
    if (streaming) {
      return;
    }

    // 使用requestAnimationFrame确保DOM已更新
    const focusTimeout = requestAnimationFrame(() => {
      if (textareaRef.current && 
          !isInteractingWithOtherElements && 
          !isEditingSensitiveInfo && 
          !showSensitiveEditor && 
          !isEditingMessage &&
          !streaming) {
        textareaRef.current.focus();
      }
    });

    return () => {
      cancelAnimationFrame(focusTimeout);
    };
  }, [isInteractingWithOtherElements, isEditingSensitiveInfo, showSensitiveEditor, isEditingMessage, streaming]);

  // 处理文本框获取焦点
  const handleTextareaFocus = (e) => {
    // 如果正在编辑消息或敏感信息，不自动聚焦输入框
    if (isEditingMessage || isEditingSensitiveInfo) {
      e.preventDefault();
      e.target.blur();
      return;
    }
    
    // 设置输入框状态为聚焦
    setInputFocused(true);
  };

  // 处理消息编辑状态变化
  const handleMessageEditStateChange = (isEditing) => {
    // 更新编辑状态
    setIsEditingMessage(isEditing);
    
    // 如果正在编辑，设置交互状态为true，防止输入框获取焦点
    if (isEditing) {
      setIsInteractingWithOtherElements(true);
      
      // 确保文本输入框失去焦点
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    } else {
      // 编辑结束后，延迟恢复交互状态
      setTimeout(() => {
        // 再次检查是否有其他编辑操作开始
        if (!isEditingMessage && !isEditingSensitiveInfo && !showSensitiveEditor) {
          setIsInteractingWithOtherElements(false);
        }
      }, 300);
    }
  };

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
          {Array.isArray(modelOptions) && modelOptions.map(model => {
            // 获取模型配置
            const modelConfig = JSON.parse(localStorage.getItem('modelConfigs') || '[]')
              .find(config => config.model_name === model);
            
            // 显示模型名称，如果有配置则显示配置名称
            const displayName = modelConfig ? 
              `${modelConfig.name} (${model})` : 
              model;
            
            return (
              <option 
                key={model} 
                value={model}
                style={{
                  backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                  color: darkMode ? '#e0e0e0' : '#2c3e50',
                  padding: '8px'
                }}
              >
                {displayName}
              </option>
            );
          })}
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
        onClick={(e) => {
          // 点击消息区域时临时阻止文本框获取焦点
          // 只有在没有显示敏感信息编辑器时才设置交互状态
          if (!showSensitiveEditor && !isEditingSensitiveInfo) {
            setIsInteractingWithOtherElements(true);
            setTimeout(() => {
              // 再次检查状态，确保在延迟期间状态没有改变
              if (!showSensitiveEditor && !isEditingSensitiveInfo) {
                setIsInteractingWithOtherElements(false);
              }
            }, 300);
          }
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
        {/* 敏感信息编辑器 */}
        {showSensitiveEditor && uploadedFileInfo && (
          <SensitiveInfoEditor
            originalFile={uploadedFileInfo.originalFile}
            processedFile={uploadedFileInfo.processedFile}
            sensitiveMap={uploadedFileInfo.sensitiveMap}
            darkMode={darkMode}
            onSave={handleEditorSave}
            onClose={handleEditorClose}
            onFocus={handleEditorFocus}
            onBlur={handleEditorBlur}
          />
        )}

        {/* 敏感信息保护提示 */}
        {sensitiveInfoProtectionEnabled && (
          <div style={{
            padding: '8px 12px',
            marginBottom: '16px',
            backgroundColor: darkMode ? '#2d4a63' : '#e3f2fd',
            borderRadius: '8px',
            fontSize: '14px',
            color: darkMode ? '#a8c7e0' : '#0d47a1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                <circle cx="12" cy="16" r="1"></circle>
              </svg>
              <span>敏感信息保护已开启 - 您的个人信息将在本地进行掩码处理，保护您的隐私</span>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {/* 显示全局映射表按钮 */}
              <button
                onClick={(e) => {
                  // 阻止事件冒泡
                  e.stopPropagation();
                  // 显示全局映射表
                  console.log('当前全局敏感信息映射表:');
                  if (window.currentSensitiveInfoMap && Object.keys(window.currentSensitiveInfoMap).length > 0) {
                    console.log('全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
                    console.log('全局映射表详细内容:');
                    Object.entries(window.currentSensitiveInfoMap).forEach(([key, value], index) => {
                      console.log(`  ${index+1}. ${key} => ${value}`);
                    });
                    toast.info(`全局映射表包含 ${Object.keys(window.currentSensitiveInfoMap).length} 条敏感信息映射，详情请查看控制台`);
                  } else {
                    console.log('全局映射表为空');
                    toast.info('全局映射表为空，请先上传包含敏感信息的文件');
                  }
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: darkMode ? '#1565c0' : '#1565c0',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                显示全局映射表
              </button>
              
              {/* 清除全局映射表按钮 */}
              <button
                onClick={(e) => {
                  // 阻止事件冒泡
                  e.stopPropagation();
                  // 清除全局映射表
                  console.log('清除全局敏感信息映射表');
                  console.log('原全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap || {}).length);
                  
                  // 清空全局映射表
                  clearSensitiveInfoMap();
                  
                  console.log('清除后全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
                  toast.success('全局敏感信息映射表已清空');
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: darkMode ? '#d32f2f' : '#d32f2f',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                清除全局映射表
              </button>
            
            {/* 添加敏感信息编辑器显示按钮 */}
            {uploadedFileInfo && (
              <button
                onClick={(e) => {
                  // 阻止事件冒泡
                  e.stopPropagation();
                  // 设置交互状态
                  setIsInteractingWithOtherElements(true);
                  // 切换敏感信息编辑器显示状态
                  const newShowState = !showSensitiveEditor;
                  setShowSensitiveEditor(newShowState);
                  // 设置编辑状态
                  setIsEditingSensitiveInfo(newShowState);
                  // 如果关闭编辑器，延迟恢复交互状态并聚焦到输入框
                  if (!newShowState) {
                    setTimeout(() => {
                      setIsInteractingWithOtherElements(false);
                      // 确保文本输入框获取焦点
                      if (textareaRef.current) {
                        console.log('通过按钮关闭敏感信息编辑器，聚焦到输入框');
                        textareaRef.current.focus();
                      }
                    }, 300);
                  }
                }}
                onFocus={() => {
                  // 设置正在与其他元素交互
                  setIsInteractingWithOtherElements(true);
                }}
                onBlur={() => {
                  // 只有在敏感信息编辑器没有显示时才重置交互状态
                  if (!showSensitiveEditor && !isEditingSensitiveInfo) {
                    setTimeout(() => setIsInteractingWithOtherElements(false), 300);
                  }
                }}
                onMouseEnter={() => {
                  // 设置正在与其他元素交互
                  setIsInteractingWithOtherElements(true);
                }}
                onMouseLeave={() => {
                  // 鼠标离开时，如果不在编辑状态，恢复交互状态
                  if (!isEditingSensitiveInfo && !showSensitiveEditor) {
                    setTimeout(() => setIsInteractingWithOtherElements(false), 300);
                  }
                }}
                style={{
                  padding: '4px 8px',
                  backgroundColor: darkMode ? '#1976d2' : '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                {showSensitiveEditor ? '隐藏敏感信息编辑器' : '显示敏感信息编辑器'}
              </button>
            )}
            </div>
          </div>
        )}

        {/* 显示历史消息 */}
        {displayMessages.map((msg, index) => {
          return (
            msg.role !== 'system' && (
              <SensitiveMessageWrapper 
                key={`${msg.id}-${index}`}
                message={{
                  ...msg,
                  onRetry: msg.role === 'assistant' ? () => {
                    setIsInteractingWithOtherElements(true);
                    handleRetry(msg, isDeepResearch, isWebSearch);
                    setTimeout(() => setIsInteractingWithOtherElements(false), 100);
                  } : null,
                  onEdit: msg.role === 'user' ? (newContent) => {
                    // 开始编辑消息时，设置编辑状态为true
                    handleMessageEditStateChange(true);
                    
                    // 确保消息对象有id
                    const messageToEdit = {
                      ...msg,
                      id: msg.id || `temp_${Date.now()}`
                    };
                    
                    // 调用编辑处理函数
                    handleEdit(messageToEdit, newContent, isDeepResearch, isWebSearch);
                  } : null,
                  isStreaming: false,
                  isWebSearch: isWebSearch,
                  reasoning_content: msg.reasoning_content  // 确保推理内容被传递
                }}
                isHighlighted={msg.id === highlightedMessageId}
                sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
                darkMode={darkMode}
                onEditStateChange={handleMessageEditStateChange}
                sessionHash={sessionHash}
              />
            )
          );
        })}

        {/* 显示正在生成的消息 */}
        {streaming && (
          <>
            {/* 显示当前正在生成的消息 */}
            <SensitiveMessageWrapper 
              key={`streaming-${streamingMessageId}`}
              message={{
                role: 'assistant',
                content: currentResponse,
                reasoning_content: reasoningText,
                isStreaming: true,
                isWebSearch: isWebSearch
              }}
              isHighlighted={false}
              sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
              darkMode={darkMode}
              onEditStateChange={handleMessageEditStateChange}
              sessionHash={sessionHash}
            />
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
            sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
            handleFileUpload={handleFileUpload}
            onUploadSuccess={(docs) => {
              // 阻止上传操作时文本框获取焦点
              setIsInteractingWithOtherElements(true);
              console.log('设置活动文档:', docs);
              // 确保docs是数组
              const docsArray = Array.isArray(docs) ? docs : (docs ? [docs] : []);
              setActiveDocuments(docsArray);
              setTimeout(() => setIsInteractingWithOtherElements(false), 300);
            }}
            setUploadedFileInfo={setUploadedFileInfo}
            handleUploadSuccess={handleUploadSuccess}
          />
          
          <textarea
            ref={textareaRef}
            value={currentInput}
            onChange={(e) => {
              const cursorPosition = e.target.selectionStart;
              updateInput(e.target.value);
              
              // 调整文本区域高度
              adjustTextareaHeight(e.target);
              
              // 保持光标位置
              requestAnimationFrame(() => {
                e.target.selectionStart = cursorPosition;
                e.target.selectionEnd = cursorPosition;
              });
            }}
            onFocus={handleTextareaFocus}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!streaming || currentInput.trim()) {
                  if (!activeDocuments || activeDocuments.length === 0) {
                    console.log('无活动文档，使用普通聊天');
                  } else {
                    // 确保activeDocuments是数组
                    const docArray = Array.isArray(activeDocuments) ? activeDocuments : [activeDocuments];
                    console.log('使用文档聊天，文档IDs:', docArray.map(doc => doc.id).join(', '));
                  }
                  if (handleSubmit) {
                    handleSubmit(e, isDeepResearch, isWebSearch);
                  }
                  if (textareaRef.current) {
                    textareaRef.current.style.height = '32px';
                  }
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
            autoFocus={!isInteractingWithOtherElements && !isEditingSensitiveInfo && !showSensitiveEditor && !isEditingMessage && !streaming}
          />
          {streaming ? (
            <button 
              type="button" 
              onClick={() => {
                setIsInteractingWithOtherElements(true);
                if (handleStop) {
                  handleStop();
                }
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
              disabled={streaming || !currentInput.trim()}
              className="send-button"
              style={{ 
                padding: '12px 24px',
                backgroundColor: (streaming || !currentInput.trim())
                  ? (darkMode ? '#444' : '#e0e0e0')
                  : '#1976d2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: (streaming || !currentInput.trim()) ? 'not-allowed' : 'pointer',
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