export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  active: boolean;
  createdAt: string;
  activeDocuments?: Document[];
}

export interface ModelConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  api_key?: string;
  api_url?: string;
  webSearch?: boolean;
  deepResearch?: boolean;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  embedding?: string[];
  createdAt: string;
}

export interface ChatState {
  darkMode: boolean;
  selectedModel: string;
  availableModels: string[];
  modelConfigs: ModelConfig[];
  embeddingConfig: ModelConfig | null;
  activeDocuments: Document[];
  displayMessages: Message[];
  requestMessages: Message[];
  streaming: boolean;
  currentResponse: string;
  reasoningText: string;
  isReasoning: boolean;
  sessionHash: string;
  highlightedMessageId: string | null;
  userHasScrolled: boolean;
  currentTurns: number;
  conversations: Conversation[];
  isSidebarExpanded: boolean;
  input: string;
  sensitiveInfoProtectionEnabled: boolean;
}
