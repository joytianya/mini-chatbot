import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import toast from 'react-hot-toast';
import React from 'react';

/**
 * 聊天逻辑的主Hook，组合其他Hook
 * @returns {Object} 聊天相关的所有状态和函数
 */
export const useChatLogic = (conversationId, webSearchEnabled, deepResearchEnabled, directRequestEnabled, onError, onLoadingChange) => {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [streamingResponse, setStreamingResponse] = useState('');
    const [apiSettings, setApiSettings] = useState(() => {
        // 从本地存储获取保存的设置，作为初始值
        const savedSettings = storageService.getApiSettings();
        // 返回保存的设置或默认值
        return savedSettings || {
            base_url: 'https://openrouter.ai/api/v1',
            api_key: '',
            model_name: 'qwen/qwen3-1.7b:free'
        };
    });
    const [isConfigLoaded, setIsConfigLoaded] = useState(false);

    // 上次加载状态的引用，用于避免重复触发
    const lastLoadingState = React.useRef(false);
    const abortControllerRef = useRef(null); // Ref to hold the AbortController

    // 组件加载时从后端获取OpenRouter配置
    useEffect(() => {
        async function loadConfig() {
            try {
                // 尝试从后端获取配置
                const config = await apiService.getOpenRouterConfig();

                // 获取本地保存的设置
                const savedSettings = storageService.getApiSettings();

                // 如果本地没有设置，或者明确要使用后端设置，则使用后端配置
                if (!savedSettings || !savedSettings.api_key) {
                    // 使用后端配置
                    const newSettings = {
                        base_url: config.base_url || 'https://openrouter.ai/api/v1',
                        api_key: config.api_key || '',
                        model_name: config.model_name || 'qwen/qwen3-1.7b:free'
                    };

                    setApiSettings(newSettings);
                    // 保存到本地存储
                    storageService.saveApiSettings(newSettings);
                } else {}

                setIsConfigLoaded(true);
            } catch (error) {
                console.error('加载OpenRouter配置时出错:', error);
                // 出错时不更新设置，继续使用本地保存的或默认的
                setIsConfigLoaded(true);
                // 可以选择是否显示通知
                // toast.error('加载API配置失败，使用默认设置');
            }
        }

        // 加载配置
        loadConfig();
    }, []);

    // Load messages and settings when conversationId changes
    useEffect(() => {
        // 在切换对话时先清空消息数组，避免显示前一个对话的消息
        setMessages([]);

        if (conversationId) {
            try {
                // Load conversation messages
                const conversation = storageService.getConversation(conversationId);

                if (conversation && Array.isArray(conversation.messages)) {
                    // 设置定时器，确保UI更新
                    setTimeout(() => {
                        setMessages(conversation.messages);
                    }, 10);
                } else {
                    setMessages([]);
                }

                // Load saved API settings
                const savedSettings = storageService.getApiSettings();
                if (savedSettings) {
                    setApiSettings(savedSettings);
                }
            } catch (error) {
                console.error('加载对话数据时出错:', error);
                setMessages([]);
                setError('加载对话数据时出错');
                if (onError) onError('加载对话数据时出错');
            }
        } else {
            setMessages([]);
        }
    }, [conversationId, onError]);

    // Save messages to localStorage when they change
    useEffect(() => {
        if (!conversationId) return;

        if (messages.length > 0) {
            // 即使没有消息，也要确保对话存在
            const conversation = storageService.getConversation(conversationId) || {
                id: conversationId,
                title: '新对话',
                createdAt: new Date().toISOString(),
                messages: []
            };

            // Update conversation with latest messages and timestamp
            conversation.messages = messages;
            conversation.updatedAt = new Date().toISOString();

            // 检查是否有用户消息，如果有则始终以第一条用户消息作为标题
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            if (firstUserMessage && firstUserMessage.content) {
                const firstMsg = firstUserMessage.content;
                conversation.title = firstMsg.substring(0, 30) + (firstMsg.length > 30 ? '...' : '');
            } else if (!conversation.title || conversation.title === '新对话') {
                // 如果没有用户消息但有其他消息，且标题为默认值，则使用第一条消息
                if (messages.length > 0 && messages[0] && messages[0].content) {
                    const firstMsg = messages[0].content;
                    conversation.title = firstMsg.substring(0, 30) + (firstMsg.length > 30 ? '...' : '');
                }
            }

            // 保存对话
            storageService.saveConversation(conversationId, conversation);
        } else {
            // 即使没有消息，也创建对话
            const conversation = {
                id: conversationId,
                title: '新对话',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: []
            };
            storageService.saveConversation(conversationId, conversation);
        }
    }, [conversationId, messages]);

    // Save API settings when they change
    useEffect(() => {
        storageService.saveApiSettings(apiSettings);
    }, [apiSettings]);

    // Notify parent about loading state changes (only if changed)
    useEffect(() => {
        // 只有当状态真正变化时才触发回调
        if (onLoadingChange && lastLoadingState.current !== isLoading) {
            lastLoadingState.current = isLoading;
            onLoadingChange(isLoading);
        }
    }, [isLoading, onLoadingChange]);

    // Send message to API
    const sendMessage = useCallback(async(messageContent, overrideSettings = null, options = {}) => {
        if (!messageContent || isLoading) return;

        const {
            shouldSaveMessage = true,
                webSearchEnabled = false,
                deepResearchEnabled = false,
                directRequest = false,
                conversationIdToSave = conversationId // 默认使用当前的conversationId，允许覆盖
        } = options;

        const targetConversationId = conversationIdToSave;
        if (!targetConversationId) {
            console.error("useChatLogic.sendMessage: 无法发送消息：目标对话ID无效");
            toast.error("无法发送消息，请先选择或创建对话。");
            return null;
        }

        try {
            // 确保在发送之前对话在存储中存在
            let existingConversation = storageService.getConversation(targetConversationId);
            if (!existingConversation) {
                existingConversation = {
                    id: targetConversationId,
                    title: messageContent.substring(0, 30) + (messageContent.length > 30 ? '...' : ''),
                    messages: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                // 直接保存到本地存储，确保对话被创建
                storageService.saveConversation(targetConversationId, existingConversation);
            }

            // 获取当前目标对话的消息列表，或如果不存在则为空数组
            const conversation = storageService.getConversation(targetConversationId);
            const currentTargetMessages = (conversation && conversation.messages) ? conversation.messages : [];

            // Add user message to the local state and prepare for API call
            const newUserMessage = {
                id: uuidv4(),
                role: 'user',
                content: messageContent,
                timestamp: new Date().toISOString()
            };

            // 首先更新目标对话的消息列表
            const updatedMessages = [...currentTargetMessages, newUserMessage];
            // 强制保存到本地存储
            const updatedConversation = {
                ...conversation,
                messages: updatedMessages,
                updatedAt: new Date().toISOString(),
                title: conversation.title || messageContent.substring(0, 30) + (messageContent.length > 30 ? '...' : '')
            };

            // 直接保存更新后的对话（使用立即保存模式）
            const saveResult = storageService.saveConversation(targetConversationId, updatedConversation, true);

            if (!saveResult) {
                console.error(`useChatLogic: 保存对话 ${targetConversationId} 失败`);
            }

            // 确认保存结果（添加短暂延迟确保保存完成）
            setTimeout(() => {
                const savedConversation = storageService.getConversation(targetConversationId);
                if (savedConversation && savedConversation.messages && savedConversation.messages.length === updatedMessages.length) {
                    // 保存成功，无需日志
                } else {
                    console.warn(`useChatLogic: 对话 ${targetConversationId} 保存可能不完整，预期消息数 ${updatedMessages.length}，实际消息数: ${savedConversation ? (savedConversation.messages ? savedConversation.messages.length : 0) : 0}`);

                    // 尝试重新保存
                    console.log(`useChatLogic: 尝试重新保存对话 ${targetConversationId}`);
                    storageService.saveConversationNow(targetConversationId, updatedConversation);
                }
            }, 50);

            // 更新本地状态以立即显示用户消息
            setMessages(prevMessages => {
                // 如果之前没有消息，直接设置用户消息作为第一条
                if (prevMessages.length === 0) {
                    return [newUserMessage];
                } else {
                    // 否则添加到现有消息列表
                    const updatedUIMessages = [...prevMessages, newUserMessage];
                    return updatedUIMessages;
                }
            });

            // 确保当前对话始终在存储中
            const finalCheck = storageService.getConversation(targetConversationId);
            if (!finalCheck) {
                console.warn(`useChatLogic: 最终检查失败，对话 ${targetConversationId} 不在存储中，再次尝试保存`);
                storageService.saveConversation(targetConversationId, updatedConversation);
            }

            // 在进行API请求前稍微延迟，确保UI已显示用户消息
            await new Promise(resolve => setTimeout(resolve, 100));

            // 通过apiService发送请求
            const settings = overrideSettings || apiSettings;

            // 创建助手消息占位符
            const assistantMessageId = uuidv4();
            const assistantPlaceholder = {
                id: assistantMessageId,
                role: 'assistant',
                content: '正在思考...',
                reasoning: '',
                timestamp: new Date().toISOString()
            };

            // 添加占位消息到UI
            setMessages(prev => {
                const updatedMessages = [...prev, assistantPlaceholder];
                // 保存到localStorage，确保AI占位消息也能即时显示
                storageService.saveConversationMessages(targetConversationId, updatedMessages);
                return updatedMessages;
            });

            // Set loading state
            setIsLoading(true);
            setStreamingResponse('');

            // 准备发送到API的消息列表（包括新用户消息）
            const messagesForApi = [...updatedMessages, assistantPlaceholder];

            // Create a new AbortController for this request
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            // 通过apiService发送请求
            try {
                const response = await apiService.sendChatMessage(
                    messagesForApi,
                    settings,
                    webSearchEnabled,
                    deepResearchEnabled,
                    directRequest,
                    signal // Pass the signal
                );

                // 处理流式响应
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let tempChunkedResponse = '';
                let tempReasoningContent = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value, { stream: true });

                        // 解析SSE数据 (适用于直接API和后端代理)
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                                try {
                                    const data = JSON.parse(line.substring(6));
                                    let contentDelta = '';
                                    let reasoningDelta = '';

                                    if (data.choices && data.choices[0] && data.choices[0].delta) {
                                        contentDelta = data.choices[0].delta.content || '';
                                        reasoningDelta = data.choices[0].delta.reasoning_content || '';
                                    } else if (data.choices && data.choices[0] && data.choices[0].message) { // 非流式兼容?
                                        contentDelta = data.choices[0].message.content || '';
                                    }

                                    // 处理content
                                    if (contentDelta) {
                                        tempChunkedResponse += contentDelta;
                                        setStreamingResponse(prev => prev + contentDelta); // 实时更新流式预览
                                        // 实时更新占位消息的内容
                                        setMessages(prev => prev.map(msg =>
                                            msg.id === assistantMessageId ? {...msg, content: tempChunkedResponse } : msg
                                        ));
                                    }

                                    // 处理reasoning_content
                                    if (reasoningDelta) {
                                        tempReasoningContent += reasoningDelta;
                                        // 实时更新占位消息的思考过程
                                        setMessages(prev => prev.map(msg =>
                                            msg.id === assistantMessageId ? {...msg, reasoning: tempReasoningContent } : msg
                                        ));
                                    }
                                } catch (e) {
                                    console.error('解析SSE数据出错:', e, '原始行:', line);
                                }
                            }
                        }
                    }

                    // 当流式响应完成时，最终确定助手消息
                    const updatedAssistantMessage = {
                        id: assistantMessageId,
                        role: 'assistant',
                        content: tempChunkedResponse,
                        reasoning: tempReasoningContent,
                        timestamp: new Date().toISOString()
                    };

                    // 更新界面上的消息
                    setMessages(prev => {
                        // 创建一个新的消息数组，替换掉占位符消息
                        const updatedMessages = prev.map(msg =>
                            msg.id === assistantMessageId ? updatedAssistantMessage : msg
                        );

                        // 确保消息保存到localStorage
                        storageService.saveConversationMessages(targetConversationId, updatedMessages);

                        return updatedMessages;
                    });

                } catch (streamError) {
                    // 处理流式解析过程中的错误
                    if (streamError.name === 'AbortError') {
                        // 中断时可以选择保留已生成的内容，或者移除占位符
                        if (tempChunkedResponse.length > 0) {
                            // 保留已生成的内容，标记为"已中断"
                            const updatedMessage = {
                                id: assistantMessageId,
                                role: 'assistant',
                                content: tempChunkedResponse + "\n\n[生成已中断]",
                                reasoning: tempReasoningContent,
                                timestamp: new Date().toISOString()
                            };

                            // 更新UI中的消息
                            setMessages(prev => {
                                const updatedMessages = prev.map(msg =>
                                    msg.id === assistantMessageId ? updatedMessage : msg
                                );

                                // 保存到本地存储
                                storageService.saveConversationMessages(targetConversationId, updatedMessages);

                                return updatedMessages;
                            });
                        } else {
                            // 如果没有生成任何内容，移除占位符
                            setMessages(prev => {
                                const filteredMessages = prev.filter(msg => msg.id !== assistantMessageId);
                                storageService.saveConversationMessages(targetConversationId, filteredMessages);
                                return filteredMessages;
                            });
                        }
                    } else {
                        // 其他流式处理错误
                        console.error('流式响应处理错误:', streamError);
                        throw streamError; // 向上传递其他类型的错误
                    }
                }

                return tempChunkedResponse;

            } catch (error) {
                if (error.name === 'AbortError') {
                    toast('请求已取消');
                    // Ensure loading state is reset if aborted before completion
                    setIsLoading(false);
                    setStreamingResponse('');
                    // 移除占位符但保留用户消息
                    setMessages(prev => {
                        const updatedMessages = prev.filter(msg => msg.id !== assistantMessageId);
                        storageService.saveConversationMessages(targetConversationId, updatedMessages);
                        return updatedMessages;
                    });
                } else {
                    console.error('API请求失败:', error);
                    toast.error(`请求失败: ${error.message || '未知错误'}`);
                    // 添加一个错误消息代替占位符
                    setMessages(prev => {
                        const errorMessages = prev.map(msg =>
                            msg.id === assistantMessageId ? {
                                ...msg,
                                content: `请求失败: ${error.message || '与服务器通信时发生错误'}`,
                                timestamp: new Date().toISOString()
                            } : msg
                        );
                        storageService.saveConversationMessages(targetConversationId, errorMessages);
                        return errorMessages;
                    });
                }
            }
        } catch (error) {
            console.error('发送消息时出错:', error);
            setError(error.message || '发送消息时出错');
            if (onError) onError(error.message || '发送消息时出错');
            toast.error(`发送失败: ${error.message || '未知错误'}`);
            return null;
        } finally {
            // 无论任何情况都重置状态
            setIsLoading(false);
            setStreamingResponse('');

            // 清理控制器引用
            abortControllerRef.current = null;
        }
    }, [conversationId, apiSettings, isLoading, onError, webSearchEnabled, deepResearchEnabled, directRequestEnabled]);

    // Function to stop the generation
    const stopGenerating = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();

            // 确保在中断后UI状态也被正确更新
            setIsLoading(false);
            setStreamingResponse('');

            // 可选：在中断时显示通知
            toast('已停止生成');
        }
    }, []);

    // Update API settings
    const updateApiSettings = useCallback((newSettings) => {
        setApiSettings(prev => ({...prev, ...newSettings }));
        toast.success('API 设置已更新');
    }, []);

    // Force reload conversation
    const forceReloadConversation = useCallback((targetId = null) => {
        // 使用传入的targetId，如果没有则使用当前conversationId
        const idToLoad = targetId || conversationId;

        if (!idToLoad) {
            return;
        }

        try {
            const conversation = storageService.getConversation(idToLoad);

            if (conversation && Array.isArray(conversation.messages)) {
                setMessages(conversation.messages);
                // 移除成功提示，避免频繁弹出
                // toast.success('对话已重新加载');
            } else {
                // 如果是新对话，应该清空消息数组
                setMessages([]);
                if (targetId) {
                    // 如果是指定ID但不存在，可能是新对话，不需要提示错误
                } else {
                    toast.error('无法重新加载对话，可能不存在或已被删除');
                }
            }
        } catch (error) {
            console.error(`加载对话 ${idToLoad} 时出错:`, error);
            setMessages([]);
            toast.error('加载对话时发生错误');
        }
    }, [conversationId]);

    // 清除所有对话历史
    const clearAllConversations = useCallback(() => {
        if (window.confirm('确定要删除所有对话历史吗？此操作不可撤销。API配置将被保留。')) {
            storageService.clearConversationsOnly();
            setMessages([]);
            toast.success('所有对话历史已清除，API配置已保留');
            return true;
        }
        return false;
    }, []);

    // 重置API配置，从后端重新加载
    const resetApiConfig = useCallback(async() => {
        try {
            setIsLoading(true);
            // 从后端获取配置
            const config = await apiService.getOpenRouterConfig();

            // 使用后端配置
            const newSettings = {
                base_url: config.base_url || 'https://openrouter.ai/api/v1',
                api_key: config.api_key || '',
                model_name: config.model_name || 'qwen/qwen3-1.7b:free'
            };

            // 更新状态和本地存储
            setApiSettings(newSettings);
            storageService.saveApiSettings(newSettings);

            toast.success('API配置已重置为服务器配置');
            return true;
        } catch (error) {
            console.error('重置API配置时出错:', error);
            toast.error('重置API配置失败: ' + (error.message || '未知错误'));
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        messages,
        setMessages,
        sendMessage,
        isLoading,
        streamingResponse,
        apiSettings,
        updateApiSettings,
        forceReloadConversation,
        clearAllConversations,
        stopGenerating,
        resetApiConfig,
        isConfigLoaded
    };
};

export default useChatLogic;