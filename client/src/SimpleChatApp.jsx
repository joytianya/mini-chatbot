import React, { useState, useEffect, useRef } from 'react';
import './SimpleChatApp.css';

/**
 * 简单聊天应用组件
 * 只包含基本的聊天功能，支持流式输出思考过程和答案
 */
const SimpleChatApp = () => {
  // 基本状态
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [isReasoning, setIsReasoning] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  
  // 引用
  const messagesEndRef = useRef(null);
  
  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // 当消息更新时滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponse, reasoningText]);
  
  // 从本地存储加载消息
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem('simple_chat_messages');
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      
      const savedDarkMode = localStorage.getItem('simple_chat_dark_mode');
      if (savedDarkMode !== null) {
        setDarkMode(JSON.parse(savedDarkMode));
      }
    } catch (error) {
      console.error('加载消息失败:', error);
    }
  }, []);
  
  // 保存消息到本地存储
  useEffect(() => {
    try {
      localStorage.setItem('simple_chat_messages', JSON.stringify(messages));
    } catch (error) {
      console.error('保存消息失败:', error);
    }
  }, [messages]);
  
  // 保存暗色模式设置
  useEffect(() => {
    try {
      localStorage.setItem('simple_chat_dark_mode', JSON.stringify(darkMode));
    } catch (error) {
      console.error('保存暗色模式设置失败:', error);
    }
  }, [darkMode]);
  
  // 发送消息
  const handleSendMessage = () => {
    if (!input.trim() || isStreaming) return;
    
    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      content: input,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    
    // 模拟流式响应
    simulateStreamingResponse(input);
  };
  
  // 模拟流式响应
  const simulateStreamingResponse = (userInput) => {
    setIsStreaming(true);
    setCurrentResponse('');
    setReasoningText('');
    setIsReasoning(true);
    
    // 模拟思考过程
    const reasoningParts = [
      "我需要分析这个问题...",
      "让我思考一下最佳的回答方式...",
      "考虑到用户的需求，我应该提供详细信息...",
      "根据我的知识，我可以这样回答..."
    ];
    
    let reasoningIndex = 0;
    const reasoningInterval = setInterval(() => {
      if (reasoningIndex < reasoningParts.length) {
        setReasoningText(prev => prev + reasoningParts[reasoningIndex] + " ");
        reasoningIndex++;
      } else {
        clearInterval(reasoningInterval);
        setIsReasoning(false);
        startResponseStreaming(userInput);
      }
    }, 700);
  };
  
  // 开始响应流式输出
  const startResponseStreaming = (userInput) => {
    // 根据用户输入生成响应（这里是简单示例）
    let response = '';
    if (userInput.toLowerCase().includes('你好') || userInput.toLowerCase().includes('hello')) {
      response = "你好！我是一个简单的聊天机器人。我可以回答你的问题，请随时向我提问。";
    } else if (userInput.toLowerCase().includes('名字')) {
      response = "我是Mini Chatbot，一个简单的聊天助手。很高兴认识你！";
    } else if (userInput.toLowerCase().includes('时间') || userInput.toLowerCase().includes('日期')) {
      response = `现在的时间是 ${new Date().toLocaleString()}`;
    } else {
      response = "感谢你的消息！我是一个简单的演示聊天机器人，目前只能进行基本对话。在实际应用中，这里会连接到真正的AI模型来生成回答。";
    }
    
    // 模拟流式输出
    let index = 0;
    const responseInterval = setInterval(() => {
      if (index < response.length) {
        setCurrentResponse(prev => prev + response[index]);
        index++;
      } else {
        clearInterval(responseInterval);
        
        // 添加助手消息
        const assistantMessage = {
          id: Date.now(),
          content: response,
          reasoning_content: reasoningText,
          role: 'assistant',
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        setCurrentResponse('');
        setReasoningText('');
        setIsStreaming(false);
      }
    }, 30);
  };
  
  // 停止生成
  const handleStop = () => {
    setIsStreaming(false);
    setIsReasoning(false);
    
    // 如果有部分响应，将其添加为消息
    if (currentResponse) {
      const assistantMessage = {
        id: Date.now(),
        content: currentResponse,
        reasoning_content: reasoningText,
        role: 'assistant',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setCurrentResponse('');
      setReasoningText('');
    }
  };
  
  // 清空对话
  const handleClearChat = () => {
    if (window.confirm('确定要清空所有对话吗？')) {
      setMessages([]);
      setCurrentResponse('');
      setReasoningText('');
      setIsStreaming(false);
      setIsReasoning(false);
    }
  };
  
  // 切换暗色模式
  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };
  
  // 格式化时间
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      return '';
    }
  };
  
  return (
    <div className={`simple-chat-app ${darkMode ? 'dark-mode' : ''}`}>
      <div className="chat-header">
        <h1>Mini Chatbot</h1>
        <div className="header-buttons">
          <button className="clear-button" onClick={handleClearChat}>
            清空对话
          </button>
          <button className="theme-button" onClick={toggleDarkMode}>
            {darkMode ? '切换亮色' : '切换暗色'}
          </button>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h2>欢迎使用 Mini Chatbot</h2>
            <p>这是一个简单的聊天界面，支持流式输出思考过程和答案。</p>
            <p>开始发送消息，体验聊天功能吧！</p>
          </div>
        ) : (
          messages.map(message => (
            <div 
              key={message.id} 
              className={`message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
            >
              <div className="message-header">
                <span className="message-role">
                  {message.role === 'user' ? '用户' : '助手'}
                </span>
                <span className="message-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              
              {message.reasoning_content && (
                <div className="reasoning-content">
                  <div className="reasoning-header">思考过程：</div>
                  <div className="reasoning-text">{message.reasoning_content}</div>
                </div>
              )}
              
              <div className="message-content">{message.content}</div>
            </div>
          ))
        )}
        
        {isStreaming && (
          <div className="message assistant-message streaming">
            <div className="message-header">
              <span className="message-role">助手</span>
              <span className="message-time">{formatTime(new Date())}</span>
            </div>
            
            {isReasoning && reasoningText && (
              <div className="reasoning-content">
                <div className="reasoning-header">思考过程：</div>
                <div className="reasoning-text">{reasoningText}</div>
              </div>
            )}
            
            {currentResponse && (
              <div className="message-content">{currentResponse}</div>
            )}
            
            {!currentResponse && !reasoningText && (
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <div className="input-container">
        <textarea
          className="message-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          placeholder="输入消息..."
          disabled={isStreaming}
        />
        
        {isStreaming ? (
          <button 
            className="stop-button"
            onClick={handleStop}
          >
            停止
          </button>
        ) : (
          <button 
            className="send-button"
            onClick={handleSendMessage}
            disabled={!input.trim()}
          >
            发送
          </button>
        )}
      </div>
      
      <div className="input-help">
        <small>按 Enter 发送，Shift+Enter 换行</small>
      </div>
    </div>
  );
};

export default SimpleChatApp;
