import { useState, useEffect } from 'react';

/**
 * UI状态管理的Hook
 * @returns {Object} UI状态相关的状态和函数
 */
function useUIState() {
  // 深色模式状态
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('darkMode');
      // Check if saved exists and is a valid string before parsing
      return saved && typeof saved === 'string' ? JSON.parse(saved) : false;
    } catch (error) {
      console.error('Error loading darkMode from localStorage:', error);
      return false;
    }
  });
  
  // 侧边栏展开状态
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  
  // 提示状态
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  
  // 预览消息状态
  const [previewMessage, setPreviewMessage] = useState(null);
  
  // 设置弹窗显示状态
  const [showSettings, setShowSettings] = useState(false);
  
  // 模型设置显示状态
  const [showModelSettings, setShowModelSettings] = useState(false);
  
  // 嵌入模型设置显示状态
  const [showEmbeddingSettings, setShowEmbeddingSettings] = useState(false);
  
  // 文件上传弹窗显示状态
  const [showFileUpload, setShowFileUpload] = useState(false);
  
  // 深色模式变化时更新body类名
  useEffect(() => {
    try {
      localStorage.setItem('darkMode', JSON.stringify(darkMode));
      document.body.classList.toggle('dark-mode', darkMode);
    } catch (error) {
      console.error('Error saving darkMode to localStorage:', error);
    }
  }, [darkMode]);
  
  // 切换深色模式
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };
  
  // 切换侧边栏展开状态
  const toggleSidebar = () => {
    setIsSidebarExpanded(prev => !prev);
  };
  
  // 显示复制成功提示
  const showCopySuccessMessage = () => {
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  };
  
  // 显示设置弹窗
  const openSettings = () => {
    setShowSettings(true);
  };
  
  // 关闭设置弹窗
  const closeSettings = () => {
    setShowSettings(false);
  };
  
  // 显示模型设置弹窗
  const openModelSettings = () => {
    setShowModelSettings(true);
  };
  
  // 关闭模型设置弹窗
  const closeModelSettings = () => {
    setShowModelSettings(false);
  };
  
  // 显示嵌入模型设置弹窗
  const openEmbeddingSettings = () => {
    setShowEmbeddingSettings(true);
  };
  
  // 关闭嵌入模型设置弹窗
  const closeEmbeddingSettings = () => {
    setShowEmbeddingSettings(false);
  };
  
  // 显示文件上传弹窗
  const openFileUpload = () => {
    setShowFileUpload(true);
  };
  
  // 关闭文件上传弹窗
  const closeFileUpload = () => {
    setShowFileUpload(false);
  };
  
  return {
    // 状态
    darkMode,
    isSidebarExpanded,
    showCopySuccess,
    previewMessage,
    showSettings,
    showModelSettings,
    showEmbeddingSettings,
    showFileUpload,
    
    // 设置函数
    setDarkMode,
    setIsSidebarExpanded,
    setShowCopySuccess,
    setPreviewMessage,
    setShowSettings,
    setShowModelSettings,
    setShowEmbeddingSettings,
    setShowFileUpload,
    
    // 功能函数
    toggleDarkMode,
    toggleSidebar,
    showCopySuccessMessage,
    openSettings,
    closeSettings,
    openModelSettings,
    closeModelSettings,
    openEmbeddingSettings,
    closeEmbeddingSettings,
    openFileUpload,
    closeFileUpload
  };
}

export default useUIState; 