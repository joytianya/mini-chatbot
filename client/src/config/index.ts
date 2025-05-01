import { ModelConfig } from '../types';

export const serverURL = process.env.NODE_ENV === 'production'
  ? 'https://mini-chatbot-backend.onrender.com'
  : 'http://localhost:5001';

export const defaultModelConfig: ModelConfig = {
  model_name: '',
  api_key: '',
  api_url: ''
};

export const maxHistoryLength = 10;

export const defaultTheme = {
  light: {
    bg: '#ffffff',
    text: '#000000',
    border: '#e0e0e0',
    primary: '#007bff'
  },
  dark: {
    bg: '#1e1e1e',
    text: '#e0e0e0',
    border: '#333333',
    primary: '#007bff'
  }
};
