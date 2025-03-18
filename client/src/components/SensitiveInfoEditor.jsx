import React, { useState, useEffect, useRef, useCallback } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, clearSensitiveInfoMap } from '../utils/SensitiveInfoMasker';
import { serverURL } from '../Config';

const SensitiveInfoEditor = ({ 
  originalFile = null, 
  processedFile = null, 
  sensitiveMap = {}, 
  darkMode = false, 
  onSave = null, 
  onClose = () => {},
  onFocus = () => {},
  onBlur = () => {}
}) => {
  const [originalText, setOriginalText] = useState('');
  const [maskedText, setMaskedText] = useState('');
  const [currentSensitiveMap, setCurrentSensitiveMap] = useState(sensitiveMap);
  const [showMap, setShowMap] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userEdits, setUserEdits] = useState({});
  const [editedText, setEditedText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState(null);
  
  // 使用 useRef 来存储回调函数，避免不必要的重新渲染
  const callbacks = useRef({ onFocus, onBlur }).current;
  
  // 使用 useRef 来跟踪组件是否已经加载过文件
  const hasLoadedRef = useRef(false);
  
  // 文件加载逻辑
  useEffect(() => {
    // 如果已经加载过，且没有新的文件，则跳过
    if (hasLoadedRef.current && !originalFile && !processedFile) {
      return;
    }
    
    const loadFileContents = async () => {
      setIsLoading(true);
      setError(null);
      
      console.log('开始加载文件内容...', {
        hasOriginalFile: !!originalFile,
        originalFileName: originalFile?.name,
        hasProcessedFile: !!processedFile,
        processedFileName: processedFile?.name,
        hasSensitiveMap: !!sensitiveMap,
        sensitiveMapSize: sensitiveMap ? Object.keys(sensitiveMap).length : 0,
        originalFileType: originalFile ? typeof originalFile : 'undefined'
      });
      
      try {
        // 处理直接从上传回调传递的文件信息
        if (!originalFile && !processedFile && sensitiveMap) {
          console.log('检测到只有敏感信息映射，尝试从localStorage加载文件内容');
          
          // 显示敏感信息映射
          setCurrentSensitiveMap(sensitiveMap);
          
          // 如果没有文件但有敏感信息映射，可以显示映射内容
          setOriginalText('原始文件内容不可用');
          setMaskedText('掩码后文件内容不可用');
          setEditedText('掩码后文件内容不可用');
          return;
        }
        
        // 如果没有提供任何文件，显示空编辑器
        if (!originalFile && !processedFile) {
          console.log('没有提供任何文件，显示空编辑器');
          setOriginalText('');
          setMaskedText('');
          setEditedText('');
          setCurrentSensitiveMap({});
          return;
        }
        
        // 处理文件信息
        let fileInfo = null;
        
        // 检查原始文件的格式
        if (Array.isArray(originalFile)) {
          console.log('originalFile 是数组格式');
          if (originalFile.length > 0) {
            fileInfo = { 
              originalFile: originalFile[0],
              processedFile,
              sensitiveMap
            };
          }
        } else if (originalFile && originalFile instanceof File) {
          console.log('originalFile 是 File 对象');
          fileInfo = { 
            originalFile,
            processedFile,
            sensitiveMap
          };
        } else if (originalFile && typeof originalFile === 'object') {
          console.log('originalFile 是对象格式');
          if (originalFile.originalFile) {
            fileInfo = originalFile;
          } else {
            fileInfo = { originalFile, processedFile, sensitiveMap };
          }
        }

        console.log('解析后的文件信息:', {
          hasFileInfo: !!fileInfo,
          originalFile: fileInfo?.originalFile?.name,
          processedFile: fileInfo?.processedFile?.name,
          sensitiveMapSize: fileInfo?.sensitiveMap ? Object.keys(fileInfo.sensitiveMap).length : 0
        });

        // 验证文件信息
        if (!fileInfo) {
          setError('无法解析文件信息，请检查文件格式');
          return;
        }

        // 如果没有原始文件，但有处理后的文件和敏感信息映射
        if ((!fileInfo.originalFile || !(fileInfo.originalFile instanceof File)) && 
            fileInfo.processedFile && fileInfo.sensitiveMap) {
          console.log('没有原始文件，但有处理后文件和敏感信息映射');
          
          // 读取处理后的文件内容
          let maskedContent = '';
          if (fileInfo.processedFile instanceof File) {
            maskedContent = await readFileAsText(fileInfo.processedFile);
          } else if (typeof fileInfo.processedFile === 'string') {
            maskedContent = fileInfo.processedFile;
          }
          
          setMaskedText(maskedContent);
          setEditedText(maskedContent);
          
          // 尝试使用敏感信息映射还原原始内容
          try {
            const originalContent = unmaskSensitiveInfo(maskedContent, fileInfo.sensitiveMap);
            setOriginalText(originalContent);
          } catch (error) {
            console.error('还原原始内容时出错:', error);
            setOriginalText('无法还原原始内容');
          }
          
          // 设置敏感信息映射
          setCurrentSensitiveMap(fileInfo.sensitiveMap);
          return;
        }

        if (!fileInfo.originalFile || !(fileInfo.originalFile instanceof File)) {
          setError('原始文件格式无效或未提供');
          return;
        }

        // 读取原始文件内容
        const originalContent = await readFileAsText(fileInfo.originalFile);
        console.log('原始文件内容已加载:', {
          fileName: fileInfo.originalFile.name,
          length: originalContent.length,
          preview: originalContent.substring(0, 100)
        });
        setOriginalText(originalContent);

        // 读取或生成掩码后的文件内容
        let maskedContent;
        if (fileInfo.processedFile && fileInfo.processedFile instanceof File) {
          maskedContent = await readFileAsText(fileInfo.processedFile);
          console.log('使用现有的掩码文件');
        } else {
          console.log('生成新的掩码内容');
          clearSensitiveInfoMap();
          maskedContent = maskSensitiveInfo(originalContent);
          const newMap = getSensitiveInfoMap();
          console.log('生成的敏感信息映射:', {
            mapSize: Object.keys(newMap).length
          });
          setCurrentSensitiveMap(newMap);
        }

        setMaskedText(maskedContent);
        setEditedText(maskedContent);

        // 设置敏感信息映射
        if (fileInfo.sensitiveMap && Object.keys(fileInfo.sensitiveMap).length > 0) {
          console.log('使用提供的敏感信息映射');
          setCurrentSensitiveMap(fileInfo.sensitiveMap);
        }

      } catch (error) {
        console.error('加载文件内容时出错:', {
          error: error.message,
          stack: error.stack,
          originalFile: originalFile ? {
            type: typeof originalFile,
            isArray: Array.isArray(originalFile),
            isFile: originalFile instanceof File,
            name: originalFile?.name
          } : 'undefined'
        });
        setError(error.message);
      } finally {
        setIsLoading(false);
        hasLoadedRef.current = true;
      }
    };
    
    loadFileContents();
  }, [originalFile, processedFile, sensitiveMap]); // 添加 sensitiveMap 作为依赖项

  // 分离焦点管理逻辑到单独的 useEffect
  useEffect(() => {
    if (!hasLoadedRef.current) {
      console.log('编辑器已挂载，调用 onFocus');
      setIsEditing(true);
      callbacks.onFocus();
      
      return () => {
        console.log('编辑器即将卸载，调用 onBlur');
        setIsEditing(false);
        callbacks.onBlur();
      };
    }
  }, []); // 空依赖数组，只在挂载和卸载时执行

  // 处理文本区域获取焦点
  const handleTextareaFocus = useCallback((e) => {
    e.stopPropagation();
    setIsEditing(true);
    callbacks.onFocus();
    e.target.focus();
  }, []);

  // 处理文本区域失去焦点
  const handleTextareaBlur = useCallback((e) => {
    e.stopPropagation();
    const activeElement = document.activeElement;
    const editorElement = document.getElementById('sensitive-info-editor');
    
    if (editorElement && !editorElement.contains(activeElement)) {
      console.log('文本区域失去焦点，焦点移出编辑器');
      setIsEditing(false);
      callbacks.onBlur();
    } else {
      console.log('文本区域失去焦点，但焦点仍在编辑器内');
    }
  }, []);

  // 处理编辑器区域点击
  const handleEditorMouseDown = useCallback((e) => {
    e.stopPropagation();
    if (!isEditing) {
      console.log('编辑器区域被点击，设置编辑状态');
      setIsEditing(true);
      callbacks.onFocus();
    }
  }, [isEditing]);

  // 处理编辑器获取焦点
  const handleEditorFocus = useCallback((e) => {
    e.stopPropagation();
    if (!isEditing) {
      console.log('编辑器获取焦点');
      setIsEditing(true);
      callbacks.onFocus();
    }
  }, [isEditing]);

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
    if (!maskedText) {
      console.error('错误：没有要保存的掩码文本');
      return;
    }
    
    setIsSaving(true);
    console.log('开始保存掩码文本...');
    
    try {
      // 创建新的文件名，添加时间戳
      const timestamp = new Date().getTime();
      const fileNameParts = processedFile.name.split('.');
      const extension = fileNameParts.pop();
      const baseName = fileNameParts.join('.');
      const newFileName = `${baseName}_${timestamp}.${extension}`;
      
      console.log('准备保存文件:', {
        originalName: processedFile.name,
        newFileName: newFileName,
        contentLength: maskedText.length
      });
      
      // 创建新的文件对象
      const blob = new Blob([maskedText], { type: processedFile.type });
      const newFile = new File([blob], newFileName, { type: processedFile.type });
      
      // 创建FormData对象
      const formData = new FormData();
      formData.append('documents', newFile);
      formData.append('sensitive_info_protected', 'true');
      
      // 从localStorage获取embedding配置
      const savedEmbeddingConfigs = localStorage.getItem('embeddingConfigs');
      const embeddingConfigs = savedEmbeddingConfigs ? JSON.parse(savedEmbeddingConfigs) : [];
      const embeddingConfig = embeddingConfigs[0];
      
      if (embeddingConfig) {
        console.log('添加embedding配置:', {
          base_url: embeddingConfig.embedding_base_url ? '已设置' : '未设置',
          api_key: embeddingConfig.embedding_api_key ? '已设置' : '未设置',
          model_name: embeddingConfig.embedding_model_name
        });
        
        formData.append('embedding_base_url', embeddingConfig.embedding_base_url || '');
        formData.append('embedding_api_key', embeddingConfig.embedding_api_key || '');
        formData.append('embedding_model_name', embeddingConfig.embedding_model_name || '');
      } else {
        console.warn('警告：未找到embedding配置');
      }
      
      // 发送请求
      console.log('发送上传请求...');
      const response = await fetch(`${serverURL}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });
      
      const result = await response.json();
      
      if (result.document_id) {
        console.log('文件上传成功:', {
          document_id: result.document_id,
          fileName: newFileName
        });
        
        // 保存敏感信息映射到localStorage
        if (Object.keys(currentSensitiveMap).length > 0) {
          const mapKey = `sensitiveMap_${newFileName}`;
          localStorage.setItem(mapKey, JSON.stringify(currentSensitiveMap));
          console.log('已保存敏感信息映射:', {
            key: mapKey,
            mapSize: Object.keys(currentSensitiveMap).length
          });
          
          // 更新全局敏感信息映射表
          console.log('更新全局敏感信息映射表...');
          if (typeof window.currentSensitiveInfoMap === 'undefined') {
            window.currentSensitiveInfoMap = {};
          }
          
          const oldSize = Object.keys(window.currentSensitiveInfoMap).length;
          window.currentSensitiveInfoMap = {
            ...window.currentSensitiveInfoMap,
            ...currentSensitiveMap
          };
          const newSize = Object.keys(window.currentSensitiveInfoMap).length;
          
          console.log('全局映射表更新完成:', {
            oldSize,
            newSize,
            added: newSize - oldSize
          });
          
          // 保存到localStorage
          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        }
        
        // 调用回调函数，返回文档信息
        if (onSave) {
          // 创建与 ChatArea 组件期望的格式一致的文档信息
          const documentInfo = {
            id: result.document_id,
            name: newFileName,
            sensitiveMap: currentSensitiveMap,
            type: processedFile.type,
            size: maskedText.length,
            // 添加原始文件和处理后文件信息，以便后续编辑
            originalFile: originalFile,
            processedFile: newFile,
            fileHash: result.document_id // 使用文档ID作为文件哈希
          };
          
          console.log('调用保存回调，返回文档信息:', documentInfo);
          onSave(documentInfo);
        }
        
        alert(`文件已成功保存！\n\n文档ID: ${result.document_id}\n文件名: ${newFileName}`);
      } else {
        throw new Error(result.error || '保存失败，未返回文档ID');
      }
    } catch (error) {
      console.error('保存文件时出错:', error);
      alert(`保存失败: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        borderRadius: '8px',
        marginBottom: '20px',
        color: '#ff4444'
      }}>
        <h3>加载错误</h3>
        <p>{error}</p>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
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
    );
  }

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
      onMouseDown={handleEditorMouseDown}
      // 添加点击事件处理
      onClick={(e) => {
        // 阻止事件冒泡
        e.stopPropagation();
      }}
      // 添加焦点事件处理
      onFocus={handleEditorFocus}
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