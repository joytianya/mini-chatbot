import React, { useState, useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import { serverURL } from '../Config';
import './ChatArea.css';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

// 自动滚动到底部的阈值
const SCROLL_THRESHOLD = 100;

// 简单的Markdown渲染函数
const renderContent = (text) => {
  if (!text) return '';
  
  // 处理代码块
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let lastIndex = 0;
  const parts = [];
  let match;
  
  while ((match = codeBlockRegex.exec(text)) !== null) {
    // 添加代码块之前的文本
    if (match.index > lastIndex) {
      const textBefore = text.substring(lastIndex, match.index);
      parts.push(
        <div key={`text-${lastIndex}`} className="text-part">
          {textBefore.split('\n').map((line, i) => <div key={i}>{line || ' '}</div>)}
        </div>
      );
    }
    
    // 添加代码块
    const language = match[1] || 'javascript';
    const code = match[2];
    parts.push(
      <div key={`code-${match.index}`} className="code-block">
        <SyntaxHighlighter language={language} style={dracula}>
          {code}
        </SyntaxHighlighter>
      </div>
    );
    
    lastIndex = match.index + match[0].length;
  }
  
  // 添加最后剩余的文本
  if (lastIndex < text.length) {
    const textAfter = text.substring(lastIndex);
    parts.push(
      <div key={`text-${lastIndex}`} className="text-part">
        {textAfter.split('\n').map((line, i) => <div key={i}>{line || ' '}</div>)}
      </div>
    );
  }
  
  return parts.length > 0 ? parts : text.split('\n').map((line, i) => <div key={i}>{line || ' '}</div>);
};

const ChatArea = ({
  displayMessages,
  setDisplayMessages,
  currentResponse,
  reasoningText,
  isReasoning,
  streaming,
  darkMode,
  chatContainerRef,
  handleScroll,
  handleRetry,
  handleCopy,
  handleEdit,
  formatTime,
  highlightedMessageId,
  loadingHistory,
  activeDocuments,
  setActiveDocuments,
  input,
  setInput,
  handleSubmit,
  handleStop,
  selectedModel,
  setSelectedModel,
  modelOptions,
  currentTurns,
  maxHistoryLength,
  setDarkMode,
  handleExport,
  sessionHash,
  handleReplyComplete
}) => {
  // 状态控制
  const [isDeepResearch, setIsDeepResearch] = useState(false);
  const [isWebSearch, setIsWebSearch] = useState(false);
  const [streamingPrev, setStreamingPrev] = useState(false);
  const lastSessionRef = useRef(sessionHash);

  // 确保setDisplayMessages存在，如果不存在则提供一个无操作函数
  const updateDisplayMessages = setDisplayMessages || (
    (messages) => console.warn('setDisplayMessages未定义，无法更新显示消息', messages)
  );

  // 处理输入框内容变化
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // 处理按键事件
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e, isDeepResearch, isWebSearch);
    }
  };

  // 将消息保存到localStorage的函数
  const saveMessageToLocalStorage = (message) => {
    try {
      if (!message || typeof message !== 'object') {
        console.error('ChatArea.saveMessageToLocalStorage: 无效的消息对象，无法保存');
        return false;
      }
      
      if (!message.content) {
        console.warn('ChatArea.saveMessageToLocalStorage: 消息内容为空，无法保存');
        return false;
      }

      // 确保消息有必要的属性
      if (!message.id) {
        message.id = `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      }
      if (!message.timestamp) {
        message.timestamp = Date.now();
      }
      if (!message.sessionHash && sessionHash) {
        message.sessionHash = sessionHash;
      }

      console.log('ChatArea.saveMessageToLocalStorage: 开始保存消息', {
        id: message.id,
        role: message.role,
        content: message.content.substring(0, 30) + '...',
        sessionHash: message.sessionHash || sessionHash
      });

      // 检查显示消息列表中是否存在相同内容的消息，但不阻止保存
      const duplicateMsgInDisplay = displayMessages.find(msg => 
        (msg.role === message.role && msg.content === message.content)
      );
      
      if (duplicateMsgInDisplay) {
        console.log('ChatArea.saveMessageToLocalStorage: 消息内容已在显示列表中存在，但仍会保存到localStorage', 
          { existingId: duplicateMsgInDisplay.id, newId: message.id });
      }

      // ⚠️重要：总是获取最新的localStorage数据，防止覆盖其他地方刚保存的内容
      const latestConversationsStr = localStorage.getItem('conversations');
      if (!latestConversationsStr) {
        console.error('ChatArea.saveMessageToLocalStorage: localStorage中没有会话数据');
        return false;
      }
      
      let conversations;
      try {
        conversations = JSON.parse(latestConversationsStr);
        console.log('ChatArea.saveMessageToLocalStorage: 从localStorage获取的最新会话数据', {
          会话数量: conversations.length,
          当前会话Hash: sessionHash
        });
      } catch (error) {
        console.error('ChatArea.saveMessageToLocalStorage: 解析localStorage数据失败', error);
        return false;
      }
      
      // 查找当前会话
      const currentConversationIndex = conversations.findIndex(c => c.sessionHash === sessionHash);
      if (currentConversationIndex === -1) {
        console.error('ChatArea.saveMessageToLocalStorage: 无法找到当前会话:', sessionHash);
        return false;
      }
      
      const currentConversation = conversations[currentConversationIndex];
      
      // 检查消息是否已存在于会话中
      if (currentConversation.messages && Array.isArray(currentConversation.messages)) {
        const duplicateMsgInStorage = currentConversation.messages.find(msg => 
          msg.id === message.id || (msg.role === message.role && msg.content === message.content)
        );
        
        if (duplicateMsgInStorage) {
          console.log('ChatArea.saveMessageToLocalStorage: 消息已存在于会话中，不再保存', {
            existingId: duplicateMsgInStorage.id,
            newId: message.id
          });
          return true;  // 返回true表示消息已处理
        }
      } else {
        currentConversation.messages = [];
      }
      
      // 添加消息到会话
      console.log('ChatArea.saveMessageToLocalStorage: 添加消息到会话', {
        会话ID: currentConversation.id,
        会话标题: currentConversation.title,
        会话Hash: currentConversation.sessionHash,
        当前消息数: currentConversation.messages.length
      });
      
      currentConversation.messages.push(message);
      currentConversation.lastUpdated = Date.now();
      
      // 更新会话列表
      conversations[currentConversationIndex] = currentConversation;
      
      // 保存到localStorage
      try {
        localStorage.setItem('conversations', JSON.stringify(conversations));
        console.log('ChatArea.saveMessageToLocalStorage: 成功保存会话到localStorage', {
          会话ID: currentConversation.id,
          会话标题: currentConversation.title,
          会话Hash: currentConversation.sessionHash,
          消息数量: currentConversation.messages.length,
          最新消息ID: message.id
        });
        return true;
      } catch (error) {
        console.error('ChatArea.saveMessageToLocalStorage: 保存到localStorage失败', error);
        return false;
      }
    } catch (error) {
      console.error('ChatArea.saveMessageToLocalStorage: 处理消息时发生未知错误:', error);
      return false;
    }
  };

  // useEffect处理流式传输结束时保存消息
  useEffect(() => {
    // 当流式传输结束时，保存最新的助手回复
    if (streaming === false && displayMessages.length > 0) {
      // 寻找最新的助手消息
      const lastAssistantMessage = [...displayMessages]
        .reverse()
        .find(message => message.role === 'assistant');
      
      // 记录会话状态以便调试
      console.log('ChatArea: 流式传输结束检测点', {
        sessionHash,
        有最新AI回复: !!lastAssistantMessage,
        AI回复内容: lastAssistantMessage ? lastAssistantMessage.content.substring(0, 30) + '...' : '无'
      });
      // 从localStorage获取最新会话数据
      const latestConversationsStr = localStorage.getItem('conversations');
      if (latestConversationsStr) {
        const latestConversations = JSON.parse(latestConversationsStr);
        // 打印所有会话的消息
        console.log('ChatArea: 所有会话消息:', {
          会话总数: latestConversations.length,
          会话详情: latestConversations.map(conv => ({
            会话ID: conv.id,
            会话标题: conv.title,
            会话Hash: conv.sessionHash,
            消息数量: conv.messages.length,
            消息列表: conv.messages.map(msg => ({
              ID: msg.id,
              角色: msg.role,
              内容: msg.content.substring(0, 30) + '...',
              时间戳: new Date(msg.timestamp).toLocaleString()
            }))
          }))
        });
      }

      if (lastAssistantMessage) {
        console.log('ChatArea: 流式传输已结束，准备保存助手回复', {
          messageId: lastAssistantMessage.id,
          content: lastAssistantMessage.content.substring(0, 30) + '...',
          sessionHash
        });
        
        // 强制保存消息，确保即使用户立即切换对话，消息也会被保存
        setTimeout(() => {
          // 再次从localStorage读取最新数据，防止覆盖
          try {
            const latestConversationsStr = localStorage.getItem('conversations');
            if (!latestConversationsStr) {
              console.error('ChatArea: 保存AI回复时无法获取最新会话数据');
              return;
            }
            
            const conversations = JSON.parse(latestConversationsStr);
            const currentConversationIndex = conversations.findIndex(c => c.sessionHash === sessionHash);
            
            if (currentConversationIndex === -1) {
              console.error('ChatArea: 无法找到当前会话:', sessionHash);
              return;
            }
            
            const currentConversation = conversations[currentConversationIndex];
            
            // 检查消息是否已存在
            if (currentConversation.messages && Array.isArray(currentConversation.messages)) {
              const duplicateMsg = currentConversation.messages.find(msg => 
                msg.id === lastAssistantMessage.id || 
                (msg.role === lastAssistantMessage.role && msg.content === lastAssistantMessage.content)
              );
              
              if (duplicateMsg) {
                console.log('ChatArea: AI回复已存在于会话中，不再保存');
                return;
              }
            }
            
            // 确保消息有完整属性
            const messageToSave = {
              ...lastAssistantMessage,
              id: lastAssistantMessage.id || `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
              timestamp: lastAssistantMessage.timestamp || Date.now(),
              sessionHash: lastAssistantMessage.sessionHash || sessionHash
            };
            
            // 添加消息到会话
            currentConversation.messages.push(messageToSave);
            currentConversation.lastUpdated = Date.now();
            // 打印会话列表详细内容
            console.log('ChatArea: 保存后的会话列表:', {
              会话总数: conversations.length,
              当前会话: {
                标题: currentConversation.title,
                消息数量: currentConversation.messages.length,
                会话哈希: currentConversation.sessionHash,
                最后更新: new Date(currentConversation.lastUpdated).toLocaleString(),
                消息内容: currentConversation.messages.map(msg => ({
                  角色: msg.role,
                  内容: msg.content,
                  ID: msg.id,
                  时间: new Date(msg.timestamp).toLocaleString()
                }))
              },
              所有会话: conversations.map(conv => ({
                标题: conv.title,
                消息数量: conv.messages.length,
                会话哈希: conv.sessionHash,
                是否激活: conv.active,
                最后更新: new Date(conv.lastUpdated).toLocaleString(),
                消息列表: conv.messages.map(msg => ({
                  角色: msg.role,
                  内容: msg.content,
                  ID: msg.id,
                  时间: new Date(msg.timestamp).toLocaleString()
                }))
              }))
            });
            // 保存更新后的会话
            localStorage.setItem('conversations', JSON.stringify(conversations));
            
            console.log('ChatArea: 成功保存AI回复到会话', {
              会话标题: currentConversation.title,
              消息数量: currentConversation.messages.length,
              最新消息: messageToSave.id
            });
          } catch (error) {
            console.error('ChatArea: 保存AI回复时出错:', error);
          }
        }, 0); // 使用setTimeout确保在当前事件循环后执行
        
        // 同时尝试使用常规保存函数
        const saveResult = saveMessageToLocalStorage(lastAssistantMessage);
        console.log('ChatArea: 常规保存助手回复结果:', saveResult);
      } else {
        console.log('ChatArea: 流式传输已结束，但未找到助手消息可保存');
      }
    }
  }, [streaming, displayMessages, sessionHash]);

  // 动画引用和滚动行为
  const scrollToBottom = () => {
    if (chatContainerRef && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  };

  // 流式传输时保持滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, streaming]);

  // 监听消息列表变化，自动滚动到底部
  useEffect(() => {
    if (!chatContainerRef || !chatContainerRef.current) return;

    const container = chatContainerRef.current;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - (scrollTop + clientHeight) <= SCROLL_THRESHOLD;

    // 如果用户在底部或有新消息或正在思考/生成响应，自动滚动
    if (isNearBottom || streaming) {
      // 使用requestAnimationFrame确保滚动发生在DOM更新之后
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }
  }, [displayMessages, currentResponse, reasoningText, streaming]);

  // 使用 MutationObserver 监视思考过程内容的变化
  useEffect(() => {
    if (!chatContainerRef || !chatContainerRef.current || !streaming) return;
    
    // 标记用户是否正在滚动
    let userScrolling = false;
    
    // 用户滚动事件处理
    const handleUserScroll = () => {
      userScrolling = true;
      // 2秒后重置，允许自动滚动
      setTimeout(() => {
        userScrolling = false;
      }, 2000);
    };
    
    // 添加滚动事件监听
    chatContainerRef.current.addEventListener('wheel', handleUserScroll);
    chatContainerRef.current.addEventListener('touchmove', handleUserScroll);
    
    // 创建一个自动滚动函数
    const autoScroll = () => {
      if (chatContainerRef.current && !userScrolling) {
        scrollToBottom();
      }
    };
    
    // 创建 MutationObserver 实例
    const observer = new MutationObserver(() => {
      // 内容变化时立即滚动到底部
      if (!userScrolling) {
        autoScroll();
      }
    });
    
    // 监听整个消息列表区域
    observer.observe(chatContainerRef.current, {
      childList: true,  // 监听子节点变化
      subtree: true,    // 监听子树变化
      characterData: true // 监听文本内容变化
    });
    
    // 定期检查并滚动到底部，确保滚动条始终在底部
    const scrollInterval = setInterval(autoScroll, 100);
    
    // 清理函数
    return () => {
      observer.disconnect();
      clearInterval(scrollInterval);
      if (chatContainerRef.current) {
        chatContainerRef.current.removeEventListener('wheel', handleUserScroll);
        chatContainerRef.current.removeEventListener('touchmove', handleUserScroll);
      }
    };
  }, [streaming, reasoningText, currentResponse]);

  return (
    <div className="chat-area">
      {/* 消息列表区域 */}
      <div 
        className="message-list" 
        ref={chatContainerRef}
        onScroll={handleScroll}
      >
        {/* 历史消息 */}
        {displayMessages.slice(1).map((message, index) => (
          <MessageBubble
            key={message.id || `msg-${index}`}
            content={message.content}
            reasoningContent={message.reasoning_content || message.reasoningContent}
            isUser={message.role === 'user'}
            onRetry={message.role === 'assistant' && handleRetry ? () => handleRetry(message) : null}
            onCopy={handleCopy ? () => handleCopy(message.content) : null}
            onEdit={message.role === 'user' && handleEdit ? 
              (newContent) => handleEdit(message, newContent) : null}
            isStreaming={false}
            id={message.id || `msg-${index}`}
            highlightedMessageId={highlightedMessageId}
            darkMode={darkMode}
            isWebSearch={message.isWebSearch}
          />
        ))}
        
        {/* 当前对话 */}
        {streaming && (currentResponse || reasoningText) && (
          <MessageBubble
            content={currentResponse}
            reasoningContent={reasoningText}
            isUser={false}
            onRetry={null}
            onCopy={null}
            onEdit={null}
            isStreaming={true}
            darkMode={darkMode}
            isWebSearch={isWebSearch}
          />
        )}
      </div>

      {/* 输入区域 */}
      <div className="input-area">
        {/* 功能按钮区域 */}
        <div className="feature-buttons">
          <button 
            className={`feature-button ${isDeepResearch ? 'active' : ''}`}
            onClick={() => setIsDeepResearch(!isDeepResearch)}
            title="深度研究模式"
          >
            <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            深度研究
          </button>
          <button 
            className={`feature-button ${isWebSearch ? 'active' : ''}`}
            onClick={() => setIsWebSearch(!isWebSearch)}
            title="联网搜索模式"
          >
            <svg className="feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            联网搜索
          </button>
        </div>

        <div className="input-container">
          <textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="chat-input"
          />
          <div className="button-container">
            {streaming ? (
              <button 
                onClick={handleStop}
                className="stop-button"
                title="停止生成"
              >
                停止
              </button>
            ) : (
              <button 
                onClick={(e) => handleSubmit(e, isDeepResearch, isWebSearch)}
                className="send-button"
                title="发送消息"
                disabled={!input.trim()}
              >
                发送
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;