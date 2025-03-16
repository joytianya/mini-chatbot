// 会话相关的工具函数

// 生成随机会话哈希值
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

// 计算字符串的哈希值
export const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

// 获取当前对话轮数
export const getCurrentTurns = (msgs) => {
  return msgs.filter(msg => msg.role === 'user').length;
};

// 确保消息有会话哈希值
export const ensureMessagesHaveSessionHash = (messages, sessionHash) => {
  return messages.map(msg => {
    if (!msg.sessionHash) {
      return { ...msg, sessionHash };
    }
    return msg;
  });
};

// 从localStorage获取会话哈希值或生成新的
export const getOrCreateSessionHash = () => {
  const saved = localStorage.getItem('sessionHash');
  if (saved) {
    return saved;
  }
  // 如果没有，生成一个新的
  const newHash = generateSessionHash();
  localStorage.setItem('sessionHash', newHash);
  return newHash;
}; 