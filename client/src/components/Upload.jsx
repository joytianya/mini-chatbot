import React, { useRef, useState, useEffect } from 'react';
import { serverURL } from '../Config';
import { toast } from 'react-toastify';
import './Upload.css'; // 引入CSS文件

export const Upload = ({ darkMode, onUploadSuccess, sensitiveInfoProtectionEnabled, handleFileUpload, setUploadedFileInfo, handleUploadSuccess, setInput }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadError, setUploadError] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [thumbnails, setThumbnails] = useState({});
  const [activeDocuments, setActiveDocuments] = useState([]);

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
    const processedResults = [];
    for (const file of files) {
      const result = await processFile(file);
      if (result) {
        // 如果文件处理成功，将文件内容添加到结果中
        if (result.processedFile && result.processedFile.content) {
          setInput(result.processedFile.content);
        }
        processedResults.push(result);
      }
    }
    
    // 如果有成功处理的文件，通知父组件
    if (processedResults.length > 0) {
      // 更新活动文档列表
      const newActiveDocuments = [...activeDocuments];
      processedResults.forEach(result => {
        if (result.processedFile && result.processedFile.id) {
          // 检查是否已存在相同ID的文档
          const existingIndex = newActiveDocuments.findIndex(doc => doc.id === result.processedFile.id);
          if (existingIndex === -1) {
            // 如果不存在，添加到列表
            newActiveDocuments.push({
              id: result.processedFile.id,
              name: result.processedFile.name || result.originalFile.name
            });
          }
        }
      });
      
      // 更新活动文档列表
      setActiveDocuments(newActiveDocuments);
      
      // 通知父组件
      if (onUploadSuccess) {
        onUploadSuccess(newActiveDocuments);
      }
      
      // 如果有设置上传文件信息的回调，调用它
      if (setUploadedFileInfo) {
        // 确保只传递第一个文件的信息
        const firstResult = processedResults[0];
        setUploadedFileInfo({
          originalFile: firstResult.originalFile,
          processedFile: firstResult.processedFile,
          sensitiveMap: firstResult.sensitiveMap || {}
        });
      }
      
      // 如果有上传成功的回调，调用它
      if (handleUploadSuccess) {
        handleUploadSuccess(processedResults);
      }
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
      
      // 如果上传成功，返回处理结果
      if (result && result.length > 0) {
        const fileInfo = result[0];
        
        // 确保上传文件状态已更新
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileId ? {
            ...f, 
            status: 'completed',
            id: fileInfo.processedFile ? fileInfo.processedFile.id : fileId
          } : f
        ));
        
        return fileInfo;
      }
      
      return null;
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
      
      return null;
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

    // 对于JSON文件
    if (file.type === 'application/json' || file.name.endsWith('.json')) {
      setThumbnails(prev => ({...prev, [fileId]: 'json'}));
      return;
    }

    // 对于CSV文件
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      setThumbnails(prev => ({...prev, [fileId]: 'csv'}));
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
      
      // 从活动文档列表中移除
      const newActiveDocuments = activeDocuments.filter(doc => doc.id !== fileId);
      setActiveDocuments(newActiveDocuments);
      
      // 通知父组件活动文档列表已更新
      if (onUploadSuccess) {
        onUploadSuccess(newActiveDocuments);
      }
      
      // 如果删除的是最后一个文件，清除上传文件信息
      if (uploadedFiles.length === 1 && setUploadedFileInfo) {
        setUploadedFileInfo(null);
      }
    }
  };

  return (
    <div className="upload-container">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        multiple // 允许多文件选择
        accept=".txt,.pdf,.doc,.docx,.md"
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        className={`upload-button ${darkMode ? 'dark' : ''}`}
        title="上传文档"
      >
        {uploading ? (
          <span className="loading-spinner"></span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        )}
      </button>

      {/* 显示已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className={`uploaded-files-list ${darkMode ? 'dark' : ''}`}>
          {uploadedFiles.map((file) => (
            <div key={file.id} className={`file-item ${file.status}`}>
              <div className="file-thumbnail">
                <div className="thumbnail">
                  {thumbnails[file.id] === 'pdf' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <text x="8" y="18" fontSize="6" fill="currentColor">PDF</text>
                    </svg>
                  ) : thumbnails[file.id] === 'txt' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="8" y1="13" x2="16" y2="13"></line>
                      <line x1="8" y1="17" x2="16" y2="17"></line>
                      <line x1="8" y1="9" x2="16" y2="9"></line>
                    </svg>
                  ) : thumbnails[file.id] === 'doc' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <text x="8" y="18" fontSize="6" fill="currentColor">DOC</text>
                    </svg>
                  ) : thumbnails[file.id] === 'json' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <text x="7" y="18" fontSize="5" fill="currentColor">JSON</text>
                    </svg>
                  ) : thumbnails[file.id] === 'csv' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <text x="8" y="18" fontSize="6" fill="currentColor">CSV</text>
                    </svg>
                  ) : thumbnails[file.id] === 'file' ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                  )}
                </div>
              </div>
              <div className="file-info">
                <div className="file-name" title={file.name}>
                  {file.name.length > 15 ? file.name.substring(0, 12) + '...' : file.name}
                </div>
                <div className="file-status">
                  {file.status === 'uploading' ? '上传中...' : 
                   file.status === 'completed' ? '已上传' : '上传失败'}
                </div>
              </div>
              {file.status === 'uploading' ? (
                <div className="upload-progress">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${uploadProgress[file.id] || 0}%` }}
                  ></div>
                </div>
              ) : (
                <button 
                  className="delete-file-btn"
                  onClick={() => handleDeleteFile(file.id)}
                  title="删除文件"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {uploadError && (
        <div className="upload-error">
          {uploadError}
        </div>
      )}
    </div>
  );
};