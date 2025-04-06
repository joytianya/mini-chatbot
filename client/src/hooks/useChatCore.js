import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { generateSessionHash, getCurrentTurns } from '../utils/sessionUtils';
import { updateMessageHistory } from '../utils/messageUtils';
import { serverURL } from '../Config';

/**
 * 核心聊天功能Hook
 * @returns {Object} 核心聊天功能和状态
 */
function useChatCore() {
  // 状态定义
  const [displayMessages, setDisplayMessages] = useState(() => {
    const saved = localStorage.getItem('conversations');
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
    const saved = localStorage.getItem('conversations');
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

  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(50); // 默认显示50条消息
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
  const [abortController, setAbortController] = useState(null);

  // 计算当前对话轮数
  const currentTurns = useMemo(() => {
    return getCurrentTurns(displayMessages);
  }, [displayMessages]);

  // 滚动相关
  const chatContainerRef = useRef(null);
  const lastUserInteraction = useRef(Date.now());
  const isNearBottom = useRef(true);
  const lastScrollPosition = useRef(0);
  const [userHasScrolled, setUserHasScrolled] = useState(false);

  // 滚动到底部的函数
  const scrollToBottom = useCallback((force = false) => {
    if (!chatContainerRef.current) return;
    const { scrollHeight, clientHeight } = chatContainerRef.current;
    const shouldScroll = force || 
      (!userHasScrolled && Date.now() - lastUserInteraction.current > 2000);
    if (shouldScroll) {
      chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
    }
  }, [userHasScrolled]);

  // 处理滚动事件
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

  // 更新状态的函数
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
        id: Date.now().toString(),
        role: 'assistant',
        content: currentResponse,
        reasoning_content: reasoningText,
        timestamp: Date.now(),
        sessionHash
      };
      const { updatedMessages } = updateMessageHistory(displayMessages, newMessage, sessionHash, []);
      setDisplayMessages(updatedMessages);
    }
  };

  // 流式响应处理的通用函数
  const processStreamResponse = async (response, messageId, conversations) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || '请求失败，请稍后重试');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    let reasoningContent = '';  // 用于累积当前轮的思考过程
    let lastResponseTime = Date.now();
    
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
              
              // 添加AI回复消息，同时包含思考过程和内容
              const aiMessage = {
                id: Date.now().toString(),
                role: 'assistant',
                content: responseText,
                reasoning_content: reasoningContent,  // 使用累积的思考过程
                timestamp: Date.now(),
                sessionHash
              };
              
              // 更新显示消息
              const { updatedMessages } = updateMessageHistory(displayMessages, aiMessage, sessionHash, conversations);
              setDisplayMessages(updatedMessages);
              
              // 更新请求消息
              setRequestMessages(prev => [...prev, {
                role: 'assistant',
                content: responseText,
                reasoning_content: reasoningContent,
                sessionHash
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

  // 获取模型配置的函数
  const getConfigForModel = (modelName, modelConfigs) => {
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

  // 基本聊天请求函数
  const sendChatRequest = async (message, selectedModel, modelConfigs, requestMessages, 
                               isDeepResearch = false, isWebSearch = false, sensitiveInfoProtectionEnabled = false) => {
    const currentConfig = getConfigForModel(selectedModel, modelConfigs);
    console.log('当前模型配置:', currentConfig);
    console.log('当前对话轮数:', currentTurns);
    console.log('当前请求消息:', requestMessages);
    console.log('深度研究模式:', isDeepResearch);
    console.log('联网搜索模式:', isWebSearch);
    
    // 处理消息内容
    let processedMessage = message;
    
    // 处理历史消息
    const processedMessages = requestMessages.map(msg => {
      // 保留系统消息
      if (msg.role === 'system') {
        return msg;
      }
      
      // 保持消息不变，但确保包含推理内容
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

  // Effects
  useEffect(() => {
    if (streaming) {
      scrollToBottom();
    }
  }, [currentResponse, reasoningText, streaming, scrollToBottom]);

  useEffect(() => {
    if (!streaming) {
      scrollToBottom(true);
      setUserHasScrolled(false);
    }
  }, [displayMessages.length, streaming, scrollToBottom]);

  return {
    // 状态
    displayMessages,
    setDisplayMessages,
    requestMessages,
    setRequestMessages,
    streaming,
    setStreaming,
    currentResponse,
    setCurrentResponse,
    reasoningText,
    setReasoningText,
    isReasoning,
    setIsReasoning,
    sessionHash,
    setSessionHash,
    highlightedMessageId,
    setHighlightedMessageId,
    loadingHistory,
    setLoadingHistory,
    userHasScrolled,
    setUserHasScrolled,
    abortController,
    setAbortController,
    currentTurns,
    
    // Refs
    chatContainerRef,
    lastUserInteraction,
    isNearBottom,
    lastScrollPosition,
    
    // 函数
    scrollToBottom,
    handleScroll,
    updateStateInstance,
    handleStop,
    processStreamResponse,
    getConfigForModel,
    sendChatRequest
  };
}

export default useChatCore; 