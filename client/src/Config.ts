// 确保process.env类型可用
declare const process: {
  env: {
    NODE_ENV: 'development' | 'production' | 'test'
  }
};

export const serverURL = process.env.NODE_ENV === 'production'
  ? 'https://mini-chatbot-backend.onrender.com'
  : 'http://localhost:5001';

export const maxHistoryLength = 10;

export const defaultTheme = {
  light: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#ffffff',
    surface: '#f8f9fa',
    text: {
      primary: '#212529',
      secondary: '#6c757d',
    },
    border: '#dee2e6',
    messageBackground: {
      user: '#e9ecef',
      assistant: '#007bff',
    },
  },
  dark: {
    primary: '#007bff',
    secondary: '#6c757d',
    background: '#343a40',
    surface: '#2c3135',
    text: {
      primary: '#ffffff',
      secondary: '#adb5bd',
    },
    border: '#495057',
    messageBackground: {
      user: '#495057',
      assistant: '#007bff',
    },
  },
} as const;