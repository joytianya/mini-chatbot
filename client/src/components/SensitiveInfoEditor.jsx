import React, { useState, useEffect, useRef } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, clearSensitiveInfoMap } from '../utils/SensitiveInfoMasker';
import { toast } from 'react-toastify';
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
  
  // 使用 useRef 标记组件是否已经初始化过
  const hasInitialized = useRef(false);
  
  // 使用 useRef 来存储回调函数，避免不必要的重新渲染
  const callbacks = useRef({ onFocus, onBlur }).current;
  
  // 读取文件内容为文本
  const readFileContent = async (file) => {
    if (!file) {
      return null;
    }
    
    // 如果是字符串，直接返回
    if (typeof file === 'string') {
      return file;
    }
    
    // 如果是包含content属性的对象
    if (file.content) {
      return file.content;
    }
    
    // 如果是File对象
    if (file instanceof File) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(new Error('读取文件失败'));
        reader.readAsText(file);
      });
    }
    
    return null;
  };
  
  // 初始化编辑器内容 - 只在组件挂载时执行一次
  useEffect(() => {
    // 防止重复初始化
    if (hasInitialized.current) return;
    
    const initializeEditor = async () => {
      setIsLoading(true);
      
      try {
        console.log('初始化敏感信息编辑器...', {
          hasOriginalFile: !!originalFile,
          hasProcessedFile: !!processedFile,
          hasSensitiveMap: !!sensitiveMap && Object.keys(sensitiveMap).length > 0,
          originalFileType: originalFile ? typeof originalFile : 'null',
          processedFileType: processedFile ? typeof processedFile : 'null'
        });
        
        // 获取原始文件内容
        if (originalFile) {
          const content = await readFileContent(originalFile);
          console.log('读取原始文件结果:', {
            success: !!content,
            contentLength: content ? content.length : 0,
            contentPreview: content ? content.substring(0, 100) : null
          });
          if (content) {
            setOriginalText(content);
            console.log('原始文件内容已设置');
          } else {
            console.warn('无法获取原始文件内容');
            setOriginalText('无法获取原始文件内容');
          }
        } else {
          console.log('未提供原始文件');
          setOriginalText('未提供原始文件');
        }
        
        // 获取处理后文件内容
        if (processedFile) {
          const content = await readFileContent(processedFile);
          console.log('读取掩码文件结果:', {
            success: !!content,
            contentLength: content ? content.length : 0,
            contentPreview: content ? content.substring(0, 100) : null
          });
          if (content) {
            setMaskedText(content);
            console.log('掩码文件内容已设置');
          } else {
            console.warn('无法获取掩码文件内容');
            setMaskedText('无法获取掩码文件内容');
          }
        } else {
          // 如果没有掩码后文件但有原始文本，生成掩码
          if (originalText) {
            console.log('生成掩码文本...');
            const masked = maskSensitiveInfo(originalText);
            setMaskedText(masked);
            console.log('掩码文本已生成，长度:', masked.length);
            // 更新敏感信息映射
            const newMap = getSensitiveInfoMap();
            console.log('更新敏感信息映射:', {
              mapSize: Object.keys(newMap).length,
              sampleKeys: Object.keys(newMap).slice(0, 3)
            });
            setCurrentSensitiveMap({...sensitiveMap, ...newMap});
          } else {
            console.log('无原始文本，无法生成掩码');
            setMaskedText('未提供掩码文件');
          }
        }
        
        // 设置敏感信息映射
        if (sensitiveMap && Object.keys(sensitiveMap).length > 0) {
          setCurrentSensitiveMap(sensitiveMap);
          console.log('使用提供的敏感信息映射:', {
            mapSize: Object.keys(sensitiveMap).length,
            sampleKeys: Object.keys(sensitiveMap).slice(0, 3)
          });
        }
      } catch (err) {
        console.error('初始化编辑器时出错:', err);
        console.error('错误详情:', {
          message: err.message,
          stack: err.stack
        });
        setError('初始化编辑器时出错: ' + err.message);
      } finally {
        setIsLoading(false);
        hasInitialized.current = true;
        console.log('编辑器初始化完成');
        
        // 通知父组件编辑器已获取焦点
        onFocus();
      }
    };
    
    initializeEditor();
    
    // 组件卸载时通知父组件
    return () => {
      onBlur();
    };
  }, []); // 只在组件挂载时执行一次

  // 处理文本区域获取焦点
  const handleTextareaFocus = (e) => {
    e.stopPropagation();
    setIsEditing(true);
    console.log('文本区域获取焦点', {
      isEditing: true,
      originalTextLength: originalText.length,
      maskedTextLength: maskedText.length,
      currentSensitiveMapSize: Object.keys(currentSensitiveMap).length
    });
    callbacks.onFocus();
    e.target.focus();
  };

  // 处理文本区域失去焦点
  const handleTextareaBlur = (e) => {
    e.stopPropagation();
    const activeElement = document.activeElement;
    const editorElement = document.getElementById('sensitive-info-editor');
    
    console.log('文本区域失去焦点', {
      activeElement: activeElement?.id || 'unknown',
      editorContainsFocus: editorElement?.contains(activeElement),
      isEditing
    });
    
    if (editorElement && !editorElement.contains(activeElement)) {
      console.log('焦点移出编辑器');
      setIsEditing(false);
      callbacks.onBlur();
    } else {
      console.log('焦点仍在编辑器内');
    }
  };

  // 处理编辑器区域点击
  const handleEditorMouseDown = (e) => {
    e.stopPropagation();
    console.log('编辑器区域被点击', {
      isEditing,
      target: e.target.id || e.target.className || 'unknown'
    });
    if (!isEditing) {
      setIsEditing(true);
      callbacks.onFocus();
    }
  };

  // 处理编辑器获取焦点
  const handleEditorFocus = (e) => {
    e.stopPropagation();
    if (!isEditing) {
      console.log('编辑器获取焦点');
      setIsEditing(true);
      callbacks.onFocus();
    }
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
      readFileContent(processedFile).then(content => {
        setMaskedText(content);
        setEditedText(content);
      });
    }
  };

  // 保存修改后的掩码文本
  const handleSave = async () => {
    if (!onSave) {
      console.warn('未提供保存回调函数');
      return;
    }
    
    setIsSaving(true);
    console.log('开始保存编辑内容', {
      originalTextLength: originalText.length,
      maskedTextLength: maskedText.length,
      editedTextLength: editedText.length,
      userEditsCount: Object.keys(userEdits).length,
      sensitiveMapSize: Object.keys(currentSensitiveMap).length
    });
    
    try {
      // 准备保存的数据
      const saveData = {
        originalText,
        maskedText: editedText || maskedText,
        sensitiveMap: currentSensitiveMap,
        userEdits
      };
      
      console.log('准备保存的数据:', {
        hasOriginalText: !!saveData.originalText,
        hasMaskedText: !!saveData.maskedText,
        sensitiveMapSize: Object.keys(saveData.sensitiveMap).length,
        userEditsSize: Object.keys(saveData.userEdits).length
      });
      
      // 调用保存回调
      await onSave(saveData);
      console.log('保存成功');
      toast.success('保存成功');
    } catch (err) {
      console.error('保存失败:', err);
      console.error('错误详情:', {
        message: err.message,
        stack: err.stack
      });
      toast.error('保存失败: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // 处理文本更新
  const handleTextUpdate = (text) => {
    console.log('文本更新', {
      textLength: text.length,
      currentMaskedTextLength: maskedText.length,
      isDifferent: text !== maskedText
    });
    
    if (text !== maskedText) {
      setEditedText(text);
      // 更新用户编辑记录
      const edits = {};
      for (let i = 0; i < text.length; i++) {
        if (text[i] !== maskedText[i]) {
          edits[i] = text[i];
        }
      }
      console.log('检测到文本变化', {
        editsCount: Object.keys(edits).length,
        sampleEdits: Object.entries(edits).slice(0, 3)
      });
      setUserEdits(edits);
    } else {
      console.log('文本未发生变化');
      setEditedText('');
      setUserEdits({});
    }
  };

  // 如果有错误，显示错误信息
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '1200px',
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        padding: '20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        color: '#ff4444',
        zIndex: 1000
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
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          关闭
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '90%',
      maxWidth: '1200px',
      height: '80vh',
      backgroundColor: darkMode ? '#1a1a1a' : '#fff',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h2 style={{
          margin: 0,
          color: darkMode ? '#e0e0e0' : '#333'
        }}>
          敏感信息编辑器
        </h2>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: darkMode ? '#e0e0e0' : '#666',
            cursor: 'pointer',
            fontSize: '24px'
          }}
        >
          ×
        </button>
      </div>

      {isLoading ? (
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: darkMode ? '#e0e0e0' : '#333'
        }}>
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <div>正在加载文件内容...</div>
            <div style={{
              width: '50px',
              height: '50px',
              border: '5px solid #f3f3f3',
              borderTop: '5px solid #3498db',
              borderRadius: '50%',
              animation: 'spin 2s linear infinite'
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex',
          gap: '20px',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* 左侧：原始文本 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h3 style={{
              margin: 0,
              color: darkMode ? '#e0e0e0' : '#333'
            }}>
              原始文本
            </h3>
            <pre style={{
              flex: 1,
              margin: 0,
              padding: '12px',
              backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
              borderRadius: '8px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: darkMode ? '#e0e0e0' : '#333',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {originalText || '原始文件内容不可用'}
            </pre>
          </div>

          {/* 右侧：掩码后文本 */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h3 style={{
              margin: 0,
              color: darkMode ? '#e0e0e0' : '#333'
            }}>
              掩码后文本
            </h3>
            <pre style={{
              flex: 1,
              margin: 0,
              padding: '12px',
              backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
              borderRadius: '8px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: darkMode ? '#e0e0e0' : '#333',
              fontFamily: 'monospace',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              {maskedText || '掩码后文件内容不可用'}
            </pre>
          </div>
        </div>
      )}

      {/* 底部按钮区域 */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px',
        marginTop: '20px'
      }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            border: `1px solid ${darkMode ? '#444' : '#e0e0e0'}`,
            borderRadius: '6px',
            backgroundColor: darkMode ? '#2d2d2d' : '#fff',
            color: darkMode ? '#e0e0e0' : '#666',
            cursor: 'pointer'
          }}
        >
          关闭
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            backgroundColor: '#1976d2',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          保存
        </button>
      </div>
    </div>
  );
};

export default SensitiveInfoEditor;


  // 处理文件上传
  const handleFileUpload = async (file) => {
    console.log('开始处理文件上传', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    try {
      const formData = new FormData();
      formData.append('documents', file);
      
      console.log('准备发送文件到服务器');
      const response = await fetch(`${serverURL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('文件上传失败', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(`上传失败: ${errorData.error || response.statusText}`);
      }
      
      const result = await response.json();
      console.log('文件上传成功', {
        result,
        documentId: result.document_id
      });
      
      // 读取上传的文件内容
      const fileContent = await readFileContent(file);
      console.log('读取上传文件内容', {
        success: !!fileContent,
        contentLength: fileContent ? fileContent.length : 0,
        contentPreview: fileContent ? fileContent.substring(0, 100) : null
      });
      
      if (fileContent) {
        setOriginalText(fileContent);
        // 生成掩码文本
        const masked = maskSensitiveInfo(fileContent);
        setMaskedText(masked);
        // 更新敏感信息映射
        const newMap = getSensitiveInfoMap();
        setCurrentSensitiveMap(newMap);
        
        console.log('文件处理完成', {
          originalLength: fileContent.length,
          maskedLength: masked.length,
          sensitiveMapSize: Object.keys(newMap).length
        });
      }
      
      return result;
    } catch (err) {
      console.error('文件上传处理出错:', err);
      console.error('错误详情:', {
        message: err.message,
        stack: err.stack
      });
      throw err;
    }
  };