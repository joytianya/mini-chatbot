import React from 'react';
import './ChatHeader.css'; // Assuming you might create a separate CSS file later or use ChatArea.css

const ChatHeader = ({
  handleToggleSidebar,
  handleNewChat,
  handleExport,
  toggleDarkMode,
  darkMode,
  currentTurns,
  activeDocuments,
  handleDeleteDocument,
  setShowFileUpload,
  openSettings
}) => {
  return (
    <div className="chat-header">
      <div className="header-left">
        {/* Use a more standard menu icon */}
        <button className="header-button icon-button toggle-sidebar-button" onClick={handleToggleSidebar} title="切换侧边栏">
          <span className="icon">≡</span>
        </button>
        {/* Standard plus icon */}
        <button className="header-button new-chat-button" onClick={handleNewChat}>
          <span className="icon">+</span> 新对话
        </button>
      </div>
      
      {/* Turn counter - consider if this is necessary or how to display it better */}
      <div className="turn-counter"> 
        轮数: {currentTurns} / ∞
      </div>
      
      <div className="header-right">
        {activeDocuments && activeDocuments.length > 0 && (
          <div className="active-documents">
            <h3>活动文档：</h3>
            <ul className="document-list">
              {activeDocuments.map(doc => (
                <li key={doc.id} className="document-item">
                  <span className="document-name" title={doc.name}>{doc.name}</span>
                  {/* Use a clearer remove icon */}
                  <button 
                    className="header-button icon-button remove-document-button"
                    onClick={() => handleDeleteDocument(doc.id)}
                    title="移除文档"
                  >
                    <span className="icon">✕</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Use consistent button class and better icons */}
        <button className="header-button icon-button" onClick={() => setShowFileUpload(true)} title="上传文件">
          <span className="icon">📄</span> {/* Document icon */}
        </button>
        <button className="header-button icon-button" onClick={handleExport} title="导出对话">
          <span className="icon">📤</span> {/* Export icon */}
        </button>
        <button className="header-button icon-button" onClick={toggleDarkMode} title="切换主题">
          <span className="icon">{darkMode ? '☀️' : '🌙'}</span> {/* Sun/Moon icon */}
        </button>
        <button className="header-button icon-button" onClick={openSettings} title="设置">
          <span className="icon">⚙️</span> {/* Gear icon */}
        </button>
      </div>
    </div>
  );
};

export default ChatHeader; 
