// API service for communicating with the backend

// 开发环境中默认后端地址
const BACKEND_URL =
    import.meta.env.VITE_SERVER_URL || 'http://localhost:5001';

export const apiService = {
    // 获取OpenRouter配置
    async getOpenRouterConfig() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/config/openrouter`);

            if (!response.ok) {
                throw new Error(`获取配置失败: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || '获取配置失败');
            }

            return data.config;
        } catch (error) {
            console.error('获取OpenRouter配置错误:', error);
            throw error;
        }
    },

    // Send a chat message to the backend or directly to OpenRouter API
    async sendChatMessage(messages, apiSettings, webSearchEnabled, deepResearchEnabled, directRequest = false, signal = null) {
        try {
            let response;
            const backendUrl = BACKEND_URL; // 确保使用正确的后端URL

            if (directRequest) {
                // 直接请求API
                // 确保消息只包含role和content字段，移除id和timestamp字段
                const apiMessages = messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                // 构建请求URL
                const apiUrl = `${apiSettings.base_url}/chat/completions`;

                // 构建请求头
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'text/event-stream', // 支持流式响应
                    'Authorization': `Bearer ${apiSettings.api_key}`
                };

                // 如果是OpenRouter API，添加额外的header参数
                if (apiSettings.base_url.includes('openrouter.ai')) {
                    headers['HTTP-Referer'] = window.location.origin;
                    headers['X-Title'] = 'Mini Chatbot';
                }

                // 构建请求体
                const requestBody = {
                    messages: apiMessages,
                    model: apiSettings.model_name,
                    stream: true // 启用流式输出
                };

                response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(requestBody),
                    signal: signal // Pass the abort signal
                });

            } else {
                // 使用后端服务器
                // 确保消息只包含role和content字段，移除id和timestamp字段
                const apiMessages = messages.map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                // 使用完整的后端URL地址
                response = await fetch(`${backendUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'text/event-stream', // 添加: 支持流式响应
                        'HTTP-Referer': window.location.origin, // 添加OpenRouter所需的请求头
                        'X-Title': 'Mini Chatbot' // 添加OpenRouter所需的请求头
                    },
                    body: JSON.stringify({
                        messages: apiMessages, // 使用处理过的消息
                        base_url: apiSettings.base_url,
                        api_key: apiSettings.api_key,
                        model_name: apiSettings.model_name,
                        web_search: webSearchEnabled,
                        deep_research: deepResearchEnabled,
                        stream: true // 确保启用流式输出
                    }),
                    signal: signal // Pass the abort signal
                });

            }

            if (!response.ok) {
                try {
                    const errorText = await response.text();
                    let errorMessage = '发送消息时出错';

                    // 尝试解析JSON
                    if (errorText) {
                        try {
                            const errorData = JSON.parse(errorText);

                            // 处理不同API可能返回的错误格式
                            if (errorData.error && typeof errorData.error === 'object') {
                                errorMessage = errorData.error.message || errorData.error.type || errorMessage;
                            } else if (errorData.error) {
                                errorMessage = errorData.error;
                            } else if (errorData.message) {
                                errorMessage = errorData.message;
                            }

                            console.error('API错误详情:', errorData);
                        } catch (e) {
                            // 如果不是JSON，就使用原始文本
                            errorMessage = errorText || errorMessage;
                            console.error('API错误文本:', errorText);
                        }
                    }

                    throw new Error(errorMessage);
                } catch (e) {
                    throw new Error(`响应错误: ${response.status} ${response.statusText}`);
                }
            }

            // 检查是否是流式响应
            const contentType = response.headers.get('Content-Type') || '';

            // 直接返回响应对象，由调用者处理流式响应
            if (contentType.includes('text/event-stream') || directRequest) {
                return response;
            }

            try {
                return await response.json();
            } catch (e) {
                // 如果响应不是JSON，尝试返回文本
                console.error('解析JSON响应失败:', e);
                const text = await response.text();
                return { text };
            }
        } catch (error) {
            console.error('API错误:', error);
            throw error;
        }
    },

    // Test the API connection
    async testConnection() {
        try {
            const response = await fetch(`${BACKEND_URL}/api/test`);
            if (!response.ok) {
                throw new Error(`状态码: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('测试连接错误:', error);
            throw error;
        }
    }
};

export default apiService;