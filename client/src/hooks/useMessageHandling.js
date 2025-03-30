// 消息处理相关的逻辑钩子
import { useState } from 'react';
import { sendChatRequest, sendDocumentChatRequest } from '../api/chatApi';
import { getOrCreateSessionHash } from '../utils/SessionUtils';
import { createUpdateState } from '../utils/UIUtils';
import { unmaskSensitiveInfo } from '../utils/SensitiveInfoMasker';

// 消息处理钩子
export const useMessageHandling = (
  displayMessages, 
  setDisplayMessages, 
  requestMessages, 
  setRequestMessages, 
  conversations, 
  setConversations,
  selectedModel,
  modelConfigs,
  embeddingConfig,
  sensitiveInfoProtectionEnabled,
  scrollToBottom
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [input, setInput] = useState(''); // 添加输入框状态
  
  // 获取当前会话哈希值
  const sessionHash = getOrCreateSessionHash();
  
  // 创建更新状态函数
  const updateState = createUpdateState(setReasoningText, setCurrentResponse, scrollToBottom);
  
  // 获取模型配置
  const getConfigForModel = (modelName) => {
    console.log('获取模型配置, 当前选择的模型:', modelName);
    console.log('当前所有模型配置:', modelConfigs);
    
    // 如果modelName为undefined，尝试从localStorage获取最后使用的模型
    if (!modelName) {
      console.log('模型名称为空，尝试从localStorage获取');
      const savedConfigs = localStorage.getItem('modelConfigs');
      if (savedConfigs) {
        const configs = JSON.parse(savedConfigs);
        if (configs.length > 0) {
          modelName = configs[0].model_name;
          console.log('从localStorage获取默认模型:', modelName);
        }
      }
    }

    // 从 modelConfigs 中查找匹配的配置
    const config = modelConfigs.find(config => config.model_name === modelName);
    console.log('找到的模型配置:', config);
    
    const result = {
      base_url: config?.base_url || '',
      api_key: config?.api_key || '',
      model_name: modelName || ''  // 确保即使modelName为undefined也返回空字符串
    };
    
    console.log('返回的模型配置:', result);
    return result;
  };
  
  // 处理流式响应
  const handleResponse = async (response, messageId) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || '请求失败，请稍后重试');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    let lastResponseTime = Date.now();
    
    const currentSessionHash = sessionHash;
    console.log('当前会话哈希值:', currentSessionHash);
    
    try {
      while (true) {
        // 检查是否超时
        const now = Date.now();
        if (now - lastResponseTime > 30000) {  // 30秒超时
          throw new Error('响应超时，请稍后重试');
        }
        
        const { done, value } = await reader.read();
        if (done) break;

        lastResponseTime = Date.now();
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              console.log('流式响应完成');
              break;
            }
            try {
              const parsed = JSON.parse(data);
              
              // 处理思考过程
              if (parsed.type === 'reasoning') {
                setIsReasoning(true);
                const reasoningContent = parsed.content || '';
                updateState(reasoningContent, responseText, true);
                continue;
              }
              
              // 处理普通消息
              if (parsed.choices && parsed.choices.length > 0) {
                const { delta, finish_reason } = parsed.choices[0];
                
                if (finish_reason === 'stop') {
                  console.log('接收到停止信号');
                  break;
                }
                
                if (delta) {
                  // 处理推理内容
                  if (delta.reasoning_content) {
                    setIsReasoning(true);
                    updateState(delta.reasoning_content, responseText, true);
                  }
                  
                  // 处理普通内容
                  if (delta.content) {
                    responseText += delta.content;
                    updateState(reasoningText, responseText, false);
                  }
                }
              }
              
              // 处理自定义格式
              if (parsed.content) {
                responseText += parsed.content;
                updateState(reasoningText, responseText, false);
              }
            } catch (e) {
              console.error('解析响应数据出错:', e, data);
            }
          }
        }
      }
      
      // 处理敏感信息解码
      if (sensitiveInfoProtectionEnabled) {
        console.log('解码响应中的敏感信息');
        responseText = unmaskSensitiveInfo(responseText);
      }
      
      // 创建AI消息对象
      const aiMessage = {
        id: messageId,
        role: 'assistant',
        content: responseText,
        reasoningContent: reasoningText, // 保存思考过程内容
        timestamp: Date.now(),
        sessionHash: currentSessionHash  // 确保消息包含会话哈希值
      };
      
      console.log('流式响应完成，创建的AI消息:', aiMessage);
      
      // 注意：这里不再更新displayMessages或保存到localStorage
      // 流式响应结束后，将在ChatArea.jsx中通过handleReplyComplete来保存这条消息
      
      // 只更新请求消息，用于后续API请求
      setRequestMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        reasoningContent: reasoningText, // 保存思考过程内容
        sessionHash: currentSessionHash  // 确保请求消息也包含会话哈希值
      }]);
      
      // 高亮消息
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 500);
      
      // 重置思考过程状态，但保留内容
      setIsReasoning(false);
      
      return responseText;
    } catch (error) {
      console.error('处理响应时出错:', error);
      throw error;
    } finally {
      reader.releaseLock();
    }
  };
  
  // 发送聊天请求
  const sendChatRequestWrapper = async (message, isDeepResearch = false, isWebSearch = false) => {
    try {
      setIsLoading(true);
      
      // 创建中止控制器
      const controller = new AbortController();
      setAbortController(controller);
      
      // 获取当前对话轮数
      const currentTurns = displayMessages.filter(msg => msg.role === 'user').length;
      
      // 获取模型配置
      const modelConfig = getConfigForModel(selectedModel);
      
      // 生成消息ID
      const messageId = Date.now().toString();
      
      // 发送请求
      const response = await sendChatRequest(
        message, 
        requestMessages, 
        currentTurns, 
        selectedModel, 
        modelConfig, 
        sessionHash, 
        sensitiveInfoProtectionEnabled, 
        isDeepResearch, 
        isWebSearch
      );
      
      // 处理响应
      await handleResponse(response, messageId);
      
      return true;
    } catch (error) {
      console.error('发送聊天请求时出错:', error);
      alert(`发送消息失败: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };
  
  // 发送文档聊天请求
  const sendDocumentChatRequestWrapper = async (message, documentIds, isDeepResearch = false, isWebSearch = false) => {
    try {
      setIsLoading(true);
      
      // 创建中止控制器
      const controller = new AbortController();
      setAbortController(controller);
      
      // 获取当前对话轮数
      const currentTurns = displayMessages.filter(msg => msg.role === 'user').length + 1;
      
      // 获取模型配置
      const modelConfig = getConfigForModel(selectedModel);
      
      // 生成消息ID
      const messageId = Date.now().toString();
      
      // 发送请求
      const response = await sendDocumentChatRequest(
        message, 
        documentIds, 
        requestMessages, 
        currentTurns, 
        selectedModel, 
        modelConfig, 
        embeddingConfig, 
        sessionHash, 
        sensitiveInfoProtectionEnabled, 
        isDeepResearch, 
        isWebSearch
      );
      
      // 处理响应
      await handleResponse(response, messageId);
      
      return true;
    } catch (error) {
      console.error('发送文档聊天请求时出错:', error);
      alert(`发送消息失败: ${error.message}`);
      return false;
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };
  
  // 停止生成
  const handleStop = async () => {
    if (abortController) {
      try {
        abortController.abort();
        console.log('已中止请求');
      } catch (error) {
        console.error('中止请求时出错:', error);
      }
      
      setAbortController(null);
      setIsLoading(false);
    }
  };
  
  // 发送聊天请求的包装函数
  const handleSubmit = async (e, isDeepResearch = false, isWebSearch = false, editedMessage = null, inputText = null) => {
    if (e) e.preventDefault();
    
    // 如果是编辑消息模式，使用编辑后的消息内容
    if (editedMessage) {
      console.log('处理编辑后的消息:', editedMessage);
      
      // 防御性检查：确保editedMessage是有效的对象
      if (!editedMessage || typeof editedMessage !== 'object') {
        console.error('无效的编辑消息对象:', editedMessage);
        return;
      }
      
      // 如果editedMessage是字符串，说明是直接传入的新内容
      if (typeof editedMessage === 'string') {
        // 查找最后一条用户消息
        const lastUserMessage = displayMessages.findLast(msg => msg.role === 'user');
        if (!lastUserMessage) {
          console.error('无法找到要编辑的用户消息');
          return;
        }
        console.log('找到要编辑的用户消息:', lastUserMessage);
        editedMessage = {
          ...lastUserMessage,
          content: editedMessage,
          timestamp: Date.now(),
          edited: true
        };
      }
      
      // 确保消息有ID
      if (!editedMessage.id) {
        console.error('编辑的消息缺少ID:', editedMessage);
        return;
      }
      
      // 获取消息前的历史，包括当前编辑的消息
      const messageIndex = displayMessages.findIndex(msg => msg.id === editedMessage.id);
      if (messageIndex === -1) {
        console.error('无法找到编辑的消息:', editedMessage.id);
        return;
      }
      
      console.log('找到编辑消息的索引:', messageIndex);
      
      // 更新目标消息内容
      const updatedMessages = displayMessages.map((msg, index) => {
        if (index === messageIndex) {
          return {
            ...msg,
            content: editedMessage.content,
            timestamp: editedMessage.timestamp || Date.now(),
            edited: true
          };
        }
        return msg;
      });
      
      // 只保留到该消息为止的历史，移除后续的所有消息
      const previousMessages = updatedMessages.slice(0, messageIndex + 1);
      
      console.log('保留编辑消息前的历史，消息数量:', previousMessages.length);
      
      // 更新显示消息，移除该消息后的所有消息
      setDisplayMessages(previousMessages);
      
      // 更新请求消息，保持与显示消息同步
      setRequestMessages(previousMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
        id: msg.id,
        timestamp: msg.timestamp,
        edited: msg.edited
      })));
      
      // 保存到localStorage
      try {
        const updatedConversations = conversations.map(conv => {
          if (conv.active) {
            return {
              ...conv,
              messages: previousMessages.map(msg => ({
                ...msg,
                reasoning_content: msg.reasoning_content || msg.reasoningContent || null
              })),
              timestamp: Date.now()
            };
          }
          return conv;
        });
        
        localStorage.setItem('conversations', JSON.stringify(updatedConversations));
        setConversations(updatedConversations);
      } catch (error) {
        console.error('保存编辑后的对话历史失败:', error);
      }
      
      // 发送请求
      try {
        setIsLoading(true);
        await sendChatRequestWrapper(editedMessage.content, isDeepResearch, isWebSearch);
      } catch (error) {
        console.error('编辑消息请求失败:', error);
        alert(`编辑请求失败: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
      
      return;
    }
    
    // 常规消息处理逻辑
    // 尝试从App.jsx传递的参数获取消息内容
    let messageText = '';
    
    if (inputText) {
      // 如果传入了inputText参数，使用它
      messageText = inputText.trim();
    } else if (typeof input !== 'undefined' && input !== null) {
      // 否则尝试使用内部状态的input
      messageText = input.trim();
    }
    
    // 如果没有消息内容，不处理
    if (!messageText) {
      console.warn('消息内容为空，不处理');
      return;
    }
    
    // 确保有会话哈希值
    console.log('发送新消息，当前会话哈希值:', sessionHash);
    
    // 创建用户消息对象
    const userMessage = {
      role: 'user',
      content: messageText,
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
      sessionHash: sessionHash  // 确保消息包含会话哈希值
    };
    
    console.log('创建用户消息:', userMessage);
    
    // 更新显示消息
    setDisplayMessages(prev => {
      const newMessages = [...prev, userMessage];
      
      // 尝试立即安全地更新本地存储
      try {
        console.log('立即保存用户消息到localStorage', {
          sessionHash,
          消息内容: newMessages.length > 0 ? newMessages[newMessages.length-1].content.substring(0, 30) + '...' : '无消息'
        });
        
        // ⚠️ 获取localStorage中最新的数据，防止覆盖
        const latestConversationsStr = localStorage.getItem('conversations');
        if (!latestConversationsStr) {
          console.warn('保存用户消息: localStorage中没有会话数据，初始化新的会话');
          // 第一次使用，初始化会话数据
          const newConversation = {
            id: Date.now().toString(),
            title: '新对话',
            messages: newMessages,
            active: true,
            timestamp: Date.now(),
            sessionHash: sessionHash
          };
          localStorage.setItem('conversations', JSON.stringify([newConversation]));
          setConversations([newConversation]);
          console.log('用户消息保存成功: 创建了新会话');
          return;
        }
        
        // 解析当前localStorage中的会话数据
        let latestConversations;
        try {
          latestConversations = JSON.parse(latestConversationsStr);
          console.log('获取最新会话数据:', {
            会话数量: latestConversations.length,
            当前会话: latestConversations.find(c => c.active)?.title || '无活动会话'
          });
        } catch (error) {
          console.error('解析localStorage会话数据失败:', error);
          return;
        }
        
        // 查找当前活动会话
        const currentConversationIndex = latestConversations.findIndex(conv => conv.active);
        if (currentConversationIndex === -1) {
          console.warn('保存用户消息: 找不到活动会话，创建新会话');
          const newConversation = {
            id: Date.now().toString(),
            title: '新对话',
            messages: newMessages,
            active: true,
            timestamp: Date.now(),
            sessionHash: sessionHash
          };
          latestConversations.unshift(newConversation);
        } else {
          // 更新当前会话的消息
          const currentConversation = latestConversations[currentConversationIndex];
          
          console.log('更新现有会话:', {
            id: currentConversation.id,
            title: currentConversation.title,
            sessionHash: currentConversation.sessionHash,
            原有消息数: currentConversation.messages?.length || 0,
            新消息数: newMessages.length
          });
          
          // 更新会话数据
          latestConversations[currentConversationIndex] = {
            ...currentConversation,
            messages: newMessages.map(msg => ({
              ...msg,
              reasoning_content: msg.reasoning_content || msg.reasoningContent || null
            })),
            timestamp: Date.now(),
            activeDocuments: typeof activeDocuments !== 'undefined' ? activeDocuments : currentConversation.activeDocuments || [] // 安全地处理activeDocuments
          };
        }
        
        // 保存到localStorage
        localStorage.setItem('conversations', JSON.stringify(latestConversations));
        setConversations(latestConversations);
        console.log('用户消息保存成功:', {
          会话数量: latestConversations.length,
          当前会话: latestConversations.find(c => c.active)?.title,
          消息数量: latestConversations.find(c => c.active)?.messages.length
        });
      } catch (error) {
        console.error('保存对话历史到localStorage失败:', error);
      }
      
      return newMessages;
    });
    
    // 更新请求消息
    setRequestMessages(prev => [...prev, userMessage]);
    
    // 清空输入框
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);
    
    // 设置流式响应状态
    setIsLoading(true);
    
    try {
      // 发送请求
      await sendChatRequestWrapper(messageText, isDeepResearch, isWebSearch);
    } catch (error) {
      console.error('发送消息失败:', error);
      alert(`发送消息失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    isLoading,
    setIsLoading,
    currentResponse,
    setCurrentResponse,
    reasoningText,
    setReasoningText,
    isReasoning,
    setIsReasoning,
    highlightedMessageId,
    setHighlightedMessageId,
    handleSubmit,
    handleStop,
    input,
    setInput,
    displayMessages: displayMessages,
    streaming: isLoading,
  };
}; 