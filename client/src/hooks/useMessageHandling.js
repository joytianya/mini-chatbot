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
              console.log('收到数据:', data); // 增加日志显示
              
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
      
      // 更新显示消息
      setDisplayMessages(prev => [...prev, aiMessage]);
      
      // 更新请求消息
      setRequestMessages(prev => [...prev, {
        role: 'assistant',
        content: responseText,
        reasoningContent: reasoningText, // 保存思考过程内容
        sessionHash: currentSessionHash  // 确保请求消息也包含会话哈希值
      }]);
      
      // 更新对话历史，保持当前对话的所有属性
      const updatedConversations = conversations.map(conv => {
        if (conv.active) {
          // 获取当前显示的所有消息加上新消息
          const currentMessages = [...displayMessages, aiMessage];
          
          // 获取第一条用户消息作为标题（如果还没有标题）
          const firstUserMessage = currentMessages.find(msg => msg.role === 'user');
          const title = conv.title === '新对话' && firstUserMessage 
            ? firstUserMessage.content.slice(0, 30) 
            : conv.title;
          
          return {
            ...conv,
            title,
            messages: currentMessages,
            timestamp: Date.now(),
            sessionHash: currentSessionHash  // 确保对话也包含会话哈希值
          };
        }
        return conv;
      });
      
      // 保存到localStorage
      localStorage.setItem('chatHistory', JSON.stringify(updatedConversations));
      setConversations(updatedConversations);
      
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
      const currentTurns = displayMessages.filter(msg => msg.role === 'user').length + 1;
      
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
  
  return {
    isLoading,
    currentResponse,
    reasoningText,
    isReasoning,
    highlightedMessageId,
    setHighlightedMessageId,
    sendChatRequestWrapper,
    sendDocumentChatRequestWrapper,
    handleStop,
    handleResponse
  };
}; 