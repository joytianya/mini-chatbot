import React, { useState } from 'react';
import '../../components/Sidebar.css';

// 添加日期格式化辅助函数
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  // 对于今天的日期，只显示时间
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // 对于其他日期，显示日期
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Sidebar = ({
  isSidebarExpanded,
  handleNewChat,
  conversations,
  handleConversationClick,
  handleDeleteConversation,
  streaming,
  handleClearAll,
  handleExport,
  darkMode,
  availableModels,
  selectedModel,
  setSelectedModel,
  handleSettingsSave,
  sensitiveInfoProtectionEnabled,
  toggleSensitiveInfoProtection,
  handleToggleSidebar
}) => {
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  
  // 过滤会话
  const filteredConversations = conversations.filter(conv => 
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`sidebar ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <h1 className="logo">Mini ChatBot</h1>
        </div>
        <button className="new-chat-button" onClick={handleNewChat}>
          <span className="plus-icon">+</span> 新对话
        </button>
      </div>
      
      {isSidebarExpanded && (
        <>
          <div className="sidebar-search">
            <input
              type="text"
              className="search-input"
              placeholder="搜索对话..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="sidebar-content">
            <div className="conversation-list">
              {filteredConversations.length > 0 ? (
                filteredConversations.map(conv => (
                  <div 
                    key={conv.id}
                    className={`conversation-item ${conv.active ? 'active' : ''}`}
                    onClick={() => handleConversationClick(conv)}
                  >
                    <span className="conversation-title">{conv.title}</span>
                    <span className="conversation-time">{formatTime(conv.timestamp)}</span>
                    <button 
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteConversation(conv.sessionHash);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-conversations">
                  {searchQuery ? '没有匹配的对话' : '没有对话历史'}
                </div>
              )}
            </div>
          </div>
          
          <div className="sidebar-footer">
            <div className="model-selector-container">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                disabled={streaming}
                className="model-selector"
              >
                {availableModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            
            <div className="footer-buttons">
              <button className="clear-button" onClick={handleClearAll}>
                清空对话
              </button>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={sensitiveInfoProtectionEnabled}
                  onChange={toggleSensitiveInfoProtection}
                  className="toggle-checkbox"
                />
                <span className="toggle-text">保护敏感信息</span>
              </label>
            </div>
          </div>
        </>
      )}
      
      <button className="collapse-button" onClick={handleToggleSidebar}>
        {isSidebarExpanded ? '◀' : '▶'}
      </button>
    </div>
  );
};

export default Sidebar; 