import React, { useState, useEffect } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, clearSensitiveInfoMap } from '../utils/SensitiveInfoMasker';
import { serverURL } from '../Config';

const SensitiveInfoEditor = ({ 
  originalFile, 
  processedFile, 
  sensitiveMap, 
  darkMode, 
  onSave, 
  onClose,
  onFocus,
  onBlur
}) => {
  const [originalText, setOriginalText] = useState('');
  const [maskedText, setMaskedText] = useState('');
  const [currentSensitiveMap, setCurrentSensitiveMap] = useState({});
  const [showMap, setShowMap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userEdits, setUserEdits] = useState({});
  const [editedText, setEditedText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 加载文件内容
  useEffect(() => {
    const loadFileContents = async () => {
      setIsLoading(true);
      console.log('开始加载文件内容...');
      console.log('原始文件:', originalFile);
      console.log('处理后文件:', processedFile);
      console.log('敏感信息映射:', sensitiveMap);
      
      try {
        if (originalFile) {
          console.log('读取原始文件内容...');
          const originalContent = await readFileAsText(originalFile);
          console.log('原始文件内容长度:', originalContent.length);
          console.log('原始文件内容示例:', originalContent.substring(0, 100));
          setOriginalText(originalContent);
        } else {
          console.warn('没有提供原始文件');
        }
        
        if (processedFile) {
          console.log('读取处理后文件内容...');
          const maskedContent = await readFileAsText(processedFile);
          console.log('处理后文件内容长度:', maskedContent.length);
          console.log('处理后文件内容示例:', maskedContent.substring(0, 100));
          setMaskedText(maskedContent);
          setEditedText(maskedContent);
        } else {
          console.warn('没有提供处理后文件');
        }
        
        if (sensitiveMap) {
          console.log('设置敏感信息映射...');
          console.log('敏感信息映射条目数:', Object.keys(sensitiveMap).length);
          setCurrentSensitiveMap(sensitiveMap);
        } else {
          console.warn('没有提供敏感信息映射');
        }
      } catch (error) {
        console.error('加载文件内容时出错:', error);
        alert(`加载文件内容时出错: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFileContents();
    
    // 在组件挂载时调用 onFocus 回调，告知父组件当前正在编辑敏感信息
    if (onFocus) {
      console.log('SensitiveInfoEditor 组件挂载，调用 onFocus');
      setIsEditing(true);
      onFocus();
    }
    
    // 在组件卸载时调用 onBlur 回调
    return () => {
      if (onBlur) {
        console.log('SensitiveInfoEditor 组件卸载，调用 onBlur');
        setIsEditing(false);
        onBlur();
      }
    };
  }, [originalFile, processedFile, sensitiveMap, onFocus, onBlur]);

  // 读取文件内容为文本
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        console.log(`文件 ${file.name} 读取成功，内容长度: ${event.target.result.length}`);
        resolve(event.target.result);
      };
      reader.onerror = (error) => {
        console.error(`文件 ${file.name} 读取失败:`, error);
        reject(error);
      };
      console.log(`开始读取文件 ${file.name}...`);
      reader.readAsText(file);
    });
  };

  // 重新掩码处理
  const handleRemask = () => {
    clearSensitiveInfoMap();
    const masked = maskSensitiveInfo(originalText);
    setMaskedText(masked);
    setEditedText(masked);
    setCurrentSensitiveMap(getSensitiveInfoMap());
  };

  // 恢复原始掩码文本
  const handleRestore = () => {
    if (processedFile) {
      readFileAsText(processedFile).then(content => {
        setMaskedText(content);
        setEditedText(content);
      });
    }
  };

  // 保存修改后的掩码文本
  const handleSave = async () => {
    if (!maskedText) return;
    
    setIsSaving(true);
    
    try {
      // 创建新的文件名，添加时间戳
      const timestamp = new Date().getTime();
      const fileNameParts = processedFile.name.split('.');
      const extension = fileNameParts.pop();
      const baseName = fileNameParts.join('.');
      const newFileName = `${baseName}_${timestamp}.${extension}`;
      
      // 创建新的文件对象
      const blob = new Blob([maskedText], { type: processedFile.type });
      const newFile = new File([blob], newFileName, { type: processedFile.type });
      
      // 创建FormData对象
      const formData = new FormData();
      formData.append('documents', newFile);
      
      // 添加敏感信息保护标志
      formData.append('sensitive_info_protected', 'true');
      
      // 从localStorage获取embedding配置
      const savedEmbeddingConfigs = localStorage.getItem('embeddingConfigs');
      const embeddingConfigs = savedEmbeddingConfigs ? JSON.parse(savedEmbeddingConfigs) : [];
      const embeddingConfig = embeddingConfigs[0]; // 使用第一个配置
      
      // 添加embedding配置
      if (embeddingConfig) {
        formData.append('embedding_base_url', embeddingConfig.embedding_base_url || '');
        formData.append('embedding_api_key', embeddingConfig.embedding_api_key || '');
        formData.append('embedding_model_name', embeddingConfig.embedding_model_name || '');
      }
      
      // 发送请求
      const response = await fetch(`${serverURL}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });
      
      const result = await response.json();
      
      if (result.document_id) {
        // 保存敏感信息映射到localStorage
        if (Object.keys(currentSensitiveMap).length > 0) {
          const mapKey = `sensitiveMap_${newFileName}`;
          localStorage.setItem(mapKey, JSON.stringify(currentSensitiveMap));
          
          // 更新全局敏感信息映射表
          console.log('保存修改后更新全局敏感信息映射表');
          console.log('原全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap || {}).length);
          
          // 确保全局映射表存在
          if (typeof window.currentSensitiveInfoMap === 'undefined') {
            window.currentSensitiveInfoMap = {};
          }
          
          // 将当前敏感信息映射合并到全局映射表中
          window.currentSensitiveInfoMap = {
            ...window.currentSensitiveInfoMap,
            ...currentSensitiveMap
          };
          
          console.log('更新后全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
          console.log('全局映射表详细内容:');
          Object.entries(window.currentSensitiveInfoMap).forEach(([key, value], index) => {
            console.log(`  ${index+1}. ${key} => ${value}`);
          });
          
          // 将全局映射表保存到localStorage，确保多轮对话中保持一致
          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        }
        
        // 调用回调函数
        if (onSave) {
          onSave({
            id: result.document_id,
            name: newFileName,
            sensitiveMap: currentSensitiveMap // 确保传递敏感信息映射
          });
        }
        
        alert(`文件已保存并重新建立索引！\n\n文档ID: ${result.document_id}`);
      } else {
        throw new Error(result.error || '保存失败');
      }
    } catch (error) {
      console.error('保存文件时出错:', error);
      alert(`保存出错: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理文本区域获取焦点
  const handleTextareaFocus = (e) => {
    // 阻止事件冒泡，防止触发其他焦点事件
    e.stopPropagation();
    
    // 设置编辑状态
    setIsEditing(true);
    
    // 调用 onFocus 回调
    if (onFocus) {
      console.log('文本区域获取焦点，调用 onFocus');
      onFocus();
    }
    
    // 防止其他元素抢夺焦点
    e.target.focus();
  };

  // 处理文本区域失去焦点
  const handleTextareaBlur = (e) => {
    // 阻止事件冒泡
    e.stopPropagation();
    
    // 检查是否点击了编辑器内的其他元素
    const activeElement = document.activeElement;
    const editorElement = document.getElementById('sensitive-info-editor');
    
    // 只有当焦点移出编辑器时才触发onBlur
    if (editorElement && !editorElement.contains(activeElement)) {
      console.log('文本区域失去焦点，焦点移出编辑器');
      setIsEditing(false);
      if (onBlur) {
        onBlur();
      }
    } else {
      console.log('文本区域失去焦点，但焦点仍在编辑器内');
    }
  };

  return (
    <div 
      id="sensitive-info-editor"
      style={{
        padding: '20px',
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        borderRadius: '8px',
        marginBottom: '20px'
      }}
      // 使用mousedown事件，阻止事件冒泡
      onMouseDown={(e) => {
        // 阻止事件冒泡，防止触发其他元素的事件
        e.stopPropagation();
        
        // 设置编辑状态
        if (!isEditing) {
          console.log('编辑器区域被点击，设置编辑状态');
          setIsEditing(true);
          if (onFocus) onFocus();
        }
      }}
      // 添加点击事件处理
      onClick={(e) => {
        // 阻止事件冒泡
        e.stopPropagation();
      }}
      // 添加焦点事件处理
      onFocus={(e) => {
        // 阻止事件冒泡
        e.stopPropagation();
        if (!isEditing) {
          console.log('编辑器获取焦点');
          setIsEditing(true);
          if (onFocus) onFocus();
        }
      }}
    >
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '15px'
      }}>
        <h2 style={{ 
          color: darkMode ? '#fff' : '#333',
          margin: 0
        }}>敏感信息编辑</h2>
        
        <button
          onClick={(e) => {
            // 阻止事件冒泡
            e.stopPropagation();
            setIsEditing(false);
            if (onBlur) onBlur();
            onClose();
          }}
          style={{
            padding: '5px 10px',
            backgroundColor: darkMode ? '#444' : '#f0f0f0',
            color: darkMode ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          关闭
        </button>
      </div>
      
      {isLoading ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: darkMode ? '#fff' : '#333'
        }}>
          正在加载文件内容...
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <h3 style={{ color: darkMode ? '#fff' : '#333' }}>原始文本</h3>
              <textarea
                value={originalText}
                onChange={(e) => setOriginalText(e.target.value)}
                style={{
                  width: '100%',
                  height: '300px',
                  padding: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                  backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
                  color: darkMode ? '#fff' : '#333',
                  resize: 'none',
                  fontFamily: 'monospace'
                }}
                readOnly
                onFocus={handleTextareaFocus}
                onBlur={handleTextareaBlur}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            
            <div style={{ flex: 1 }}>
              <h3 style={{ color: darkMode ? '#fff' : '#333' }}>掩码后文本</h3>
              <textarea
                value={maskedText}
                onChange={(e) => setMaskedText(e.target.value)}
                style={{
                  width: '100%',
                  height: '300px',
                  padding: '10px',
                  borderRadius: '4px',
                  border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                  backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
                  color: darkMode ? '#fff' : '#333',
                  resize: 'none',
                  fontFamily: 'monospace'
                }}
                onFocus={handleTextareaFocus}
                onBlur={handleTextareaBlur}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <button
              onClick={(e) => {
                // 阻止事件冒泡
                e.stopPropagation();
                handleRemask();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1976d2',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              重新掩码
            </button>
            
            <button
              onClick={(e) => {
                // 阻止事件冒泡
                e.stopPropagation();
                handleRestore();
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: darkMode ? '#444' : '#f0f0f0',
                color: darkMode ? '#fff' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              恢复原始掩码
            </button>
            
            <button
              onClick={(e) => {
                // 阻止事件冒泡
                e.stopPropagation();
                setShowMap(!showMap);
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: darkMode ? '#444' : '#f0f0f0',
                color: darkMode ? '#fff' : '#333',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {showMap ? '隐藏敏感信息映射' : '显示敏感信息映射'}
            </button>
            
            <button
              onClick={(e) => {
                // 阻止事件冒泡
                e.stopPropagation();
                handleSave();
              }}
              disabled={isSaving}
              style={{
                padding: '8px 16px',
                backgroundColor: isSaving ? '#999' : '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isSaving ? 'not-allowed' : 'pointer',
                marginLeft: 'auto'
              }}
            >
              {isSaving ? '保存中...' : '保存修改'}
            </button>
          </div>
          
          {showMap && (
            <div style={{
              marginTop: '20px',
              padding: '15px',
              backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
              borderRadius: '4px',
              border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
            }}>
              <h3 style={{ color: darkMode ? '#fff' : '#333', marginTop: 0 }}>敏感信息映射</h3>
              <div style={{
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '14px',
                color: darkMode ? '#fff' : '#333'
              }}>
                {Object.keys(currentSensitiveMap).length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={{ 
                          textAlign: 'left', 
                          padding: '8px', 
                          borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}` 
                        }}>掩码ID</th>
                        <th style={{ 
                          textAlign: 'left', 
                          padding: '8px', 
                          borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}` 
                        }}>原始值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(currentSensitiveMap).map(([key, value], index) => (
                        <tr key={index}>
                          <td style={{ 
                            padding: '8px', 
                            borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}` 
                          }}>{key}</td>
                          <td style={{ 
                            padding: '8px', 
                            borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}` 
                          }}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p>没有检测到敏感信息</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SensitiveInfoEditor; 