import { useState } from 'react';
import { updateMessageHistory } from '../utils/messageUtils';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, updateGlobalSensitiveInfoMap, ensureGlobalMapExists } from '../utils/SensitiveInfoMasker';
import { serverURL } from '../Config';

/**
 * 消息提交和处理的Hook
 * @param {Object} options 选项
 * @param {Array} options.displayMessages 显示的消息数组
 * @param {Function} options.setDisplayMessages 设置显示消息的函数
 * @param {Array} options.requestMessages 请求消息数组
 * @param {Function} options.setRequestMessages 设置请求消息的函数
 * @param {Function} options.setStreaming 设置流式状态的函数
 * @param {Function} options.setCurrentResponse 设置当前响应的函数
 * @param {Function} options.setReasoningText 设置推理文本的函数
 * @param {Function} options.setIsReasoning 设置是否推理的函数
 * @param {string} options.sessionHash 会话哈希值
 * @param {Array} options.activeDocuments 活动文档数组
 * @param {Function} options.processStreamResponse 处理流式响应的函数
 * @param {Function} options.getConfigForModel 获取模型配置的函数
 * @param {Array} options.conversations 会话数组
 * @param {Function} options.setConversations 设置会话数组的函数
 * @returns {Object} 消息提交和处理相关的状态和函数
 */
