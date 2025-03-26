// 对话管理相关的逻辑钩子
import { useState } from 'react';
import { generateSessionHash } from '../utils/SessionUtils';
import { ensureGlobalMapExists } from '../utils/SensitiveInfoMasker';

// 对话管理钩子
export const useConversationManagement = (
  conversations,
  setConversations,
  setDisplayMessages,
  setRequestMessages,
  setCurrentResponse,
  setReasoningText,
  setStreaming,
  setActiveDocuments,
  setUserHasScrolled,
  scrollToBottom
) => {
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');

  // 处理新建对话
  const handleNewChat = () => {
    // 生成新的会话哈希值
    const newSessionHash = generateSessionHash();
    
    // 创建新对话
    const newConversation = {
      id: Date.now().toString(),
      title: '新对话',
      active: true,
      messages: [{ 
        role: "system", 
        content: "You are a helpful assistant.",
        sessionHash: newSessionHash  // 为系统消息添加会话哈希值
      }],
      timestamp: Date.now(),
      sessionHash: newSessionHash, // 添加新的会话哈希值
      activeDocuments: [] // 添加空的活动文档列表
    };
    
    // 更新对话列表
    const updatedConversations = conversations.map(conv => ({
      ...conv,
      active: false
    }));
    updatedConversations.unshift(newConversation);
    
    // 保存到localStorage
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    // 更新显示消息和请求消息
    setDisplayMessages(newConversation.messages);
    setRequestMessages(newConversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      sessionHash: newSessionHash  // 确保请求消息也有会话哈希值
    })));
    
    // 重置状态
    setCurrentResponse('');
    setReasoningText('');
    setStreaming(false);
    setActiveDocuments([]); // 清空活动文档
    
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
    
    console.log('创建新对话，会话哈希值:', newSessionHash);
  };

  // 处理对话点击
  const handleConversationClick = (conv) => {
    // 保存当前会话的活动文档
    const currentActiveConv = conversations.find(c => c.active);
    if (currentActiveConv) {
      currentActiveConv.activeDocuments = activeDocuments || [];
    }
    
    // 更新活动状态
    const updatedConversations = conversations.map(c => ({
      ...c,
      active: c.id === conv.id
    }));
    
    // 保存到localStorage
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    // 重置当前状态
    setCurrentResponse('');
    setReasoningText('');
    setStreaming(false);
    
    // 更新当前会话哈希值
    if (conv.sessionHash) {
      // 使用会话的哈希值
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
      localStorage.setItem('sessionHash', newSessionHash);
      
      // 更新会话的哈希值
      const updatedWithHash = updatedConversations.map(c => {
        if (c.id === conv.id) {
          return { ...c, sessionHash: newSessionHash };
        }
        return c;
      });
      localStorage.setItem('chatHistory', JSON.stringify(updatedWithHash));
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
    
    // 恢复会话的活动文档
    const docsToRestore = conv.activeDocuments || [];
    setActiveDocuments(docsToRestore);
    console.log('恢复会话的活动文档:', docsToRestore);
    
    // 获取会话消息并设置显示消息
    const messages = conv.messages || [{ role: "system", content: "You are a helpful assistant." }];
    console.log('加载会话消息，消息数量:', messages.length);
    
    // 确保每条消息都有会话哈希值
    const messagesWithSessionHash = messages.map(msg => ({
      ...msg,
      sessionHash: msg.sessionHash || (conv.sessionHash || conv.sessionHash)
    }));
    
    // 设置显示消息和请求消息
    setDisplayMessages(messagesWithSessionHash);
    setRequestMessages(messagesWithSessionHash.map(msg => ({
      role: msg.role,
      content: msg.content,
      reasoningContent: msg.reasoningContent, // 加载思考过程内容
      sessionHash: msg.sessionHash
    })));

    // 重置用户滚动状态，确保滚动到底部
    setUserHasScrolled(false);
    
    // 使用 scrollToBottom 函数滚动到底部
    scrollToBottom(true);
  };

  // 处理删除对话
  const handleDeleteConversation = (e, convId) => {
    e.stopPropagation();
    
    // 获取要删除的对话信息，用于后续清理对应的映射表
    const conversationToDelete = conversations.find(conv => conv.id === convId);
    const sessionHashToDelete = conversationToDelete?.sessionHash;
    
    console.log('准备删除对话:', {
      conversationId: convId,
      sessionHash: sessionHashToDelete
    });
    
    const updatedConversations = conversations.filter(conv => conv.id !== convId);
    if (updatedConversations.length > 0) {
      if (conversations.find(conv => conv.id === convId)?.active) {
        // 设置第一个对话为活动对话
        updatedConversations[0].active = true;
        
        // 获取新活动对话的会话哈希值
        const newActiveSessionHash = updatedConversations[0].sessionHash || generateSessionHash();
        
        // 如果对话没有会话哈希值，添加一个
        if (!updatedConversations[0].sessionHash) {
          updatedConversations[0].sessionHash = newActiveSessionHash;
        }
        
        // 更新当前会话哈希值
        localStorage.setItem('sessionHash', newActiveSessionHash);
        
        // 确保所有消息都有会话哈希值
        const messagesWithSessionHash = updatedConversations[0].messages.map(msg => ({
          ...msg,
          sessionHash: msg.sessionHash || newActiveSessionHash
        }));
        
        // 更新对话的消息
        updatedConversations[0].messages = messagesWithSessionHash;
        
        // 设置显示消息和请求消息
        setDisplayMessages(messagesWithSessionHash);
        setRequestMessages(messagesWithSessionHash.map(msg => ({
          role: msg.role,
          content: msg.content,
          sessionHash: msg.sessionHash
        })));
      }
    } else {
      // 如果没有对话了，创建一个新的
      const newSessionHash = generateSessionHash();
      
      updatedConversations.push({
        id: Date.now().toString(),
        title: '新对话',
        active: true,
        messages: [{ 
          role: "system", 
          content: "You are a helpful assistant.",
          sessionHash: newSessionHash
        }],
        timestamp: Date.now(),
        sessionHash: newSessionHash
      });
      
      // 更新当前会话哈希值
      localStorage.setItem('sessionHash', newSessionHash);
      
      // 设置显示消息和请求消息
      setDisplayMessages(updatedConversations[0].messages);
      setRequestMessages(updatedConversations[0].messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        reasoningContent: msg.reasoningContent, // 加载思考过程内容
        sessionHash: msg.sessionHash
      })));
      
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
    
    // 从全局映射表中删除被删除对话的敏感信息映射
    if (sessionHashToDelete && window.currentSensitiveInfoMap && window.currentSensitiveInfoMap[sessionHashToDelete]) {
      console.log(`删除会话 ${sessionHashToDelete} 的敏感信息映射表`);
      console.log(`原映射表条目数: ${Object.keys(window.currentSensitiveInfoMap[sessionHashToDelete]).length}`);
      
      // 删除该会话的映射表
      delete window.currentSensitiveInfoMap[sessionHashToDelete];
      
      // 更新localStorage
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        console.log('更新localStorage中的全局映射表，删除了会话的敏感信息映射');
      } catch (error) {
        console.error('更新localStorage中的全局映射表时出错:', error);
      }
    }
    
    // 保存到localStorage
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    console.log('删除对话后，剩余对话数量:', updatedConversations.length);
  };

  // 处理清除所有对话
  const handleClearAll = () => {
    if (window.confirm('确定要清除所有对话吗？')) {
      // 生成新的会话哈希值
      const newSessionHash = generateSessionHash();
      
      const newConversation = {
        id: Date.now().toString(),
        title: '新对话',
        active: true,
        messages: [{ 
          role: "system", 
          content: "You are a helpful assistant.",
          sessionHash: newSessionHash  // 为系统消息添加会话哈希值
        }],
        timestamp: Date.now(),
        sessionHash: newSessionHash, // 添加新的会话哈希值
        activeDocuments: [] // 添加空的活动文档列表
      };
      
      setConversations([newConversation]);
      setDisplayMessages(newConversation.messages);
      setRequestMessages(newConversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        reasoningContent: msg.reasoningContent, // 加载思考过程内容
        sessionHash: newSessionHash  // 确保请求消息也有会话哈希值
      })));
      localStorage.setItem('chatHistory', JSON.stringify([newConversation]));
      
      // 更新当前会话哈希值
      localStorage.setItem('sessionHash', newSessionHash);
      
      // 清空当前活动文档
      setActiveDocuments([]);
      
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
      
      console.log('清除所有对话，创建新对话，会话哈希值:', newSessionHash);
    }
  };

  // 处理标题编辑
  const handleTitleEdit = (conv) => {
    setEditingTitle(conv.id);
    setEditingTitleValue(conv.title);
  };

  // 处理标题变更
  const handleTitleChange = (e) => {
    setEditingTitleValue(e.target.value);
  };

  // 处理标题保存
  const handleTitleSave = () => {
    const updatedConversations = conversations.map(conv => {
      if (conv.id === editingTitle) {
        return {
          ...conv,
          title: editingTitleValue || '新对话'
        };
      }
      return conv;
    });
    
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  // 处理标题取消编辑
  const handleTitleCancel = () => {
    setEditingTitle(null);
    setEditingTitleValue('');
  };

  return {
    editingTitle,
    editingTitleValue,
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll,
    handleTitleEdit,
    handleTitleChange,
    handleTitleSave,
    handleTitleCancel
  };
}; 