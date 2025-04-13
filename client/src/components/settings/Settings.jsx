import React, { useState, useEffect } from 'react';
import styles from './Settings.module.css'; // 导入 CSS Modules

const Settings = ({ isOpen, onClose, onSave, modelConfigs, availableModels }) => {
  const [configs, setConfigs] = useState([]);

  // 移除内联样式对象
  /*
  const styles = {
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: isOpen ? 'flex' : 'none',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    },
    content: {
      width: '80%',
      maxWidth: '800px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
      overflow: 'hidden',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      padding: '16px',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    body: {
      padding: '20px',
      overflowY: 'auto',
      flex: 1,
    },
    footer: {
      padding: '16px',
      borderTop: '1px solid #e0e0e0',
      display: 'flex',
      justifyContent: 'flex-end',
    },
    button: {
      padding: '8px 16px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      marginLeft: '10px',
    },
    saveButton: {
      backgroundColor: '#1976d2',
      color: 'white',
    },
    cancelButton: {
      backgroundColor: '#f5f5f5',
      color: '#333',
    },
    formGroup: {
      marginBottom: '20px',
    },
    section: {
      marginBottom: '30px',
    },
    configItem: {
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      padding: '15px',
      marginBottom: '15px',
      position: 'relative',
    },
    input: {
      width: '100%',
      padding: '8px',
      marginTop: '5px',
      borderRadius: '4px',
      border: '1px solid #ddd',
    },
    label: {
      display: 'block',
      marginBottom: '10px',
    },
    addButton: {
      backgroundColor: '#4caf50',
      color: 'white',
      padding: '8px 16px',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginTop: '10px',
    },
    deleteButton: {
      position: 'absolute',
      top: '10px',
      right: '10px',
      backgroundColor: '#f44336',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '5px 10px',
      cursor: 'pointer',
    }
  };
  */

  useEffect(() => {
    if (isOpen) {
      setConfigs(modelConfigs || []);
    }
  }, [isOpen, modelConfigs]);

  const handleAddConfig = () => {
    setConfigs([
      ...configs,
      {
        model_name: '',
        base_url: '',
        api_key: '',
      }
    ]);
  };

  const handleDeleteConfig = (index) => {
    const newConfigs = [...configs];
    newConfigs.splice(index, 1);
    setConfigs(newConfigs);
  };

  const handleConfigChange = (index, field, value) => {
    const newConfigs = [...configs];
    newConfigs[index][field] = value;
    setConfigs(newConfigs);
  };

  const handleSave = () => {
    // 提取模型名称
    const modelNames = configs.map(config => config.model_name).filter(Boolean);
    
    onSave({
      configs,
      modelNames
    });
    
    onClose();
  };

  // 使用 style 控制 modal 的显示/隐藏
  const modalStyle = isOpen ? { display: 'flex' } : { display: 'none' };

  return (
    <div className={styles.modal} style={modalStyle}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h2>模型设置</h2>
          <button
            className={styles.closeButton} // 使用 closeButton 类
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        {/* Use CSS Module classes instead of inline styles */}
        <div className={styles.body}> 
          <div className={styles.section}> 
            <h3>模型配置</h3>

            {configs.map((config, index) => (
              <div key={index} className={styles.configItem}> {/* 应用 configItem 类 */}
                <div className={styles.formGroup}> {/* 应用 formGroup 类 */}
                  <label className={styles.label}> {/* 应用 label 类 */}
                    模型名称:
                    <input
                      className={styles.input} // 应用 input 类
                      type="text"
                      value={config.model_name || ''}
                      onChange={(e) => handleConfigChange(index, 'model_name', e.target.value)}
                      placeholder="例如: gpt-3.5-turbo"
                    />
                  </label>
                </div>

                <div className={styles.formGroup}> {/* 应用 formGroup 类 */}
                  <label className={styles.label}> {/* 应用 label 类 */}
                    基础URL:
                    <input
                      className={styles.input} // 应用 input 类
                      type="text"
                      value={config.base_url || ''}
                      onChange={(e) => handleConfigChange(index, 'base_url', e.target.value)}
                      placeholder="例如: https://api.openai.com/v1"
                    />
                  </label>
                </div>

                <div className={styles.formGroup}> {/* 应用 formGroup 类 */}
                  <label className={styles.label}> {/* 应用 label 类 */}
                    API密钥:
                    <input
                      className={styles.input} // 应用 input 类
                      type="password"
                      value={config.api_key || ''}
                      onChange={(e) => handleConfigChange(index, 'api_key', e.target.value)}
                      placeholder="输入您的API密钥"
                    />
                  </label>
                </div>

                <button
                  className={styles.deleteButton} // 应用 deleteButton 类
                  onClick={() => handleDeleteConfig(index)}
                >
                  删除
                </button>
              </div>
            ))}

            <button className={styles.addButton} onClick={handleAddConfig}> {/* 应用 addButton 类 */}
              添加模型配置
            </button>
          </div>
        </div>

        <div className={styles.footer}> {/* 应用 footer 类 */}
          <button
            className={`${styles.button} ${styles.saveButton}`} // 应用 button 和 saveButton 类
            onClick={handleSave}
          >
            保存
          </button>
          <button
            className={`${styles.button} ${styles.cancelButton}`} // 应用 button 和 cancelButton 类
            onClick={onClose}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 
