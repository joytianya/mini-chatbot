import { useState, useCallback } from 'react';
import { generateSessionHash } from '../utils/sessionUtils';
import { ensureGlobalMapExists } from '../utils/SensitiveInfoMasker';

/**
 * 会话管理Hook
 * @param {Object} options 选项
 * @param {Function} options.setDisplayMessages 设置显示消息的函数
 * @param {Function} options.setRequestMessages 设置请求消息的函数
 * @param {Function} options.setSessionHash 设置会话哈希的函数
 * @param {Function} options.setActiveDocuments 设置活动文档的函数
 * @param {Function} options.setStreaming 设置流式状态的函数
 * @param {Function} options.setCurrentResponse 设置当前响应的函数
 * @param {Function} options.setReasoningText 设置推理文本的函数
 * @param {Function} options.setUserHasScrolled 设置用户滚动状态的函数
 * @returns {Object} 会话管理相关的状态和函数
 */
function useConversations({
  setDisplayMessages,
  setRequestMessages,
  setSessionHash,
  setActiveDocuments,
  setStreaming,
  setCurrentResponse,
  setReasoningText,
  setUserHasScrolled
}) {
  // 会话列表状态
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('conversations');
    if (saved) {
      // 确保每个会话都有activeDocuments字段
      const parsedConversations = JSON.parse(saved);
      return parsedConversations.map(conv => ({
        ...conv,
        activeDocuments: conv.activeDocuments || []
      }));
    }
    return [];
  });
  
  // 侧边栏展开状态
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // 新建会话
  const handleNewChat = useCallback(() => {
    // 生成新的会话哈希值
    const newSessionHash = generateSessionHash();
    
    // 创建新的会话
    const newConversation = {
      id: Date.now().toString(),
      title: '新对话',
      active: true,
      messages: [{ role: "system", content: "You are a helpful assistant." }],
      timestamp: Date.now(),
      sessionHash: newSessionHash, // 添加新的会话哈希值
      activeDocuments: [] // 添加空的活动文档列表
    };

    const updatedConversations = conversations.map(conv => ({
      ...conv,
      active: false
    }));
    
    updatedConversations.unshift(newConversation);
    
    // 更新会话列表
    setConversations(updatedConversations);
    setDisplayMessages(newConversation.messages);
    setRequestMessages(newConversation.messages);
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    
    // 更新当前会话哈希值
    setSessionHash(newSessionHash);
    localStorage.setItem('sessionHash', newSessionHash);
    
    // 确保全局映射表存在
    ensureGlobalMapExists();
    
    // 为新会话创建空的映射表
    if (window.currentSensitiveInfoMap && !window.currentSensitiveInfoMap[newSessionHash]) {
      window.currentSensitiveInfoMap[newSessionHash] = {};
      console.log('为新会话创建空的映射表，会话哈希值:', newSessionHash);
      
      // 保存到localStorage
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
      } catch (error) {
        console.error('保存全局映射表到localStorage时出错:', error);
      }
    }
  }, [conversations, setConversations, setDisplayMessages, setRequestMessages, setSessionHash]);

  // 点击会话
  const handleConversationClick = useCallback((conv) => {
    // 在切换会话前保存当前会话
    const saved = localStorage.getItem('conversations');
    if (saved) {
      const parsed = JSON.parse(saved);
      const activeConv = parsed.find(c => c.active);
      if (activeConv) {
        // 获取当前显示的消息
        const currentDisplayed = JSON.parse(localStorage.getItem('displayMessages') || '[]');
        
        const updated = parsed.map(c => {
          if (c.active) {
            return {
              ...c,
              messages: currentDisplayed.length > 0 ? currentDisplayed : c.messages,
              timestamp: Date.now()
            };
          }
          return c;
        });
        localStorage.setItem('conversations', JSON.stringify(updated));
      }
    }

    const updatedConversations = conversations.map(c => ({
      ...c,
      active: c.id === conv.id
    }));
    
    // 获取并显示所有会话消息
    const allConversations = JSON.parse(localStorage.getItem('conversations') || '[]');
    console.log('所有会话消息:', allConversations.map(conv => ({
      标题: conv.title,
      消息数: conv.messages?.length || 0,
      最后更新: new Date(conv.lastUpdated).toLocaleString(),
      消息列表: conv.messages?.map(msg => ({
        角色: msg.role,
        内容: msg.content.substring(0, 50) + '...',
        时间: new Date(msg.timestamp).toLocaleString()
      }))
    })));
    console.log('updatedConversations:', JSON.stringify(updatedConversations));
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    
    setConversations(updatedConversations);
    
    setCurrentResponse('');
    setReasoningText('');
    setStreaming(false);
    
    // 更新当前会话哈希值
    if (conv.sessionHash) {
      setSessionHash(conv.sessionHash);
      localStorage.setItem('sessionHash', conv.sessionHash);
      console.log('切换到会话，哈希值:', conv.sessionHash);
      
      // 确保全局映射表存在
      ensureGlobalMapExists();
      
      // 为会话创建映射表（如果不存在）
      if (window.currentSensitiveInfoMap && !window.currentSensitiveInfoMap[conv.sessionHash]) {
        window.currentSensitiveInfoMap[conv.sessionHash] = {};
        console.log('为会话创建空的映射表，会话哈希值:', conv.sessionHash);
        
        // 保存到localStorage
        try {
          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        } catch (error) {
          console.error('保存全局映射表到localStorage时出错:', error);
        }
      }
    } else {
      // 如果会话没有哈希值，生成一个新的
      const newSessionHash = generateSessionHash();
      setSessionHash(newSessionHash);
      localStorage.setItem('sessionHash', newSessionHash);
      
      // 更新会话的哈希值
      const updatedWithHash = updatedConversations.map(c => {
        if (c.id === conv.id) {
          return { ...c, sessionHash: newSessionHash };
        }
        return c;
      });
      localStorage.setItem('conversations', JSON.stringify(updatedWithHash));
      setConversations(updatedWithHash);
      
      console.log('会话没有哈希值，生成新的哈希值:', newSessionHash);
      
      // 确保全局映射表存在
      ensureGlobalMapExists();
      
      // 为会话创建映射表
      if (window.currentSensitiveInfoMap) {
        window.currentSensitiveInfoMap[newSessionHash] = {};
        console.log('为会话创建空的映射表，会话哈希值:', newSessionHash);
        
        // 保存到localStorage
        try {
          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        } catch (error) {
          console.error('保存全局映射表到localStorage时出错:', error);
        }
      }
    }
    
    // 清空当前活动文档
    setActiveDocuments([]);
    
    const messages = conv.messages || [{ role: "system", content: "You are a helpful assistant." }];
    setDisplayMessages(messages);
    setRequestMessages(messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })));

    // 重置用户滚动状态，确保滚动到底部
    setUserHasScrolled(false);
    
    // 将当前显示的消息保存到localStorage
    localStorage.setItem('displayMessages', JSON.stringify(messages));
  }, [
    conversations, 
    setConversations, 
    setDisplayMessages, 
    setRequestMessages, 
    setSessionHash, 
    setActiveDocuments, 
    setStreaming, 
    setCurrentResponse, 
    setReasoningText, 
    setUserHasScrolled
  ]);

  // 删除会话
  const handleDeleteConversation = useCallback((sessionHash) => {
    // 使用sessionHash作为参数，不再需要事件对象
    const updatedConversations = conversations.filter(conv => conv.sessionHash !== sessionHash);
    if (updatedConversations.length > 0) {
      if (conversations.find(conv => conv.sessionHash === sessionHash)?.active) {
        updatedConversations[0].active = true;
        setDisplayMessages(updatedConversations[0].messages);
        setRequestMessages(updatedConversations[0].messages);
        
        // 更新当前会话哈希值
        setSessionHash(updatedConversations[0].sessionHash);
        localStorage.setItem('sessionHash', updatedConversations[0].sessionHash);
      }
    } else {
      // 如果没有会话，创建一个新的
      const newSessionHash = generateSessionHash();
      const newConversation = {
        id: Date.now().toString(),
        title: '新对话',
        active: true,
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        timestamp: Date.now(),
        sessionHash: newSessionHash
      };
      updatedConversations.push(newConversation);
      
      setDisplayMessages(newConversation.messages);
      setRequestMessages(newConversation.messages);
      
      // 更新当前会话哈希值
      setSessionHash(newSessionHash);
      localStorage.setItem('sessionHash', newSessionHash);
    }
    
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    // 删除会话的敏感信息映射
    if (window.currentSensitiveInfoMap && window.currentSensitiveInfoMap[sessionHash]) {
      delete window.currentSensitiveInfoMap[sessionHash];
      
      // 保存到localStorage
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
      } catch (error) {
        console.error('保存全局映射表到localStorage时出错:', error);
      }
    }
  }, [conversations, setConversations, setDisplayMessages, setRequestMessages, setSessionHash]);

  // 清除所有会话
  const handleClearAll = useCallback(() => {
    if (window.confirm('确定要清除所有对话吗？')) {
      // 生成新的会话哈希值
      const newSessionHash = generateSessionHash();
      
      const newConversation = {
        id: Date.now().toString(),
        title: '新对话',
        active: true,
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        timestamp: Date.now(),
        sessionHash: newSessionHash, // 添加新的会话哈希值
        activeDocuments: [] // 添加空的活动文档列表
      };
      
      setConversations([newConversation]);
      setDisplayMessages(newConversation.messages);
      setRequestMessages(newConversation.messages);
      localStorage.setItem('conversations', JSON.stringify([newConversation]));
      
      // 更新当前会话哈希值
      setSessionHash(newSessionHash);
      localStorage.setItem('sessionHash', newSessionHash);
      
      // 清空当前活动文档
      setActiveDocuments([]);
      
      // 清空敏感信息映射
      window.currentSensitiveInfoMap = {};
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify({}));
      } catch (error) {
        console.error('保存全局映射表到localStorage时出错:', error);
      }
      
      // 确保全局映射表存在
      ensureGlobalMapExists();
      
      // 为新会话创建空的映射表
      if (window.currentSensitiveInfoMap && !window.currentSensitiveInfoMap[newSessionHash]) {
        window.currentSensitiveInfoMap[newSessionHash] = {};
        console.log('为新会话创建空的映射表，会话哈希值:', newSessionHash);
        
        // 保存到localStorage
        try {
          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        } catch (error) {
          console.error('保存全局映射表到localStorage时出错:', error);
        }
      }
    }
  }, [setConversations, setDisplayMessages, setRequestMessages, setSessionHash, setActiveDocuments]);

  return {
    conversations,
    setConversations,
    isSidebarExpanded,
    setIsSidebarExpanded,
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll,
    handleToggleSidebar: () => setIsSidebarExpanded(prev => !prev)
  };
}

export default useConversations; 