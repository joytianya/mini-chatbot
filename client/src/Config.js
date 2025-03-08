export const serverURL = process.env.NODE_ENV === 'production' 
  ? 'https://mini-chatbot-backend.onrender.com'
  : 'http://localhost:5001';

export const modelOptions = [
  'gpt-3.5-turbo',
  'gpt-4'
];

export const maxHistoryLength = 50; 