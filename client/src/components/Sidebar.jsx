import React from 'react';

const Sidebar = ({
  isSidebarExpanded,
  handleNewChat,
  conversations,
  handleConversationClick,
  handleDeleteConversation,
  streaming,
  handleClearAll,
  formatTime,
  darkMode
}) => {
  return (
    <div style={{
      width: isSidebarExpanded ? '260px' : '0',
      height: '100vh',
      borderRight: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
      backgroundColor: darkMode ? '#2d2d2d' : '#fff',
      transition: 'width 0.3s',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* 标题区域 */}
      <div className="title-area" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '15px',
        borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        height: '64px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="app-icon" style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: darkMode ? '#304254' : '#1976d2',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '18px'
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
              fontSize: '22px',
              fontWeight: 'bold',
              color: darkMode ? '#b0c4de' : '#2c3e50'
            }}>
              Mini Chatbot
            </h1>
          )}
        </div>
      </div>

      {/* 新建对话按钮 */}
      <div style={{
        padding: '12px',
        borderBottom: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`
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

      {/* 对话列表 */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        backgroundColor: darkMode ? '#2d2d2d' : '#fff'
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
              transition: 'background-color 0.2s',
              ':hover': {
                backgroundColor: darkMode ? '#1e3a5f' : '#e3f2fd'
              }
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
                borderRadius: '4px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18"/>
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* 底部清除按钮 */}
      <div style={{
        padding: '12px',
        borderTop: `1px solid ${darkMode ? '#333' : '#e0e0e0'}`,
        backgroundColor: darkMode ? '#2d2d2d' : '#fff'
      }}>
        <button
          onClick={handleClearAll}
          style={{
            width: '100%',
            padding: '10px',
            border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
            borderRadius: '8px',
            backgroundColor: darkMode ? '#2d2d2d' : '#fff',
            color: darkMode ? '#e0e0e0' : '#333',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          清除所有对话
        </button>
      </div>
    </div>
  );
};

export default Sidebar; 