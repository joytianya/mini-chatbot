import React, { useState } from 'react';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import './Chat.css';

export function Chat() {
  const [messages, setMessages] = useState([]);
  const [streaming, setStreaming] = useState(false);

  const handleSendMessage = async (message) => {
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // 设置流式响应状态
    setStreaming(true);
    
    try {
      // TODO: 实现与后端的通信
      // 模拟 AI 响应
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '这是一个模拟的 AI 响应。\n\n我可以：\n- 回答问题\n- 编写代码\n- 解释概念' 
        }]);
        setStreaming(false);
      }, 1000);
    } catch (error) {
      console.error('发送消息失败:', error);
      setStreaming(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="model-selector">
        <div className="model-info">
          <span className="model-name">Gemini Pro</span>
          <span className="model-version">1.0</span>
        </div>
        <button className="advanced-button">高级版本</button>
      </div>
      
      <div className="chat-main">
        <MessageList 
          messages={messages}
          streaming={streaming}
        />
        <MessageInput 
          onSendMessage={handleSendMessage}
          streaming={streaming}
        />
      </div>
    </div>
  );
} 