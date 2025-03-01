// 测试用配置
export const modelOptions = [
  'deepseek-v3-241226',
  'deepseek-r1-250120',
  //'deepseek-chat',
  //'deepseek-reasoner'
];
export const maxHistoryLength = 10;  // 添加最大对话长度配置

// API 地址
export const serverURL = process.env.NODE_ENV === 'production' 
  ? 'https://mini-chatbot-zty6.onrender.com'
  : window.location.hostname === 'localhost' 
    ? 'http://localhost:5001'
    : `http://${window.location.hostname}:5001`;

// 本地调试用 