// Storage service for managing localStorage operations
// With improved error handling to prevent JSON parsing errors

const CONVERSATIONS_KEY = 'mini-chatbot-conversations';
const API_SETTINGS_KEY = 'mini-chatbot-api-settings';
const UI_STATE_KEY = 'mini-chatbot-ui-state';
const LAST_SAVE_KEY = 'mini-chatbot-last-save';

// 添加调试模式标志，可以通过URL参数启用
const isDebugMode = new URLSearchParams(window.location.search).has('debug');

// 即时保存计时器
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_DELAY = 300; // 保存延迟时间(毫秒)

export const storageService = {
    // Safely parse JSON from localStorage
    safelyParseJSON(jsonString) {
        if (!jsonString) return null;

        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Error parsing JSON from localStorage:', error);
            return null;
        }
    },

    // Safely stringify JSON for localStorage
    safelyStringifyJSON(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('Error stringifying JSON for localStorage:', error);
            return null;
        }
    },

    // 设置上次保存时间戳
    setLastSaveTime() {
        const now = new Date().toISOString();
        localStorage.setItem(LAST_SAVE_KEY, now);
        return now;
    },

    // 获取上次保存时间戳
    getLastSaveTime() {
        return localStorage.getItem(LAST_SAVE_KEY);
    },

    // Get conversations from localStorage with backup recovery
    getConversations() {
        // 尝试从localStorage读取
        const conversationsJson = localStorage.getItem(CONVERSATIONS_KEY);
        let conversations = this.safelyParseJSON(conversationsJson);

        // 检查是否获取到有效数据
        if (!conversations || typeof conversations !== 'object') {
            console.warn('storageService.getConversations: 从localStorage读取对话失败，尝试从sessionStorage恢复');

            // 尝试从sessionStorage恢复
            const backupJson = sessionStorage.getItem(CONVERSATIONS_KEY + '_backup');
            const backup = this.safelyParseJSON(backupJson);

            if (backup && typeof backup === 'object') {
                console.log('storageService.getConversations: 从sessionStorage成功恢复对话数据');
                conversations = backup;

                // 立即保存回localStorage
                this.saveConversations(conversations);
            } else {
                console.warn('storageService.getConversations: 无法从备份恢复，使用空对象');
                conversations = {};
            }
        } else {
            // 成功读取，创建备份
            sessionStorage.setItem(CONVERSATIONS_KEY + '_backup', conversationsJson);
        }

        console.log('storageService.getConversations: 解析后的对话数据，对话数量:', Object.keys(conversations).length);

        return conversations;
    },

    // Save conversations to localStorage with backup, with debounce for performance
    saveConversations(conversations, immediate = false) {
        // 清除之前的定时器
        if (saveDebounceTimer) {
            clearTimeout(saveDebounceTimer);
        }

        const doSave = () => {
            console.log('storageService.saveConversations: 保存全部对话到localStorage，对话数量:', Object.keys(conversations).length);

            // 数据验证，确保有效的对话格式
            const validatedConversations = {};
            for (const id in conversations) {
                if (Object.prototype.hasOwnProperty.call(conversations, id)) {
                    const conv = conversations[id];
                    validatedConversations[id] = {
                        id: conv.id || id,
                        title: conv.title || '新对话',
                        messages: Array.isArray(conv.messages) ? conv.messages : [],
                        createdAt: conv.createdAt || new Date().toISOString(),
                        updatedAt: conv.updatedAt || new Date().toISOString(),
                    };
                }
            }

            // 将数据转换为JSON
            const conversationsJson = this.safelyStringifyJSON(validatedConversations);
            if (conversationsJson) {
                // 保存到localStorage
                localStorage.setItem(CONVERSATIONS_KEY, conversationsJson);

                // 同时创建备份到sessionStorage
                sessionStorage.setItem(CONVERSATIONS_KEY + '_backup', conversationsJson);

                // 更新上次保存时间
                this.setLastSaveTime();

                console.log('storageService.saveConversations: 对话数据已保存到localStorage，并创建备份');

                // 验证保存结果
                const verificationJson = localStorage.getItem(CONVERSATIONS_KEY);
                if (!verificationJson || verificationJson !== conversationsJson) {
                    console.warn('storageService.saveConversations: 验证失败，保存的数据与预期不符');
                }

                return true;
            } else {
                console.error('storageService.saveConversations: 无法将对话数据转换为JSON');
                return false;
            }
        };

        // 如果要求立即保存，则直接执行保存
        if (immediate) {
            return doSave();
        }

        // 否则使用防抖延迟保存
        return new Promise((resolve) => {
            saveDebounceTimer = setTimeout(() => {
                const result = doSave();
                resolve(result);
            }, SAVE_DEBOUNCE_DELAY);
        });
    },

    // 立即保存对话
    saveConversationsNow(conversations) {
        return this.saveConversations(conversations, true);
    },

    // Get a specific conversation by ID with improved error handling
    getConversation(conversationId) {
        if (!conversationId) {
            console.warn('storageService.getConversation: 尝试获取对话但conversationId为空');
            return null;
        }

        try {
            const conversations = this.getConversations();

            if (!conversations || typeof conversations !== 'object') {
                console.error(`storageService.getConversation: 获取对话 ${conversationId} 失败，conversations不是有效对象`);
                return null;
            }

            const conversation = conversations[conversationId];

            console.log(`storageService.getConversation: 获取对话 ${conversationId}:`,
                conversation ? `标题: ${conversation.title}, 消息数: ${conversation.messages?.length || 0}` : '不存在');

            if (conversation && typeof conversation === 'object') {
                // 确保消息数组是有效的
                if (!Array.isArray(conversation.messages)) {
                    console.warn(`storageService.getConversation: 对话 ${conversationId} 的消息不是数组，已修复`);
                    conversation.messages = [];
                }
                return conversation;
            }
        } catch (error) {
            console.error(`storageService.getConversation: 获取对话 ${conversationId} 时出错:`, error);
        }

        return null;
    },

    // Save a specific conversation with improved reliability
    saveConversation(conversationId, conversation, immediate = false) {
        if (!conversationId) {
            console.warn('storageService.saveConversation: 尝试保存对话但conversationId为空');
            return false;
        }

        if (!conversation || typeof conversation !== 'object') {
            console.warn(`storageService.saveConversation: 尝试保存对话 ${conversationId} 但对话数据不是有效对象`);
            return false;
        }

        try {
            // 确保ID一致性
            if (conversation.id && conversation.id !== conversationId) {
                console.warn(`storageService.saveConversation: 对话ID不匹配，参数ID: ${conversationId}, 对话ID: ${conversation.id}，使用参数ID`);
                // 强制使用传入的ID
                conversation.id = conversationId;
            }

            console.log(`storageService.saveConversation: 保存单个对话 ${conversationId}:`,
                `标题: ${conversation.title}, 消息数: ${conversation.messages?.length || 0}, 立即保存: ${immediate}`);

            // 数据验证，确保有效的对话格式
            const validConversation = {
                id: conversationId, // 始终使用传入的conversationId作为唯一标识
                title: conversation.title || '新对话',
                messages: Array.isArray(conversation.messages) ? conversation.messages : [],
                createdAt: conversation.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(), // 更新时间总是使用当前时间
            };

            // 获取所有对话
            const conversations = this.getConversations();

            // 更新特定对话
            conversations[conversationId] = validConversation;

            // 保存所有对话
            const result = this.saveConversations(conversations, immediate);

            // 验证保存结果
            if (immediate) {
                const savedConversations = this.getConversations();
                const savedConv = savedConversations[conversationId];

                if (!savedConv) {
                    console.error(`storageService.saveConversation: 验证失败，对话 ${conversationId} 未成功保存`);
                    // 尝试再次保存
                    console.log(`storageService.saveConversation: 尝试再次保存对话 ${conversationId}`);
                    conversations[conversationId] = validConversation;
                    localStorage.setItem(CONVERSATIONS_KEY, this.safelyStringifyJSON(conversations));
                    // 创建备份
                    sessionStorage.setItem(CONVERSATIONS_KEY + '_backup', this.safelyStringifyJSON(conversations));
                    return false;
                } else {
                    console.log(`storageService.saveConversation: 对话 ${conversationId} 保存成功，验证消息数: ${savedConv.messages?.length || 0}`);
                }
            }

            return result;
        } catch (error) {
            console.error(`storageService.saveConversation: 保存对话 ${conversationId} 时出错:`, error);
            return false;
        }
    },

    // 立即保存单个对话
    saveConversationNow(conversationId, conversation) {
        return this.saveConversation(conversationId, conversation, true);
    },

    // Delete a specific conversation
    deleteConversation(conversationId) {
        const conversations = this.getConversations();
        if (conversations[conversationId]) {
            console.log(`删除对话 ${conversationId}`);
            delete conversations[conversationId];
            this.saveConversations(conversations);
            return true;
        }
        return false;
    },

    // 保存指定对话的消息列表
    saveConversationMessages(conversationId, messages, immediate = false) {
        if (!conversationId) {
            console.warn('storageService.saveConversationMessages: 尝试保存消息但conversationId为空');
            return false;
        }

        if (!Array.isArray(messages)) {
            console.error(`storageService.saveConversationMessages: 尝试保存非数组类型的消息到对话 ${conversationId}`);
            return false;
        }

        try {
            // 从存储中获取现有对话
            const conversations = this.getConversations();
            let conversation = conversations[conversationId];

            // 如果对话不存在，创建新对话
            if (!conversation) {
                console.warn(`storageService.saveConversationMessages: 对话 ${conversationId} 不存在，创建新对话`);
                conversation = {
                    id: conversationId, // 确保ID一致
                    title: '新对话',
                    messages: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
            }

            console.log(`storageService.saveConversationMessages: 更新对话 ${conversationId} 的消息列表，新消息数: ${messages.length}`);

            // 设置新消息并更新时间戳
            conversation.messages = messages;
            conversation.updatedAt = new Date().toISOString();

            // 更新对话标题: 始终使用第一条用户消息作为标题
            const firstUserMessage = messages.find(msg => msg.role === 'user');
            if (firstUserMessage && firstUserMessage.content) {
                const firstMsg = firstUserMessage.content.trim();
                conversation.title = firstMsg.substring(0, 30) + (firstMsg.length > 30 ? '...' : '');
                console.log(`storageService.saveConversationMessages: 对话 ${conversationId} 标题已设置为用户第一条消息: ${conversation.title}`);
            } else if (!conversation.title || conversation.title === '新对话') {
                // 如果找不到用户消息且标题为默认值，尝试使用第一条任意消息
                if (messages.length > 0 && messages[0] && messages[0].content) {
                    const firstMsg = messages[0].content.trim();
                    conversation.title = firstMsg.substring(0, 30) + (firstMsg.length > 30 ? '...' : '');
                    console.log(`storageService.saveConversationMessages: 对话 ${conversationId} 标题已自动更新为: ${conversation.title}`);
                }
            }

            // 确保对话ID一致
            conversation.id = conversationId;

            // 更新集合中的对话
            conversations[conversationId] = conversation;

            // 保存所有对话
            const result = this.saveConversations(conversations, immediate);

            // 如果是立即保存，验证结果
            if (immediate) {
                const verification = this.getConversation(conversationId);
                if (!verification || !Array.isArray(verification.messages) || verification.messages.length !== messages.length) {
                    console.error(`storageService.saveConversationMessages: 验证失败，对话 ${conversationId} 的消息可能未正确保存`);
                }
            }

            return result;
        } catch (error) {
            console.error(`storageService.saveConversationMessages: 保存对话 ${conversationId} 消息时出错:`, error);
            return false;
        }
    },

    // 立即保存对话消息
    saveConversationMessagesNow(conversationId, messages) {
        return this.saveConversationMessages(conversationId, messages, true);
    },

    // Get API settings from localStorage
    getApiSettings() {
        const settingsJson = localStorage.getItem(API_SETTINGS_KEY);
        const settings = this.safelyParseJSON(settingsJson);
        return settings || {
            base_url: 'https://openrouter.ai/api/v1',
            api_key: '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',
            model_name: 'qwen/qwen3-1.7b:free'
        };
    },

    // Save API settings to localStorage
    saveApiSettings(settings) {
        const settingsJson = this.safelyStringifyJSON(settings);
        if (settingsJson) {
            localStorage.setItem(API_SETTINGS_KEY, settingsJson);
        }
    },

    // Get UI state from localStorage
    getUIState() {
        const stateJson = localStorage.getItem(UI_STATE_KEY);
        const state = this.safelyParseJSON(stateJson);
        console.log('storageService.getUIState: 从localStorage加载的原始UI状态:', state);

        // 默认值
        const defaultState = {
            currentConversationId: null,
            isSidebarOpen: true,
            webSearchEnabled: false,
            deepResearchEnabled: false,
            directRequestEnabled: false,
        };

        // 如果没有有效的state对象，直接返回默认值
        if (!state || typeof state !== 'object') {
            return defaultState;
        }

        // 合并状态并处理特殊属性
        let isSidebarOpenValue = true; // 默认为true
        if (state.isSidebarOpen === false) { // 只有明确为false才设为false
            isSidebarOpenValue = false;
        }

        const finalState = {
            ...defaultState,
            ...state,
            isSidebarOpen: isSidebarOpenValue,
        };

        console.log('storageService.getUIState: 返回的最终UI状态:', finalState);
        return finalState;
    },

    // Save UI state to localStorage
    saveUIState(state) {
        console.log('storageService.saveUIState: 准备保存的UI状态:', state);
        if (typeof state !== 'object' || state === null) {
            console.error('storageService.saveUIState: 尝试保存无效的UI状态 (非对象或null):', state);
            return;
        }
        const stateJson = this.safelyStringifyJSON(state);
        if (stateJson) {
            localStorage.setItem(UI_STATE_KEY, stateJson);
            console.log('storageService.saveUIState: UI状态已保存:', state);
        } else {
            console.error('storageService.saveUIState: 无法保存UI状态，JSON转换失败');
        }
    },

    // 检测和修复localStorage中的问题
    repairStorage() {
        try {
            // 尝试验证对话数据
            const conversationsJson = localStorage.getItem(CONVERSATIONS_KEY);
            if (conversationsJson) {
                const conversations = this.safelyParseJSON(conversationsJson);
                if (!conversations || typeof conversations !== 'object') {
                    console.warn('修复存储: 对话数据无效，重置');
                    localStorage.removeItem(CONVERSATIONS_KEY);
                }
            }

            // 尝试验证API设置
            const settingsJson = localStorage.getItem(API_SETTINGS_KEY);
            if (settingsJson) {
                const settings = this.safelyParseJSON(settingsJson);
                if (!settings || typeof settings !== 'object') {
                    console.warn('修复存储: API设置无效，重置');
                    localStorage.removeItem(API_SETTINGS_KEY);
                }
            }

            // 尝试验证UI状态
            const stateJson = localStorage.getItem(UI_STATE_KEY);
            if (stateJson) {
                const state = this.safelyParseJSON(stateJson);
                if (!state || typeof state !== 'object') {
                    console.warn('修复存储: UI状态无效，重置');
                    localStorage.removeItem(UI_STATE_KEY);
                }
            }

            console.log('存储修复检查完成');
            return true;
        } catch (error) {
            console.error('修复存储时出错:', error);
            return false;
        }
    },

    // 清除localStorage中的所有数据
    clearAll() {
        localStorage.removeItem(CONVERSATIONS_KEY);
        localStorage.removeItem(API_SETTINGS_KEY);
        localStorage.removeItem(UI_STATE_KEY);
        sessionStorage.removeItem(CONVERSATIONS_KEY + '_backup');
        console.log('已清除所有本地存储数据');
    }
};

export default storageService;