import React, { useState } from 'react';
import { Settings } from './Settings';
import './Sidebar.css';

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
  handleToggleSidebar
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  return (
    <>
      <div style={{
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
        {/* 标题区域 */}
        <div 
          className="title-area" 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: isSidebarExpanded ? 'space-between' : 'center',
            padding: isSidebarExpanded ? '15px' : '10px 15px',
            borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            height: '60px',
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
              height: '44px',
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
            
            <h1 style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 'bold',
              color: darkMode ? '#b0c4de' : '#2c3e50',
              whiteSpace: 'nowrap',
              opacity: isSidebarExpanded ? 1 : 0,
              transform: isSidebarExpanded ? 'translateX(0)' : 'translateX(-10px)',
              transition: 'opacity 0.3s linear, transform 0.3s linear',
              position: 'absolute',
              left: '57px',
              lineHeight: '32px'
            }}>
              Mini Chatbot
            </h1>
          </div>
        </div>

        {/* 内容区域 - 使用条件渲染但保持DOM结构 */}
        <div className="sidebar-content" style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* 新建对话按钮 - 展开状态 */}
          <div style={{
            padding: '12px',
            borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
            opacity: isSidebarExpanded ? 1 : 0,
            maxHeight: isSidebarExpanded ? '60px' : '0',
            overflow: 'hidden',
            transition: 'opacity 0.3s ease-in-out, max-height 0.3s ease-in-out',
            display: isSidebarExpanded ? 'block' : 'none'
          }}>
            <button
              onClick={handleNewChat}
              disabled={streaming}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
                borderRadius: '8px',
                backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                color: darkMode ? '#e0e0e0' : '#333',
                cursor: streaming ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '14px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              新对话
            </button>
          </div>

          {/* 新建对话按钮 - 收缩状态 */}
          <div style={{
            display: isSidebarExpanded ? 'none' : 'flex',
            justifyContent: 'center',
            padding: '8px 0',
            opacity: isSidebarExpanded ? 0 : 1,
            maxHeight: isSidebarExpanded ? '0' : '48px',
            overflow: 'hidden',
            transition: 'opacity 0.3s ease-in-out, max-height 0.3s ease-in-out',
            borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
          }}>
            <div
              onClick={handleNewChat}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#4caf50', // 绿色
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: streaming ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'transform 0.2s ease-in-out, background-color 0.2s ease-in-out',
                opacity: streaming ? 0.7 : 1
              }}
              title="新对话"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
            </div>
          </div>

          {/* 对话列表区域 */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px',
            backgroundColor: darkMode ? '#2d2d2d' : '#fff',
            transition: 'all 0.3s ease-in-out'
          }}>
            {/* 展开状态下的对话列表 */}
            <div style={{
              opacity: isSidebarExpanded ? 1 : 0,
              maxHeight: isSidebarExpanded ? '100%' : '0',
              overflow: 'hidden',
              transition: 'opacity 0.3s ease-in-out, max-height 0.3s ease-in-out',
              display: isSidebarExpanded ? 'block' : 'none'
            }}>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  className="conversation-item"
                  onClick={() => handleConversationClick(conv)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    marginBottom: '4px',
                    cursor: 'pointer',
                    backgroundColor: conv.active 
                      ? (darkMode ? '#1e3a5f' : '#e3f2fd')
                      : 'transparent',
                    color: darkMode ? '#e0e0e0' : '#333',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s ease-in-out'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                  </svg>
                  <div style={{
                    flex: 1,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {conv.title}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: darkMode ? '#aaa' : '#666',
                      marginTop: '2px'
                    }}>
                      {formatTime(conv.timestamp)}
                    </div>
                  </div>
                  <button
                    className="delete-button"
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    style={{
                      visibility: 'hidden',
                      border: 'none',
                      background: 'none',
                      padding: '4px',
                      cursor: 'pointer',
                      color: darkMode ? '#aaa' : '#666',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background-color 0.2s, color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? '#444' : '#f0f0f0';
                      e.currentTarget.style.color = '#f44336';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = darkMode ? '#aaa' : '#666';
                    }}
                    title="删除对话"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {/* 收缩状态下的对话圆形图标 */}
            <div style={{
              opacity: isSidebarExpanded ? 0 : 1,
              maxHeight: isSidebarExpanded ? '0' : '100%',
              overflow: 'hidden',
              transition: 'opacity 0.3s ease-in-out, max-height 0.3s ease-in-out',
              display: isSidebarExpanded ? 'none' : 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 0'
            }}>
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => handleConversationClick(conv)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: getRandomColor(conv.id),
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '4px 0',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    border: conv.active ? '2px solid #fff' : 'none',
                    boxShadow: conv.active ? '0 0 0 1px #1976d2' : 'none',
                    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                    transform: conv.active ? 'scale(1.05)' : 'scale(1)'
                  }}
                  title={conv.title}
                >
                  {getFirstChar(conv.title)}
                </div>
              ))}
            </div>
          </div>

          {/* 底部操作区域 */}
          <div style={{
            display: 'flex',
            flexDirection: isSidebarExpanded ? 'column' : 'column',
            alignItems: 'center',
            marginTop: 'auto',
            padding: isSidebarExpanded ? '12px' : '8px',
            width: '100%'
          }}>
            {/* 敏感信息保护开关 */}
            {isSidebarExpanded ? (
              <div 
                className="action-button"
                onClick={toggleSensitiveInfoProtection}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: darkMode ? '#fff' : '#333',
                  transition: 'background-color 0.2s',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#333' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ marginRight: '8px', color: sensitiveInfoProtectionEnabled ? '#4caf50' : '#9e9e9e' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <span style={{ fontSize: '14px' }}>
                  敏感信息保护 {sensitiveInfoProtectionEnabled ? '开' : '关'}
                </span>
              </div>
            ) : (
              <div
                onClick={toggleSensitiveInfoProtection}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: sensitiveInfoProtectionEnabled ? '#4caf50' : '#9e9e9e',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s linear',
                  marginBottom: '8px'
                }}
                title={`敏感信息保护 ${sensitiveInfoProtectionEnabled ? '开' : '关'}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
            )}

            {/* 深色模式切换 */}
            {isSidebarExpanded ? (
              <div 
                className="action-button"
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: darkMode ? '#fff' : '#333',
                  transition: 'background-color 0.2s',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#333' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ marginRight: '8px', color: darkMode ? '#ffc107' : '#9e9e9e' }}>
                  {darkMode ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: '14px' }}>
                  {darkMode ? '浅色模式' : '深色模式'}
                </span>
              </div>
            ) : (
              <div
                onClick={() => setDarkMode(!darkMode)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: darkMode ? '#ffc107' : '#9e9e9e',
                  color: darkMode ? '#333' : '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s linear',
                  marginBottom: '8px'
                }}
                title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
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
            )}

            {/* 清空所有对话按钮 */}
            {isSidebarExpanded ? (
              <div 
                className="action-button"
                onClick={handleClearAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: darkMode ? '#fff' : '#333',
                  transition: 'background-color 0.2s',
                  marginBottom: '8px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#333' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ marginRight: '8px', color: '#f44336' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                  </svg>
                </div>
                <span style={{ fontSize: '14px' }}>
                  清空所有对话
                </span>
              </div>
            ) : (
              <div
                onClick={handleClearAll}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f44336',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s linear',
                  marginBottom: '8px'
                }}
                title="清除所有对话"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </div>
            )}

            {/* 设置按钮 */}
            {isSidebarExpanded ? (
              <div 
                className="action-button"
                onClick={() => setIsSettingsOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: 'transparent',
                  color: darkMode ? '#fff' : '#333',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#333' : '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ marginRight: '8px', color: '#607d8b' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3"/>
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                  </svg>
                </div>
                <span style={{ fontSize: '14px' }}>
                  设置
                </span>
              </div>
            ) : (
              <div
                onClick={() => setIsSettingsOpen(true)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#607d8b',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s linear'
                }}
                title="设置"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

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