// API请求相关的函数
import { serverURL } from '../Config';
import { maskSensitiveInfo, updateGlobalSensitiveInfoMap, getSensitiveInfoMap, ensureGlobalMapExists } from '../utils/SensitiveInfoMasker';

// 发送普通聊天请求
export const sendChatRequest = async (message, requestMessages, currentTurns, selectedModel, modelConfig, sessionHash, sensitiveInfoProtectionEnabled, isDeepResearch = false, isWebSearch = false) => {
  console.log('当前模型配置:', modelConfig);
  console.log('当前对话轮数:', currentTurns);
  console.log('当前请求消息:', requestMessages);
  console.log('深度研究模式:', isDeepResearch);
  console.log('联网搜索模式:', isWebSearch);
  
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
      
      // 将新的敏感信息映射合并到全局映射表中
      updateGlobalSensitiveInfoMap(queryMap);
      console.log('更新后全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
    }
  }

  // 处理历史消息中的敏感信息
  const processedMessages = requestMessages.slice(-(currentTurns * 2)).slice(1).map(msg => {
    if (sensitiveInfoProtectionEnabled && msg.role === 'user') {
      return {
        role: msg.role,
        content: maskSensitiveInfo(msg.content)
      };
    }
    return {
      role: msg.role,
      content: msg.content
    };
  });

  const requestBody = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...processedMessages,
      { role: 'user', content: processedMessage }
    ],
    model: selectedModel,
    base_url: modelConfig.base_url,
    api_key: modelConfig.api_key,
    model_name: modelConfig.model_name || selectedModel,  // 确保有 model_name
    stream: true,
    deep_research: isDeepResearch,
    web_search: isWebSearch,
    session_hash: sessionHash
  };

  console.log('发送请求数据:', {
    ...requestBody,
    api_key: '***' // 隐藏 API 密钥
  });

  const response = await fetch(`${serverURL}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
    credentials: 'include',
    mode: 'cors'
  });

  return response;
};

// 发送文档聊天请求
export const sendDocumentChatRequest = async (message, documentIds, requestMessages, currentTurns, selectedModel, modelConfig, embeddingConfig, sessionHash, sensitiveInfoProtectionEnabled, isDeepResearch = false, isWebSearch = false) => {
  console.log('当前模型配置:', modelConfig);
  console.log('当前对话轮数:', currentTurns);
  console.log('当前请求消息:', requestMessages);
  
  // 处理文档ID参数，确保它是数组形式
  let docIds = [];
  if (Array.isArray(documentIds)) {
    docIds = documentIds;
  } else if (documentIds) {
    docIds = [documentIds]; // 兼容单个文档ID的情况
  }
  console.log('处理的文档IDs:', docIds);
  
  // 处理消息中的敏感信息
  let processedMessage = message;
  let originalMessage = message;
  
  if (sensitiveInfoProtectionEnabled) {
    // 不再清除之前的敏感信息映射，而是确保全局映射表存在
    ensureGlobalMapExists();
    console.log('保持全局敏感信息映射表，当前条目数:', Object.keys(window.currentSensitiveInfoMap || {}).length);
    
    // 掩码处理消息
    processedMessage = maskSensitiveInfo(message);
    
    // 获取并保存当前查询的敏感信息映射
    const queryMap = getSensitiveInfoMap();
    if (Object.keys(queryMap).length > 0) {
      console.log('查询中的敏感信息已被掩码处理:', queryMap);
      
      // 将新的敏感信息映射合并到全局映射表中
      updateGlobalSensitiveInfoMap(queryMap);
      console.log('更新后全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
      
      // 保存查询映射到localStorage
      const queryMappings = JSON.parse(localStorage.getItem('querySensitiveMappings') || '{}');
      const queryId = Date.now().toString();
      queryMappings[queryId] = queryMap;
      localStorage.setItem('querySensitiveMappings', JSON.stringify(queryMappings));
      
      // 将当前查询ID与所有文档ID关联
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
  const processedMessages = requestMessages.slice(-(currentTurns * 2)).slice(1).map(msg => {
    if (sensitiveInfoProtectionEnabled && msg.role === 'user') {
      return {
        role: msg.role,
        content: maskSensitiveInfo(msg.content)
      };
    }
    return {
      role: msg.role,
      content: msg.content
    };
  });

  const requestBody = {
    messages: [
      { role: 'system', content: 'You are a helpful assistant.' },
      ...processedMessages,
      { role: 'user', content: processedMessage }
    ],
    model: selectedModel,
    base_url: modelConfig.base_url,
    api_key: modelConfig.api_key,
    model_name: modelConfig.model_name || selectedModel,
    document_ids: docIds,  // 使用文档ID列表
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
    embedding_api_key: '***'
  });

  const response = await fetch(`${serverURL}/api/chat_with_doc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(requestBody),
    credentials: 'include',
    mode: 'cors'
  });

  return response;
}; 