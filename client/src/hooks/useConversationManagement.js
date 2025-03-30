// 对话管理相关的逻辑钩子
import { useState, useEffect } from 'react';
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

  // 加载保存的会话历史
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('conversations');
      if (storedHistory) {
        const parsedHistory = JSON.parse(storedHistory);
        setConversations(parsedHistory);
        
        // 查找活动会话
        const activeConversation = parsedHistory.find(conv => conv.active);
        if (activeConversation) {
          console.log('找到活动会话:', activeConversation.title);
          
          // 设置会话哈希
          if (activeConversation.sessionHash) {
            localStorage.setItem('sessionHash', activeConversation.sessionHash);
          }
          
          // 设置当前会话的消息
          if (activeConversation.messages && Array.isArray(activeConversation.messages)) {
            setDisplayMessages(activeConversation.messages);
          }
          
          // 更新请求消息
          if (activeConversation.messages && Array.isArray(activeConversation.messages)) {
            // 转换消息格式为请求格式
            const filteredMessages = activeConversation.messages.filter(msg => 
              msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system'
            );
            setRequestMessages(filteredMessages);
          }
          
          // 设置活动文档
          if (activeConversation.activeDocuments) {
            setActiveDocuments(activeConversation.activeDocuments);
          }
        }
      } else {
        console.log('未找到已保存的会话历史，创建新会话');
        handleNewChat();
      }
    } catch (error) {
      console.error('加载会话历史时出错:', error);
      handleNewChat();
    }
  }, []);

  // 处理对话点击
  const handleConversationClick = (sessionHash) => {
    console.log('===== 切换对话 =====');
    console.log('目标会话Hash:', sessionHash);
    
    try {
      // 直接从localStorage获取最新数据，不依赖displayMessages
      const storedHistory = localStorage.getItem('conversations');
      if (storedHistory) {
        let conversationsCopy = JSON.parse(storedHistory);
        console.log('从localStorage获取的最新会话数据:', {
          会话数量: conversationsCopy.length,
          当前活动会话: conversationsCopy.find(c => c.active)?.title || '无活动会话'
        });
        
        // 查找目标会话
        const targetConv = conversationsCopy.find(conv => conv.sessionHash === sessionHash);
        if (targetConv) {
          console.log('目标对话:', {
            id: targetConv.id,
            title: targetConv.title,
            sessionHash: targetConv.sessionHash,
            消息数量: targetConv.messages?.length || 0
          });
          
          // 更新会话激活状态，不重写任何消息数据
          const updatedConversations = conversationsCopy.map(conv => ({
            ...conv,
            active: conv.sessionHash === sessionHash
          }));
          
          // 保存会话列表到localStorage
          localStorage.setItem('conversations', JSON.stringify(updatedConversations));
          console.log('已更新会话激活状态，写入localStorage');
          
          // 在内存中更新会话列表
          setConversations(updatedConversations);
          
          // 加载选定对话的消息
          const messages = targetConv.messages || [];
          
          // 筛选出需要显示的消息
          const displayableMessages = [
            { role: 'system', content: '你是一个有用的AI助手。', id: 'system-1', timestamp: Date.now() }, // 默认系统消息
            ...messages.filter(msg => msg.role !== 'system') // 排除系统消息
          ];
          
          console.log('加载到显示消息列表的消息数量:', displayableMessages.length);
          
          // 更新显示消息和请求消息
          setDisplayMessages(displayableMessages);
          
          // 只保留用户消息和助手消息作为历史，不包括系统消息
          const requestMsgs = messages.filter(msg => msg.role !== 'system');
          setRequestMessages(requestMsgs);
          
          // 更新活动文档和会话哈希
          setActiveDocuments(targetConv.activeDocuments || []);
          localStorage.setItem('sessionHash', sessionHash);
          
          // 重置其他状态
          setCurrentResponse('');
          setReasoningText('');
          
          // 滚动到底部
          scrollToBottom();
          
          console.log('对话切换完成');
        } else {
          console.error('找不到目标会话:', sessionHash);
        }
      }
    } catch (error) {
      console.error('切换对话时出错:', error);
    }
    
    console.log('===== 对话切换结束 =====');
  };
  
  // 创建新对话
  const handleNewChat = () => {
    console.log('创建新对话');
    
    // 生成新的会话哈希值
    const newSessionHash = Date.now().toString();
    console.log('新会话哈希值:', newSessionHash);
    
    // 创建新的对话对象
    const newConversation = {
      id: Date.now().toString(),
      title: '新对话',
      messages: [{ 
        role: 'system', 
        content: '你是一个有用的AI助手。', 
        id: 'system-' + Date.now(), 
        timestamp: Date.now() 
      }],
      timestamp: Date.now(),
      active: true,
      sessionHash: newSessionHash
    };
    
    // 更新对话列表，确保只有一个活动对话
    const updatedConversations = conversations.map(conv => ({
      ...conv,
      active: false
    }));
    updatedConversations.unshift(newConversation);
    
    // 保存更新后的对话列表
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    // 更新当前会话哈希值
    localStorage.setItem('sessionHash', newSessionHash);
    
    // 重置显示状态
    setDisplayMessages(newConversation.messages);
    setRequestMessages([]);  // 新对话不需要初始请求消息
    setCurrentResponse('');
    setReasoningText('');
    setStreaming(false);
    setActiveDocuments([]);
    
    // 滚动到底部
    scrollToBottom();
    
    console.log('新对话创建完成');
    return newSessionHash;
  };
  
  // 删除对话
  const handleDeleteConversation = (sessionHash) => {
    console.log('删除对话:', sessionHash);
    
    // 找到要删除的对话
    const convToDelete = conversations.find(conv => conv.sessionHash === sessionHash);
    if (!convToDelete) {
      console.error('无法找到要删除的对话:', sessionHash);
      return;
    }
    
    // 如果删除的是当前活动对话，需要切换到其他对话
    const wasActive = convToDelete.active;
    
    // 更新对话列表
    const updatedConversations = conversations.filter(conv => conv.sessionHash !== sessionHash);
    
    // 如果删除后还有对话，且删除的是活动对话，激活最新的对话
    if (wasActive && updatedConversations.length > 0) {
      updatedConversations[0].active = true;
      
      // 更新显示状态为新的活动对话
      setDisplayMessages(updatedConversations[0].messages || []);
      
      // 更新请求消息，只需要用户和助手消息
      const filteredMessages = updatedConversations[0].messages
        ? updatedConversations[0].messages.filter(msg => msg.role !== 'system')
        : [];
      
      setRequestMessages(filteredMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        id: msg.id,
        timestamp: msg.timestamp,
        reasoningContent: msg.reasoning_content || msg.reasoningContent
      })));
      
      // 更新活动文档
      setActiveDocuments(updatedConversations[0].activeDocuments || []);
      
      // 更新当前会话哈希值
      localStorage.setItem('sessionHash', updatedConversations[0].sessionHash);
      
      console.log('切换到新的活动对话, ID:', updatedConversations[0].id);
    } else if (updatedConversations.length === 0) {
      // 如果没有对话了，创建一个新对话
      console.log('没有剩余对话，创建新对话');
      handleNewChat();
      return;
    }
    
    // 保存更新后的对话列表
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    // 重置其他状态
    setCurrentResponse('');
    setReasoningText('');
    setStreaming(false);
    
    // 滚动到底部
    scrollToBottom();
    
    console.log('对话删除完成');
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
      localStorage.setItem('conversations', JSON.stringify([newConversation]));
      
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
    
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));
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