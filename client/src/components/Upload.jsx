import React, { useRef, useState, useEffect } from 'react';
import { serverURL } from '../Config';
import { toast } from 'react-toastify';
import './Upload.css'; // 引入CSS文件

export const Upload = ({ darkMode, onUploadSuccess, sensitiveInfoProtectionEnabled, handleFileUpload, setUploadedFileInfo, handleUploadSuccess }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [thumbnails, setThumbnails] = useState({});

  // 当组件挂载时，检查是否有已上传的文件信息
  useEffect(() => {
    // 如果有上传的文件信息但没有设置uploadedFiles，可以在这里初始化
  }, []);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 处理多个文件上传
    for (const file of files) {
      await processFile(file);
    }
    
    e.target.value = ''; // 清空文件选择
  };

  // 处理单个文件上传
  const processFile = async (file) => {
    // 创建文件唯一ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 添加到上传文件列表
    const newFile = {
      name: file.name,
      type: file.type,
      size: file.size,
      id: fileId,
      status: 'uploading' // 状态：uploading, completed, error
    };
    
    setUploadedFiles(prev => [...prev, newFile]);
    setUploadProgress(prev => ({...prev, [fileId]: 0}));
    setUploadError(null);
    setUploading(true);
    
    // 生成文件缩略图
    generateThumbnail(file, fileId);
    
    try {
      // 从localStorage获取embedding配置
      const savedEmbeddingConfigs = localStorage.getItem('embeddingConfigs');
      const embeddingConfigs = savedEmbeddingConfigs ? JSON.parse(savedEmbeddingConfigs) : [];
      const embeddingConfig = embeddingConfigs[0]; // 使用第一个配置

      // 使用 handleFileUpload 函数处理文件上传
      const result = await handleFileUpload(
        [file], 
        embeddingConfig, 
        (doc) => {
          // 更新上传文件状态，包含服务器返回的ID
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileId ? {...f, id: doc.id, status: 'completed'} : f
          ));
          
          // 只有当这是第一个上传的文件时，才调用onUploadSuccess
          if (uploadedFiles.length === 0) {
            onUploadSuccess?.(doc);
          }
        }, 
        (status) => {
          if (status === 'uploading') {
            setUploadProgress(prev => ({...prev, [fileId]: 50})); // 简化进度显示
          } else if (status === 'error') {
            setUploadedFiles(prev => prev.map(f => 
              f.id === fileId ? {...f, status: 'error'} : f
            ));
            setUploadError('上传失败');
          }
        },
        sensitiveInfoProtectionEnabled
      );
      
      console.log('上传结果:', result);
      
      if (!result) {
        throw new Error('上传失败');
      }
      
      // 如果上传成功且启用了敏感信息保护，保存上传的文件信息
      if (result && result.length > 0) {
        const fileInfo = result[0];
        
        // 设置上传的文件信息 - 只有当这是第一个上传的文件时
        if (setUploadedFileInfo && uploadedFiles.length <= 1) {
          setUploadedFileInfo(fileInfo);
        }
        
        // 调用上传成功回调 - 只有当这是第一个上传的文件时
        if (handleUploadSuccess && uploadedFiles.length <= 1) {
          console.log('调用handleUploadSuccess，传递文件信息:', fileInfo);
          handleUploadSuccess(fileInfo);
        }
        
        // 如果没有启用敏感信息保护，直接设置活动文档 - 只有当这是第一个上传的文件时
        if (!sensitiveInfoProtectionEnabled && onUploadSuccess && uploadedFiles.length <= 1) {
          const doc = {
            id: result[0].processedFile ? result[0].processedFile.id : '',
            name: result[0].processedFile ? result[0].processedFile.name : file.name
          };
          onUploadSuccess(doc);
        }
        
        // 确保上传文件状态已更新
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? {
            ...f, 
            status: 'completed',
            id: fileInfo.processedFile ? fileInfo.processedFile.id : fileId
          } : f
        ));
      }
      
      console.log('上传成功', onUploadSuccess);
    } catch (error) {
      console.error('文件上传错误:', error);
      setUploadError(error.message);
      
      // 如果上传失败，更新文件状态
      setUploadedFiles(prev => prev.map(f => 
        f.id === fileId ? {...f, status: 'error'} : f
      ));
      
      // 移除缩略图
      setThumbnails(prev => {
        const newThumbnails = {...prev};
        delete newThumbnails[fileId];
        return newThumbnails;
      });
    } finally {
      setUploadProgress(prev => {
        const newProgress = {...prev};
        delete newProgress[fileId];
        return newProgress;
      });
      
      // 检查是否所有文件都已处理完毕
      setTimeout(() => {
        setUploadedFiles(prev => {
          const anyUploading = prev.some(f => f.status === 'uploading');
          if (!anyUploading) {
            setUploading(false);
          }
          return prev;
        });
      }, 500);
    }
  };

  // 生成文件缩略图
  const generateThumbnail = (file, fileId) => {
    if (!file) return;

    // 对于图片文件，直接生成缩略图
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setThumbnails(prev => ({...prev, [fileId]: e.target.result}));
      };
      reader.readAsDataURL(file);
      return;
    }

    // 对于PDF文件，使用默认图标
    if (file.type === 'application/pdf') {
      setThumbnails(prev => ({...prev, [fileId]: 'pdf'}));
      return;
    }

    // 对于文本文件，使用默认图标
    if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      setThumbnails(prev => ({...prev, [fileId]: 'txt'}));
      return;
    }

    // 对于Word文档
    if (file.type === 'application/msword' || 
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      setThumbnails(prev => ({...prev, [fileId]: 'doc'}));
      return;
    }

    // 默认图标
    setThumbnails(prev => ({...prev, [fileId]: 'file'}));
  };

  // 处理文件删除
  const handleDeleteFile = (fileId) => {
    // 确认删除
    if (window.confirm('确定要删除此文件吗？')) {
      // 获取要删除的文件
      const fileToDelete = uploadedFiles.find(f => f.id === fileId);
      
      // 更新文件列表
      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
      
      // 移除缩略图
      setThumbnails(prev => {
        const newThumbnails = {...prev};
        delete newThumbnails[fileId];
        return newThumbnails;
      });
      
      // 如果删除的是最后一个文件，通知父组件
      if (uploadedFiles.length === 1) {
        onUploadSuccess?.(null);  // 清除 activeDocument 状态
        
        // 如果有设置上传文件信息的函数，也清除它
        if (setUploadedFileInfo) {
          setUploadedFileInfo(null);
        }
      } 
      // 如果删除的不是最后一个文件，但是删除的是当前活动文档，则设置第一个文件为活动文档
      else if (uploadedFiles.length > 1) {
        // 这里需要根据实际情况判断当前活动文档是哪个
        // 假设我们可以通过某种方式获取当前活动文档的ID
        const currentActiveDocId = fileToDelete.id; // 这里需要根据实际情况修改
        
        if (fileId === currentActiveDocId) {
          // 找到第一个不是正在删除的文件
          const nextActiveFile = uploadedFiles.find(f => f.id !== fileId && f.status === 'completed');
          
          if (nextActiveFile) {
            // 设置新的活动文档
            const doc = {
              id: nextActiveFile.id,
              name: nextActiveFile.name
            };
            onUploadSuccess?.(doc);
            
            // 如果有设置上传文件信息的函数，也更新它
            if (setUploadedFileInfo) {
              // 这里需要根据实际情况构造fileInfo对象
              const fileInfo = {
                processedFile: {
                  id: nextActiveFile.id,
                  name: nextActiveFile.name
                }
              };
              setUploadedFileInfo(fileInfo);
            }
          }
        }
      }
      
      toast.success('文件已删除');
    }
  };

  // 其他辅助函数保持不变
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();
    switch (ext) {
      case 'pdf':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <text x="8" y="18" fontSize="6" fill="currentColor">PDF</text>
          </svg>
        );
      case 'txt':
      case 'md':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <text x="8" y="18" fontSize="6" fill="currentColor">TXT</text>
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <text x="8" y="18" fontSize="6" fill="currentColor">DOC</text>
          </svg>
        );
      default:
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        );
    }
  };

  const truncateFileName = (fileName, maxLength = 20) => {
    if (fileName.length <= maxLength) return fileName;
    const ext = fileName.split('.').pop();
    const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.slice(0, maxLength - ext.length - 3) + '...';
    return `${truncatedName}.${ext}`;
  };

  return (
    <div className="upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
        onChange={handleFileChange}
        multiple // 允许多文件选择
        style={{ display: 'none' }}
      />
      
      {/* 文件列表 */}
      <div className="files-list" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        gap: '8px',
        maxHeight: '300px',
        overflowY: uploadedFiles.length > 3 ? 'auto' : 'visible',
        padding: uploadedFiles.length > 3 ? '4px' : '0',
        marginBottom: uploadedFiles.length > 0 ? '12px' : '0'
      }}>
        {uploadedFiles.map((file) => (
          <div 
            key={file.id}
            className={`file-card fade-in ${file.status}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
              borderRadius: '8px',
              fontSize: '14px',
              color: darkMode ? '#aaa' : '#666',
              maxWidth: '300px',
              position: 'relative',
              border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {/* 文件缩略图或图标 */}
            <div style={{ 
              color: darkMode ? '#aaa' : '#666', 
              flexShrink: 0,
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              borderRadius: '4px',
              backgroundColor: darkMode ? '#222' : '#e0e0e0'
            }}>
              {file.status === 'uploading' ? (
                <div style={{ position: 'relative' }}>
                  <svg className="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 1 10 10"/>
                  </svg>
                </div>
              ) : thumbnails[file.id] && typeof thumbnails[file.id] === 'string' && thumbnails[file.id].startsWith('data:image/') ? (
                <img 
                  src={thumbnails[file.id]} 
                  alt={file.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                getFileIcon(file.name)
              )}
            </div>
            
            {/* 文件信息 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              minWidth: 0,
              flex: 1
            }}>
              <div style={{ 
                fontWeight: 500,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: darkMode ? '#e0e0e0' : '#333'
              }} title={file.name}>
                {truncateFileName(file.name)}
              </div>
              <div style={{ 
                fontSize: '12px',
                color: file.status === 'error' ? (darkMode ? '#ff6b6b' : '#d32f2f') : (darkMode ? '#888' : '#777')
              }}>
                {file.status === 'uploading' ? '上传中...' : 
                 file.status === 'error' ? '上传失败' : 
                 `${(file.size / 1024).toFixed(1)} KB`}
                {uploadProgress[file.id] > 0 && file.status === 'uploading' && ` (${uploadProgress[file.id]}%)`}
              </div>
              
              {/* 上传进度条 */}
              {file.status === 'uploading' && uploadProgress[file.id] > 0 && (
                <div className="upload-progress">
                  <div 
                    className="upload-progress-bar" 
                    style={{ width: `${uploadProgress[file.id]}%` }}
                  ></div>
                </div>
              )}
            </div>
            
            {/* 删除按钮 */}
            {file.status !== 'uploading' && (
              <button
                className="delete-button"
                onClick={() => handleDeleteFile(file.id)}
                style={{
                  border: 'none',
                  background: darkMode ? '#444' : '#e0e0e0',
                  padding: '6px',
                  marginLeft: '8px',
                  cursor: 'pointer',
                  color: darkMode ? '#fff' : '#666',
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.target.style.backgroundColor = darkMode ? '#d32f2f' : '#f44336';
                  e.target.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.target.style.backgroundColor = darkMode ? '#444' : '#e0e0e0';
                  e.target.style.color = darkMode ? '#fff' : '#666';
                }}
                title="删除文件"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* 上传按钮 */}
      <button
        onClick={handleClick}
        style={{
          border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
          background: darkMode ? '#2d2d2d' : '#f5f5f5',
          padding: '8px 12px',
          cursor: 'pointer',
          color: darkMode ? '#aaa' : '#666',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          transition: 'all 0.2s ease',
          marginTop: uploadedFiles.length > 0 ? '8px' : '0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={e => {
          e.target.style.backgroundColor = darkMode ? '#333' : '#eee';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 3px 8px rgba(0,0,0,0.15)';
        }}
        onMouseLeave={e => {
          e.target.style.backgroundColor = darkMode ? '#2d2d2d' : '#f5f5f5';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
        }}
        title={uploadedFiles.length > 0 ? "继续上传文档" : "上传文档"}
        disabled={uploading}
        className="upload-button fade-in"
      >
        {uploading ? (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a10 10 0 0 1 10 10"/>
            </svg>
            <span>上传中...</span>
          </div>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '8px'}}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <span>{uploadedFiles.length > 0 ? '继续上传' : '上传文档'}</span>
          </>
        )}
      </button>
      
      {uploadError && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: darkMode ? '#d32f2f' : '#ffebee',
          color: darkMode ? '#fff' : '#d32f2f',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          marginBottom: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          zIndex: 100,
          whiteSpace: 'nowrap'
        }}>
          {uploadError}
        </div>
      )}
    </div>
  );
};