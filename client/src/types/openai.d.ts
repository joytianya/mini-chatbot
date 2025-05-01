declare module 'openai' {
  export class Configuration {
    constructor(options: {
      apiKey?: string;
      organization?: string;
      basePath?: string;
    });
  }

  export class OpenAIApi {
    constructor(configuration: Configuration);
    
    createCompletion(options: {
      model: string;
      prompt: string | string[];
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      n?: number;
      stream?: boolean;
      stop?: string | string[];
    }): Promise<{
      data: {
        choices: Array<{
          text: string;
          index: number;
        }>;
      }
    }>;
    
    createChatCompletion(options: {
      model: string;
      messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
      }>;
      max_tokens?: number;
      temperature?: number;
      top_p?: number;
      n?: number;
      stream?: boolean;
      stop?: string | string[];
    }): Promise<{
      data: {
        choices: Array<{
          message: {
            role: string;
            content: string;
          };
          index: number;
        }>;
      }
    }>;
    
    createEmbedding(options: {
      model: string;
      input: string | string[];
    }): Promise<{
      data: {
        data: Array<{
          embedding: number[];
          index: number;
        }>;
      }
    }>;
  }
} 