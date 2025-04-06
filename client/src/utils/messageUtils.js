// 消息处理工具函数

/**
 * 更新消息历史
 * @param {Array} currentMessages 当前消息数组
 * @param {Object} newMessage 新消息
 * @param {string} sessionHash 会话哈希值
 * @param {Array} conversations 会话数组
 * @returns {Object} 包含更新后的消息和会话
 */
export const updateMessageHistory = (currentMessages, newMessage, sessionHash, conversations) => {
  // 确保新消息包含会话哈希值
  if (!newMessage.sessionHash) {
    newMessage.sessionHash = sessionHash;
    console.log('为新消息添加会话哈希值:', newMessage.sessionHash);
  }
  
  const newDisplayMessages = [...currentMessages, newMessage];
  
  // 更新对话历史，保持当前对话的所有属性
  const updatedConversations = conversations.map(conv => {
    if (conv.active) {
      // 获取第一条用户消息作为标题（如果还没有标题）
      const firstUserMessage = conv.messages.find(msg => msg.role === 'user');
      const title = conv.title === '新对话' && firstUserMessage 
        ? firstUserMessage.content.slice(0, 30) 
        : conv.title;
      
      return {
        ...conv,
        title,
        messages: newDisplayMessages,
        timestamp: Date.now(),
        sessionHash: sessionHash  // 确保对话也包含会话哈希值
      };
    }
    return conv;
  });

  // 保存到localStorage
  localStorage.setItem('conversations', JSON.stringify(updatedConversations));
  
  return {
    updatedMessages: newDisplayMessages,
    updatedConversations
  };
};

/**
 * 检查消息是否是重复的
 * @param {Array} messages 消息数组
 * @param {Object} newMessage 新消息
 * @returns {boolean} 是否重复
 */
export const isDuplicateMessage = (messages, newMessage) => {
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return false;
  }
  
  return messages.some(msg => 
    msg.role === newMessage.role && 
    msg.content === newMessage.content && 
    msg.id !== newMessage.id
  );
};

/**
 * 查找消息应该保存的会话
 * @param {Array} conversations 会话数组
 * @param {Object} message 消息
 * @param {string} currentSessionHash 当前会话哈希
 * @returns {Object|null} 找到的会话或null
 */
export const findConversationForMessage = (conversations, message, currentSessionHash) => {
  // 1. 首先尝试通过当前会话哈希找到对话
  let targetConversation = conversations.find(c => c.sessionHash === currentSessionHash);
  
  // 2. 如果没找到，尝试通过消息自己的会话哈希找
  if (!targetConversation && message.sessionHash) {
    targetConversation = conversations.find(c => c.sessionHash === message.sessionHash);
  }
  
  // 3. 如果还是没找到，尝试查找包含相似用户消息的会话
  if (!targetConversation && message.role === 'assistant') {
    // 获取所有会话中的用户消息
    const conversationsWithUserMessages = conversations.map(conv => ({
      conversation: conv,
      userMessages: conv.messages.filter(m => m.role === 'user').map(m => m.content)
    }));
    
    // 在所有的用户消息中查找与当前消息上下文匹配的会话
    for (const { conversation, userMessages } of conversationsWithUserMessages) {
      if (userMessages.length > 0) {
        targetConversation = conversation;
        break;
      }
    }
  }
  
  return targetConversation;
};

/**
 * 保存消息到指定会话
 * @param {Object} conversation 会话
 * @param {Object} message 消息
 * @param {Array} conversations 所有会话
 * @returns {Object} 包含更新后的会话数组
 */
export const saveMessageToConversation = (conversation, message, conversations) => {
  if (!conversation || !message) {
    console.error('保存消息失败: 会话或消息对象为空');
    return { updatedConversations: conversations };
  }
  
  // 检查消息是否已经存在于会话中
  const isDuplicate = isDuplicateMessage(conversation.messages, message);
  
  if (isDuplicate) {
    console.log('跳过添加重复消息:', message.content?.substring(0, 50));
    return { updatedConversations: conversations };
  }
  
  // 添加消息到会话
  const updatedMessages = [...conversation.messages, message];
  
  // 更新会话数组
  const updatedConversations = conversations.map(c => {
    if (c.id === conversation.id) {
      return {
        ...c,
        messages: updatedMessages,
        timestamp: Date.now()
      };
    }
    return c;
  });
  
  // 保存到localStorage
  localStorage.setItem('conversations', JSON.stringify(updatedConversations));
  
  return {
    updatedConversations,
    updatedMessages
  };
};

/**
 * 创建一个新的消息对象
 * @param {string} role 角色 ('user', 'assistant', 'system')
 * @param {string} content 消息内容
 * @param {string} sessionHash 会话哈希
 * @returns {Object} 新创建的消息对象
 */
export const createMessage = (role, content, sessionHash) => {
  return {
    id: Date.now().toString(),
    role,
    content,
    timestamp: Date.now(),
    sessionHash
  };
};

/**
 * 处理导出对话
 * @param {Array} messages 消息数组
 * @param {string} title 对话标题
 */
export const exportConversation = (messages, title) => {
  const processedMessages = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      const time = new Date(msg.timestamp || Date.now()).toLocaleString('zh-CN');
      const role = msg.role === 'user' ? '用户' : 'AI';
      
      // 处理可能包含掩码的消息内容
      let content = msg.content;
      
      // 如果是用户消息且有原始内容，使用原始内容
      if (msg.role === 'user' && msg.originalContent) {
        content = msg.originalContent;
      }
      // 如果是AI消息且有敏感信息映射，进行反映射
      else if (msg.role === 'assistant') {
        // 如果已经有反映射后的内容，直接使用
        if (msg.originalContent) {
          content = msg.originalContent;
        }
      }
      
      return `${time} ${role}:\n${content}\n`;
    })
    .join('\n');

  const blob = new Blob([processedMessages], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `聊天记录_${title || '对话'}_${new Date().toLocaleDateString()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}; 