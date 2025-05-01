export interface ModelType {
  id: string;
  name: string;
  provider?: string;
  description?: string;
  contextLength?: number;
  maxTokens?: number;
}

export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
  isError?: boolean;
  loading?: boolean;
  special?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  active: boolean;
  model?: string;
  system_prompt?: string;
  timestamp?: number;
  activeDocuments?: Document[];
  is_conversation?: boolean;
}

export interface ModelConfig {
  model_name: string;
  api_key: string;
  api_url?: string;
  organization_id?: string;
  provider: string;
}

export interface EmbeddingConfig {
  model_name: string;
  api_key: string;
  api_url?: string;
  provider: string;
}

export interface Document {
  id: string;
  name: string;
  content: string;
  type: string;
  size?: number;
  timestamp?: number;
} 