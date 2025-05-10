import React, { useState, useEffect } from 'react';
import '../styles/Sidebar.css';
import { Modal } from '../common/Modal';
import storageService from '../services/storageService';
import toast from 'react-hot-toast';

const Sidebar = ({
  conversations,
  setConversations,
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRenameConversation,
  isOpen,
  apiSettings,
  onUpdateApiSettings,
  webSearchEnabled,
  onToggleWebSearch,
  deepResearchEnabled,
  onToggleDeepResearch,
  directRequestEnabled,
  onToggleDirectRequest,
  chatLogicProps
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [localApiSettings, setLocalApiSettings] = useState(apiSettings);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Handle conversation renaming
  const startEditing = (id, title) => {
    setEditingId(id);
    setEditingTitle(title);
  };

  const saveEdit = () => {
    if (editingTitle.trim()) {
      onRenameConversation(editingId, editingTitle);
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  // Handle API settings changes
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setLocalApiSettings(prev => ({ ...prev, [name]: value }));
    console.log(`设置已更新: ${name} = ${value.substring(0, 3)}...`);
  };
  
  // 处理粘贴事件，不需要特殊处理，因为默认粘贴会触发onChange事件

  const saveSettings = () => {
    onUpdateApiSettings(localApiSettings);
    setIsSettingsOpen(false);
  };

  // Format conversation date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // 确保侧边栏始终显示对话历史
  useEffect(() => {
    // 当conversations变化时，确保侧边栏内容更新
    console.log('对话历史已更新，当前会话数:', Object.keys(conversations).length);
  }, [conversations]);

  // 清空对话历史功能
  const handleClearAllConversations = () => {
    if (chatLogicProps?.clearAllConversations) {
      if (window.confirm('确定要删除所有对话历史记录吗？此操作不可撤销，所有对话记录将被永久删除。')) {
        if (chatLogicProps.clearAllConversations()) {
          // 清空对话列表状态
          setConversations({});
          onNewConversation();
          toast.success('已清除所有对话历史记录');
        }
      }
    } else {
      toast.error('无法清除对话历史记录');
    }
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>对话列表</h2>
          <button 
            className="new-chat-button" 
            onClick={(e) => {
              e.preventDefault();
              console.log('Sidebar: 点击新对话按钮');
              // 先触发动画效果
              e.currentTarget.classList.add('active');
              
              // 延时处理，给用户视觉反馈
              setTimeout(() => {
                // 创建新对话，获取新ID
                const newId = onNewConversation();
                console.log(`Sidebar: 新对话已创建，ID: ${newId}`);
                
                // 移除成功提示
                // toast.success('已创建新对话');
                
                // 恢复按钮状态
                e.currentTarget.classList.remove('active');
              }, 200);
            }}
            aria-label="New conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            新对话
          </button>
        </div>

        <div className="conversations-list">
          {Object.entries(conversations).length === 0 ? (
            <div className="empty-conversations">
              <p>没有对话历史</p>
              <p>点击"新对话"开始聊天</p>
            </div>
          ) : (
            Object.entries(conversations)
              .sort(([, a], [, b]) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
              .map(([id, conversation]) => (
                <div 
                  key={id} 
                  className={`conversation-item ${currentConversationId === id ? 'active' : ''}`}
                >
                  {editingId === id ? (
                    <div className="edit-conversation">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onPaste={(e) => {
                          // 不阻止默认粘贴行为
                          console.log('粘贴到对话标题输入框');
                        }}
                        className="paste-enabled"
                        autoFocus
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                      />
                      <small className="input-tip">支持粘贴内容</small>
                      <div className="edit-buttons">
                        <button onClick={saveEdit} aria-label="Save">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </button>
                        <button onClick={cancelEdit} aria-label="Cancel">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div 
                        className="conversation-title"
                        onClick={(e) => {
                          e.preventDefault();
                          // 先置灰条目，视觉上表明已响应点击
                          if (e && e.currentTarget) {
                            e.currentTarget.classList.add('loading');
                          }
                          toast.dismiss(); // 清除可能存在的提示
                          
                          try {
                            // 延时调用选择对话，给UI时间完成状态转换
                            setTimeout(() => {
                              console.log(`Sidebar: 选择对话 ${id}, 当前活动对话: ${currentConversationId}`);
                              
                              // 触发选择事件
                              onSelectConversation(id);
                              
                              // 移除切换成功提示
                              // if (id !== currentConversationId) {
                              //   toast.success(`已切换到对话: ${conversation.title || '新对话'}`);
                              // }
                              
                              // 200ms后恢复样式
                              setTimeout(() => {
                                if (e && e.currentTarget) {
                                  e.currentTarget.classList.remove('loading');
                                }
                              }, 200);
                            }, 50);
                          } catch (error) {
                            console.error('选择对话时出错:', error);
                            toast.error('切换对话失败');
                            if (e && e.currentTarget) {
                              e.currentTarget.classList.remove('loading');
                            }
                          }
                        }}
                      >
                        <span>{conversation.title || '新对话'}</span>
                        <small>{formatDate(conversation.updatedAt)}</small>
                      </div>
                      <div className="conversation-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            startEditing(id, conversation.title || '新对话');
                          }}
                          aria-label="Edit conversation"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(id);
                          }}
                          aria-label="Delete conversation"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
          )}
        </div>

        <div className="maintenance-actions">
          <button 
            className="clear-all-button action-button"
            onClick={handleClearAllConversations}
            title="删除所有对话历史记录，此操作不可恢复，所有对话数据将被永久删除"
          >
            🗑️ 清除所有历史记录
          </button>
        </div>

        <div className="sidebar-footer">
          <div className="feature-toggles">
            <div className="toggle-item">
              <label htmlFor="web-search-toggle">联网搜索</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="web-search-toggle"
                  checked={webSearchEnabled}
                  onChange={onToggleWebSearch}
                />
                <span className="toggle-slider"></span>
              </div>
            </div>
            <div className="toggle-item">
              <label htmlFor="deep-research-toggle">深度研究</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="deep-research-toggle"
                  checked={deepResearchEnabled}
                  onChange={onToggleDeepResearch}
                />
                <span className="toggle-slider"></span>
              </div>
            </div>
            <div className="toggle-item">
              <label htmlFor="direct-request-toggle">直接请求API</label>
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  id="direct-request-toggle"
                  checked={directRequestEnabled}
                  onChange={onToggleDirectRequest}
                />
                <span className="toggle-slider"></span>
              </div>
            </div>
          </div>

          <button 
            className="settings-button" 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
            API 设置
          </button>
        </div>
      </aside>

      {isSettingsOpen && (
        <div className="settings-panel">
          <div className="settings-header">
            <h3>API 设置</h3>
            <button onClick={() => setIsSettingsOpen(false)} aria-label="Close settings">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label htmlFor="base_url">API 基础 URL</label>
              <input
                type="text"
                id="base_url"
                name="base_url"
                value={localApiSettings.base_url}
                onChange={handleSettingsChange}
                onPaste={(e) => {
                  // 不阻止默认粘贴行为
                  console.log('粘贴到 API URL 输入框');
                }}
                placeholder="https://openrouter.ai/api/v1"
                className="paste-enabled"
              />
              <small className="input-tip">支持粘贴内容</small>
            </div>
            <div className="form-group">
              <label htmlFor="api_key">API 密钥</label>
              <input
                type="password"
                id="api_key"
                name="api_key"
                value={localApiSettings.api_key}
                onChange={handleSettingsChange}
                onPaste={(e) => {
                  // 不阻止默认粘贴行为
                  console.log('粘贴到 API 密钥输入框');
                }}
                placeholder="sk-..."
                className="paste-enabled"
              />
              <small className="input-tip">支持粘贴内容</small>
            </div>
            <div className="form-group">
              <label htmlFor="model_name">模型名称</label>
              <input
                type="text"
                id="model_name"
                name="model_name"
                value={localApiSettings.model_name}
                onChange={handleSettingsChange}
                onPaste={(e) => {
                  // 不阻止默认粘贴行为
                  console.log('粘贴到模型名称输入框');
                }}
                placeholder="gpt-3.5-turbo"
                className="paste-enabled"
              />
              <small className="input-tip">支持粘贴内容</small>
            </div>
            <button 
              className="save-settings-button" 
              onClick={saveSettings}
            >
              保存设置
            </button>
          </div>
        </div>
      )}

      {/* 重命名对话弹窗 */}
      {renameModalVisible && (
        <Modal onClose={() => setRenameModalVisible(false)}>
          <h2>重命名对话</h2>
          <input 
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="对话标题"
            autoFocus
          />
          <div className="modal-actions">
            <button onClick={() => setRenameModalVisible(false)}>取消</button>
            <button onClick={() => {
              onRenameConversation(editingId, renameValue);
              setRenameModalVisible(false);
            }}>保存</button>
          </div>
        </Modal>
      )}
    </>
  );
};

export default Sidebar;
