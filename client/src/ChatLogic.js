import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
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

export const useChatLogic = () => {
  // 所有状态定义放在最前面
  const [displayMessages, setDisplayMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      const activeConversation = parsed.find(conv => conv.active);
      return activeConversation?.messages?.map(msg => ({
        ...msg,
        reasoning_content: msg.reasoning_content || null  // 确保加载推理内容
      })) || [{ role: "system", content: "You are a helpful assistant." }];
    }
    return [{ role: "system", content: "You are a helpful assistant." }];
  });

  const [requestMessages, setRequestMessages] = useState(() => {
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsed = JSON.parse(saved);
      const activeConversation = parsed.find(conv => conv.active);
      return activeConversation?.messages?.map(msg => ({
        role: msg.role,
        content: msg.content,
        reasoning_content: msg.reasoning_content || null  // 确保加载推理内容
      })) || [{ role: "system", content: "You are a helpful assistant." }];
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
      // 确保每个会话都有activeDocuments字段
      const parsedConversations = JSON.parse(saved);
      return parsedConversations.map(conv => ({
        ...conv,
        activeDocuments: conv.activeDocuments || []
      }));
    }
    return [];
  });
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [availableModels, setAvailableModels] = useState(() => {
    const saved = localStorage.getItem('availableModels');
    return saved ? JSON.parse(saved) : [];
  });
  const [modelConfigs, setModelConfigs] = useState(() => {
    const saved = localStorage.getItem('modelConfigs');
    return saved ? JSON.parse(saved) : [];
  });
  const [embeddingConfig, setEmbeddingConfig] = useState(() => {
    const saved = localStorage.getItem('embeddingConfigs');
    return saved ? JSON.parse(saved)[0] : null;
  });
  const [activeDocuments, setActiveDocuments] = useState(() => {
    // 从当前活动会话中获取活动文档
    const saved = localStorage.getItem('chatHistory');
    if (saved) {
      const parsedConversations = JSON.parse(saved);
      const activeConv = parsedConversations.find(conv => conv.active);
      if (activeConv && activeConv.activeDocuments) {
        console.log('从活动会话中恢复活动文档:', activeConv.activeDocuments);
        return activeConv.activeDocuments;
      }
    }
    return [];
  });
  const [sessionHash, setSessionHash] = useState(() => {
    // 尝试从localStorage获取会话哈希值
    const saved = localStorage.getItem('sessionHash');
    if (saved) {
      return saved;
    }
    // 如果没有，生成一个新的
    const newHash = generateSessionHash();
    localStorage.setItem('sessionHash', newHash);
    return newHash;
  });
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [abortController, setAbortController] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50); // 默认显示50条消息

  // 计算当前对话轮数
  const currentTurns = useMemo(() => {
    return displayMessages.filter(msg => msg.role === 'user').length;
  }, [displayMessages]);

  // Refs
  const chatContainerRef = useRef(null);
  const lastUserInteraction = useRef(Date.now());
  const isNearBottom = useRef(true);
  const lastScrollPosition = useRef(0);

  // 滚动相关函数
  const scrollToBottom = useCallback((force = false) => {
    if (!chatContainerRef.current) return;
    const { scrollHeight, clientHeight } = chatContainerRef.current;
    const shouldScroll = force || 
      (!userHasScrolled && Date.now() - lastUserInteraction.current > 2000);
    if (shouldScroll) {
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [userHasScrolled]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    
    // 检测用户是否手动滚动
    if (Math.abs(lastScrollPosition.current - scrollTop) > 10) {
      setUserHasScrolled(true);
      lastUserInteraction.current = Date.now();
    }
    
    // 检测是否滚动到底部
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      setUserHasScrolled(false);
    }
    
    // 保存最后的滚动位置
    lastScrollPosition.current = scrollTop;
    
    // 加载更多历史消息
    if (scrollTop === 0 && !loadingHistory) {
      setLoadingHistory(true);
      setTimeout(() => {
        setDisplayLimit(prev => prev + 20);
        setLoadingHistory(false);
      }, 500);
    }
  };

  // 将 updateState 函数移到 hook 内部
  const updateStateInstance = useMemo(() => {
    return (newReasoningText, newResponseText, isReasoning) => {
      requestAnimationFrame(() => {
        if (isReasoning) {
          setReasoningText(newReasoningText);
        } else {
          setCurrentResponse(newResponseText);
        }
        scrollToBottom();
      });
    };
  }, [setReasoningText, setCurrentResponse, scrollToBottom]);

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

  // 当用户提交表单时隐藏敏感信息编辑器
  const handleSubmit = async (e, isDeepResearch = false, isWebSearch = false) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    // 创建新消息
    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now()
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

    // 更新显示消息
    setDisplayMessages(prev => {
      const newMessages = [...prev, newMessage];
      
      // 更新本地存储
      const updatedConversations = conversations.map(conv => {
        if (conv.active) {
          return {
            ...conv,
            messages: newMessages.map(msg => ({
              ...msg,
              reasoning_content: msg.reasoning_content || null  // 确保推理内容被保存
            })),
            timestamp: Date.now(),
            activeDocuments: activeDocuments || [] // 保存活动文档
          };
        }
        return conv;
      });
      localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
      setConversations(updatedConversations);
      
      return newMessages;
    });
    
    // 更新请求消息
    setRequestMessages(prev => [...prev, newMessage]);
    
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
      await handleResponse(response, newMessage.id);
    } catch (error) {
      console.error('处理请求时出错:', error);
      setStreaming(false);
      
      // 添加错误消息
      const errorMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `发生错误: ${error.message}`,
        timestamp: Date.now(),
        error: true
      };
      
      setDisplayMessages(prev => [...prev, errorMessage]);
      setRequestMessages(prev => [...prev, errorMessage]);
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
  const handleResponse = async (response, messageId) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || '请求失败，请稍后重试');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    let reasoningContent = '';  // 用于累积当前轮的思考过程
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
                        console.log('未找到缺失的映射，使用原始响应');
                        finalResponse = responseText;
                      }
                    } else {
                      console.log('所有掩码标识符都在会话映射表中，使用会话映射表进行反映射');
                      finalResponse = unmaskSensitiveInfo(responseText, sessionMap);
                      sensitiveMap = {...sessionMap};
                      isMasked = true;
                    }
                  } else {
                    console.log('未在AI回复中找到掩码标识符，使用原始响应');
                    finalResponse = responseText;
                  }
                } else {
                  console.log('AI回复中不包含掩码标识符，使用原始响应');
                  finalResponse = responseText;
                }
              }
              
              // 添加AI回复消息，同时包含思考过程和内容
              const aiMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: responseText,
                reasoning_content: reasoningContent,  // 使用累积的思考过程
                originalContent: isMasked ? finalResponse : null,
                sensitiveMap: isMasked ? sensitiveMap : null,
                isMasked: isMasked,
                timestamp: Date.now(),
                sessionHash: currentSessionHash
              };
              
              // 更新显示消息和请求消息
              setDisplayMessages(prev => {
                const newMessages = [...prev, aiMessage];
                
                // 保存到localStorage
                const activeConversation = JSON.parse(localStorage.getItem('chatHistory') || '[]')
                  .find(conv => conv.active);
                
                if (activeConversation) {
                  // 更新活动会话的消息
                  const updatedHistory = JSON.parse(localStorage.getItem('chatHistory') || '[]')
                    .map(conv => {
                      if (conv.active) {
                        return {
                          ...conv,
                          messages: newMessages.map(msg => ({
                            id: msg.id,
                            role: msg.role,
                            content: msg.content,
                            timestamp: msg.timestamp,
                            sessionHash: msg.sessionHash,
                            reasoning_content: msg.reasoning_content || null,
                          })),
                          activeDocuments: activeDocuments || [] // 保存活动文档
                        };
                      }
                      return conv;
                    });
                  
                  localStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
                }
                
                return newMessages;
              });
              
              setRequestMessages(prev => [...prev, {
                role: 'assistant',
                content: responseText,
                reasoning_content: reasoningContent,  // 使用累积的思考过程
                sessionHash: currentSessionHash
              }]);
              
              // 高亮消息
              setHighlightedMessageId(messageId);
              setTimeout(() => setHighlightedMessageId(null), 500);
              
              break;
            }
            
            try {
              const parsedData = JSON.parse(data);
              
              // 处理推理内容
              if (parsedData.choices && 
                  parsedData.choices[0] && 
                  parsedData.choices[0].delta && 
                  parsedData.choices[0].delta.reasoning_content) {
                const content = parsedData.choices[0].delta.reasoning_content;
                reasoningContent += content;  // 累积思考过程
                setReasoningText(reasoningContent);  // 更新显示的思考过程
                setIsReasoning(true);
              }
              // 处理正常内容
              else if (parsedData.choices && 
                       parsedData.choices[0] && 
                       parsedData.choices[0].delta && 
                       parsedData.choices[0].delta.content) {
                const content = parsedData.choices[0].delta.content;
                responseText += content;
                setCurrentResponse(responseText);
                setIsReasoning(false);
              }
              // 处理新格式的内容
              else if (parsedData.content !== undefined) {
                const content = parsedData.content;
                responseText += content;
                setCurrentResponse(responseText);
                setIsReasoning(false);
              }
            } catch (e) {
              console.error('解析数据时出错:', e, 'data:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('处理流式响应时出错:', error);
      throw error;
    }
  };

  // 处理重试
  const handleRetry = async (message, isDeepResearch = false, isWebSearch = false) => {
    // 确保 message 对象存在
    if (!message) {
      console.error('重试失败: message 对象为空');
      return;
    }
    
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
      if (activeDocuments && activeDocuments.length > 0) {
        const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
        const embeddingConfig = embeddingConfigs[0];
        if (!embeddingConfig?.embedding_base_url || !embeddingConfig?.embedding_api_key) {
          throw new Error('请先在设置中配置 Embedding 参数');
        }
      }

      console.log('准备重试请求:', {
        selectedModel,
        activeDocuments: activeDocuments && activeDocuments.length > 0 ? `使用文档 ${activeDocuments.map(doc => doc.name).join(', ')}` : '未使用文档',
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
        document_ids: activeDocuments && activeDocuments.length > 0 ? activeDocuments.map(doc => doc.id) : [],
        stream: true,
        deep_research: isDeepResearch,
        web_search: isWebSearch,  // 添加联网搜索参数
        session_hash: currentSessionHash  // 添加会话哈希值
      };
      
      // 为了兼容性，如果只有一个文档ID，也添加document_id参数
      if (activeDocuments && activeDocuments.length === 1) {
        requestBody.document_id = activeDocuments[0].id;
      }
      
      console.log('重试请求的完整数据:', {
        url: `${serverURL}/api${activeDocuments && activeDocuments.length > 0 ? '/chat_with_doc' : '/chat'}`,
        body: {
          ...requestBody,
          api_key: '***',
          embedding_api_key: '***'
        }
      });

      const response = await fetch(`${serverURL}/api${activeDocuments && activeDocuments.length > 0 ? '/chat_with_doc' : '/chat'}`, {
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

      // 生成一个临时消息ID，用于高亮显示
      const tempMessageId = Date.now().toString();
      await handleResponse(response, tempMessageId);
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
    localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
    
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
    
    // 使用setTimeout确保DOM更新后再滚动
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
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
      localStorage.setItem('chatHistory', JSON.stringify([newConversation]));
      
      // 更新当前会话哈希值
      setSessionHash(newSessionHash);
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
    }
  };

  // 处理复制
  const handleCopy = async (text) => {
    try {
      let processedText = text;
      
      // 如果启用了敏感信息保护，尝试获取原始内容
      if (sensitiveInfoProtectionEnabled) {
        // 首先检查是否有原始内容
        if (message.originalContent) {
          processedText = message.originalContent;
        }
        // 如果有敏感信息映射，使用映射进行反映射
        else if (message.sensitiveMap && Object.keys(message.sensitiveMap).length > 0) {
          processedText = unmaskSensitiveInfo(message.content, message.sensitiveMap, sessionHash);
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
              processedText = unmaskSensitiveInfo(message.content, window.currentSensitiveInfoMap, sessionHash);
            }
          }
        }
      }
      
      await navigator.clipboard.writeText(processedText);
      console.log('文本已复制到剪贴板');
      
      // 显示成功提示
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (error) {
      console.error('复制文本时出错:', error);
    }
  };

  // 处理编辑
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
      id: message.id || Date.now().toString() // 确保消息有ID
    };
    
    const updatedMessages = [...previousMessages, updatedMessage];
    
    setDisplayMessages(updatedMessages);
    setRequestMessages([...previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content,
      reasoning_content: msg.reasoning_content || null,  // 保留推理内容
      sessionHash: msg.sessionHash || currentSessionHash
    })), updatedMessage]);
    
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
      if (activeDocuments) {
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
          updatedMessage
        ],
        model: selectedModel,
        base_url: currentConfig.base_url || '',
        api_key: currentConfig.api_key || '',
        model_name: currentConfig.model_name || selectedModel,
        embedding_base_url: embeddingConfig.embedding_base_url || '',
        embedding_api_key: embeddingConfig.embedding_api_key || '',
        embedding_model_name: embeddingConfig.embedding_model_name || '',
        document_id: activeDocuments ? activeDocuments[0].id : '',
        stream: true,
        deep_research: isDeepResearch,
        web_search: isWebSearch,  // 添加联网搜索参数
        session_hash: currentSessionHash  // 添加会话哈希值
      };
      
      console.log('编辑请求的完整数据:', {
        url: `${serverURL}/api${activeDocuments ? '/chat_with_doc' : '/chat'}`,
        body: {
          ...requestBody,
          api_key: '***',
          embedding_api_key: '***'
        }
      });

      const response = await fetch(`${serverURL}/api${activeDocuments ? '/chat_with_doc' : '/chat'}`, {
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

      // 生成一个临时消息ID，用于高亮显示
      const tempMessageId = updatedMessage.id || Date.now().toString();
      await handleResponse(response, tempMessageId);
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
  const handleFileUpload = async (files, embeddingConfig, setActiveDocuments, setUploadStatus, sensitiveInfoProtectionEnabled) => {
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
  const sendChatRequest = async (message, isDeepResearch = false, isWebSearch = false) => {
    const currentConfig = getConfigForModel(selectedModel);
    console.log('当前模型配置:', currentConfig);
    console.log('当前对话轮数:', currentTurns);
    console.log('当前请求消息:', requestMessages);
    console.log('深度研究模式:', isDeepResearch);
    console.log('联网搜索模式:', isWebSearch);
    
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
  const sendDocumentChatRequest = async (message, documentIds, isDeepResearch = false, isWebSearch = false) => {
    const currentConfig = getConfigForModel(selectedModel);
    console.log('当前模型配置:', currentConfig);
    console.log('当前对话轮数:', currentTurns);
    console.log('当前请求消息:', requestMessages);
    
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
    activeDocuments,
    setActiveDocuments,
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