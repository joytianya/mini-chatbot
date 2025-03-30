import React, { useState, useRef, useEffect } from 'react';
import { Settings } from './Settings';
import './Sidebar.css';
import DocumentUploader from './DocumentUploader.jsx';

const Sidebar = ({
  isSidebarExpanded,
  handleNewChat,
  conversations,
  handleConversationClick,
  handleDeleteConversation,
  streaming,
  handleClearAll,
  handleExport,
  formatTime,
  darkMode,
  setDarkMode,
  availableModels,
  selectedModel,
  setSelectedModel,
  handleSettingsSave,
  sensitiveInfoProtectionEnabled,
  toggleSensitiveInfoProtection,
  handleToggleSidebar,
  currentSessionHash,
  onConversationClick,
  onCreateNewChat,
  onDeleteConversation,
  onUploadSuccess
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' 或 'documents'
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const modelSelectorRef = useRef(null);

  // 点击外部关闭模型选择下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 生成随机颜色函数
  const getRandomColor = (seed) => {
    const colors = [
      '#1976d2', '#388e3c', '#d32f2f', '#7b1fa2', 
      '#c2185b', '#f57c00', '#0288d1', '#689f38'
    ];
    // 使用对话ID作为种子来选择颜色
    const index = seed.toString().split('').reduce((a, b) => a + b.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  // 获取对话标题的第一个字符
  const getFirstChar = (title) => {
    return title && title.length > 0 ? title.charAt(0) : '对';
  };

  // 标签页样式
  const getTabStyle = (tabName) => ({
    padding: '10px 20px',
    cursor: 'pointer',
    backgroundColor: activeTab === tabName ? (darkMode ? '#2d2d2d' : '#f0f0f0') : 'transparent',
    color: darkMode ? '#e0e0e0' : '#333',
    border: 'none',
    borderBottom: activeTab === tabName ? `2px solid ${darkMode ? '#4a9eff' : '#1976d2'}` : 'none',
    flex: 1,
    textAlign: 'center',
    transition: 'all 0.3s ease'
  });

  // 模型选择处理函数
  const handleModelChange = (e) => {
    if (setSelectedModel) {
      setSelectedModel(e.target.value);
      localStorage.setItem('selectedModel', e.target.value);
    }
  };

  // 直接选择模型处理函数
  const handleModelSelect = (model) => {
    if (setSelectedModel) {
      setSelectedModel(model);
      localStorage.setItem('selectedModel', model);
      setShowModelDropdown(false);
    }
  };

  // 获取简短的模型名称
  const getShortModelName = (modelName) => {
    if (!modelName) return '';
    
    // 如果含有 "-" 或 "/" 取最后一部分
    const parts = modelName.split(/[-\/]/);
    if (parts.length > 1) {
      return parts[parts.length - 1];
    }
    
    // 如果太长就截取
    return modelName.length > 12 ? modelName.substring(0, 10) + '...' : modelName;
  };

  return (
    <>
      <div className="sidebar-container" style={{
        width: isSidebarExpanded ? '260px' : '48px',
        height: '100vh',
        borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        transition: 'width 0.3s linear',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {/* 标签页导航 */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
          backgroundColor: darkMode ? '#1a1a1a' : '#fff'
        }}>
          <button
            className={`tab-button ${activeTab === 'chats' ? 'active' : ''}`}
            onClick={() => setActiveTab('chats')}
            style={getTabStyle('chats')}
          >
            {isSidebarExpanded ? '对话列表' : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            )}
          </button>
          <button
            className={`tab-button ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
            style={getTabStyle('documents')}
          >
            {isSidebarExpanded ? '文档管理' : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            )}
          </button>
        </div>

        {/* 标题区域 */}
        <div 
          className="title-area" 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarExpanded ? 'space-between' : 'center',
            padding: isSidebarExpanded ? '12px 16px' : '10px',
            borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            height: '56px',
            boxSizing: 'border-box',
            overflow: 'hidden',
            transition: 'all 0.3s linear',
            cursor: 'pointer'
          }}
          onClick={handleToggleSidebar}
          title={isSidebarExpanded ? "收起侧边栏" : "展开侧边栏"}
        >
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px',
              minWidth: isSidebarExpanded ? 'auto' : '32px',
              transition: 'all 0.3s linear',
              height: '32px',
              justifyContent: 'center'
            }}
          >
            <div className="app-icon" style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: darkMode ? '#304254' : '#1976d2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '18px',
              flexShrink: 0,
              transition: 'transform 0.3s linear',
              transform: isSidebarExpanded ? 'scale(1)' : 'scale(1)'
            }}>
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <rect x="4" y="4" width="16" height="12" rx="2" />
                <circle cx="9" cy="10" r="1" />
                <circle cx="12" cy="10" r="1" />
                <circle cx="15" cy="10" r="1" />
                <line x1="12" y1="16" x2="12" y2="20" />
              </svg>
            </div>
            
            {isSidebarExpanded && (
              <h1 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: darkMode ? '#b0c4de' : '#2c3e50',
                whiteSpace: 'nowrap',
                transition: 'opacity 0.3s linear',
              }}>
                Mini Chatbot
              </h1>
            )}
          </div>
        </div>

        {/* 内容区域 */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '10px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          {activeTab === 'chats' ? (
            // 对话列表
            <>
              <button
                className="new-chat-btn"
                onClick={handleNewChat}
                style={{
                  width: isSidebarExpanded ? '100%' : '32px',
                  padding: isSidebarExpanded ? '10px' : '6px 0',
                  marginBottom: '6px',
                  backgroundColor: darkMode ? '#3a3a3a' : '#f5f5f5',
                  border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
                  borderRadius: '6px',
                  color: darkMode ? '#e0e0e0' : '#333',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  margin: isSidebarExpanded ? '0 0 6px 0' : '0 auto 6px auto'
                }}
              >
                <svg width={isSidebarExpanded ? "20" : "24"} height={isSidebarExpanded ? "20" : "24"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16"></line>
                  <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                {isSidebarExpanded && <span>新建对话</span>}
              </button>

              {/* 对话列表区域标识 - 当侧边栏缩小且没有对话时显示 */}
              {!isSidebarExpanded && conversations.length === 0 && (
                <div 
                  className="empty-conversations-indicator"
                  style={{
                    width: '32px',
                    height: '32px',
                    margin: '8px auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    borderRadius: '6px',
                    color: darkMode ? '#aaa' : '#888'
                  }}
                  title="暂无对话，点击上方按钮新建"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="9" y1="9" x2="15" y2="9"></line>
                    <line x1="9" y1="15" x2="15" y2="15"></line>
                  </svg>
                </div>
              )}

              {/* 对话列表 */}
              <div className="conversation-list" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                width: isSidebarExpanded ? '100%' : '40px',
                margin: isSidebarExpanded ? '0' : '0 auto'
              }}>
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className={`conversation-item ${conv.active ? 'active' : ''}`}
                    onClick={() => handleConversationClick(conv)}
                    onMouseEnter={(e) => {
                      const deleteButton = e.currentTarget.querySelector('.delete-button');
                      if (deleteButton) {
                        deleteButton.style.opacity = '1';
                        deleteButton.style.visibility = 'visible';
                      }
                    }}
                    onMouseLeave={(e) => {
                      const deleteButton = e.currentTarget.querySelector('.delete-button');
                      if (deleteButton) {
                        deleteButton.style.opacity = '0';
                        deleteButton.style.visibility = 'hidden';
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: isSidebarExpanded ? '8px 10px' : '6px 0',
                      backgroundColor: conv.active ? (darkMode ? '#444' : '#e3f2fd') : 'transparent',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      position: 'relative',
                      gap: isSidebarExpanded ? '10px' : '0',
                      transition: 'background-color 0.2s ease',
                      justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
                      width: isSidebarExpanded ? '100%' : '40px'
                    }}
                    title={!isSidebarExpanded ? conv.title : ""}
                  >
                    {/* 对话图标 */}
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      backgroundColor: getRandomColor(conv.id),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '14px',
                      flexShrink: 0,
                      margin: isSidebarExpanded ? '0' : '0 auto'
                    }}>
                      {getFirstChar(conv.title)}
                    </div>

                    {/* 对话标题 */}
                    {isSidebarExpanded && (
                      <div style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: darkMode ? '#e0e0e0' : '#333',
                        fontSize: '14px'
                      }}>
                        {conv.title}
                      </div>
                    )}

                    {/* 删除按钮 */}
                    {isSidebarExpanded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // 阻止事件冒泡
                          handleDeleteConversation(conv.sessionHash);
                        }}
                        style={{
                          padding: '4px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '4px',
                          color: darkMode ? '#888' : '#666',
                          cursor: 'pointer',
                          opacity: '0',
                          visibility: 'hidden',
                          transition: 'all 0.2s ease',
                          position: 'absolute',
                          right: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '24px',
                          height: '24px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        className="delete-button"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            // 文档管理
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: isSidebarExpanded ? 'stretch' : 'center'
            }}>
              {/* 缩小状态下显示上传文件图标 */}
              {!isSidebarExpanded ? (
                <div
                  className="upload-icon"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: darkMode ? '#e0e0e0' : '#555',
                    transition: 'transform 0.2s ease'
                  }}
                  title="上传文件"
                  onClick={() => {
                    // 触发隐藏的文件上传输入
                    const fileInput = document.getElementById('file-upload-input');
                    if (fileInput) fileInput.click();
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
              ) : (
                <DocumentUploader
                  onUploadSuccess={onUploadSuccess}
                  darkMode={darkMode}
                />
              )}
              
              {/* 文件上传说明提示文本 - 仅在缩小模式下显示 */}
              {!isSidebarExpanded && (
                <div 
                  className="doc-hint"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: darkMode ? '#888' : '#999'
                  }}
                  title="上传文件后可用于知识库查询"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 模型选择区域 */}
        {availableModels && availableModels.length > 0 && (
          <div 
            ref={modelSelectorRef}
            className="model-selector-container"
            style={{
              padding: isSidebarExpanded ? '10px 12px' : '8px',
              borderTop: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
              backgroundColor: darkMode ? '#333' : '#f7f7f7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isSidebarExpanded ? 'flex-start' : 'center',
              gap: '8px',
              position: 'relative'
            }}
          >
            {/* 模型图标按钮 */}
            <div 
              className="model-icon"
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              style={{
                color: darkMode ? '#aaa' : '#666',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                cursor: 'pointer',
                backgroundColor: isSidebarExpanded ? 'transparent' : (darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                transition: 'background-color 0.2s ease, transform 0.2s ease',
                position: 'relative'
              }}
              title={`${selectedModel ? '当前模型: ' + selectedModel : '选择模型'}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.5-4.5 10-10 10S2 17.5 2 12 6.5 2 12 2z"/>
                <path d="M12 8v4l3 3"/>
              </svg>
            </div>
            
            {/* 展开状态下的选择器 */}
            {isSidebarExpanded && !showModelDropdown && (
              <div className="model-selector" style={{ flex: 1 }}>
                <select
                  value={selectedModel || ''}
                  onChange={handleModelChange}
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    backgroundColor: darkMode ? '#444' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    borderRadius: '4px',
                    fontSize: '13px',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  {availableModels.map(model => {
                    // 对过长的模型名进行处理
                    const displayName = model.length > 20 ? model.substring(0, 18) + '...' : model;
                    return (
                      <option key={model} value={model} title={model}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            
            {/* 模型选择下拉菜单 - 在缩小状态下点击图标或者展开状态下点击图标时显示 */}
            {showModelDropdown && (
              <div 
                className="compact-model-dropdown"
                style={{
                  position: 'absolute',
                  left: isSidebarExpanded ? '40px' : '50px',
                  bottom: '100%',
                  zIndex: 9999,
                  backgroundColor: darkMode ? '#444' : '#fff',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  width: '180px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: `1px solid ${darkMode ? '#555' : '#e0e0e0'}`
                }}
              >
                <div style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  color: darkMode ? '#aaa' : '#888',
                  borderBottom: `1px solid ${darkMode ? '#555' : '#eee'}`,
                  marginBottom: '4px'
                }}>
                  选择模型
                </div>
                {availableModels.map(model => (
                  <div
                    key={model}
                    onClick={() => handleModelSelect(model)}
                    style={{
                      padding: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      color: darkMode ? '#e0e0e0' : '#333',
                      backgroundColor: model === selectedModel 
                        ? (darkMode ? 'rgba(77, 171, 247, 0.2)' : 'rgba(25, 118, 210, 0.1)')
                        : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background-color 0.15s ease'
                    }}
                    title={model}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = model === selectedModel
                        ? (darkMode ? 'rgba(77, 171, 247, 0.25)' : 'rgba(25, 118, 210, 0.15)')
                        : (darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = model === selectedModel
                        ? (darkMode ? 'rgba(77, 171, 247, 0.2)' : 'rgba(25, 118, 210, 0.1)')
                        : 'transparent';
                    }}
                  >
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {model.length > 20 ? model.substring(0, 18) + '...' : model}
                    </span>
                    {model === selectedModel && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* 底部操作区域 */}
        <div style={{
          display: 'flex',
          flexDirection: isSidebarExpanded ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: isSidebarExpanded ? 'space-around' : 'center',
          padding: isSidebarExpanded ? '12px' : '8px',
          borderTop: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
          gap: isSidebarExpanded ? '12px' : '8px'
        }}>
          {/* 深色模式切换 */}
          <div
            className="action-button"
            onClick={() => setDarkMode(!darkMode)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: darkMode ? '#ffc107' : '#777',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title={darkMode ? "切换到浅色模式" : "切换到深色模式"}
          >
            {darkMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </div>

          {/* 清空所有对话按钮 */}
          <div
            className="action-button"
            onClick={handleClearAll}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(244, 67, 54, 0.1)',
              color: '#f44336',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="清空所有对话"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </div>

          {/* 设置按钮 */}
          <div
            className="action-button"
            onClick={() => setIsSettingsOpen(true)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: darkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: darkMode ? '#e0e0e0' : '#555',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            title="设置"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* 创建一个隐藏的文件上传输入 - 供缩小状态下的文档管理使用 */}
      <input
        type="file"
        id="file-upload-input"
        style={{ display: 'none' }}
        onChange={(e) => {
          if (e.target.files && e.target.files[0] && onUploadSuccess) {
            onUploadSuccess(e.target.files[0]);
          }
        }}
      />

      <Settings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        darkMode={darkMode}
        onSave={handleSettingsSave}
        sensitiveInfoProtectionEnabled={sensitiveInfoProtectionEnabled}
        toggleSensitiveInfoProtection={toggleSensitiveInfoProtection}
      />
    </>
  );
};

export default Sidebar;