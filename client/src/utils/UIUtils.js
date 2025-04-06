// UI相关的工具函数

/**
 * 格式化时间戳
 * @param {number} timestamp - 时间戳
 * @returns {string} 格式化后的时间
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  // 对于今天的日期，只显示时间
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // 对于其他日期，显示日期
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

// 更新状态函数
export const createUpdateState = (setReasoningText, setCurrentResponse, scrollToBottom) => 
  (newReasoningText, newResponseText, isReasoning) => {
    requestAnimationFrame(() => {
      if (isReasoning) {
        setReasoningText(newReasoningText);
      } else {
        setCurrentResponse(newResponseText);
      }
      scrollToBottom();
    });
  };

// 复制文本到剪贴板
export const copyToClipboard = async (text) => {
  if (!text) return false;
  
  try {
    // 首先尝试使用 clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // 备用方案：使用传统的 execCommand
    const textArea = document.createElement('textarea');
    textArea.value = text;
    
    // 防止滚动
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.opacity = '0';
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return success;
  } catch (err) {
    console.error('复制失败:', err);
    return false;
  }
};

// 显示复制成功提示
export const showCopyToast = (message = '已复制到剪贴板') => {
  const toast = document.createElement('div');
  toast.textContent = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '8px 16px';
  toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  toast.style.color = 'white';
  toast.style.borderRadius = '4px';
  toast.style.zIndex = '1000';
  document.body.appendChild(toast);
  
  // 2秒后移除提示
  setTimeout(() => {
    document.body.removeChild(toast);
  }, 2000);
};

/**
 * 切换深色模式
 * @param {Function} setDarkMode - 设置深色模式的函数
 */
export const toggleDarkMode = (setDarkMode) => {
  setDarkMode(prev => {
    const newValue = !prev;
    localStorage.setItem('darkMode', JSON.stringify(newValue));
    document.body.classList.toggle('dark-mode', newValue);
    return newValue;
  });
};

/**
 * 滚动到底部
 * @param {React.RefObject} containerRef - 容器的ref
 * @param {boolean} [smooth=true] - 是否平滑滚动
 */
export const scrollToBottom = (containerRef, smooth = true) => {
  if (!containerRef || !containerRef.current) return;
  
  const scrollOptions = smooth ? { behavior: 'smooth' } : {};
  
  containerRef.current.scrollTo({
    top: containerRef.current.scrollHeight,
    ...scrollOptions
  });
}; 