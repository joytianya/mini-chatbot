// 确保process.env类型可用
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test'
  }
};

// 服务器基础URL
export const SERVER_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://mini-chatbot-backend.onrender.com'
  : 'http://localhost:5001';

// 其他全局设置
export const DEFAULT_SYSTEM_PROMPT = 'You are a helpful, creative, clever, and very friendly assistant.';
export const MAX_RESPONSE_TOKENS = 4096;
export const MAX_TURN_COUNT = 10; 