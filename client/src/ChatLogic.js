import { useState, useRef, useEffect } from 'react';
import { maxHistoryLength, serverURL } from './Config';
// 导入敏感信息处理工具
import { 
  maskSensitiveInfo, 
  unmaskSensitiveInfo, 
  getSensitiveInfoMap, 
  clearSensitiveInfoMap,
  processSensitiveFile,
  ensureGlobalMapExists,
  updateGlobalSensitiveInfoMap,
  getAllDocumentMaps
} from './utils/SensitiveInfoMasker';

// 辅助函数
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

export const hashCode = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
};

export const getCurrentTurns = (msgs) => {
  return msgs.filter(msg => msg.role === 'user').length;
};

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

// 在文件顶部添加 updateState 函数的定义
const updateState = (setReasoningText, setCurrentResponse, scrollToBottom) => 
  (newReasoningText, newResponseText, isReasoning) => {
    requestAnimationFrame(() => {
      if (isReasoning) {
        setReasoningText(newReasoningText);
      } else {
        setCurrentResponse(newResponseText);
      }
      scrollToBottom();
    });
  };

export const useChatLogic = () => {
  // 所有状态定义放在最前面
  const [displayMessages, setDisplayMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      const activeConversation = parsed.find(conv => conv.active);
      return activeConversation?.messages || [{ role: "system", content: "You are a helpful assistant." }];
    }
    return [{ role: "system", content: "You are a helpful assistant." }];
  });

  const [requestMessages, setRequestMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      const activeConversation = parsed.find(conv => conv.active);
      return activeConversation?.requestMessages || [{ role: "system", content: "You are a helpful assistant." }];
    }
    return [{ role: "system", content: "You are a helpful assistant." }];
  });

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(() => {
    // 从 localStorage 获取用户配置的模型
    const savedConfigs = localStorage.getItem('modelConfigs');
    if (savedConfigs) {
      const configs = JSON.parse(savedConfigs);
      if (configs.length > 0 && configs[0].model_name) {
        return configs[0].model_name;
      }
    }
    // 如果没有配置,返回空字符串
    return '';
  });
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(chat => ({
        ...chat,
        title: chat.title || '新对话',
        lastMessage: chat.lastMessage || ''
      }));
    }
    return [{ 
      id: Date.now().toString(),
      title: '新对话',
      lastMessage: '',
      timestamp: Date.now(),
      active: true,
      messages: [{ role: "system", content: "You are a helpful assistant." }]
    }];
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editingTitleValue, setEditingTitleValue] = useState('');
  const [displayLimit, setDisplayLimit] = useState(20);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sentMessageId, setSentMessageId] = useState(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  const [currentTurns, setCurrentTurns] = useState(2);
  const [modelConfigs, setModelConfigs] = useState(() => {
    const saved = localStorage.getItem('modelConfigs');
    return saved ? JSON.parse(saved) : [];
  });
  const [availableModels, setAvailableModels] = useState(() => {
    const saved = localStorage.getItem('modelConfigs');
    const configs = saved ? JSON.parse(saved) : [];
    return configs
      .map(config => config.model_name)
      .filter(name => name && name.trim() !== '');
  });

  // Refs
  const chatContainerRef = useRef(null);
  const lastUserInteraction = useRef(Date.now());
  const isNearBottom = useRef(true);
  const lastScrollPosition = useRef(0);

  // 滚动相关函数
  const scrollToBottom = (force = false) => {
    if (!chatContainerRef.current) return;
    const { scrollHeight, clientHeight } = chatContainerRef.current;
    const shouldScroll = force || 
      (!userHasScrolled && Date.now() - lastUserInteraction.current > 2000);
    if (shouldScroll) {
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  };

  const handleScroll = (e) => {
    const { scrollTop } = e.target;
    if (scrollTop === 0 && !loadingHistory) {
      setLoadingHistory(true);
      setTimeout(() => {
        setDisplayLimit(prev => prev + 20);
        setLoadingHistory(false);
      }, 500);
    }
  };

  // 创建 updateState 实例
  const updateStateInstance = updateState(setReasoningText, setCurrentResponse, scrollToBottom);

  // 添加 updateMessageHistory 辅助函数
  const updateMessageHistory = (currentMessages, newMessage) => {
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

    // 更新状态和本地存储
    setDisplayMessages(newDisplayMessages);
    setRequestMessages([...requestMessages, {
      role: 'assistant',
      content: newMessage.content,
      sessionHash: newMessage.sessionHash  // 确保请求消息也包含会话哈希值
    }]);
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
  };

  // 消息处理函数
  const getConfigForModel = (modelName) => {
    console.log('获取模型配置, 当前选择的模型:', modelName);
    console.log('当前所有模型配置:', modelConfigs);
    console.log('可用的模型列表:', availableModels);
    
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

  const handleSubmit = async (e, isDeepResearch = false, isWebSearch = false) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    // 使用当前会话哈希值
    const currentSessionHash = sessionHash;
    console.log('提交消息，当前会话哈希值:', currentSessionHash);
    
    // 获取当前选中模型的配置
    const currentConfig = getConfigForModel(selectedModel);
    
    // 处理敏感信息
    let processedInput = input;
    let userOriginalInput = input;  // 重命名变量，避免重复声明
    let isMasked = false;
    
    if (sensitiveInfoProtectionEnabled) {
      console.log('敏感信息保护已启用，处理用户输入');
      
      // 使用会话哈希值处理敏感信息
      processedInput = maskSensitiveInfo(input, currentSessionHash);
      
      // 检查是否有敏感信息被掩码
      const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
      isMasked = possibleMaskPatterns.some(pattern => pattern.test(processedInput));
      
      if (isMasked) {
        console.log('用户输入包含敏感信息，已进行掩码处理');
        console.log('原始输入:', input);
        console.log('处理后输入:', processedInput);
      } else {
        console.log('用户输入不包含敏感信息，无需掩码处理');
        userOriginalInput = null;  // 如果没有敏感信息，不需要保存原始输入
      }
    } else {
      userOriginalInput = null;  // 如果未启用敏感信息保护，不需要保存原始输入
    }
    
    // 创建新的用户消息
    const newMessage = {
      role: 'user',
      content: processedInput,
      originalContent: userOriginalInput,
      isMasked: isMasked,
      id: Date.now().toString(),
      isDeepResearch: isDeepResearch,
      isWebSearch: isWebSearch,
      sessionHash: currentSessionHash  // 添加会话哈希值
    };
    
    let updatedDisplayMessages = [...displayMessages, newMessage];
    let updatedRequestMessages = [...requestMessages, {
      role: 'user',
      content: processedInput
    }];
    
    setSentMessageId(newMessage.id);
    setTimeout(() => setSentMessageId(null), 1000);
    
    const updatedConversations = conversations.map(conv => {
      if (conv.active) {
        const userMessages = conv.messages.filter(msg => msg.role === 'user');
        const isFirstUserMessage = userMessages.length === 0;
        
        return {
          ...conv,
          title: isFirstUserMessage 
            ? (userOriginalInput?.length > 50 ? userOriginalInput.slice(0, 50) + '...' : userOriginalInput)
            : conv.title,
          lastMessage: userOriginalInput?.length > 20 ? userOriginalInput.slice(0, 20) + '...' : userOriginalInput,
          messages: updatedDisplayMessages,
          timestamp: Date.now()
        };
      }
      return conv;
    });

    setDisplayMessages(updatedDisplayMessages);
    setRequestMessages(updatedRequestMessages);
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    setInput('');

    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 检查是否有必要的配置
      if (!isDeepResearch && (!currentConfig.base_url || !currentConfig.api_key)) {
        throw new Error('请先在设置中配置模型参数');
      }

      // 如果是文档聊天，检查 embedding 配置
      if (activeDocument) {
        const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
        const embeddingConfig = embeddingConfigs[0];
        if (!embeddingConfig?.embedding_base_url || !embeddingConfig?.embedding_api_key) {
          throw new Error('请先在设置中配置 Embedding 参数');
        }
      }

      console.log('准备发送请求:', {
        selectedModel,
        activeDocument: activeDocument ? `使用文档 ${activeDocument.name}` : '未使用文档',
        isDeepResearch: isDeepResearch ? '深度研究模式' : '普通模式',
        isWebSearch: isWebSearch ? '联网搜索' : '离线模式'
      });
      
      // 获取当前选中模型对应的embedding配置
      const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
      const embeddingConfig = embeddingConfigs[0] || {}; // 使用第一个embedding配置
      
      const requestBody = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...requestMessages.slice(-(currentTurns * 2)).slice(1).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: processedInput }
        ],
        model: selectedModel,
        base_url: currentConfig.base_url || '',
        api_key: currentConfig.api_key || '',
        model_name: currentConfig.model_name || selectedModel,
        embedding_base_url: embeddingConfig.embedding_base_url || '',
        embedding_api_key: embeddingConfig.embedding_api_key || '',
        embedding_model_name: embeddingConfig.embedding_model_name || '',
        document_id: activeDocument?.id || '',
        stream: true,
        deep_research: isDeepResearch,
        web_search: isWebSearch  // 添加联网搜索参数
      };

      console.log('完整的请求数据:', {
        url: `${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`,
        body: {
          ...requestBody,
          api_key: '***',
          embedding_api_key: '***'
        }
      });

      const response = await fetch(`${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`, {
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.code === 'MissingParameter') {
          throw new Error('缺少必要参数，请检查模型配置是否完整');
        } else if (errorData.error?.code === 'TimeoutError') {
          throw new Error('请求超时，请稍后重试或减少搜索范围');
        } else if (errorData.error?.code === 'MemoryError') {
          throw new Error('服务器内存不足，请稍后重试或减少搜索范围');
        } else {
          throw new Error(errorData.error?.message || '请求失败，请稍后重试');
        }
      }
      await handleStreamResponse(response, updatedDisplayMessages);
      
      setHighlightedMessageId(newMessage.id);
      setTimeout(() => setHighlightedMessageId(null), 500);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
      } else {
        console.error('请求失败:', error);
        setStreaming(false);
        const errorMessage = {
          role: 'assistant',
          content: error.message || '请求失败，请稍后重试',
          error: true
        };
        updateMessageHistory(updatedDisplayMessages, errorMessage);
      }
    } finally {
      setAbortController(null);
      setStreaming(false);
    }
  };

  // 处理停止生成
  const handleStop = async () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    setStreaming(false);
    
    // 如果有已生成的内容，保存为一条消息
    if (currentResponse || reasoningText) {
      const newMessage = {
        role: 'assistant',
        content: currentResponse,
        reasoning_content: reasoningText
      };
      updateMessageHistory(displayMessages, newMessage);
    }
  };

  // 处理流式响应
  const handleStreamResponse = async (response, currentMessages) => {
    if (!response.ok) {
      const errorText = await response.text();
      console.error('响应错误:', errorText);
      throw new Error(`服务器错误: ${response.status} ${errorText}`);
    }
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let responseText = '';
    let reasoningText = '';
    let currentIsReasoning = false;
    let lastResponseTime = Date.now();
    
    // 在函数内部使用会话哈希值
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
          if (line.startsWith('data: ')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              setStreaming(false);
              
              // 处理AI回复中可能包含的掩码信息
              let finalResponse = responseText;
              let sensitiveMap = {};
              let isMasked = false;
              
              if (sensitiveInfoProtectionEnabled) {
                // 确保全局映射表存在
                ensureGlobalMapExists();
                console.log('处理AI回复，当前全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap || {}).length);
                console.log('当前会话哈希值:', currentSessionHash);
                
                // 检查响应中是否包含掩码标识符
                const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
                const hasPossibleMasks = possibleMaskPatterns.some(pattern => pattern.test(responseText));
                
                if (hasPossibleMasks) {
                  console.log('AI回复中包含掩码标识符，尝试使用会话映射表进行反映射');
                  
                  // 获取当前会话的映射表
                  const sessionMap = window.currentSensitiveInfoMap[currentSessionHash] || {};
                  console.log('当前会话映射表条目数:', Object.keys(sessionMap).length);
                  
                  // 提取文本中的所有掩码标识符
                  const maskIdsInText = [];
                  possibleMaskPatterns.forEach(pattern => {
                    const matches = responseText.match(new RegExp(pattern, 'g'));
                    if (matches) {
                      maskIdsInText.push(...matches);
                    }
                  });
                  
                  if (maskIdsInText.length > 0) {
                    console.log('AI回复中包含的掩码标识符:', maskIdsInText);
                    
                    // 检查掩码标识符是否在会话映射表中
                    const missingMaskIds = maskIdsInText.filter(id => !sessionMap[id]);
                    
                    if (missingMaskIds.length > 0) {
                      console.warn('警告：以下掩码标识符在会话映射表中不存在:', missingMaskIds);
                      
                      // 获取所有文档的映射表
                      const allMaps = getAllDocumentMaps();
                      console.log('获取所有文档的映射表，文档数:', Object.keys(allMaps).length);
                      
                      // 创建一个合并的映射表，包含会话映射表和所有文档的映射
                      const mergedMap = {...sessionMap};
                      
                      // 遍历所有文档的映射表，查找缺失的掩码标识符
                      let foundMissingMappings = false;
                      Object.entries(allMaps).forEach(([docHash, docMap]) => {
                        if (typeof docMap === 'object' && docHash !== currentSessionHash) {
                          missingMaskIds.forEach(id => {
                            if (docMap[id] && !mergedMap[id]) {
                              mergedMap[id] = docMap[id];
                              console.log(`从文档 ${docHash} 的映射表添加缺失的映射: ${id} => ${docMap[id]}`);
                              
                              // 同时更新会话映射表
                              if (window.currentSensitiveInfoMap[currentSessionHash]) {
                                window.currentSensitiveInfoMap[currentSessionHash][id] = docMap[id];
                                console.log(`将映射 ${id} => ${docMap[id]} 添加到会话 ${currentSessionHash} 的映射表`);
                              }
                              
                              foundMissingMappings = true;
                            }
                          });
                        }
                      });
                      
                      if (foundMissingMappings) {
                        console.log('使用合并后的映射表进行反映射，映射条目数:', Object.keys(mergedMap).length);
                        finalResponse = unmaskSensitiveInfo(responseText, mergedMap);
                        sensitiveMap = {...mergedMap};
                        isMasked = true;
                        
                        // 将更新后的会话映射表保存到localStorage
                        try {
                          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
                          console.log('已将更新后的全局映射表保存到localStorage');
                        } catch (error) {
                          console.error('保存全局映射表到localStorage时出错:', error);
                        }
                      } else {
                        console.warn('在所有文档的映射表中都没有找到缺失的掩码标识符');
                        finalResponse = responseText;
                        sensitiveMap = {...sessionMap};
                        isMasked = true;
                      }
                    } else {
                      console.log('所有掩码标识符在会话映射表中都存在，可以进行反映射');
                      finalResponse = unmaskSensitiveInfo(responseText, sessionMap);
                      sensitiveMap = {...sessionMap};
                      isMasked = true;
                    }
                  } else {
                    console.log('AI回复中没有检测到掩码标识符，无需反映射');
                  }
                } else {
                  console.log('AI回复不包含掩码标识符，无需反映射');
                }
              } else {
                console.log('敏感信息保护未启用，不进行反映射');
              }
              
              // 强制设置isMasked为true，确保显示反映射按钮
              isMasked = true;
              
              const newMessage = {
                role: 'assistant',
                content: responseText,  // 保存原始响应内容
                originalContent: isMasked ? responseText : null,  // 原始掩码内容
                reasoning_content: reasoningText,
                sensitiveMap: sensitiveMap,  // 添加映射，可能为空
                isMasked: isMasked,  // 设置为true，以便显示反映射按钮
                sessionHash: currentSessionHash  // 添加会话哈希值
              };
              
              console.log('添加新的助手消息:', {
                isMasked,
                hasSensitiveMap: !!newMessage.sensitiveMap,
                mapSize: newMessage.sensitiveMap ? Object.keys(newMessage.sensitiveMap).length : 0,
                hasOriginalContent: !!newMessage.originalContent,
                contentLength: newMessage.content.length,
                originalContentLength: newMessage.originalContent ? newMessage.originalContent.length : 0,
                sessionHash: newMessage.sessionHash
              });
              
              updateMessageHistory(currentMessages, newMessage);
            } else {
              try {
                const parsed = JSON.parse(data);
                if (parsed.error) {
                  const errorCode = parsed.error.code;
                  let errorMessage = '发生错误';
                  
                  switch (errorCode) {
                    case 'TimeoutError':
                      errorMessage = '请求超时，请稍后重试或减少搜索范围';
                      break;
                    case 'MemoryError':
                      errorMessage = '服务器内存不足，请稍后重试或减少搜索范围';
                      break;
                    case 'AccountOverdueError':
                      errorMessage = '账户余额不足，请联系管理员充值';
                      break;
                    default:
                      errorMessage = parsed.error.message || '未知错误，请稍后重试';
                  }
                  
                  throw new Error(errorMessage);
                }

                const content = parsed.choices[0]?.delta?.content;
                const reasoningContent = parsed.choices[0]?.delta?.reasoning_content;
                
                if (content) {
                  responseText += content;
                  
                  // 实时显示响应内容，如果启用了敏感信息保护，尝试反映射
                  let displayContent = responseText;
                  if (sensitiveInfoProtectionEnabled) {
                    // 获取当前的敏感信息映射
                    const currentMap = getSensitiveInfoMap();
                    
                    // 尝试反映射，但不更新sensitiveMap
                    if (Object.keys(currentMap).length > 0) {
                      displayContent = unmaskSensitiveInfo(responseText, currentMap);
                    }
                  }
                  
                  setCurrentResponse(displayContent);
                  if (currentIsReasoning) {
                    currentIsReasoning = false;
                    setIsReasoning(false);
                  }
                }
                if (reasoningContent) {
                  reasoningText += reasoningContent;
                  setReasoningText(reasoningText);
                  setIsReasoning(true);
                }
              } catch (e) {
                if (e.message !== '解析响应出错') {
                  setStreaming(false);
                  const errorMessage = {
                    role: 'assistant',
                    content: e.message,
                    error: true
                  };
                  updateMessageHistory(currentMessages, errorMessage);
                  throw e;
                } else {
                  console.error('解析响应出错:', e);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
      } else {
        console.error('流式处理错误:', error);
        setStreaming(false);
        const errorMessage = {
          role: 'assistant',
          content: error.message || '处理响应时出错，请稍后重试',
          error: true
        };
        updateMessageHistory(currentMessages, errorMessage);
      }
      // 确保停止流式响应
      setStreaming(false);
    }
  };

  // 处理重试
  const handleRetry = async (message, isDeepResearch = false, isWebSearch = false) => {
    const messageIndex = displayMessages.findIndex(msg => msg === message);
    const previousMessages = displayMessages.slice(0, messageIndex);
    
    // 使用当前会话哈希值
    const currentSessionHash = sessionHash;
    console.log('重试消息，当前会话哈希值:', currentSessionHash);
    
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
        const processedContent = maskSensitiveInfo(userContent, currentSessionHash);
        
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
      sessionHash: msg.sessionHash || currentSessionHash
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
      
      const currentConfig = getConfigForModel(selectedModel);
      console.log('重试请求的模型配置:', currentConfig);

      // 检查是否有必要的配置
      if (!isDeepResearch && (!currentConfig.base_url || !currentConfig.api_key)) {
        throw new Error('请先在设置中配置模型参数');
      }

      // 如果是文档聊天，检查 embedding 配置
      if (activeDocument) {
        const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
        const embeddingConfig = embeddingConfigs[0];
        if (!embeddingConfig?.embedding_base_url || !embeddingConfig?.embedding_api_key) {
          throw new Error('请先在设置中配置 Embedding 参数');
        }
      }

      console.log('准备重试请求:', {
        selectedModel,
        activeDocument: activeDocument ? `使用文档 ${activeDocument.name}` : '未使用文档',
        isDeepResearch: isDeepResearch ? '深度研究模式' : '普通模式',
        isWebSearch: isWebSearch ? '联网搜索' : '离线模式',
        sessionHash: currentSessionHash
      });

      // 获取当前选中模型对应的embedding配置
      const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
      const embeddingConfig = embeddingConfigs[0] || {}; // 使用第一个embedding配置

      const requestBody = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...requestMsgs.slice(-(currentTurns * 2)).slice(1)
        ],
        model: selectedModel,
        base_url: currentConfig.base_url || '',
        api_key: currentConfig.api_key || '',
        model_name: currentConfig.model_name || selectedModel,
        embedding_base_url: embeddingConfig.embedding_base_url || '',
        embedding_api_key: embeddingConfig.embedding_api_key || '',
        embedding_model_name: embeddingConfig.embedding_model_name || '',
        document_id: activeDocument?.id || '',
        stream: true,
        deep_research: isDeepResearch,
        web_search: isWebSearch,  // 添加联网搜索参数
        session_hash: currentSessionHash  // 添加会话哈希值
      };
      
      console.log('重试请求的完整数据:', {
        url: `${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`,
        body: {
          ...requestBody,
          api_key: '***',
          embedding_api_key: '***'
        }
      });

      const response = await fetch(`${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`, {
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

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      await handleStreamResponse(response, previousMessages);
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
      } else {
        console.error('重试失败:', error);
        setStreaming(false);
        const errorMessage = {
          role: 'assistant',
          content: '重试失败：' + error.message,
          sessionHash: currentSessionHash
        };
        updateMessageHistory(previousMessages, errorMessage);
      }
    } finally {
      setAbortController(null);
    }
  };

  // 处理新对话
  const handleNewChat = () => {
    const newConversation = {
      id: Date.now().toString(),
      title: '新对话',
      active: true,
      messages: [{ role: "system", content: "You are a helpful assistant." }],
      timestamp: Date.now()
    };

    const updatedConversations = conversations.map(conv => ({
      ...conv,
      active: false
    }));
    updatedConversations.unshift(newConversation);

    setConversations(updatedConversations);
    setDisplayMessages(newConversation.messages);
    setRequestMessages(newConversation.messages);
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
  };

  // 处理对话点击
  const handleConversationClick = (conv) => {
    const updatedConversations = conversations.map(c => ({
      ...c,
      active: c.id === conv.id
    }));
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
    
    setCurrentResponse('');
    setReasoningText('');
    setStreaming(false);
    
    const messages = conv.messages || [{ role: "system", content: "You are a helpful assistant." }];
    setDisplayMessages(messages);
    setRequestMessages(messages.map(msg => ({
      role: msg.role,
      content: msg.content
    })));

    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 处理删除对话
  const handleDeleteConversation = (e, convId) => {
    e.stopPropagation();
    
    const updatedConversations = conversations.filter(conv => conv.id !== convId);
    if (updatedConversations.length > 0) {
      if (conversations.find(conv => conv.id === convId)?.active) {
        updatedConversations[0].active = true;
        setDisplayMessages(updatedConversations[0].messages);
        setRequestMessages(updatedConversations[0].messages);
      }
    } else {
      updatedConversations.push({
        id: Date.now().toString(),
        title: '新对话',
        active: true,
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        timestamp: Date.now()
      });
    }
    
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    setConversations(updatedConversations);
  };

  // 处理清除所有对话
  const handleClearAll = () => {
    if (window.confirm('确定要清除所有对话吗？')) {
      const newConversation = {
        id: Date.now().toString(),
        title: '新对话',
        active: true,
        messages: [{ role: "system", content: "You are a helpful assistant." }],
        timestamp: Date.now()
      };
      
      setConversations([newConversation]);
      setDisplayMessages(newConversation.messages);
      setRequestMessages(newConversation.messages);
      localStorage.setItem('chatHistory', JSON.stringify([newConversation]));
    }
  };

  // 处理复制
  const handleCopy = async (text) => {
    if (!text) return;
    
    try {
      // 检查是否需要对文本进行反映射处理
      let processedText = text;
      
      // 查找对应的消息
      const message = displayMessages.find(msg => msg.content === text);
      
      // 如果找到消息且有敏感信息映射，进行反映射
      if (message && sensitiveInfoProtectionEnabled) {
        // 如果是用户消息且有原始内容，使用原始内容
        if (message.role === 'user' && message.originalContent) {
          processedText = message.originalContent;
        }
        // 如果是AI消息且有敏感信息映射，进行反映射
        else if (message.role === 'assistant') {
          // 如果已经有反映射后的内容，直接使用
          if (message.originalContent) {
            processedText = message.originalContent;
          } 
          // 如果有敏感信息映射，使用映射进行反映射
          else if (message.sensitiveMap && Object.keys(message.sensitiveMap).length > 0) {
            processedText = unmaskSensitiveInfo(message.content, message.sensitiveMap);
          }
          // 如果没有映射但内容中包含掩码标识符，尝试使用全局映射表
          else {
            // 检查内容中是否包含掩码标识符
            const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
            const contentHasMasks = message.content && possibleMaskPatterns.some(pattern => pattern.test(message.content));
            
            if (contentHasMasks) {
              console.log('内容中包含掩码标识符，但消息没有映射信息');
              
              // 检查全局映射表是否可用
              if (window.currentSensitiveInfoMap && Object.keys(window.currentSensitiveInfoMap).length > 0) {
                console.log('使用全局映射表进行反映射');
                processedText = unmaskSensitiveInfo(message.content, window.currentSensitiveInfoMap);
              }
            }
          }
        }
      }
      
      // 首先尝试使用 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(processedText);
        console.log('复制成功(clipboard API):', processedText);
        
        // 显示复制成功提示
        const toast = document.createElement('div');
        toast.textContent = '已复制到剪贴板';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '8px 16px';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '1000';
        document.body.appendChild(toast);
        
        // 2秒后移除提示
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
        
        return;
      }
      
      // 备用方案：使用传统的 execCommand
      const textArea = document.createElement('textarea');
      textArea.value = processedText;
      
      // 防止滚动
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.opacity = '0';
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        console.log('复制成功(execCommand):', processedText);
        
        // 显示复制成功提示
        const toast = document.createElement('div');
        toast.textContent = '已复制到剪贴板';
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.padding = '8px 16px';
        toast.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        toast.style.color = 'white';
        toast.style.borderRadius = '4px';
        toast.style.zIndex = '1000';
        document.body.appendChild(toast);
        
        // 2秒后移除提示
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
      } catch (err) {
        console.error('execCommand 复制失败:', err);
        
        // 最后的备用方案：提示用户手动复制
        window.prompt('请手动复制以下文本:', processedText);
      }
      
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('复制失败:', err);
      
      // 最后的备用方案：提示用户手动复制
      window.prompt('请手动复制以下文本:', text);
    }
  };

  // 处理编辑
  const handleEdit = async (message, newContent, isDeepResearch = false, isWebSearch = false) => {
    const messageIndex = displayMessages.findIndex(msg => msg === message);
    const previousMessages = displayMessages.slice(0, messageIndex);
    
    // 使用当前会话哈希值
    const currentSessionHash = sessionHash;
    console.log('编辑消息，当前会话哈希值:', currentSessionHash);
    
    // 处理敏感信息
    let processedInput = newContent;
    let userOriginalInput = newContent;
    let isMasked = false;
    
    if (sensitiveInfoProtectionEnabled) {
      console.log('敏感信息保护已启用，处理编辑后的用户输入');
      
      // 使用会话哈希值处理敏感信息
      processedInput = maskSensitiveInfo(newContent, currentSessionHash);
      
      // 检查是否有敏感信息被掩码
      const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
      isMasked = possibleMaskPatterns.some(pattern => pattern.test(processedInput));
      
      if (isMasked) {
        console.log('编辑后的用户输入包含敏感信息，已进行掩码处理');
        console.log('原始输入:', newContent);
        console.log('处理后输入:', processedInput);
      } else {
        console.log('编辑后的用户输入不包含敏感信息，无需掩码处理');
        userOriginalInput = null;  // 如果没有敏感信息，不需要保存原始输入
      }
    } else {
      userOriginalInput = null;  // 如果未启用敏感信息保护，不需要保存原始输入
    }
    
    // 创建编辑后的消息
    const editedMessage = {
      role: 'user', 
      content: processedInput,
      originalContent: userOriginalInput,
      isMasked: isMasked,
      id: Date.now().toString(),
      isDeepResearch: isDeepResearch,
      isWebSearch: isWebSearch,
      sessionHash: currentSessionHash  // 添加会话哈希值
    };
    
    const updatedMessages = [...previousMessages, editedMessage];
    
    setDisplayMessages(updatedMessages);
    setRequestMessages([...previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      sessionHash: msg.sessionHash || currentSessionHash
    })), editedMessage]);
    
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);

    try {
      const currentConfig = getConfigForModel(selectedModel);
      console.log('编辑消息使用的模型配置:', currentConfig);

      // 检查是否有必要的配置
      if (!isDeepResearch && (!currentConfig.base_url || !currentConfig.api_key)) {
        throw new Error('请先在设置中配置模型参数');
      }

      // 如果是文档聊天，检查 embedding 配置
      if (activeDocument) {
        const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
        const embeddingConfig = embeddingConfigs[0];
        if (!embeddingConfig?.embedding_base_url || !embeddingConfig?.embedding_api_key) {
          throw new Error('请先在设置中配置 Embedding 参数');
        }
      }

      // 获取当前选中模型对应的embedding配置
      const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
      const embeddingConfig = embeddingConfigs[0] || {}; // 使用第一个embedding配置
      
      const requestBody = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...previousMessages.slice(-(currentTurns * 2)).slice(1).map(msg => ({
            role: msg.role,
            content: msg.content,
            sessionHash: msg.sessionHash || currentSessionHash
          })), 
          editedMessage
        ],
        model: selectedModel,
        base_url: currentConfig.base_url || '',
        api_key: currentConfig.api_key || '',
        model_name: currentConfig.model_name || selectedModel,
        embedding_base_url: embeddingConfig.embedding_base_url || '',
        embedding_api_key: embeddingConfig.embedding_api_key || '',
        embedding_model_name: embeddingConfig.embedding_model_name || '',
        document_id: activeDocument?.id || '',
        stream: true,
        deep_research: isDeepResearch,
        web_search: isWebSearch,  // 添加联网搜索参数
        session_hash: currentSessionHash  // 添加会话哈希值
      };
      
      console.log('编辑请求的完整数据:', {
        url: `${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`,
        body: {
          ...requestBody,
          api_key: '***',
          embedding_api_key: '***'
        }
      });

      const response = await fetch(`${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(requestBody),
        credentials: 'include',
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`API 请求失败: ${response.status}`);
      }

      await handleStreamResponse(response, updatedMessages);
    } catch (error) {
      console.error('编辑请求失败:', error);
      setStreaming(false);
      const errorMessage = {
        role: 'assistant', 
        content: '编辑请求失败：' + error.message,
        sessionHash: currentSessionHash
      };
      updateMessageHistory(updatedMessages, errorMessage);
    }
  };

  // 处理导出
  const handleExport = () => {
    const activeConversation = conversations.find(conv => conv.active);
    if (!activeConversation) return;

    const messages = activeConversation.messages
      .filter(msg => msg.role !== 'system')
      .map(msg => {
        const time = new Date().toLocaleString('zh-CN');
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
          // 如果有敏感信息映射，使用映射进行反映射
          else if (msg.sensitiveMap && Object.keys(msg.sensitiveMap).length > 0) {
            content = unmaskSensitiveInfo(msg.content, msg.sensitiveMap);
          }
          // 如果没有映射但内容中包含掩码标识符，尝试使用全局映射表
          else {
            // 检查内容中是否包含掩码标识符
            const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
            const contentHasMasks = msg.content && possibleMaskPatterns.some(pattern => pattern.test(msg.content));
            
            if (contentHasMasks && window.currentSensitiveInfoMap && Object.keys(window.currentSensitiveInfoMap).length > 0) {
              console.log('导出时使用全局映射表进行反映射');
              content = unmaskSensitiveInfo(msg.content, window.currentSensitiveInfoMap);
            }
          }
        }
        
        return `${time} ${role}:\n${content}\n`;
      })
      .join('\n');

    const blob = new Blob([messages], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `聊天记录_${activeConversation.title}_${new Date().toLocaleDateString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Effects
  useEffect(() => {
    if (streaming) {
      scrollToBottom();
    }
  }, [currentResponse, reasoningText, streaming]);

  useEffect(() => {
    if (!streaming) {
      scrollToBottom(true);
      setUserHasScrolled(false);
    }
  }, [displayMessages.length]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // 添加敏感信息处理状态
  const [sensitiveInfoProtectionEnabled, setSensitiveInfoProtectionEnabled] = useState(() => {
    const saved = localStorage.getItem('sensitiveInfoProtection');
    return saved ? JSON.parse(saved) : true; // 默认启用
  });

  // 文件上传处理
  const handleFileUpload = async (files, embeddingConfig, setActiveDocument, setUploadStatus, sensitiveInfoProtectionEnabled) => {
    if (!files || files.length === 0) {
      console.error('没有选择文件');
      return null;
    }

    // 检查文件类型，如果启用了敏感信息保护，只允许上传文本文件和PDF文件
    if (sensitiveInfoProtectionEnabled) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isTextFile = file.type.includes('text') || file.type.includes('json') || 
                          file.type.includes('csv') || file.name.endsWith('.txt') || 
                          file.name.endsWith('.json') || file.name.endsWith('.csv');
        const isPdfFile = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        
        if (!isTextFile && !isPdfFile) {
          alert(`敏感信息保护模式下只能上传文本文件和PDF文件。${file.name} 不是支持的文件类型。`);
          return null;
        }
      }
    }

    try {
      setUploadStatus('uploading');
      const formData = new FormData();
      
      // 用于跟踪处理后的文件
      const processedFiles = [];
      // 用于存储处理结果
      const processResults = [];
      
      // 处理每个文件
      for (let i = 0; i < files.length; i++) {
        let fileToUpload = files[i];
        let sensitiveMap = {};
        
        // 如果启用了敏感信息保护，处理文件内容
        if (sensitiveInfoProtectionEnabled) {
          try {
            console.log(`开始处理文件敏感信息: ${files[i].name}`);
            
            // 先读取原始文件内容，用于调试
            const reader = new FileReader();
            reader.readAsText(files[i]);
            await new Promise((resolve) => {
              reader.onload = (event) => {
                const content = event.target.result;
                console.log(`原始文件内容长度: ${content.length}`);
                console.log(`原始文件内容示例: ${content.substring(0, 200)}...`);
                resolve();
              };
            });
            
            // 处理文件敏感信息
            const result = await processSensitiveFile(files[i]);
            fileToUpload = result.processedFile;
            sensitiveMap = result.sensitiveMap;
            
            console.log(`文件处理完成: ${files[i].name} -> ${fileToUpload.name}`);
            console.log(`敏感信息映射条目数: ${Object.keys(sensitiveMap).length}`);
            
            // 读取处理后的文件内容，用于调试
            const processedReader = new FileReader();
            processedReader.readAsText(fileToUpload);
            await new Promise((resolve) => {
              processedReader.onload = (event) => {
                const content = event.target.result;
                console.log(`处理后文件内容长度: ${content.length}`);
                console.log(`处理后文件内容示例: ${content.substring(0, 200)}...`);
                resolve();
              };
            });
            
            // 保存处理后的文件信息
            processedFiles.push(fileToUpload);
            
            // 保存处理结果
            processResults.push({
              originalFile: files[i],
              processedFile: fileToUpload,
              sensitiveMap: sensitiveMap
            });
            
            // 保存敏感信息映射到localStorage，使用掩码处理后的文件名作为键
            if (Object.keys(sensitiveMap).length > 0) {
              const mapKey = `sensitiveMap_${fileToUpload.name}`;
              localStorage.setItem(mapKey, JSON.stringify(sensitiveMap));
              console.log(`文件 ${files[i].name} 的敏感信息已保存到 ${mapKey}`);
            }
          } catch (error) {
            console.error('处理文件敏感信息时出错:', error);
            // 不再使用原始文件，而是中止上传并提示用户
            setUploadStatus('error');
            alert(`处理文件 ${files[i].name} 的敏感信息时出错: ${error.message}`);
            return null;
          }
        } else {
          // 如果不启用敏感信息保护，直接使用原始文件
          processedFiles.push(fileToUpload);
          processResults.push({
            originalFile: files[i],
            processedFile: fileToUpload,
            sensitiveMap: {}
          });
        }
        
        // 使用正确的参数名 'documents'
        console.log(`添加文件到表单: ${fileToUpload.name}, 大小: ${fileToUpload.size} 字节`);
        formData.append('documents', fileToUpload);
      }
      
      // 添加embedding配置
      if (embeddingConfig) {
        formData.append('embedding_base_url', embeddingConfig.embedding_base_url || '');
        formData.append('embedding_api_key', embeddingConfig.embedding_api_key || '');
        formData.append('embedding_model_name', embeddingConfig.embedding_model_name || '');
      }
      
      // 添加敏感信息保护标志
      formData.append('sensitive_info_protected', sensitiveInfoProtectionEnabled ? 'true' : 'false');

      // 在上传前检查文件内容
      if (sensitiveInfoProtectionEnabled && processedFiles.length > 0) {
        console.log('准备检查处理后的文件内容...');
        
        // 检查是否为PDF文件，如果是则跳过内容检查
        const isPdfFile = processedFiles[0].type === 'application/pdf' || processedFiles[0].name.endsWith('.pdf');
        if (isPdfFile) {
          console.log('检测到PDF文件，跳过内容检查');
        } else {
          const checkFileContent = async () => {
            try {
              return new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = (event) => {
                  const content = event.target.result;
                  console.log(`上传前检查文件内容: ${processedFiles[0].name}`);
                  console.log(`文件内容示例: ${content.substring(0, 200)}...`);
                  // 检查是否包含手机号码
                  const phoneRegex = /\b1\d{10}\b/;
                  const containsPhone = phoneRegex.test(content);
                  console.log(`文件是否包含未掩码的手机号码: ${containsPhone}`);
                  
                  if (containsPhone) {
                    console.error('警告：掩码处理后的文件仍包含未掩码的手机号码');
                    // 如果文件仍包含敏感信息，中止上传
                    reject(new Error('掩码处理失败：文件仍包含未掩码的敏感信息'));
                  } else {
                    resolve();
                  }
                };
                fileReader.readAsText(processedFiles[0]);
              });
            } catch (error) {
              console.error('读取文件内容时出错:', error);
              throw error;
            }
          };
          
          try {
            await checkFileContent();
          } catch (error) {
            setUploadStatus('error');
            alert(`上传前检查失败: ${error.message}`);
            return null;
          }
        }
      }

      // 使用正确的API端点路径 '/upload'
      console.log('发送上传请求到:', `${serverURL}/upload`);
      const response = await fetch(`${serverURL}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });

      const result = await response.json();
      console.log('上传响应:', result);
      
      if (result.document_id) {
        setUploadStatus('success');
        
        // 更新处理结果中的文档ID
        for (let i = 0; i < processResults.length; i++) {
          if (processResults[i].processedFile) {
            processResults[i].processedFile.id = result.document_id;
          }
        }
        
        // 根据敏感信息保护状态显示不同的成功消息
        if (sensitiveInfoProtectionEnabled) {
          const fileNames = processedFiles.map(f => f.name).join(', ');
          alert(`文件上传成功！敏感信息已被保护。\n\n文档ID: ${result.document_id}\n\n上传的文件: ${fileNames}\n\n注意：上传的是经过掩码处理的文件，原始敏感信息已在本地保存，不会发送到服务器。`);
        } else {
          const fileNames = files.map(f => f.name).join(', ');
          alert(`文件上传成功！文档ID: ${result.document_id}\n\n上传的文件: ${fileNames}\n\n注意：文件未经敏感信息处理，如有敏感内容请谨慎使用。`);
        }
        
        // 返回处理结果
        return processResults;
      } else {
        setUploadStatus('error');
        alert(`上传失败: ${result.error || '未知错误'}`);
        return null;
      }
    } catch (error) {
      console.error('上传文件时出错:', error);
      setUploadStatus('error');
      alert(`上传出错: ${error.message}`);
      return null;
    }
  };

  // 修改sendChatRequest函数
  const sendChatRequest = async (message) => {
    const currentConfig = getConfigForModel(selectedModel);
    console.log('当前模型配置:', currentConfig);
    console.log('当前对话轮数:', currentTurns);
    console.log('当前请求消息:', requestMessages);
    const headers = {
      'Content-Type': 'application/json',
    };

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
      base_url: currentConfig.base_url,
      api_key: currentConfig.api_key,
      model_name: currentConfig.model_name || selectedModel,  // 确保有 model_name
      stream: true
    };

    console.log('发送请求数据:', requestBody);  // 添加日志

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

  // 带文档的聊天请求
  const sendDocumentChatRequest = async (message, documentId, isDeepResearch = false, isWebSearch = false) => {
    const currentConfig = getConfigForModel(selectedModel);
    console.log('当前模型配置:', currentConfig);
    console.log('当前对话轮数:', currentTurns);
    console.log('当前请求消息:', requestMessages);
    
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
        
        // 将当前查询ID与文档ID关联
        const docQueryMap = JSON.parse(localStorage.getItem('documentQueryMap') || '{}');
        if (!docQueryMap[documentId]) {
          docQueryMap[documentId] = [];
        }
        docQueryMap[documentId].push(queryId);
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
      base_url: currentConfig.base_url,
      api_key: currentConfig.api_key,
      model_name: currentConfig.model_name || selectedModel,
      document_id: documentId,
      deep_research: isDeepResearch,
      web_search: isWebSearch,
      stream: true,
      sensitive_info_protected: sensitiveInfoProtectionEnabled
    };

    console.log('发送文档聊天请求数据:', requestBody);

    const response = await fetch(`${serverURL}/api/document_chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
      credentials: 'include',
      mode: 'cors'
    });

    // 保存原始消息和处理后的消息，以便在显示时恢复
    if (sensitiveInfoProtectionEnabled) {
      setDisplayMessages(prev => {
        // 找到最后一条用户消息
        const lastUserMsgIndex = prev.findIndex(msg => 
          msg.role === 'user' && msg.content === processedMessage
        );
        
        if (lastUserMsgIndex !== -1) {
          // 添加原始消息作为元数据
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

  // 处理设置保存
  const handleSettingsSave = (settings) => {
    const { configs, modelNames } = settings;
    setModelConfigs(configs);
    
    // 更新可用模型列表
    const updatedModels = [...new Set([...modelNames])];
    setAvailableModels(updatedModels);
    
    // 如果当前选中的模型不在更新后的列表中，选择第一个可用模型
    if (!updatedModels.includes(selectedModel)) {
      setSelectedModel(updatedModels[0]);
    }
  };

  // 添加敏感信息保护开关函数
  const toggleSensitiveInfoProtection = () => {
    setSensitiveInfoProtectionEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('sensitiveInfoProtection', JSON.stringify(newValue));
      return newValue;
    });
  };

  // 初始化会话哈希值
  const [sessionHash, setSessionHash] = useState('');
  useEffect(() => {
    const hash = generateSessionHash();
    setSessionHash(hash);
    console.log('初始化会话哈希值:', hash);
    
    // 确保全局映射表存在
    ensureGlobalMapExists();
    
    // 为当前会话创建一个空的映射表
    if (window.currentSensitiveInfoMap && !window.currentSensitiveInfoMap[hash]) {
      window.currentSensitiveInfoMap[hash] = {};
      console.log(`为会话 ${hash} 创建空映射表`);
      
      // 将更新后的全局映射表保存到localStorage
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        console.log('已将更新后的全局映射表保存到localStorage');
      } catch (error) {
        console.error('保存全局映射表到localStorage时出错:', error);
      }
    }
  }, []);

  return {
    displayMessages,
    setDisplayMessages,
    input,
    setInput,
    selectedModel,
    setSelectedModel,
    streaming,
    currentResponse,
    reasoningText,
    isReasoning,
    darkMode,
    setDarkMode,
    conversations,
    isSidebarExpanded,
    chatContainerRef,
    handleSubmit,
    handleStop,
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll,
    handleExport,
    handleRetry,
    handleCopy,
    handleEdit,
    handleScroll,
    formatTime,
    currentTurns,
    highlightedMessageId,
    loadingHistory,
    sendChatRequest,
    sendDocumentChatRequest,
    activeDocument,
    setActiveDocument,
    handleToggleSidebar: () => setIsSidebarExpanded(prev => !prev),
    availableModels,
    setAvailableModels,
    setModelConfigs,
    getConfigForModel,
    sensitiveInfoProtectionEnabled,
    toggleSensitiveInfoProtection,
    handleFileUpload,
    sessionHash
  };
};