function useMessageSubmission({
  displayMessages,
  setDisplayMessages,
  requestMessages,
  setRequestMessages,
  streaming,
  setStreaming,
  setCurrentResponse,
  setReasoningText,
  setIsReasoning,
  sessionHash,
  activeDocuments,
  processStreamResponse,
  getConfigForModel,
  conversations,
  setConversations
}) {
  // 输入状态
  const [input, setInput] = useState('');
  
  // 是否启用敏感信息保护
  const [sensitiveInfoProtectionEnabled, setSensitiveInfoProtectionEnabled] = useState(() => {
    // 从localStorage获取设置，默认关闭
    const saved = localStorage.getItem('sensitiveInfoProtection');
    return saved ? JSON.parse(saved) : false;
  });
  
  // 中止控制器
  const [abortController, setAbortController] = useState(null);

  /**
   * 提交表单时的处理函数
   * @param {Event} e 事件对象
   * @param {boolean} isDeepResearch 是否深度研究
   * @param {boolean} isWebSearch 是否联网搜索
   */
  const handleSubmit = async (e, isDeepResearch = false, isWebSearch = false) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    // 创建新消息
    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
      sessionHash
    };

    // 如果启用了敏感信息保护，处理用户输入
    if (sensitiveInfoProtectionEnabled) {
      // 确保全局映射表存在
      ensureGlobalMapExists();
      console.log('处理用户输入，当前全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap || {}).length);
      
      // 掩码处理用户输入
      const maskedInput = maskSensitiveInfo(input);
      
      // 获取并保存当前查询的敏感信息映射
      const queryMap = getSensitiveInfoMap();
      if (Object.keys(queryMap).length > 0) {
        console.log('用户输入中的敏感信息已被掩码处理:', queryMap);
        
        // 将新的敏感信息映射合并到全局映射表中，使用会话哈希作为键
        updateGlobalSensitiveInfoMap(queryMap, sessionHash);
        console.log('更新后全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
        
        // 保存会话映射到localStorage
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        
        // 设置消息的原始内容和掩码内容
        newMessage.originalContent = input;
        newMessage.content = maskedInput;
        newMessage.isMasked = true;
      }
    }

    // 更新消息历史
    const { updatedMessages, updatedConversations } = updateMessageHistory(
      displayMessages,
      newMessage,
      sessionHash,
      conversations
    );
    
    setDisplayMessages(updatedMessages);
    setConversations(updatedConversations);
    
    // 更新请求消息
    setRequestMessages(prev => [...prev, {
      role: newMessage.role,
      content: newMessage.content,
      sessionHash: newMessage.sessionHash
    }]);
    
    // 清空输入框
    setInput('');
    
    // 设置流式响应状态
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);
    
    try {
      let response;
      
      // 根据是否有活动文档决定使用哪种请求
      if (activeDocuments && activeDocuments.length > 0) {
        console.log('使用文档聊天请求，文档IDs:', activeDocuments.map(doc => doc.id));
        // 提取所有文档ID
        const documentIds = activeDocuments.map(doc => doc.id);
        response = await sendDocumentChatRequest(input, documentIds, isDeepResearch, isWebSearch);
      } else {
        console.log('使用普通聊天请求');
        response = await sendChatRequest(input, isDeepResearch, isWebSearch);
      }
      
      // 处理响应
      await processStreamResponse(response, newMessage.id, updatedConversations);
    } catch (error) {
      console.error('处理请求时出错:', error);
      setStreaming(false);
      
      // 添加错误消息
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `发生错误: ${error.message}`,
        timestamp: Date.now(),
        error: true,
        sessionHash
      };
      
      const { updatedMessages } = updateMessageHistory(
        displayMessages, 
        errorMessage, 
        sessionHash,
        updatedConversations
      );
      
      setDisplayMessages(updatedMessages);
      setRequestMessages(prev => [...prev, {
        role: errorMessage.role,
        content: errorMessage.content,
        sessionHash: errorMessage.sessionHash
      }]);
    }
  };

  /**
   * 处理重试请求
   * @param {Object} message 消息对象
   * @param {boolean} isDeepResearch 是否深度研究
   * @param {boolean} isWebSearch 是否联网搜索
   */
  const handleRetry = async (message, isDeepResearch = false, isWebSearch = false) => {
    // 确保 message 对象存在
    if (!message) {
      console.error('重试失败: message 对象为空');
      return;
    }
    
    const messageIndex = displayMessages.findIndex(msg => msg === message);
    const previousMessages = displayMessages.slice(0, messageIndex);
    
    // 获取用户最后一条消息的内容
    const lastUserMessage = previousMessages.filter(msg => msg.role === 'user').pop();
    let userContent = lastUserMessage ? lastUserMessage.content : '';
    let userOriginalContent = lastUserMessage && lastUserMessage.originalContent ? lastUserMessage.originalContent : null;
    let isMasked = lastUserMessage ? lastUserMessage.isMasked : false;
    
    // 处理敏感信息
    if (sensitiveInfoProtectionEnabled && userContent) {
      console.log('敏感信息保护已启用，处理用户输入');
      
      // 如果原始消息已经被掩码处理，使用原始内容
      if (isMasked && userOriginalContent) {
        console.log('使用原始消息的掩码处理结果');
        userContent = lastUserMessage.content;
      } else {
        // 否则重新处理敏感信息
        const processedContent = maskSensitiveInfo(userContent, sessionHash);
        
        // 检查是否有敏感信息被掩码
        const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
        isMasked = possibleMaskPatterns.some(pattern => pattern.test(processedContent));
        
        if (isMasked) {
          console.log('用户输入包含敏感信息，已进行掩码处理');
          console.log('原始输入:', userContent);
          console.log('处理后输入:', processedContent);
          userOriginalContent = userContent;
          userContent = processedContent;
        } else {
          console.log('用户输入不包含敏感信息，无需掩码处理');
          userOriginalContent = null;
        }
      }
    }
    
    // 更新请求消息
    const requestMsgs = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      sessionHash: msg.sessionHash || sessionHash
    }));
    
    setDisplayMessages(previousMessages);
    setRequestMessages(requestMsgs);
    
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);

    try {
      const controller = new AbortController();
      setAbortController(controller);
      
      let response;
      
      // 根据是否有活动文档决定使用哪种请求
      if (activeDocuments && activeDocuments.length > 0) {
        console.log('使用文档聊天重试请求，文档IDs:', activeDocuments.map(doc => doc.id));
        // 提取所有文档ID
        const documentIds = activeDocuments.map(doc => doc.id);
        const lastContent = lastUserMessage ? lastUserMessage.content : '';
        response = await sendDocumentChatRequest(lastContent, documentIds, isDeepResearch, isWebSearch);
      } else {
        console.log('使用普通聊天重试请求');
        const lastContent = lastUserMessage ? lastUserMessage.content : '';
        response = await sendChatRequest(lastContent, isDeepResearch, isWebSearch);
      }
      
      // 生成一个临时消息ID，用于高亮显示
      const tempMessageId = Date.now().toString();
      await processStreamResponse(response, tempMessageId, conversations);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
      } else {
        console.error('重试失败:', error);
        setStreaming(false);
        const errorMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: '重试失败：' + error.message,
          sessionHash,
          timestamp: Date.now()
        };
        const { updatedMessages } = updateMessageHistory(
          previousMessages, 
          errorMessage, 
          sessionHash,
          conversations
        );
        setDisplayMessages(updatedMessages);
      }
    } finally {
      setAbortController(null);
    }
  };

  /**
   * 处理编辑消息
   * @param {Object} message 消息对象
   * @param {string} newContent 新内容
   * @param {boolean} isDeepResearch 是否深度研究
   * @param {boolean} isWebSearch 是否联网搜索
   */
  const handleEdit = async (message, newContent, isDeepResearch = false, isWebSearch = false) => {
    if (!message) {
      console.error('编辑消息失败: 消息对象为空');
      return;
    }
    
    const messageIndex = displayMessages.findIndex(msg => msg === message);
    if (messageIndex === -1) {
      console.error('编辑消息失败: 未找到消息');
      return;
    }
    
    const previousMessages = displayMessages.slice(0, messageIndex);
    
    // 处理敏感信息
    let processedInput = newContent;
    let userOriginalInput = newContent;
    let isMasked = false;
    
    if (sensitiveInfoProtectionEnabled) {
      console.log('敏感信息保护已启用，处理编辑后的用户输入');
      
      // 使用会话哈希值处理敏感信息
      processedInput = maskSensitiveInfo(newContent, sessionHash);
      
      // 检查是否有敏感信息被掩码
      const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
      isMasked = possibleMaskPatterns.some(pattern => pattern.test(processedInput));
      
      if (isMasked) {
        console.log('检测到敏感信息，已进行掩码处理');
        userOriginalInput = newContent;
      } else {
        console.log('未检测到敏感信息');
      }
    }
    
    // 更新消息
    const updatedMessage = {
      ...message,
      content: processedInput,
      originalContent: isMasked ? userOriginalInput : undefined,
      reasoning_content: message.reasoning_content || null,  // 保留原有的推理内容
      id: message.id || Date.now().toString(), // 确保消息有ID
      sessionHash
    };
    
    const updatedMessages = [...previousMessages, updatedMessage];
    
    setDisplayMessages(updatedMessages);
    setRequestMessages([...previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      reasoning_content: msg.reasoning_content || null,  // 保留推理内容
      sessionHash: msg.sessionHash || sessionHash
    })), updatedMessage]);
    
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);

    try {
      let response;
      
      // 根据是否有活动文档决定使用哪种请求
      if (activeDocuments && activeDocuments.length > 0) {
        console.log('使用文档聊天编辑请求，文档IDs:', activeDocuments.map(doc => doc.id));
        // 提取所有文档ID
        const documentIds = activeDocuments.map(doc => doc.id);
        response = await sendDocumentChatRequest(processedInput, documentIds, isDeepResearch, isWebSearch);
      } else {
        console.log('使用普通聊天编辑请求');
        response = await sendChatRequest(processedInput, isDeepResearch, isWebSearch);
      }
      
      // 生成一个临时消息ID，用于高亮显示
      const tempMessageId = updatedMessage.id || Date.now().toString();
      await processStreamResponse(response, tempMessageId, conversations);
    } catch (error) {
      console.error('编辑请求失败:', error);
      setStreaming(false);
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant', 
        content: '编辑请求失败：' + error.message,
        sessionHash,
        timestamp: Date.now()
      };
      const { updatedMessages } = updateMessageHistory(
        updatedMessages, 
        errorMessage, 
        sessionHash,
        conversations
      );
      setDisplayMessages(updatedMessages);
    }
  };

  /**
   * 发送聊天请求
   * @param {string} message 消息内容
   * @param {boolean} isDeepResearch 是否深度研究
   * @param {boolean} isWebSearch 是否联网搜索
   * @returns {Promise<Response>} 响应对象
   */
  const sendChatRequest = async (message, isDeepResearch = false, isWebSearch = false) => {
    const modelConfigs = JSON.parse(localStorage.getItem('modelConfigs') || '[]');
    const selectedModel = localStorage.getItem('selectedModel') || (modelConfigs.length > 0 ? modelConfigs[0].model_name : '');
    
    const currentConfig = getConfigForModel(selectedModel, modelConfigs);
    console.log('当前模型配置:', currentConfig);
    
    // 处理消息中的敏感信息
    let processedMessage = message;
    if (sensitiveInfoProtectionEnabled) {
      // 确保全局映射表存在
      ensureGlobalMapExists();
      console.log('保持全局敏感信息映射表，当前条目数:', Object.keys(window.currentSensitiveInfoMap || {}).length);
      
      // 掩码处理消息
      processedMessage = maskSensitiveInfo(message);
      
      // 获取并保存当前查询的敏感信息映射
      const queryMap = getSensitiveInfoMap();
      if (Object.keys(queryMap).length > 0) {
        console.log('查询中的敏感信息已被掩码处理:', queryMap);
        updateGlobalSensitiveInfoMap(queryMap);
      }
    }

    // 处理历史消息中的敏感信息
    const processedMessages = requestMessages.map(msg => {
      // 保留系统消息
      if (msg.role === 'system') {
        return msg;
      }
      // 处理用户消息中的敏感信息
      if (sensitiveInfoProtectionEnabled && msg.role === 'user') {
        return {
          role: msg.role,
          content: maskSensitiveInfo(msg.content),
          reasoning_content: msg.reasoning_content || null
        };
      }
      // 保持 AI 消息不变，但确保包含推理内容
      return {
        role: msg.role,
        content: msg.content,
        reasoning_content: msg.reasoning_content || null
      };
    });

    const requestBody = {
      messages: [
        ...processedMessages,
        { role: 'user', content: processedMessage }
      ],
      model: selectedModel,
      base_url: currentConfig.base_url,
      api_key: currentConfig.api_key,
      model_name: currentConfig.model_name || selectedModel,
      stream: true,
      deep_research: isDeepResearch,
      web_search: isWebSearch,
      session_hash: sessionHash
    };

    console.log('发送请求数据:', {
      ...requestBody,
      api_key: '***',
      messages: requestBody.messages.map(msg => ({
        role: msg.role,
        content: msg.content ? msg.content.substring(0, 50) + '...' : '',
        reasoning_content: msg.reasoning_content ? msg.reasoning_content.substring(0, 50) + '...' : null
      }))
    });

    const controller = new AbortController();
    setAbortController(controller);

    const response = await fetch(`${serverURL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      credentials: 'include',
      mode: 'cors'
    });

    return response;
  };

  /**
   * 发送带文档的聊天请求
   * @param {string} message 消息内容
   * @param {Array} documentIds 文档ID数组
   * @param {boolean} isDeepResearch 是否深度研究
   * @param {boolean} isWebSearch 是否联网搜索
   * @returns {Promise<Response>} 响应对象
   */
  const sendDocumentChatRequest = async (message, documentIds, isDeepResearch = false, isWebSearch = false) => {
    const modelConfigs = JSON.parse(localStorage.getItem('modelConfigs') || '[]');
    const selectedModel = localStorage.getItem('selectedModel') || (modelConfigs.length > 0 ? modelConfigs[0].model_name : '');
    const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
    const embeddingConfig = embeddingConfigs[0] || {};
    
    const currentConfig = getConfigForModel(selectedModel, modelConfigs);
    console.log('当前模型配置:', currentConfig);
    
    // 处理文档ID参数，确保它是数组形式
    let docIds = [];
    if (Array.isArray(documentIds)) {
      docIds = documentIds;
    } else if (documentIds) {
      docIds = [documentIds];
    }
    console.log('处理的文档IDs:', docIds);
    
    // 处理消息中的敏感信息
    let processedMessage = message;
    let originalMessage = message;
    
    if (sensitiveInfoProtectionEnabled) {
      ensureGlobalMapExists();
      processedMessage = maskSensitiveInfo(message);
      
      const queryMap = getSensitiveInfoMap();
      if (Object.keys(queryMap).length > 0) {
        updateGlobalSensitiveInfoMap(queryMap);
        
        // 保存查询映射和文档关联
        const queryMappings = JSON.parse(localStorage.getItem('querySensitiveMappings') || '{}');
        const queryId = Date.now().toString();
        queryMappings[queryId] = queryMap;
        localStorage.setItem('querySensitiveMappings', JSON.stringify(queryMappings));
        
        const docQueryMap = JSON.parse(localStorage.getItem('documentQueryMap') || '{}');
        docIds.forEach(docId => {
          if (!docQueryMap[docId]) {
            docQueryMap[docId] = [];
          }
          docQueryMap[docId].push(queryId);
        });
        localStorage.setItem('documentQueryMap', JSON.stringify(docQueryMap));
      }
    }
    
    // 处理历史消息中的敏感信息
    const processedMessages = requestMessages.map(msg => {
      // 保留系统消息
      if (msg.role === 'system') {
        return msg;
      }
      // 处理用户消息中的敏感信息
      if (sensitiveInfoProtectionEnabled && msg.role === 'user') {
        return {
          role: msg.role,
          content: maskSensitiveInfo(msg.content),
          reasoning_content: msg.reasoning_content || null
        };
      }
      // 保持 AI 消息不变，但确保包含推理内容
      return {
        role: msg.role,
        content: msg.content,
        reasoning_content: msg.reasoning_content || null
      };
    });

    const requestBody = {
      messages: [
        ...processedMessages,
        { role: 'user', content: processedMessage }
      ],
      model: selectedModel,
      base_url: currentConfig.base_url,
      api_key: currentConfig.api_key,
      model_name: currentConfig.model_name || selectedModel,
      document_ids: docIds,
      deep_research: isDeepResearch,
      web_search: isWebSearch,
      stream: true,
      sensitive_info_protected: sensitiveInfoProtectionEnabled,
      embedding_base_url: embeddingConfig?.embedding_base_url || '',
      embedding_api_key: embeddingConfig?.embedding_api_key || '',
      embedding_model_name: embeddingConfig?.embedding_model_name || ''
    };

    // 为了兼容性，如果只有一个文档ID，也添加document_id参数
    if (docIds.length === 1) {
      requestBody.document_id = docIds[0];
    }

    console.log('发送文档聊天请求数据:', {
      ...requestBody,
      api_key: '***',
      embedding_api_key: '***',
      messages: requestBody.messages.map(msg => ({
        role: msg.role,
        content: msg.content ? msg.content.substring(0, 50) + '...' : '',
        reasoning_content: msg.reasoning_content ? msg.reasoning_content.substring(0, 50) + '...' : null
      }))
    });

    const controller = new AbortController();
    setAbortController(controller);

    const response = await fetch(`${serverURL}/api/chat_with_doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
      credentials: 'include',
      mode: 'cors'
    });

    // 保存原始消息和处理后的消息，以便在显示时恢复
    if (sensitiveInfoProtectionEnabled) {
      setDisplayMessages(prev => {
        const lastUserMsgIndex = prev.findIndex(msg => 
          msg.role === 'user' && msg.content === processedMessage
        );
        
        if (lastUserMsgIndex !== -1) {
          const updatedMessages = [...prev];
          updatedMessages[lastUserMsgIndex] = {
            ...updatedMessages[lastUserMsgIndex],
            originalContent: originalMessage,
            isMasked: true
          };
          return updatedMessages;
        }
        
        return prev;
      });
    }

    return response;
  };

  /**
   * 切换敏感信息保护
   */
  const toggleSensitiveInfoProtection = () => {
    setSensitiveInfoProtectionEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('sensitiveInfoProtection', JSON.stringify(newValue));
      return newValue;
    });
  };

  return {
    input,
    setInput,
    sensitiveInfoProtectionEnabled,
    abortController,
    handleSubmit,
    handleRetry,
    handleEdit,
    sendChatRequest,
    sendDocumentChatRequest,
    toggleSensitiveInfoProtection
  };
}

export default useMessageSubmission; 