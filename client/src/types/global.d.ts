// 为JavaScript模块添加全局声明
declare module '*.js';
declare module '*.jsx';
declare module '*.css';

// 为缺少类型的模块添加声明
declare module '../utils/messageUtils';
declare module './useChatCore';
declare module './useConversations';
declare module './useMessageSubmission';
declare module '../settings';
declare module 'openai';

// 项目特定模块
declare module './Config';
declare module './components/sidebar/Sidebar';
declare module './components/chat/ChatArea';
declare module './components/settings/Settings';
declare module './components/SensitiveInfoDemo';
declare module './components/ErrorBoundary';
declare module './utils/sessionManager'; 