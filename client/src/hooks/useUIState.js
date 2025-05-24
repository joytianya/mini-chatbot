import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import storageService from '../services/storageService';

export const useUIState = () => {
    // Initialize state with safe defaults
    const [conversations, setConversations] = useState({});
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // 添加三个功能开关的状态
    const [webSearchEnabled, setWebSearchEnabled] = useState(false);
    const [deepResearchEnabled, setDeepResearchEnabled] = useState(false);
    const [directRequestEnabled, setDirectRequestEnabled] = useState(false);

    // Load saved state from localStorage on component mount
    useEffect(() => {
        try {
            // Load conversations
            const savedConversations = storageService.getConversations();
            const conversationCount = Object.keys(savedConversations || {}).length;
            setConversations(savedConversations || {});

            // Load UI state
            const savedUIState = storageService.getUIState();

            // 处理当前对话ID的情况
            let selectedConversationId = null;

            // 情况1: 有已保存的UI状态和当前对话ID，且该对话存在
            if (savedUIState && savedUIState.currentConversationId &&
                savedConversations && savedConversations[savedUIState.currentConversationId]) {
                selectedConversationId = savedUIState.currentConversationId;
            }
            // 情况2: 没有有效的当前对话ID，但有其他对话，则使用最近的对话
            else if (conversationCount > 0) {
                const sortedIds = Object.entries(savedConversations)
                    .sort(([, a], [, b]) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
                    .map(([id]) => id);
                selectedConversationId = sortedIds[0];
            }

            // 设置当前对话ID (可能为null)
            setCurrentConversationId(selectedConversationId);

            // Set sidebar state
            setIsSidebarOpen(savedUIState && savedUIState.isSidebarOpen !== false);

            // 加载功能开关状态
            setWebSearchEnabled(savedUIState && savedUIState.webSearchEnabled === true);
            setDeepResearchEnabled(savedUIState && savedUIState.deepResearchEnabled === true);
            setDirectRequestEnabled(savedUIState && savedUIState.directRequestEnabled === true);

        } catch (error) {
            console.error('useUIState: 加载UI状态时出错:', error);
            // Use defaults if there's an error
        }
    }, []);

    // Save UI state whenever it changes
    useEffect(() => {
        // 始终保存UI状态，无论是否有当前对话
        storageService.saveUIState({
            currentConversationId,
            isSidebarOpen,
            webSearchEnabled,
            deepResearchEnabled,
            directRequestEnabled
        });
    }, [currentConversationId, isSidebarOpen, webSearchEnabled, deepResearchEnabled, directRequestEnabled]);

    // Save conversations whenever they change
    useEffect(() => {
        storageService.saveConversations(conversations);
    }, [conversations]);

    // Create a new conversation
    const createNewConversation = (firstMessageContent = null) => {
        // 生成新的唯一ID (UUID)
        const newId = uuidv4();

        // 创建一个全新的空对话
        const newConversation = {
            id: newId,
            title: '新对话',
            messages: [], // 确保消息数组为空
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // 添加到对话集合
        setConversations(prev => ({
            ...prev,
            [newId]: newConversation
        }));

        // 切换到新对话
        setCurrentConversationId(newId);

        // 立即保存新对话到本地存储
        storageService.saveConversationNow(newId, newConversation);

        // 记录到UI状态
        storageService.saveUIState({
            currentConversationId: newId,
            isSidebarOpen,
            webSearchEnabled,
            deepResearchEnabled,
            directRequestEnabled
        });

        return newId;
    };

    // Delete a conversation
    const deleteConversation = (conversationId) => {
        if (!conversations[conversationId]) return;

        const newConversations = {...conversations };
        delete newConversations[conversationId];
        setConversations(newConversations);

        // If we deleted the current conversation, select another one or create a new one
        if (conversationId === currentConversationId) {
            const remainingIds = Object.keys(newConversations);
            if (remainingIds.length > 0) {
                setCurrentConversationId(remainingIds[0]);
            } else {
                createNewConversation();
            }
        }
    };

    // Rename a conversation
    const renameConversation = (conversationId, newTitle) => {
        if (!conversations[conversationId]) return;

        setConversations(prev => ({
            ...prev,
            [conversationId]: {
                ...prev[conversationId],
                title: newTitle,
                updatedAt: new Date().toISOString()
            }
        }));
    };

    // Toggle sidebar visibility
    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    // 切换功能开关
    const toggleWebSearch = () => {
        setWebSearchEnabled(prev => !prev);
    };

    const toggleDeepResearch = () => {
        setDeepResearchEnabled(prev => !prev);
    };

    const toggleDirectRequest = () => {
        setDirectRequestEnabled(prev => !prev);
    };

    return {
        conversations,
        currentConversationId,
        setCurrentConversationId,
        createNewConversation,
        deleteConversation,
        renameConversation,
        isSidebarOpen,
        toggleSidebar,
        webSearchEnabled,
        toggleWebSearch,
        deepResearchEnabled,
        toggleDeepResearch,
        directRequestEnabled,
        toggleDirectRequest,
        setConversations
    };
};

export default useUIState;