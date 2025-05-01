import React from 'react';
import { Message, Document } from '../../types/types';

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

declare const ChatArea: React.FC<ChatAreaProps>;

export default ChatArea; 