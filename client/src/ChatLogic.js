import { useState, useRef, useEffect } from 'react';
import { maxHistoryLength, serverURL } from './Config';

// 辅助函数
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
      return activeConversation?.messages || [{ role: "system", content: "You are a helpful assistant." }];
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
  const [isReasoning, setIsReasoning] = useState(true);
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
          timestamp: Date.now()
        };
      }
      return conv;
    });

    // 更新状态和本地存储
    setDisplayMessages(newDisplayMessages);
    setRequestMessages([...requestMessages, {
      role: 'assistant',
      content: newMessage.content
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

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!input.trim() || streaming) return;

    // 获取当前选中模型的配置
    const currentConfig = getConfigForModel(selectedModel);
    
    const messageId = Date.now().toString();
    const newMessage = { 
      id: messageId,
      role: 'user', 
      content: input 
    };
    
    let updatedDisplayMessages = [...displayMessages, newMessage];
    let updatedRequestMessages = [...requestMessages, newMessage];
    
    setSentMessageId(messageId);
    setTimeout(() => setSentMessageId(null), 1000);
    
    const updatedConversations = conversations.map(conv => {
      if (conv.active) {
        const userMessages = conv.messages.filter(msg => msg.role === 'user');
        const isFirstUserMessage = userMessages.length === 0;
        
        return {
          ...conv,
          title: isFirstUserMessage 
            ? (input.length > 50 ? input.slice(0, 50) + '...' : input)
            : conv.title,
          lastMessage: input.length > 20 ? input.slice(0, 20) + '...' : input,
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
    setIsReasoning(true);

    const controller = new AbortController();
    setAbortController(controller);

    try {
      console.log('准备发送请求:', {
        selectedModel,
        activeDocument: activeDocument ? `使用文档 ${activeDocument.name}` : '未使用文档'
      });
      
      // 获取当前选中模型对应的embedding配置
      const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
      const embeddingConfig = embeddingConfigs[0] || {}; // 使用第一个embedding配置
      
      const requestBody = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          ...requestMessages.slice(-(currentTurns * 2)).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: 'user', content: input }
        ],
        model: selectedModel,
        base_url: currentConfig.base_url,
        api_key: currentConfig.api_key,
        model_name: currentConfig.model_name || selectedModel,
        embedding_base_url: embeddingConfig.embedding_base_url,
        embedding_api_key: embeddingConfig.embedding_api_key,
        embedding_model_name: embeddingConfig.embedding_model_name,
        ...(activeDocument && { document_id: activeDocument.id })
      };

      console.log('完整的请求数据:', {
        url: `${serverURL}/api${activeDocument ? '/chat_with_doc' : '/chat'}`,
        body: requestBody
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
        const errorData = await response.json();
        throw new Error(errorData.error || '请求失败');
      }
      await handleStreamResponse(response, updatedDisplayMessages);
      
      setHighlightedMessageId(messageId);
      setTimeout(() => setHighlightedMessageId(null), 500);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求被用户取消');
      } else {
        console.error('请求失败:', error);
        setStreaming(false);
        const errorMessage = {
          role: 'assistant',
          content: '请求失败：' + error.message
        };
        updateMessageHistory(updatedDisplayMessages, errorMessage);
      }
    } finally {
      setAbortController(null);
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
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';
    let reasoningText = '';
    let currentIsReasoning = true;

    try {
      setCurrentResponse('');
      setReasoningText('');
      setIsReasoning(true);
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5).trim();
            if (data === '[DONE]') {
              setStreaming(false);
              // 更新消息历史
              const newMessage = {
                role: 'assistant',
                content: responseText,
                reasoning_content: reasoningText
              };
              updateMessageHistory(currentMessages, newMessage);
            } else {
              try {
                const parsed = JSON.parse(data);
                // 检查是否有错误信息
                if (parsed.error) {
                  const errorCode = parsed.error.code;
                  let errorMessage = '发生错误';
                  
                  // 根据错误类型显示不同的错误信息
                  switch (errorCode) {
                    case 'AccountOverdueError':
                      errorMessage = '账户余额不足，请联系管理员充值';
                      break;
                    default:
                      errorMessage = parsed.error.message || '未知错误';
                  }
                  
                  throw new Error(errorMessage);
                }

                const content = parsed.choices[0]?.delta?.content;
                const reasoningContent = parsed.choices[0]?.delta?.reasoning_content;
                
                if (content) {
                  responseText += content;
                  setCurrentResponse(responseText);
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
                // 如果是我们抛出的错误，直接显示给用户
                if (e.message !== '解析响应出错') {
                  setStreaming(false);
                  const errorMessage = {
                    role: 'system',
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
          role: 'system',
          content: error.message || '处理响应时出错',
          error: true
        };
        updateMessageHistory(currentMessages, errorMessage);
      }
      // 确保停止流式响应
      setStreaming(false);
    }
  };

  // 处理重试
  const handleRetry = async (message) => {
    const messageIndex = displayMessages.findIndex(msg => msg === message);
    const previousMessages = displayMessages.slice(0, messageIndex);
    const requestMsgs = previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    setDisplayMessages(previousMessages);
    setRequestMessages(requestMsgs);
    
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(true);

    try {
      const controller = new AbortController();
      setAbortController(controller);
      
      const currentConfig = getConfigForModel(selectedModel);
      console.log('重试请求的模型配置:', currentConfig);

      const requestBody = {
        messages: requestMsgs,
        model: selectedModel,
        base_url: currentConfig.base_url,
        api_key: currentConfig.api_key,
        model_name: currentConfig.model_name,
        stream: true
      };
      
      console.log('重试请求的完整数据:', requestBody);

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
          content: '重试失败：' + error.message
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
      // 首先尝试使用 clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        console.log('复制成功(clipboard API):', text);
        return;
      }

      // 备用方案：使用传统的 execCommand
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
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
        console.log('复制成功(execCommand):', text);
      } catch (err) {
        console.error('execCommand 复制失败:', err);
      }
      
      document.body.removeChild(textArea);
    } catch (err) {
      console.error('复制失败:', err);
      
      // 最后的备用方案：提示用户手动复制
      window.prompt('请手动复制以下文本:', text);
    }
  };

  // 处理编辑
  const handleEdit = async (message, newContent) => {
    const messageIndex = displayMessages.findIndex(msg => msg === message);
    const previousMessages = displayMessages.slice(0, messageIndex);
    const editedMessage = { role: 'user', content: newContent };
    const updatedMessages = [...previousMessages, editedMessage];
    
    setDisplayMessages(updatedMessages);
    setRequestMessages([...previousMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    })), editedMessage]);
    
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(true);

    try {
      const currentConfig = getConfigForModel(selectedModel);
      console.log('编辑消息使用的模型配置:', currentConfig);
      
      const requestBody = {
        messages: [...previousMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })), editedMessage],
        model: selectedModel,
        base_url: currentConfig.base_url,
        api_key: currentConfig.api_key,
        model_name: currentConfig.model_name,
        stream: true
      };
      
      console.log('编辑请求的完整数据:', requestBody);

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

      await handleStreamResponse(response, updatedMessages);
    } catch (error) {
      console.error('编辑请求失败:', error);
      setStreaming(false);
      const errorMessage = {
        role: 'assistant', 
        content: '编辑请求失败：' + error.message
      };
      setDisplayMessages(prev => [...prev, errorMessage]);
      setRequestMessages(prev => [...prev, errorMessage]);
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
        return `${time} ${role}:\n${msg.content}\n`;
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

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    const formData = new FormData();
    
    // 获取当前选中模型对应的embedding配置
    const embeddingConfigs = JSON.parse(localStorage.getItem('embeddingConfigs') || '[]');
    const embeddingConfig = embeddingConfigs[0] || {}; // 使用第一个embedding配置
    
    // 添加文件和embedding配置参数
    for (let file of files) {
      formData.append('documents', file);
    }
    formData.append('embedding_base_url', embeddingConfig.embedding_base_url || '默认的embedding_base_url');
    formData.append('embedding_api_key', embeddingConfig.embedding_api_key || '默认的embedding_api_key');
    formData.append('embedding_model_name', embeddingConfig.embedding_model_name || '默认的embedding_model_name');
    
    try {
      const response = await fetch(`${serverURL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('上传失败');
      }
      
      // 显示上传成功消息
      setDisplayMessages(prev => [...prev, {
        role: 'system',
        content: '文档上传成功！现在你可以询问关于这些文档的问题了。'
      }]);
      
    } catch (error) {
      console.error('文件上传失败:', error);
      setDisplayMessages(prev => [...prev, {
        role: 'system',
        content: '文档上传失败：' + error.message
      }]);
    }
  };

  // 普通聊天请求
  const sendChatRequest = async (message) => {
    const currentConfig = getConfigForModel(selectedModel);
    console.log('当前模型配置:', currentConfig);
    console.log('当前对话轮数:', currentTurns);
    console.log('当前请求消息:', requestMessages);
    const headers = {
      'Content-Type': 'application/json',
    };

    const requestBody = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...requestMessages.slice(-(currentTurns * 2)).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
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
  const sendDocumentChatRequest = async (message, documentId) => {
    const currentConfig = getConfigForModel(selectedModel);
    const headers = {
      'Content-Type': 'application/json',
    };

    const requestBody = {
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...requestMessages.slice(-(currentTurns * 2)).map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        { role: 'user', content: message }
      ],
      model: selectedModel,
      base_url: currentConfig.base_url,
      api_key: currentConfig.api_key,
      model_name: currentConfig.model_name || selectedModel,  // 确保有 model_name
      embedding_base_url: currentConfig.embedding_base_url,
      embedding_api_key: currentConfig.embedding_api_key,
      embedding_model_name: currentConfig.embedding_model_name,
      document_id: documentId,
      stream: true
    };

    console.log('发送文档请求数据:', requestBody);  // 添加日志

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
    getConfigForModel
  };
};