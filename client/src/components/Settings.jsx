import React, { useState, useEffect } from 'react';

export const Settings = ({ isOpen, onClose, darkMode, initialSettings, onSave }) => {
  const [activeTab, setActiveTab] = useState('model');

  // 修改状态管理，支持模型和embedding配置
  const [modelConfigs, setModelConfigs] = useState(() => {
    const saved = localStorage.getItem('modelConfigs');
    return saved ? JSON.parse(saved) : [{
      id: Date.now(),
      name: '默认配置',
      base_url: '',
      api_key: '',
      model_name: ''
    }];
  });

  const [embeddingConfigs, setEmbeddingConfigs] = useState(() => {
    const saved = localStorage.getItem('embeddingConfigs');
    return saved ? JSON.parse(saved) : [{
      id: Date.now(),
      name: '默认Embedding配置',
      embedding_base_url: '',
      embedding_api_key: '',
      embedding_model_name: ''
    }];
  });

  // 添加新配置组
  const handleAddConfig = (type) => {
    if (type === 'model') {
      setModelConfigs(prev => [...prev, {
        id: Date.now(),
        name: `配置 ${prev.length + 1}`,
        base_url: '',
        api_key: '',
        model_name: ''
      }]);
    } else {
      setEmbeddingConfigs(prev => [...prev, {
        id: Date.now(),
        name: `Embedding配置 ${prev.length + 1}`,
        embedding_base_url: '',
        embedding_api_key: '',
        embedding_model_name: ''
      }]);
    }
  };

  // 更新配置
  const handleConfigChange = (type, id, field, value) => {
    if (type === 'model') {
      setModelConfigs(prev => prev.map(config => 
        config.id === id ? { ...config, [field]: value } : config
      ));
    } else {
      setEmbeddingConfigs(prev => prev.map(config => 
        config.id === id ? { ...config, [field]: value } : config
      ));
    }
  };

  // 删除配置
  const handleDeleteConfig = (type, id) => {
    if (type === 'model') {
      setModelConfigs(prev => prev.filter(config => config.id !== id));
    } else {
      setEmbeddingConfigs(prev => prev.filter(config => config.id !== id));
    }
  };

  // 上移配置
  const moveConfigUp = (type, id) => {
    if (type === 'model') {
      setModelConfigs(prev => {
        const index = prev.findIndex(config => config.id === id);
        if (index <= 0) return prev; // 已经是第一个，无法上移
        
        const newConfigs = [...prev];
        // 交换当前配置与上一个配置的位置
        [newConfigs[index], newConfigs[index - 1]] = [newConfigs[index - 1], newConfigs[index]];
        return newConfigs;
      });
    } else {
      setEmbeddingConfigs(prev => {
        const index = prev.findIndex(config => config.id === id);
        if (index <= 0) return prev;
        
        const newConfigs = [...prev];
        [newConfigs[index], newConfigs[index - 1]] = [newConfigs[index - 1], newConfigs[index]];
        return newConfigs;
      });
    }
  };

  // 下移配置
  const moveConfigDown = (type, id) => {
    if (type === 'model') {
      setModelConfigs(prev => {
        const index = prev.findIndex(config => config.id === id);
        if (index >= prev.length - 1) return prev; // 已经是最后一个，无法下移
        
        const newConfigs = [...prev];
        // 交换当前配置与下一个配置的位置
        [newConfigs[index], newConfigs[index + 1]] = [newConfigs[index + 1], newConfigs[index]];
        return newConfigs;
      });
    } else {
      setEmbeddingConfigs(prev => {
        const index = prev.findIndex(config => config.id === id);
        if (index >= prev.length - 1) return prev;
        
        const newConfigs = [...prev];
        [newConfigs[index], newConfigs[index + 1]] = [newConfigs[index + 1], newConfigs[index]];
        return newConfigs;
      });
    }
  };

  // 保存所有配置
  const handleSave = () => {
    // 保存配置到 localStorage
    localStorage.setItem('modelConfigs', JSON.stringify(modelConfigs));
    localStorage.setItem('embeddingConfigs', JSON.stringify(embeddingConfigs));
    
    // 提取所有配置中的模型名称
    const modelNames = modelConfigs
      .map(config => config.model_name)
      .filter(name => name && name.trim() !== '');
    
    // 调用 onSave 时传递所有配置
    onSave({
      configs: modelConfigs,
      modelNames: modelNames,
      embeddingConfigs: embeddingConfigs
    });
    onClose();
  };

  if (!isOpen) return null;

  const renderConfigFields = (type, configs) => {
    return configs.map((config, index) => (
      <div key={config.id} className="config-group" style={{
        backgroundColor: darkMode ? '#3d3d3d' : '#f5f5f5',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <div className="config-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <input
            type="text"
            value={config.name}
            onChange={(e) => handleConfigChange(type, config.id, 'name', e.target.value)}
            placeholder="配置名称"
            style={{
              padding: '8px',
              borderRadius: '4px',
              border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
              backgroundColor: darkMode ? '#2d2d2d' : '#fff',
              color: darkMode ? '#e0e0e0' : '#333',
              width: '200px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* 上移按钮 */}
            <button 
              onClick={() => moveConfigUp(type, config.id)}
              disabled={index === 0}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: index === 0 ? (darkMode ? '#444' : '#e0e0e0') : (darkMode ? '#555' : '#f0f0f0'),
                color: index === 0 ? (darkMode ? '#777' : '#999') : (darkMode ? '#e0e0e0' : '#333'),
                cursor: index === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="上移"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </button>
            
            {/* 下移按钮 */}
            <button 
              onClick={() => moveConfigDown(type, config.id)}
              disabled={index === configs.length - 1}
              style={{
                padding: '6px 8px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: index === configs.length - 1 ? (darkMode ? '#444' : '#e0e0e0') : (darkMode ? '#555' : '#f0f0f0'),
                color: index === configs.length - 1 ? (darkMode ? '#777' : '#999') : (darkMode ? '#e0e0e0' : '#333'),
                cursor: index === configs.length - 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="下移"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            
            {/* 删除按钮 */}
            <button 
              onClick={() => handleDeleteConfig(type, config.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#dc3545',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              删除
            </button>
          </div>
        </div>
        
        <div className="config-fields" style={{
          display: 'grid',
          gap: '12px'
        }}>
          {type === 'model' ? (
            <>
              <div className="input-group">
                <label style={{ color: darkMode ? '#e0e0e0' : '#333', marginBottom: '4px', display: 'block' }}>Base URL:</label>
                <input
                  type="text"
                  value={config.base_url}
                  onChange={(e) => handleConfigChange(type, config.id, 'base_url', e.target.value)}
                  placeholder="输入 Base URL"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333'
                  }}
                />
              </div>
              
              <div className="input-group">
                <label style={{ color: darkMode ? '#e0e0e0' : '#333', marginBottom: '4px', display: 'block' }}>API Key:</label>
                <input
                  type="password"
                  value={config.api_key}
                  onChange={(e) => handleConfigChange(type, config.id, 'api_key', e.target.value)}
                  placeholder="输入 API Key"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333'
                  }}
                />
              </div>
              
              <div className="input-group">
                <label style={{ color: darkMode ? '#e0e0e0' : '#333', marginBottom: '4px', display: 'block' }}>Model Name:</label>
                <input
                  type="text"
                  value={config.model_name}
                  onChange={(e) => handleConfigChange(type, config.id, 'model_name', e.target.value)}
                  placeholder="输入模型名称"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333'
                  }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="input-group">
                <label style={{ color: darkMode ? '#e0e0e0' : '#333', marginBottom: '4px', display: 'block' }}>Embedding Base URL:</label>
                <input
                  type="text"
                  value={config.embedding_base_url}
                  onChange={(e) => handleConfigChange(type, config.id, 'embedding_base_url', e.target.value)}
                  placeholder="输入 Embedding Base URL"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333'
                  }}
                />
              </div>
              
              <div className="input-group">
                <label style={{ color: darkMode ? '#e0e0e0' : '#333', marginBottom: '4px', display: 'block' }}>Embedding API Key:</label>
                <input
                  type="password"
                  value={config.embedding_api_key}
                  onChange={(e) => handleConfigChange(type, config.id, 'embedding_api_key', e.target.value)}
                  placeholder="输入 Embedding API Key"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333'
                  }}
                />
              </div>
              
              <div className="input-group">
                <label style={{ color: darkMode ? '#e0e0e0' : '#333', marginBottom: '4px', display: 'block' }}>Embedding Model Name:</label>
                <input
                  type="text"
                  value={config.embedding_model_name}
                  onChange={(e) => handleConfigChange(type, config.id, 'embedding_model_name', e.target.value)}
                  placeholder="输入 Embedding 模型名称"
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#555' : '#ddd'}`,
                    backgroundColor: darkMode ? '#2d2d2d' : '#fff',
                    color: darkMode ? '#e0e0e0' : '#333'
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="settings-modal" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div className="settings-content" style={{
        width: '80%',
        maxWidth: '800px',
        maxHeight: '80vh',
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <div className="settings-header" style={{
          padding: '16px 24px',
          borderBottom: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: darkMode ? '#fff' : '#333',
            fontSize: '18px'
          }}>设置</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: darkMode ? '#aaa' : '#666',
              fontSize: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = darkMode ? '#444' : '#f0f0f0'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            &times;
          </button>
        </div>
        
        <div className="settings-tabs" style={{
          display: 'flex',
          borderBottom: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`
        }}>
          <div 
            className={`tab ${activeTab === 'model' ? 'active' : ''}`}
            onClick={() => setActiveTab('model')}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              color: activeTab === 'model' ? (darkMode ? '#fff' : '#1976d2') : (darkMode ? '#aaa' : '#666'),
              borderBottom: activeTab === 'model' ? `2px solid ${darkMode ? '#fff' : '#1976d2'}` : 'none',
              fontWeight: activeTab === 'model' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            模型配置
          </div>
          <div 
            className={`tab ${activeTab === 'embedding' ? 'active' : ''}`}
            onClick={() => setActiveTab('embedding')}
            style={{
              padding: '12px 24px',
              cursor: 'pointer',
              color: activeTab === 'embedding' ? (darkMode ? '#fff' : '#1976d2') : (darkMode ? '#aaa' : '#666'),
              borderBottom: activeTab === 'embedding' ? `2px solid ${darkMode ? '#fff' : '#1976d2'}` : 'none',
              fontWeight: activeTab === 'embedding' ? 'bold' : 'normal',
              transition: 'all 0.2s'
            }}
          >
            Embedding配置
          </div>
        </div>
        
        <div className="settings-body" style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {activeTab === 'model' && (
            <div className="model-settings">
              <h3 style={{ 
                margin: '0 0 16px 0', 
                color: darkMode ? '#fff' : '#333',
                fontSize: '16px'
              }}>模型配置</h3>
              
              {renderConfigFields('model', modelConfigs)}
              
              <button 
                onClick={() => handleAddConfig('model')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: darkMode ? '#444' : '#f0f0f0',
                  border: 'none',
                  borderRadius: '4px',
                  color: darkMode ? '#fff' : '#333',
                  cursor: 'pointer',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加模型配置
              </button>
            </div>
          )}
          
          {activeTab === 'embedding' && (
            <div className="embedding-settings">
              <h3 style={{ 
                margin: '0 0 16px 0', 
                color: darkMode ? '#fff' : '#333',
                fontSize: '16px'
              }}>Embedding配置</h3>
              
              {renderConfigFields('embedding', embeddingConfigs)}
              
              <button 
                onClick={() => handleAddConfig('embedding')}
                style={{
                  padding: '8px 16px',
                  backgroundColor: darkMode ? '#444' : '#f0f0f0',
                  border: 'none',
                  borderRadius: '4px',
                  color: darkMode ? '#fff' : '#333',
                  cursor: 'pointer',
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加Embedding配置
              </button>
            </div>
          )}
        </div>
        
        <div className="settings-footer" style={{
          padding: '16px 24px',
          borderTop: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${darkMode ? '#666' : '#ccc'}`,
              borderRadius: '4px',
              color: darkMode ? '#ccc' : '#666',
              cursor: 'pointer'
            }}
          >
            取消
          </button>
          <button 
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              border: 'none',
              borderRadius: '4px',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

const ModelConfigSelector = ({ configs, currentConfigId, onConfigChange, darkMode }) => {
  return (
    <select
      value={currentConfigId || ''}
      onChange={(e) => onConfigChange(e.target.value)}
      className={`model-config-selector ${darkMode ? 'dark' : ''}`}
    >
      {configs.map(config => (
        <option key={config.id} value={config.id}>
          {config.name}
        </option>
      ))}
    </select>
  );
};