export const serverURL = process.env.NODE_ENV === 'production'
  ? 'https://mini-chatbot-backend.onrender.com'
  : 'http://localhost:5001';

export const maxHistoryLength = 10; 