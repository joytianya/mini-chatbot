import React from 'react';
import { Conversation } from '../../types/types';

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

declare const Sidebar: React.FC<SidebarProps>;

export default Sidebar; 