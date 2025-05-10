// fix_storage.js - 用于修复前端本地存储问题
// 将此文件放在前端项目中使用，或者作为浏览器控制台脚本运行

// 存储键名
const CONVERSATIONS_KEY = 'mini-chatbot-conversations';
const API_SETTINGS_KEY = 'mini-chatbot-api-settings';
const UI_STATE_KEY = 'mini-chatbot-ui-state';

// 存储修复工具
const StorageRepairTool = {
    // 安全解析JSON
    safelyParseJSON(jsonString) {
        if (!jsonString) return null;
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('解析JSON出错:', error);
            return null;
        }
    },

    // 安全序列化JSON
    safelyStringifyJSON(data) {
        try {
            return JSON.stringify(data);
        } catch (error) {
            console.error('序列化JSON出错:', error);
            return null;
        }
    },

    // 检查并修复对话存储
    repairConversations() {
        console.log('正在检查对话存储...');

        try {
            // 尝试读取对话
            const conversationsJson = localStorage.getItem(CONVERSATIONS_KEY);
            if (!conversationsJson) {
                console.log('未找到对话存储，初始化为空对象');
                localStorage.setItem(CONVERSATIONS_KEY, '{}');
                return { fixed: true, message: '已初始化空对话存储' };
            }

            // 尝试解析对话
            const conversations = this.safelyParseJSON(conversationsJson);
            if (!conversations || typeof conversations !== 'object') {
                console.error('对话存储内容无效，重置为空对象');
                localStorage.setItem(CONVERSATIONS_KEY, '{}');
                return { fixed: true, message: '已重置损坏的对话存储' };
            }

            // 验证并修复每个对话
            let hasFixed = false;
            const fixedConversations = {};
            let conversationCount = 0;
            let messageCount = 0;

            for (const id in conversations) {
                if (Object.prototype.hasOwnProperty.call(conversations, id)) {
                    const conv = conversations[id];
                    // 验证对话结构
                    if (typeof conv !== 'object' || !conv) {
                        console.warn(`对话 ${id} 结构无效，跳过`);
                        hasFixed = true;
                        continue;
                    }

                    // 验证和修复消息数组
                    if (!Array.isArray(conv.messages)) {
                        console.warn(`对话 ${id} 消息不是数组，修复为空数组`);
                        conv.messages = [];
                        hasFixed = true;
                    }

                    // 确保必要的字段
                    fixedConversations[id] = {
                        id: id,
                        title: conv.title || '对话 ' + id.substring(0, 8),
                        messages: conv.messages || [],
                        createdAt: conv.createdAt || new Date().toISOString(),
                        updatedAt: conv.updatedAt || new Date().toISOString()
                    };

                    conversationCount++;
                    messageCount += fixedConversations[id].messages.length;
                }
            }

            // 保存修复后的对话
            const fixedJson = this.safelyStringifyJSON(fixedConversations);
            if (fixedJson) {
                localStorage.setItem(CONVERSATIONS_KEY, fixedJson);
                console.log(`对话存储已修复，包含 ${conversationCount} 个对话，共 ${messageCount} 条消息`);
                return {
                    fixed: hasFixed,
                    message: hasFixed ? '已修复对话存储问题' : '对话存储正常',
                    conversations: conversationCount,
                    messages: messageCount
                };
            } else {
                console.error('无法保存修复后的对话，重置为空对象');
                localStorage.setItem(CONVERSATIONS_KEY, '{}');
                return { fixed: true, message: '无法保存修复后的对话，已重置' };
            }
        } catch (error) {
            console.error('修复对话存储时发生错误:', error);
            localStorage.setItem(CONVERSATIONS_KEY, '{}');
            return { fixed: true, message: '修复时发生错误，已重置对话存储' };
        }
    },

    // 检查并修复API设置
    repairApiSettings() {
        console.log('正在检查API设置...');

        try {
            // 尝试读取API设置
            const settingsJson = localStorage.getItem(API_SETTINGS_KEY);
            if (!settingsJson) {
                console.log('未找到API设置，初始化为默认值');
                const defaultSettings = {
                    base_url: 'https://openrouter.ai/api/v1',
                    api_key: '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',
                    model_name: 'qwen/qwen3-1.7b:free'
                };
                localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(defaultSettings));
                return { fixed: true, message: '已初始化默认API设置' };
            }

            // 尝试解析API设置
            const settings = this.safelyParseJSON(settingsJson);
            if (!settings || typeof settings !== 'object') {
                console.error('API设置内容无效，重置为默认值');
                const defaultSettings = {
                    base_url: 'https://openrouter.ai/api/v1',
                    api_key: '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',
                    model_name: 'qwen/qwen3-1.7b:free'
                };
                localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(defaultSettings));
                return { fixed: true, message: '已重置损坏的API设置' };
            }

            // 验证API设置结构
            let hasFixed = false;
            const fixedSettings = {
                base_url: settings.base_url || 'https://openrouter.ai/api/v1',
                api_key: settings.api_key || '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',
                model_name: settings.model_name || 'qwen/qwen3-1.7b:free'
            };

            // 检查是否进行了修复
            if (fixedSettings.base_url !== settings.base_url ||
                fixedSettings.api_key !== settings.api_key ||
                fixedSettings.model_name !== settings.model_name) {
                hasFixed = true;
            }

            // 保存修复后的API设置
            localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(fixedSettings));
            console.log('API设置已检查完毕');
            return {
                fixed: hasFixed,
                message: hasFixed ? '已修复API设置问题' : 'API设置正常'
            };
        } catch (error) {
            console.error('修复API设置时发生错误:', error);
            const defaultSettings = {
                base_url: 'https://openrouter.ai/api/v1',
                api_key: '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',
                model_name: 'qwen/qwen3-1.7b:free'
            };
            localStorage.setItem(API_SETTINGS_KEY, JSON.stringify(defaultSettings));
            return { fixed: true, message: '修复时发生错误，已重置API设置' };
        }
    },

    // 检查并修复UI状态
    repairUIState() {
        console.log('正在检查UI状态...');

        try {
            // 尝试读取UI状态
            const stateJson = localStorage.getItem(UI_STATE_KEY);
            if (!stateJson) {
                console.log('未找到UI状态，初始化为默认值');
                const defaultState = {
                    currentConversationId: null,
                    isSidebarOpen: true,
                    webSearchEnabled: false,
                    deepResearchEnabled: false,
                    directRequestEnabled: false
                };
                localStorage.setItem(UI_STATE_KEY, JSON.stringify(defaultState));
                return { fixed: true, message: '已初始化默认UI状态' };
            }

            // 尝试解析UI状态
            const state = this.safelyParseJSON(stateJson);
            if (!state || typeof state !== 'object') {
                console.error('UI状态内容无效，重置为默认值');
                const defaultState = {
                    currentConversationId: null,
                    isSidebarOpen: true,
                    webSearchEnabled: false,
                    deepResearchEnabled: false,
                    directRequestEnabled: false
                };
                localStorage.setItem(UI_STATE_KEY, JSON.stringify(defaultState));
                return { fixed: true, message: '已重置损坏的UI状态' };
            }

            // 验证UI状态结构
            let hasFixed = false;
            const fixedState = {
                currentConversationId: state.currentConversationId || null,
                isSidebarOpen: state.isSidebarOpen !== false, // 默认为true
                webSearchEnabled: !!state.webSearchEnabled,
                deepResearchEnabled: !!state.deepResearchEnabled,
                directRequestEnabled: !!state.directRequestEnabled
            };

            // 检查是否进行了修复
            if (JSON.stringify(fixedState) !== JSON.stringify(state)) {
                hasFixed = true;
            }

            // 保存修复后的UI状态
            localStorage.setItem(UI_STATE_KEY, JSON.stringify(fixedState));
            console.log('UI状态已检查完毕');
            return {
                fixed: hasFixed,
                message: hasFixed ? '已修复UI状态问题' : 'UI状态正常',
                currentConversationId: fixedState.currentConversationId
            };
        } catch (error) {
            console.error('修复UI状态时发生错误:', error);
            const defaultState = {
                currentConversationId: null,
                isSidebarOpen: true,
                webSearchEnabled: false,
                deepResearchEnabled: false,
                directRequestEnabled: false
            };
            localStorage.setItem(UI_STATE_KEY, JSON.stringify(defaultState));
            return { fixed: true, message: '修复时发生错误，已重置UI状态' };
        }
    },

    // 检查会话ID是否有效
    checkConversationId(id) {
        if (!id) return false;

        try {
            const conversationsJson = localStorage.getItem(CONVERSATIONS_KEY);
            if (!conversationsJson) return false;

            const conversations = this.safelyParseJSON(conversationsJson);
            if (!conversations || typeof conversations !== 'object') return false;

            return !!conversations[id];
        } catch (error) {
            console.error('检查会话ID时发生错误:', error);
            return false;
        }
    },

    // 主修复函数
    repairAll() {
        console.log('===== 开始修复所有存储 =====');

        // 修复对话存储
        const conversationsResult = this.repairConversations();

        // 修复API设置
        const apiSettingsResult = this.repairApiSettings();

        // 修复UI状态
        const uiStateResult = this.repairUIState();

        // 检查并处理currentConversationId
        if (uiStateResult.currentConversationId && !this.checkConversationId(uiStateResult.currentConversationId)) {
            console.warn(`当前选中的会话ID ${uiStateResult.currentConversationId} 无效，已重置`);
            const uiState = this.safelyParseJSON(localStorage.getItem(UI_STATE_KEY)) || {};
            uiState.currentConversationId = null;
            localStorage.setItem(UI_STATE_KEY, JSON.stringify(uiState));
            uiStateResult.fixed = true;
            uiStateResult.message += '，当前会话ID已重置';
        }

        // 创建会话备份
        const conversationsJson = localStorage.getItem(CONVERSATIONS_KEY);
        if (conversationsJson) {
            sessionStorage.setItem(CONVERSATIONS_KEY + '_backup', conversationsJson);
            console.log('已创建会话数据备份');
        }

        console.log('===== 存储修复完成 =====');

        return {
            conversations: conversationsResult,
            apiSettings: apiSettingsResult,
            uiState: uiStateResult,
            allFixed: conversationsResult.fixed || apiSettingsResult.fixed || uiStateResult.fixed
        };
    }
};

// 自动执行修复
const result = StorageRepairTool.repairAll();
console.log('修复结果:', result);

// 返回修复工具对象，方便在控制台中手动使用
StorageRepairTool