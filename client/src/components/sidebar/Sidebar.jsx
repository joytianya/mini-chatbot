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
  // 基本属性
  isSidebarExpanded = true,
  onToggleSidebar = () => {},
  darkMode = false,
  onToggleDarkMode = () => {},
  streaming = false,
  
  // 会话相关
  conversations = [],
  onNewChat = () => {},
  onSelectConversation = () => {},
  onDeleteConversation = () => {},
  onClearAll = () => {},
  onExport = () => {},
  
  // 设置相关
  onShowSettings = () => {},
  onShowFileUpload = () => {},
  
  // 其他属性
  formatTime = (timestamp) => {
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
  }
}) => {
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('');
  
  // 安全地过滤会话
  const filteredConversations = Array.isArray(conversations) ? conversations.filter(conv => {
    // 添加防御性检查
    if (!conv || typeof conv !== 'object') return false;
    
    // 使用 name 而不是 title，并确保它是字符串
    const convName = typeof conv.name === 'string' ? conv.name : '';
    const query = typeof searchQuery === 'string' ? searchQuery.toLowerCase() : '';
    
    return convName.toLowerCase().includes(query);
  }) : [];

  return (
    <div className={`sidebar ${isSidebarExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <h1 className="logo">Mini ChatBot</h1>
        </div>
        <button className="new-chat-button" onClick={onNewChat}>
          <span className="plus-icon">+</span> 新对话
        </button>
        <button className="toggle-sidebar-button" onClick={onToggleSidebar}>
          {isSidebarExpanded ? '←' : '→'}
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
                filteredConversations.map((conv, index) => (
                  <div 
                    key={conv.id || conv.sessionHash || index}
                    className={`conversation-item ${conv.active ? 'active' : ''}`}
                    onClick={() => onSelectConversation(conv)}
                  >
                    <span className="conversation-title">{conv.name || conv.title || '无标题对话'}</span>
                    <span className="conversation-time">{formatTime(conv.timestamp)}</span>
                    <button 
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.sessionHash || conv.id);
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
            <div className="footer-buttons">
              <button 
                className="settings-button" 
                onClick={onShowSettings}
                disabled={streaming}
              >
                设置
              </button>
              
              <button 
                className="upload-button" 
                onClick={onShowFileUpload}
                disabled={streaming}
              >
                上传文件
              </button>
              
              <button 
                className="clear-button" 
                onClick={onClearAll}
                disabled={streaming}
              >
                清空对话
              </button>
              
              <button 
                className="export-button" 
                onClick={onExport}
                disabled={streaming}
              >
                导出对话
              </button>
              
              <button 
                className="theme-button" 
                onClick={onToggleDarkMode}
              >
                {darkMode ? '切换亮色模式' : '切换暗色模式'}
              </button>
            </div>
          </div>
        </>
      )}
      
      <button className="collapse-button" onClick={onToggleSidebar}>
        {isSidebarExpanded ? '◀' : '▶'}
      </button>
    </div>
  );
};

export default Sidebar; 