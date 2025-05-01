import { Message } from '../types';

export const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const exportConversation = (messages: Message[]): string => {
  return messages.map(msg => {
    const role = msg.role === 'user' ? '用户' : '助手';
    return `${role} (${formatTime(msg.timestamp)}): ${msg.content}\n`;
  }).join('\n');
};

export const generateMessageId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const isUserMessage = (message: Message): boolean => {
  return message.role === 'user';
};

export const isAssistantMessage = (message: Message): boolean => {
  return message.role === 'assistant';
};
