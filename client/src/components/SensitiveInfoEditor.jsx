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
  // 新增状态：是否显示反映射结果
  const [showUnmasked, setShowUnmasked] = useState(false);
  // 新增状态：反映射后的文本
  const [unmaskedText, setUnmaskedText] = useState('');
  
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
      // 确保不会阻止其他元素获取焦点
      document.body.style.pointerEvents = 'auto';
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
    // 移除阻止点击的样式
    document.body.style.pointerEvents = 'auto';
    
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

  // 处理关闭编辑器
  const handleClose = () => {
    // 确保恢复所有交互状态
    document.body.style.pointerEvents = 'auto';
    // 移除任何可能的样式限制
    document.body.style.cursor = 'auto';
    setIsEditing(false);
    callbacks.onBlur();
    
    // 聚焦到聊天输入框
    const chatInput = document.querySelector('#chat-input');
    if (chatInput) {
      setTimeout(() => {
        chatInput.focus();
        chatInput.style.pointerEvents = 'auto';
        chatInput.style.cursor = 'text';
        console.log('聊天输入框已获得焦点');
      }, 100);
    }
    
    onClose();
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
      
      // 使用 handleClose 来处理保存后的关闭操作
      handleClose();
      
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

  // 新增函数：处理反映射操作
  const handleToggleUnmasked = () => {
    if (showUnmasked) {
      // 如果当前已经显示反映射结果，关闭显示
      setShowUnmasked(false);
      setUnmaskedText('');
    } else {
      // 如果当前没有显示反映射结果，执行反映射并显示
      try {
        if (!maskedText) {
          toast.warning('无掩码文本可供反映射');
          return;
        }
        
        console.log('执行反映射操作，掩码文本长度:', maskedText.length);
        console.log('当前映射表大小:', Object.keys(currentSensitiveMap).length);
        
        // 执行反映射操作，将掩码文本转换回原始文本
        const unmasked = unmaskSensitiveInfo(maskedText, currentSensitiveMap);
        console.log('反映射完成，结果长度:', unmasked.length);
        
        // 检查反映射结果是否与原始文本不同
        if (unmasked === maskedText) {
          console.log('反映射后的文本与掩码文本相同，可能映射表为空或未找到映射关系');
          toast.info('未找到映射关系或映射表为空');
        } else {
          console.log('反映射成功，显示反映射结果');
        }
        
        // 无论如何都设置反映射结果并显示
        setUnmaskedText(unmasked);
        setShowUnmasked(true);
      } catch (err) {
        console.error('反映射操作失败:', err);
        toast.error('反映射失败: ' + err.message);
      }
    }
  };

  // 处理文件上传
  const handleFileUpload = async (file) => {
    console.log('开始处理文件上传', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    try {
      // 获取当前会话哈希值
      const sessionHash = localStorage.getItem('sessionHash');
      if (!sessionHash) {
        console.warn('警告：未找到当前会话哈希值，文件上传可能不会正确关联到当前会话');
      } else {
        console.log('当前会话哈希值:', sessionHash);
      }
      
      const formData = new FormData();
      formData.append('documents', file);
      if (sessionHash) {
        formData.append('sessionHash', sessionHash); // 将会话哈希值传递给服务器
      }
      
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
        documentId: result.document_id,
        sessionHash
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
        // 生成掩码文本，确保使用当前会话哈希值
        const masked = maskSensitiveInfo(fileContent, sessionHash);
        setMaskedText(masked);
        // 更新敏感信息映射
        const newMap = getSensitiveInfoMap(sessionHash);
        setCurrentSensitiveMap(newMap);
        
        console.log('文件处理完成', {
          originalLength: fileContent.length,
          maskedLength: masked.length,
          sensitiveMapSize: Object.keys(newMap).length,
          sessionHash
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
          flexDirection: 'column',
          flex: 1,
          overflow: 'hidden'
        }}>
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
                color: darkMode ? '#e0e0e0' : '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                  <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                  <path d="M2 2l7.586 7.586"></path>
                  <circle cx="11" cy="11" r="2"></circle>
                </svg>
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
                lineHeight: '1.5',
                maxHeight: 'calc(100% - 40px)',
                minHeight: '200px'
              }}>
                {originalText || '原始文件内容不可用'}
              </pre>
            </div>

            {/* 右侧：掩码后文本 */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minHeight: 0
            }}>
              <h3 style={{
                margin: 0,
                color: darkMode ? '#e0e0e0' : '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                掩码后文本
              </h3>
              <div style={{
                position: 'relative',
                flex: 1,
                minHeight: 0
              }}>
                <pre style={{
                  height: '100%',
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
                  lineHeight: '1.5',
                  maxHeight: 'calc(100% - 40px)',
                  minHeight: '200px'
                }}>
                  {showUnmasked ? originalText : maskedText || '掩码后文件内容不可用'}
                </pre>
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: showUnmasked 
                    ? (darkMode ? 'rgba(25, 118, 210, 0.8)' : 'rgba(25, 118, 210, 0.8)')
                    : (darkMode ? 'rgba(76, 175, 80, 0.8)' : 'rgba(76, 175, 80, 0.8)'),
                  color: '#fff',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  {showUnmasked ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      已反映射
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      掩码保护
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* 映射表显示区域 */}
          {showMap && (
            <div style={{
              marginTop: '20px',
              backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
              padding: '15px',
              borderRadius: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              <h3 style={{ 
                margin: '0 0 10px 0',
                color: darkMode ? '#e0e0e0' : '#333'
              }}>
                敏感信息映射表
              </h3>
              
              {Object.keys(currentSensitiveMap).length > 0 ? (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  color: darkMode ? '#e0e0e0' : '#333',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '8px', 
                        borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}`
                      }}>
                        掩码值
                      </th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '8px', 
                        borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}`
                      }}>
                        原始值
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(currentSensitiveMap).map(([masked, original], index) => (
                      <tr key={index}>
                        <td style={{ 
                          padding: '8px', 
                          borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}`
                        }}>
                          {masked}
                        </td>
                        <td style={{ 
                          padding: '8px', 
                          borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}`
                        }}>
                          {original}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ 
                  color: darkMode ? '#e0e0e0' : '#666',
                  fontStyle: 'italic'
                }}>
                  无敏感信息映射
                </p>
              )}
            </div>
          )}
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
          onClick={() => setShowUnmasked(!showUnmasked)}
          style={{
            padding: '8px 16px',
            backgroundColor: showUnmasked ? '#1976d2' : (darkMode ? '#555' : '#f0f0f0'),
            color: showUnmasked ? '#fff' : (darkMode ? '#fff' : '#333'),
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {showUnmasked ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
              显示掩码文本
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              显示原始文本
            </>
          )}
        </button>
        <button
          onClick={() => setShowMap(!showMap)}
          style={{
            padding: '8px 16px',
            backgroundColor: showMap ? '#1976d2' : (darkMode ? '#555' : '#f0f0f0'),
            color: showMap ? '#fff' : (darkMode ? '#fff' : '#333'),
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {showMap ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18"></path>
                <path d="M6 6l12 12"></path>
              </svg>
              隐藏映射表
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              显示映射表
            </>
          )}
        </button>
        <button
          onClick={handleClose}
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