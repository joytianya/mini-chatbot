import React, { useState, useRef } from 'react'

export default function DocumentUploader({ onUploadSuccess, darkMode }) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  const handleFileSelect = async (e) => {
    const files = e.target.files
    if (files.length > 0) {
      await handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file) => {
    try {
      setUploading(true)
      // 这里添加文件上传逻辑
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('上传失败')
      }

      const data = await response.json()
      onUploadSuccess?.(data)
    } catch (error) {
      console.error('上传文件时出错:', error)
      // 这里可以添加错误提示
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? (darkMode ? '#4a9eff' : '#1976d2') : (darkMode ? '#666' : '#ccc')}`,
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging 
          ? (darkMode ? 'rgba(74, 158, 255, 0.1)' : 'rgba(25, 118, 210, 0.1)')
          : (darkMode ? '#2d2d2d' : '#f5f5f5'),
        transition: 'all 0.3s ease'
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        accept=".txt,.pdf,.doc,.docx"
      />
      <div style={{
        color: darkMode ? '#e0e0e0' : '#333',
        marginBottom: '10px'
      }}>
        <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isDragging ? (darkMode ? '#4a9eff' : '#1976d2') : (darkMode ? '#666' : '#999')}
          strokeWidth="2"
          style={{ margin: '0 auto 10px' }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div style={{
        color: darkMode ? '#e0e0e0' : '#333',
        fontSize: '16px',
        marginBottom: '5px'
      }}>
        {uploading ? '正在上传...' : '点击或拖拽文件到此处上传'}
      </div>
      <div style={{
        color: darkMode ? '#999' : '#666',
        fontSize: '14px'
      }}>
        支持 .txt、.pdf、.doc、.docx 格式
      </div>
    </div>
  )
}

// At the end of the file, add:
// 删除重复的默认导出声明，因为已在组件定义处使用了 export default
