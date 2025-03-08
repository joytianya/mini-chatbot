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
    return configs.map((config) => (
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
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        position: 'relative'
      }}>
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '20px',
          borderBottom: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`
        }}>
          <button
            onClick={() => setActiveTab('model')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'model' ? '#1976d2' : (darkMode ? '#e0e0e0' : '#666'),
              borderBottom: activeTab === 'model' ? '2px solid #1976d2' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'model' ? 'bold' : 'normal'
            }}
          >
            模型配置
          </button>
          <button
            onClick={() => setActiveTab('embedding')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'embedding' ? '#1976d2' : (darkMode ? '#e0e0e0' : '#666'),
              borderBottom: activeTab === 'embedding' ? '2px solid #1976d2' : 'none',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: activeTab === 'embedding' ? 'bold' : 'normal'
            }}
          >
            Embedding配置
          </button>
        </div>

        {/* 根据activeTab显示对应的配置内容 */}
        {renderConfigFields(activeTab, activeTab === 'model' ? modelConfigs : embeddingConfigs)}
        
        <button 
          onClick={() => handleAddConfig(activeTab)}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
            backgroundColor: darkMode ? '#3d3d3d' : '#f5f5f5',
            color: darkMode ? '#e0e0e0' : '#666',
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '16px',
            width: '100%'
          }}
        >
          添加新配置
        </button>
        
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
              backgroundColor: 'transparent',
              color: darkMode ? '#e0e0e0' : '#666',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#1976d2',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
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