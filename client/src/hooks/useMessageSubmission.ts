import { useState, useCallback } from 'react';
import { Message, ChatState } from '../types';
import { apiService } from '../services/api';
import { generateMessageId, formatTime } from '../utils/messageUtils';

export const useMessageSubmission = ({
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
}: {
  displayMessages: ChatState['displayMessages'];
  setDisplayMessages: (messages: ChatState['displayMessages']) => void;
  requestMessages: ChatState['requestMessages'];
  setRequestMessages: (messages: ChatState['requestMessages']) => void;
  streaming: ChatState['streaming'];
  setStreaming: (streaming: ChatState['streaming']) => void;
  setCurrentResponse: (response: ChatState['currentResponse']) => void;
  setReasoningText: (text: ChatState['reasoningText']) => void;
  setIsReasoning: (isReasoning: ChatState['isReasoning']) => void;
  sessionHash: ChatState['sessionHash'];
  activeDocuments: ChatState['activeDocuments'];
  processStreamResponse: ChatState['processStreamResponse'];
  getConfigForModel: ChatState['getConfigForModel'];
  conversations: ChatState['conversations'];
  setConversations: (convs: ChatState['conversations']) => void;
}) => {
  const [input, setInput] = useState('');
  const [sensitiveInfoProtectionEnabled, setSensitiveInfoProtectionEnabled] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: generateMessageId(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setDisplayMessages(prev => [...prev, userMessage]);
    setRequestMessages(prev => [...prev, userMessage]);
    setInput('');
    setStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(false);

    try {
      const modelConfig = getConfigForModel(conversations.find(conv => conv.active)?.id || '');
      if (!modelConfig) throw new Error('未配置模型');

      const response = await apiService.sendMessage(input, sessionHash, modelConfig);
      if (!response.success) throw new Error(response.error || '发送消息失败');

      const assistantMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: response.data.message,
        timestamp: new Date().toISOString()
      };

      setDisplayMessages(prev => [...prev, assistantMessage]);
      setRequestMessages(prev => [...prev, assistantMessage]);

      // 更新当前会话的消息
      const currentConv = conversations.find(conv => conv.active);
      if (currentConv) {
        setConversations(prev => prev.map(conv =>
          conv.id === currentConv.id
            ? { ...conv, messages: [...conv.messages, userMessage, assistantMessage] }
            : conv
        ));
      }
    } catch (error) {
      console.error('发送消息错误:', error);
      const errorMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: '发送消息时发生错误，请稍后重试',
        timestamp: new Date().toISOString()
      };
      setDisplayMessages(prev => [...prev, errorMessage]);
    } finally {
      setStreaming(false);
    }
  }, [
    input,
    setDisplayMessages,
    setRequestMessages,
    setStreaming,
    setCurrentResponse,
    setReasoningText,
    setIsReasoning,
    getConfigForModel,
    conversations,
    setConversations,
    sessionHash
  ]);

  const handleRetry = useCallback(() => {
    if (requestMessages.length === 0) return;

    const lastUserMessage = requestMessages
      .filter(msg => msg.role === 'user')
      .slice(-1)[0];

    if (lastUserMessage) {
      setInput(lastUserMessage.content);
      handleSubmit();
    }
  }, [requestMessages, handleSubmit]);

  const handleEdit = useCallback((message: Message) => {
    if (message.role === 'user') {
      setInput(message.content);
      handleSubmit();
    }
  }, [handleSubmit]);

  const toggleSensitiveInfoProtection = useCallback(() => {
    setSensitiveInfoProtectionEnabled(prev => !prev);
  }, []);

  return {
    input,
    setInput,
    sensitiveInfoProtectionEnabled,
    handleSubmit,
    handleRetry,
    handleEdit,
    toggleSensitiveInfoProtection
  };
};

export type MessageSubmissionState = ReturnType<typeof useMessageSubmission>;
export type MessageSubmissionActions = MessageSubmissionState;
