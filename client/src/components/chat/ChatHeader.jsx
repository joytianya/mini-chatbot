import React from 'react';

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
        <button className="toggle-sidebar-button" onClick={handleToggleSidebar}>
          <span className="menu-icon">☰</span>
        </button>
        <button className="new-chat-button" onClick={handleNewChat}>
          <span className="plus-icon">+</span> 新对话
        </button>
      </div>
      
      <div className="turn-counter">
        轮数: {currentTurns} / ∞
      </div>
      
      <div className="header-right">
        {activeDocuments && activeDocuments.length > 0 && (
          <div className="active-documents">
            <h3>活动文档：</h3>
            <ul>
              {activeDocuments.map(doc => (
                <li key={doc.id} className="document-item">
                  <span className="document-name">{doc.name}</span>
                  <button 
                    className="remove-document-button"
                    onClick={() => handleDeleteDocument(doc.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        <button className="icon-button" onClick={() => setShowFileUpload(true)}>
          <span className="file-icon">📄</span>
        </button>
        <button className="icon-button" onClick={handleExport}>
          <span className="export-icon">📤</span>
        </button>
        <button className="icon-button" onClick={toggleDarkMode}>
          <span className="theme-icon">{darkMode ? '☀️' : '🌙'}</span>
        </button>
        <button className="icon-button" onClick={openSettings}>
          <span className="settings-icon">⚙️</span>
        </button>
      </div>
    </div>
  );
};

export default ChatHeader; 