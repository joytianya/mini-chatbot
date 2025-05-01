// 声明所有.js文件
declare module '*.js';

// 声明所有.jsx文件
declare module '*.jsx';

// 声明特定的模块
declare module './Config' {
  export const serverURL: string;
  export const maxHistoryLength: number;
}

declare module './Config.ts' {
  export const serverURL: string;
  export const maxHistoryLength: number;
}

declare module './utils/sessionManager' {
  export function handleReplyComplete(message: string, response: string): void;
}

// 声明组件模块
declare module './components/sidebar/Sidebar' {
  import React from 'react';
  import { Conversation } from '../types/types';
  
  interface SidebarProps {
    isSidebarExpanded: boolean;
    handleNewChat: () => void;
    conversations: Conversation[];
    handleConversationClick: (conversationId: string) => void;
    handleDeleteConversation: (conversationId: string) => void;
    streaming: boolean;
    handleClearAll: () => void;
    handleExport: () => void;
    darkMode: boolean;
    setDarkMode: (value: boolean) => void;
    availableModels: string[];
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    handleSettingsSave: (settings: any) => void;
    sensitiveInfoProtectionEnabled: boolean;
    toggleSensitiveInfoProtection: () => void;
    handleToggleSidebar: () => void;
  }

  const Sidebar: React.FC<SidebarProps>;
  export default Sidebar;
}

declare module './components/chat/ChatArea' {
  import React from 'react';
  import { Message, Document } from '../types/types';

  interface ChatAreaProps {
    displayMessages: Message[];
    setDisplayMessages: React.Dispatch<React.SetStateAction<Message[]>>;
    currentResponse: string;
    reasoningText: string;
    isReasoning: boolean;
    streaming: boolean;
    darkMode: boolean;
    chatContainerRef: React.RefObject<HTMLDivElement>;
    handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
    handleRetry: () => void;
    handleCopy: (text: string) => void;
    handleEdit: (messageId: string, newContent: string) => void;
    formatTime: (timestamp: number) => string;
    highlightedMessageId: string | null;
    loadingHistory: boolean;
    activeDocuments: Document[];
    setActiveDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    handleSubmit: (e: React.FormEvent) => void;
    handleStop: () => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    modelOptions: string[];
    currentTurns: number;
    maxHistoryLength: number;
    setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
    handleExport: () => void;
    sessionHash: string;
    handleReplyComplete: (message: string, response: string) => void;
    handleNewChat: () => void;
    handleToggleSidebar: () => void;
    toggleDarkMode: () => void;
    setShowFileUpload: React.Dispatch<React.SetStateAction<boolean>>;
    openSettings: () => void;
  }

  const ChatArea: React.FC<ChatAreaProps>;
  export default ChatArea;
}

declare module './components/settings/Settings' {
  import React from 'react';
  import { ModelConfig } from '../types/types';

  interface SettingsProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (settings: { configs: ModelConfig[], modelNames: string[] }) => void;
    modelConfigs: ModelConfig[];
    availableModels: string[];
  }

  const Settings: React.FC<SettingsProps>;
  export default Settings;
} 