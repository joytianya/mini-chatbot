import React, { useRef, useState } from 'react';
import { serverURL } from '../Config';

export const Upload = ({ darkMode, onUploadSuccess }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const file = files[0]; // 只处理第一个文件
      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);
      
      const formData = new FormData();
      formData.append('documents', file);

      try {
        console.log('开始上传文件:', files);
        const response = await fetch(`${serverURL}/upload`, {
          method: 'POST',
          body: formData,
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
            console.log(`上传进度: ${progress}%`);
          }
        });
        
        const result = await response.json();
        console.log('上传结果:', result);
        
        if (response.ok) {
          setUploadedFile({
            name: file.name,
            type: file.type,
            size: file.size,
            id: result.document_id
          });
          onUploadSuccess?.({
            id: result.document_id,
            name: file.name,
            type: file.type,
            size: file.size
          });
        } else {
          throw new Error(result.error || '上传失败');
        }
        console.log('上传成功', onUploadSuccess);
      } catch (error) {
        console.error('文件上传错误:', error);
        setUploadError(error.message);
      } finally {
        setUploading(false);
        setUploadProgress(0);
        e.target.value = ''; // 清空文件选择
      }
    }
  };

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
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <text x="8" y="18" fontSize="6" fill="currentColor">TXT</text>
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
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.pdf,.doc,.docx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {uploadedFile ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: darkMode ? '#2d2d2d' : '#f5f5f5',
          borderRadius: '8px',
          fontSize: '14px',
          color: darkMode ? '#aaa' : '#666',
          maxWidth: '300px'
        }}>
          <div style={{ color: darkMode ? '#aaa' : '#666', flexShrink: 0 }}>
            {getFileIcon(uploadedFile.name)}
          </div>
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
              whiteSpace: 'nowrap'
            }} title={uploadedFile.name}>
              {truncateFileName(uploadedFile.name)}
            </div>
            <div style={{ fontSize: '12px' }}>
              {(uploadedFile.size / 1024).toFixed(1)} KB
            </div>
          </div>
          <button
            onClick={() => {
              setUploadedFile(null);
              onUploadSuccess?.(null);  // 清除 activeDocument 状态
            }}
            style={{
              border: 'none',
              background: 'none',
              padding: '4px',
              marginLeft: '8px',
              cursor: 'pointer',
              color: darkMode ? '#aaa' : '#666',
              borderRadius: '50%',
              flexShrink: 0
            }}
            onMouseEnter={e => e.target.style.backgroundColor = darkMode ? '#444' : '#ddd'}
            onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={handleClick}
          style={{
            border: 'none',
            background: 'none',
            padding: '8px',
            cursor: 'pointer',
            color: darkMode ? '#aaa' : '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={e => e.target.style.backgroundColor = darkMode ? '#333' : '#eee'}
          onMouseLeave={e => e.target.style.backgroundColor = 'transparent'}
          title="上传文档"
          disabled={uploading}
        >
          {uploading ? (
            <div style={{ position: 'relative' }}>
              <svg className="spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2a10 10 0 0 1 10 10"/>
              </svg>
              {uploadProgress > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}>
                  {uploadProgress}%
                </div>
              )}
            </div>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          )}
        </button>
      )}
      {uploadError && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: darkMode ? '#333' : '#fff',
          color: '#ff4d4f',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          {uploadError}
        </div>
      )}
    </>
  );
}; 