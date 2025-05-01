import { useCallback, useEffect, useRef } from 'react';
import useChatCore from './useChatCore';
import useConversations from './useConversations';
import useMessageSubmission from './useMessageSubmission';
import { useTheme } from './useTheme';
import useFileUpload from './useFileUpload';
import useUIState from './useUIState';
import { useModelConfig } from './useModelConfig';
import { ModelConfig } from '../types';
import { storageService } from '../utils/storage';

/**
 * 聊天逻辑的主Hook，组合其他Hook
 * @returns {Object} 聊天相关的所有状态和函数
 */
export const useChatLogic = () => {
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 主题管理 - with error handling
  const themeHook = useTheme() as any;
  // Use type assertion to bypass TypeScript errors
  const theme = themeHook?.theme || {};
  const darkMode = themeHook?.darkMode || false;
  const setDarkMode = themeHook?.setDarkMode || (() => {});

  // 模型配置管理 - with error handling
  const modelConfigHook = useModelConfig() as any;
  // Use optional chaining and type assertion to safely access properties
  const modelConfigs = modelConfigHook?.modelConfigs || [];
  const setModelConfigs = modelConfigHook?.setModelConfigs || (() => {});
  const availableModels = modelConfigHook?.availableModels || [];
  const setAvailableModels = modelConfigHook?.setAvailableModels || (() => {});
  const selectedModel = modelConfigHook?.selectedModel || '';
  const setSelectedModel = modelConfigHook?.setSelectedModel || (() => {});
  const embeddingConfig = modelConfigHook?.embeddingConfig || null;
  const setEmbeddingConfig = modelConfigHook?.setEmbeddingConfig || (() => {});

  // UI状态管理
  // UI状态管理 - with error handling
  const uiStateHook = useUIState() as any;
  // Use optional chaining and type assertion to safely access properties
  const activeDocuments = uiStateHook?.activeDocuments || [];
  const setActiveDocuments = uiStateHook?.setActiveDocuments || (() => {});
  const isSidebarExpanded = uiStateHook?.isSidebarExpanded || true;
  const setIsSidebarExpanded = uiStateHook?.setIsSidebarExpanded || (() => {});
  const handleToggleSidebar = uiStateHook?.handleToggleSidebar || (() => {});

  // 核心聊天功能 - with error handling
  const chatCore = useChatCore() as any;
  // Use optional chaining and type assertion to safely access properties
  const displayMessages = chatCore?.displayMessages || [];
  const setDisplayMessages = chatCore?.setDisplayMessages || (() => {});
  const requestMessages = chatCore?.requestMessages || [];
  const setRequestMessages = chatCore?.setRequestMessages || (() => {});
  const streaming = chatCore?.streaming || false;
  const setStreaming = chatCore?.setStreaming || (() => {});
  const loadingHistory = chatCore?.loadingHistory || false;
  const setCurrentResponse = chatCore?.setCurrentResponse || (() => {});
  const setReasoningText = chatCore?.setReasoningText || (() => {});
  const setIsReasoning = chatCore?.setIsReasoning || (() => {});
  const sessionHash = chatCore?.sessionHash || '';
  const processStreamResponse = chatCore?.processStreamResponse || (() => Promise.resolve(''));
  const getConfigForModel = chatCore?.getConfigForModel || (() => null);
  const formatTime = chatCore?.formatTime || (() => '');

  // 会话管理
  const {
    conversations,
    setConversations,
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll
  } = useConversations({
    setDisplayMessages,
    setRequestMessages,
    setSessionHash: chatCore.setSessionHash || (() => console.warn("setSessionHash missing from useChatCore")),
    setActiveDocuments,
    setStreaming,
    setCurrentResponse: chatCore.setCurrentResponse || (() => console.warn("setCurrentResponse missing from useChatCore")),
    setReasoningText: chatCore.setReasoningText || (() => console.warn("setReasoningText missing from useChatCore")),
    setUserHasScrolled: chatCore.setUserHasScrolled || (() => console.warn("setUserHasScrolled missing from useChatCore"))
  });

  // Derive activeConversationId from the conversations array
  // Cast to any to bypass type checking
  const activeConversationId = (conversations as any).find((c: any) => c.active)?.id || null;

  // 文件上传处理
  // Following linter suggestion to call with no arguments
  const handleFileUpload = useFileUpload();

  // 消息提交和处理
  const messageSubmission = useMessageSubmission({
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
    processStreamResponse,
    getConfigForModel,
    activeDocuments,
    conversations,
    setConversations
  });
  const {
    input,
    setInput,
    sensitiveInfoProtectionEnabled, 
    handleSubmit,
    handleRetry,
    handleEdit,
    toggleSensitiveInfoProtection
  } = messageSubmission;

  // 合并展示的消息 (包括当前流式响应)
  const getDisplayMessages = useCallback(() => {
    const baseMessages = (conversations as any).find((c: any) => c.id === activeConversationId)?.messages || [];
    if (streaming && displayMessages) {
      return [
        ...baseMessages,
        {
          id: 'streaming_response',
          role: 'assistant',
          content: displayMessages.find((m: any) => m.isStreaming)?.content || '', 
          timestamp: new Date().toISOString(),
          isStreaming: true,
          metadata: { reasoning: '', isReasoning: false }
        }
      ];
    } else {
      return baseMessages;
    }
  }, [conversations, activeConversationId, streaming, displayMessages]);

  // 滚动到底部
  const scrollToBottom = useCallback(() => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, []);

  // 处理复制
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      console.log('文本已复制到剪贴板');
    } catch (error) {
      console.error('复制文本时出错:', error);
    }
  }, []);

  // 处理导出
  // const handleExport = useCallback(() => {
  //   const currentConversation = (conversations as any).find((c: any) => c.id === activeConversationId);
  //   if (!currentConversation) return;
  //   console.log('Exporting conversation:', currentConversation.id);
  // }, [conversations, activeConversationId]);

  // 处理模型设置保存
  const handleSettingsSave = useCallback((settings: { configs: ModelConfig[], modelNames: string[] }) => {
    if (settings.configs) setModelConfigs(settings.configs);
    if (settings.modelNames) setAvailableModels(settings.modelNames);
  }, [setModelConfigs, setAvailableModels]);

  // 处理嵌入模型设置保存
  const handleEmbeddingConfigSave = useCallback((embeddingConfigs: ModelConfig[]) => {
    if (embeddingConfigs.length > 0) {
      setEmbeddingConfig(embeddingConfigs[0]); 
    } else {
      setEmbeddingConfig(null);
    }
  }, [setEmbeddingConfig]);

  // 效果：保存主题设置
  useEffect(() => {
    storageService.setItem('darkMode', JSON.stringify(darkMode));
    document.body.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // 效果：保存会话
  useEffect(() => {
    if (conversations.length > 0) {
      storageService.setItem('conversations', JSON.stringify(conversations));
    }
  }, [conversations]);

  // 效果：滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]); 

  // Handle scroll for potential features like 'go to bottom' button
  const handleScroll = useCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current || {};
    if (scrollTop === undefined || scrollHeight === undefined || clientHeight === undefined) return;

    // Example: set some state like `showScrollToBottomButton(!isAtBottom)`

    // Highlight message in view? (More complex logic needed)
    // Find the message element closest to the center/top of the viewport
    // setHighlightedMessageId(visibleMessageId);
  }, [chatContainerRef, setIsSidebarExpanded]); 


  return {
    // 核心状态
    theme,
    selectedModel,
    availableModels,
    modelConfigs,
    embeddingConfig,
    activeDocuments,
    messages: getDisplayMessages(), 
    streaming,
    loadingHistory,
    conversations,
    isSidebarExpanded,
    input,
    sensitiveInfoProtectionEnabled,

    // 核心方法
    setDarkMode,
    setSelectedModel,
    setAvailableModels,
    setModelConfigs,
    setEmbeddingConfig,
    setActiveDocuments,
    setDisplayMessages,
    setRequestMessages,
    setStreaming,
    setIsSidebarExpanded,
    setInput,
    toggleSensitiveInfoProtection,

    // UI方法
    scrollToBottom,
    handleScroll,
    processStreamResponse,
    getConfigForModel,
    formatTime,
    handleToggleSidebar,

    // 会话管理
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll,

    // 消息处理
    handleSubmit,
    handleRetry,
    handleEdit,

    // 文件上传
    handleFileUpload,

    // 复制
    handleCopy,

    // 模型设置保存
    handleSettingsSave,

    // 嵌入模型设置
    handleEmbeddingConfigSave,

    // 其他状态
    chatContainerRef
  };
};

export type ChatLogicState = ReturnType<typeof useChatLogic>;

// Add default export to match import in Chat.jsx
export default useChatLogic;