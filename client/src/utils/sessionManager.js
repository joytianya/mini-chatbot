// 会话管理和消息保存工具

/**
 * 保存消息到localStorage
 * @param {Object} message 消息对象
 * @param {string} currentSessionHash 当前会话哈希
 * @param {string} originalSessionHash 原始会话哈希
 * @returns {boolean} 是否成功保存
 */
export const saveMessageToLocalStorage = (message, currentSessionHash, originalSessionHash) => {
  try {
    if (!message || typeof message !== 'object') {
      console.error('sessionManager.saveMessageToLocalStorage: 无效的消息对象，无法保存');
      return false;
    }
    
    if (!message.content) {
      console.warn('sessionManager.saveMessageToLocalStorage: 消息内容为空，无法保存');
      return false;
    }

    // 确保消息有必要的属性
    if (!message.id) {
      message.id = `message-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    }
    if (!message.timestamp) {
      message.timestamp = Date.now();
    }
    
    // 使用提供的会话哈希或消息自身的会话哈希
    const messageSessionHash = message.sessionHash || currentSessionHash;
    
    console.log('sessionManager.saveMessageToLocalStorage: 开始保存消息', {
      id: message.id,
      role: message.role,
      content: message.content.substring(0, 30) + '...',
      messageSessionHash,
      currentSessionHash,
      originalSessionHash
    });

    // 获取最新的localStorage数据
    const latestConversationsStr = localStorage.getItem('conversations');
    if (!latestConversationsStr) {
      console.error('sessionManager.saveMessageToLocalStorage: localStorage中没有会话数据');
      return false;
    }
    
    let conversations;
    try {
      conversations = JSON.parse(latestConversationsStr);
    } catch (error) {
      console.error('sessionManager.saveMessageToLocalStorage: 解析localStorage数据失败', error);
      return false;
    }
    
    // 处理会话切换情况
    if (originalSessionHash && originalSessionHash !== currentSessionHash) {
      // 尝试保存到原始会话
      const originalConvIndex = conversations.findIndex(c => c.sessionHash === originalSessionHash);
      if (originalConvIndex !== -1) {
        console.log('sessionManager.saveMessageToLocalStorage: 尝试将消息保存到原会话', originalSessionHash);
        const originalConv = conversations[originalConvIndex];
        
        // 检查消息是否已存在
        const duplicateMsgInOriginal = originalConv.messages?.find(msg => 
          msg.id === message.id || (msg.role === message.role && msg.content === message.content)
        );
        
        if (!duplicateMsgInOriginal) {
          // 克隆消息并设置正确的会话哈希
          const messageToSave = {
            ...message,
            sessionHash: originalSessionHash
          };
          
          // 添加消息到原会话
          if (!originalConv.messages) {
            originalConv.messages = [];
          }
          originalConv.messages.push(messageToSave);
          originalConv.lastUpdated = Date.now();
          
          // 更新会话列表并保存
          conversations[originalConvIndex] = originalConv;
          localStorage.setItem('conversations', JSON.stringify(conversations));
          
          console.log('sessionManager.saveMessageToLocalStorage: 成功保存消息到原会话', {
            会话标题: originalConv.title,
            消息数量: originalConv.messages.length
          });
          return true;
        } else {
          console.log('sessionManager.saveMessageToLocalStorage: 消息已存在于原会话中，不再保存');
          return true;
        }
      }
    }
    
    // 尝试保存到当前会话
    const currentConvIndex = conversations.findIndex(c => c.sessionHash === currentSessionHash);
    if (currentConvIndex !== -1) {
      const currentConv = conversations[currentConvIndex];
      
      // 检查消息是否已存在
      const duplicateMsgInCurrent = currentConv.messages?.find(msg => 
        msg.id === message.id || (msg.role === message.role && msg.content === message.content)
      );
      
      if (!duplicateMsgInCurrent) {
        // 克隆消息并设置正确的会话哈希
        const messageToSave = {
          ...message,
          sessionHash: currentSessionHash
        };
        
        // 添加消息到当前会话
        if (!currentConv.messages) {
          currentConv.messages = [];
        }
        currentConv.messages.push(messageToSave);
        currentConv.lastUpdated = Date.now();
        
        // 更新会话列表并保存
        conversations[currentConvIndex] = currentConv;
        localStorage.setItem('conversations', JSON.stringify(conversations));
        
        console.log('sessionManager.saveMessageToLocalStorage: 成功保存消息到当前会话', {
          会话标题: currentConv.title,
          消息数量: currentConv.messages.length
        });
        return true;
      } else {
        console.log('sessionManager.saveMessageToLocalStorage: 消息已存在于当前会话中，不再保存');
        return true;
      }
    }
    
    // 如果没有找到会话，尝试使用消息会话哈希或查找最佳匹配
    if (messageSessionHash && messageSessionHash !== currentSessionHash) {
      const alternativeIndex = conversations.findIndex(c => c.sessionHash === messageSessionHash);
      if (alternativeIndex !== -1) {
        const alternativeConv = conversations[alternativeIndex];
        
        // 检查消息是否已存在
        const duplicateMsg = alternativeConv.messages?.find(msg => 
          msg.id === message.id || (msg.role === message.role && msg.content === message.content)
        );
        
        if (!duplicateMsg) {
          // 添加消息到替代会话
          if (!alternativeConv.messages) {
            alternativeConv.messages = [];
          }
          alternativeConv.messages.push({...message, sessionHash: messageSessionHash});
          alternativeConv.lastUpdated = Date.now();
          
          // 更新会话列表并保存
          conversations[alternativeIndex] = alternativeConv;
          localStorage.setItem('conversations', JSON.stringify(conversations));
          
          console.log('sessionManager.saveMessageToLocalStorage: 成功保存消息到替代会话', {
            会话标题: alternativeConv.title,
            消息数量: alternativeConv.messages.length
          });
          return true;
        } else {
          console.log('sessionManager.saveMessageToLocalStorage: 消息已存在于替代会话中，不再保存');
          return true;
        }
      }
    }
    
    console.error('sessionManager.saveMessageToLocalStorage: 无法找到合适的会话保存消息');
    return false;
  } catch (error) {
    console.error('sessionManager.saveMessageToLocalStorage: 保存消息时发生错误', error);
    return false;
  }
};

/**
 * 处理AI回复完成
 * @param {Object} message AI回复消息
 * @param {string} originalSessionHash 原始会话哈希
 * @returns {boolean} 是否成功处理
 */
export const handleReplyComplete = (message, originalSessionHash) => {
  return saveMessageToLocalStorage(message, message.sessionHash, originalSessionHash);
};

/**
 * 创建新会话
 * @param {string} sessionHash 会话哈希
 * @param {Array} conversations 当前会话列表
 * @returns {Object} 包含新会话和更新后的会话列表
 */
export const createNewConversation = (sessionHash, conversations = []) => {
  const newConversation = {
    id: Date.now().toString(),
    title: '新对话',
    active: true,
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    timestamp: Date.now(),
    sessionHash,
    activeDocuments: []
  };

  const updatedConversations = conversations.map(conv => ({
    ...conv,
    active: false
  }));
  
  updatedConversations.unshift(newConversation);
  localStorage.setItem('conversations', JSON.stringify(updatedConversations));
  
  return {
    newConversation,
    updatedConversations
  };
};

/**
 * 获取当前活跃会话
 * @returns {Object|null} 当前活跃会话或null
 */
export const getActiveConversation = () => {
  try {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.find(conv => conv.active) || null;
    }
    return null;
  } catch (error) {
    console.error('sessionManager.getActiveConversation: 获取活跃会话失败', error);
    return null;
  }
}; 