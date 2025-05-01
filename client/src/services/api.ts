import { serverURL } from '../config';
import { Document, ModelConfig } from '../types';

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export const apiService = {
  async fetchMessages(sessionHash: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${serverURL}/api/messages/${sessionHash}`);
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async sendMessage(message: string, sessionHash: string, modelConfig: ModelConfig): Promise<ApiResponse> {
    try {
      const response = await fetch(`${serverURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionHash,
          modelConfig
        }),
        credentials: 'include',
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async uploadFiles(files: File[], embeddingConfig: ModelConfig | null): Promise<ApiResponse> {
    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('files', file);
      });

      if (embeddingConfig) {
        formData.append('api_key', embeddingConfig.api_key);
        formData.append('base_url', embeddingConfig.api_url || '');
        formData.append('model_name', embeddingConfig.model_name);
      }

      const response = await fetch(`${serverURL}/api/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async deleteConversation(id: string): Promise<ApiResponse> {
    try {
      const response = await fetch(`${serverURL}/api/conversations/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};
