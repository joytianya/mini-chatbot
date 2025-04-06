// 会话管理工具函数

/**
 * 生成随机会话哈希值
 * @returns {string} 生成的会话哈希值
 */
export const generateSessionHash = () => {
  const randomStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const timestamp = new Date().getTime().toString();
  const hashSource = `session_${randomStr}_${timestamp}`;
  
  // 简单的字符串哈希函数
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 转换为16进制字符串
  const hashHex = Math.abs(hash).toString(16);
  console.log('生成的会话哈希值:', hashHex);
  
  return hashHex;
};

/**
 * 为字符串生成哈希值
 * @param {string} str 需要哈希的字符串
 * @returns {number} 生成的哈希值
 */
export const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

/**
 * 获取当前对话轮数
 * @param {Array} msgs 消息数组
 * @returns {number} 用户消息的数量
 */
export const getCurrentTurns = (msgs) => {
  return msgs.filter(msg => msg.role === 'user').length;
};

/**
 * 格式化时间戳
 * @param {number} timestamp 时间戳
 * @returns {string} 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isYesterday = date.toDateString() === new Date(now - 86400000).toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday) {
    return '昨天';
  } else {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  }
};

/**
 * 检查是否有保存的对话历史
 * @returns {Array} 保存的对话列表
 */
export const loadSavedConversations = () => {
  try {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    return [];
  } catch (error) {
    console.error('加载保存的对话失败:', error);
    return [];
  }
};

/**
 * 获取活跃的对话
 * @returns {Object|null} 活跃的对话
 */
export const getActiveConversation = () => {
  try {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.find(conv => conv.active) || null;
      }
    }
    return null;
  } catch (error) {
    console.error('获取活跃对话失败:', error);
    return null;
  }
};

/**
 * 获取所有保存的对话
 * @returns {Array} 所有对话
 */
export const getAllConversations = () => {
  try {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    console.error('获取所有对话失败:', error);
    return [];
  }
};

/**
 * 获取指定会话的消息
 * @param {string} sessionHash 会话哈希值
 * @returns {Array} 会话消息
 */
export const getConversationMessages = (sessionHash) => {
  try {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const conversation = parsed.find(conv => conv.sessionHash === sessionHash);
        if (conversation && Array.isArray(conversation.messages)) {
          return conversation.messages;
        }
      }
    }
    return [];
  } catch (error) {
    console.error('获取会话消息失败:', error);
    return [];
  }
}; 