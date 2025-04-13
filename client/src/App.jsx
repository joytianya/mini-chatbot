import React, { useState, useRef, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import { useConversationManagement } from './hooks/useConversationManagement';
import { useMessageHandling } from './hooks/useMessageHandling';

const App = () => {
  // 添加chatContainerRef
  const chatContainerRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [currentSessionHash, setCurrentSessionHash] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [displayMessages, setDisplayMessages] = useState([]);
  const [requestMessages, setRequestMessages] = useState([]);
  const [currentResponse, setCurrentResponse] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [activeDocuments, setActiveDocuments] = useState([]);
  const [userHasScrolled, setUserHasScrolled] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);

  // 修改scrollToBottom函数使用ref并用useCallback包裹
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatContainerRef]); // 依赖项是 chatContainerRef

  // 使用不同的名称实现保存对话函数并用useCallback包裹
  const saveCompletedReply = useCallback((assistantMessage) => {
    console.log('App.jsx中的saveCompletedReply被调用', assistantMessage?.id);
    
    // 防御性检查：确保assistantMessage是对象且有必要属性
    if (!assistantMessage || typeof assistantMessage !== 'object') {
      console.error('保存AI回复失败：无效的消息对象', assistantMessage);
      return false;
    }
    
    // 确保消息有内容
    if (!assistantMessage.content) {
      console.warn('AI回复无内容，不保存');
      return false;
    }
    
    try {
      // 严格检查此消息是否已存在于displayMessages中
      const messageExists = displayMessages.some(msg => 
        // 1. ID匹配
        (msg.id === assistantMessage.id) || 
        // 2. 角色和内容都匹配的消息
        (msg.role === 'assistant' && msg.content === assistantMessage.content)
      );
      
      // 如果消息已存在，不再添加
      if (messageExists) {
        console.log('App.jsx: 该AI回复已存在于displayMessages中，跳过保存');
        return true; // 返回true表示处理成功
      }
      
      // 双重保险：直接从localStorage中读取最新的对话历史
      let latestConversations;
      try {
        const storedHistory = localStorage.getItem('conversations');
        if (storedHistory) {
          latestConversations = JSON.parse(storedHistory);
        } else {
          latestConversations = [...conversations];
        }
      } catch (error) {
        console.error('读取localStorage中的对话历史失败:', error);
        latestConversations = [...conversations];
      }
      
      // 找到当前活动对话
      const activeConv = latestConversations.find(conv => conv.active);
      if (activeConv) {
        // 再次检查此消息是否已存在于对话中
        const messageExistsInConv = activeConv.messages.some(msg => 
          (msg.id === assistantMessage.id) || 
          (msg.role === 'assistant' && msg.content === assistantMessage.content)
        );
        
        if (messageExistsInConv) {
          console.log('App.jsx: 该AI回复已存在于对话历史中，跳过保存');
          return true; // 返回true表示处理成功
        }
      }
      
      console.log('App.jsx: 消息检查完毕，开始保存AI回复');
      
      // 使用函数式更新确保原子性
      setDisplayMessages(prev => {
        // 再检查一次消息是否已存在
        if (prev.some(msg => 
          (msg.id === assistantMessage.id) || 
          (msg.role === 'assistant' && msg.content === assistantMessage.content)
        )) {
          console.log('App.jsx: 最终检查 - 消息已存在，跳过添加');
          return prev;
        }
        return [...prev, assistantMessage];
      });
      
      // 如果没有活动对话或对话列表为空，不进行进一步处理
      if (!activeConv) {
        console.warn('App.jsx: 找不到活动对话，只更新UI不保存到localStorage');
        return true;
      }
      
      // 更新当前对话历史
      const updatedConversations = latestConversations.map(conv => {
        if (conv.active) {
          // 最后一次检查这条消息是否已经存在于对话历史中
          const msgExists = conv.messages.some(msg => 
            msg.id === assistantMessage.id ||
            (msg.role === 'assistant' && msg.content === assistantMessage.content)
          );
          
          // 如果消息已存在，不添加
          if (msgExists) {
            return conv;
          }
          
          return {
            ...conv,
            messages: [...conv.messages, assistantMessage],
            timestamp: Date.now()
          };
        }
        return conv;
      });
      
      // 保存到本地存储
      console.log('App.jsx: 保存更新后的对话历史到localStorage');
      localStorage.setItem('conversations', JSON.stringify(updatedConversations));
      setConversations(updatedConversations);
      
      return true;
    } catch (error) {
      console.error('App.jsx: 保存AI回复时发生错误:', error);
      return false;
    }
  }, [displayMessages, conversations, setConversations, setDisplayMessages]); // 添加依赖项

  // 使用对话管理钩子
  const {
    handleNewChat,
    handleConversationClick,
    handleDeleteConversation,
    handleClearAll,
    handleTitleEdit,
    handleTitleChange,
    handleTitleSave,
    handleTitleCancel
  } = useConversationManagement(
    conversations,
    setConversations,
    setDisplayMessages,
    setRequestMessages,
    setCurrentResponse,
    setReasoningText,
    setStreaming,
    setActiveDocuments,
    setUserHasScrolled,
    scrollToBottom
  );

  // 消息处理相关钩子
  const {
    input,
    setInput,
    displayMessages: messageHandlingDisplayMessages,
    setDisplayMessages: setMessageHandlingDisplayMessages,
    requestMessages: messageHandlingRequestMessages,
    setRequestMessages: setMessageHandlingRequestMessages,
    streaming: messageHandlingStreaming,
    setStreaming: setMessageHandlingStreaming,
    currentResponse: messageHandlingCurrentResponse,
    setCurrentResponse: setMessageHandlingCurrentResponse,
    reasoningText: messageHandlingReasoningText,
    setReasoningText: setMessageHandlingReasoningText,
    isReasoning,
    setIsReasoning,
    sendChatRequest,
    handleSubmit: originalHandleSubmit,
    handleResponse,
    handleStop,
    handleReplyComplete
  } = useMessageHandling(
    displayMessages, 
    setDisplayMessages,
    requestMessages,
    setRequestMessages,
    conversations,
    setConversations,
    '', // selectedModel - 暂时使用空字符串
    [], // modelConfigs - 暂时使用空数组
    {}, // embeddingConfig - 暂时使用空对象
    false, // sensitiveInfoProtectionEnabled - 暂时禁用
    scrollToBottom // 使用之前定义的scrollToBottom函数
  );

  // 包装handleSubmit函数，确保消息发送后清空输入框，并用useCallback包裹
  const handleSubmit = useCallback(async (e, isDeepResearch = false, isWebSearch = false) => {
    // 保存当前输入值用于创建用户消息
    const currentInput = input.trim();
    
    // 如果输入为空，不处理
    if (!currentInput) {
      console.warn('不能发送空消息');
      return;
    }
    
    console.log('准备发送消息:', currentInput);
    
    // 立即清空输入框，提高用户体验
    setInput('');
    
    // 调用原始的handleSubmit函数并传入当前输入值
    return await originalHandleSubmit(e, isDeepResearch, isWebSearch, null, currentInput);
  }, [input, setInput, originalHandleSubmit]); // 添加依赖项

  const handleFileUpload = (file) => {
    // Implementation of handleFileUpload
  };

  // 处理编辑消息，并用useCallback包裹
  const handleEdit = useCallback((message, newContent = null) => {
    console.log('处理编辑消息:', message, newContent);
    
    // 如果只传递了一个参数，且是字符串，则视为新内容
    if (typeof message === 'string' && newContent === null) {
      console.log('传入的是编辑内容字符串，查找最后一条用户消息');
      const lastUserMessage = displayMessages.findLast(msg => msg.role === 'user');
      if (!lastUserMessage) {
        console.error('无法编辑：找不到用户消息');
        return;
      }
      return handleEdit(lastUserMessage, message);
    }

    // 检查消息对象有效性
    if (!message || !message.id) {
      console.error('无效的消息对象:', message);
      return;
    }

    // 更新消息内容
    const updatedDisplayMessages = displayMessages.map(msg => {
      if (msg.id === message.id) {
        return {
          ...msg,
          content: newContent || message.content,
          timestamp: Date.now(),
          edited: true
        };
      }
      return msg;
    });

    // 更新显示消息
    setDisplayMessages(updatedDisplayMessages);

    // 更新对话历史
    const updatedConversations = conversations.map(conv => {
      if (conv.active) {
        return {
          ...conv,
          messages: updatedDisplayMessages,
          timestamp: Date.now()
        };
      }
      return conv;
    });

    // 更新状态并保存到本地存储
    setConversations(updatedConversations);
    localStorage.setItem('conversations', JSON.stringify(updatedConversations));

    // 找到被编辑的消息
    const editedMessage = updatedDisplayMessages.find(msg => msg.id === message.id);
    if (!editedMessage) {
      console.error('无法找到编辑后的消息');
      return;
    }

    // 触发AI响应，使用带有editedMessage参数的handleSubmit
    try {
      console.log('提交编辑后的消息给AI:', editedMessage);
      originalHandleSubmit(null, false, false, editedMessage);
    } catch (error) {
      console.error('处理编辑消息时出错:', error);
      alert('处理编辑消息失败，请重试');
    }
  }, [displayMessages, setDisplayMessages, conversations, setConversations, originalHandleSubmit]); // 添加依赖项

  // 组件渲染前确保saveCompletedReply函数有效
  console.log('App组件渲染，saveCompletedReply函数类型:', typeof saveCompletedReply);

  return (
    // Add app-layout class and remove inline styles for layout
    <div className="app-layout"> 
      {/* Add sidebar-column class */}
      <div className="sidebar-column"> 
        <Sidebar
          conversations={conversations}
          currentSessionHash={currentSessionHash}
          handleConversationClick={handleConversationClick}
          handleNewChat={handleNewChat}
          handleDeleteConversation={handleDeleteConversation}
          handleClearAll={handleClearAll}
          onUploadSuccess={handleFileUpload}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          streaming={streaming}
          isSidebarExpanded={isSidebarExpanded}
          // Pass the actual toggle function to Sidebar if it needs it, 
          // otherwise remove or keep placeholder
          handleToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} 
        />
      </div>
      {/* Add chat-column class */}
      <div className="chat-column"> 
        {/* Ensure only one ChatArea is rendered */}
        <ChatArea
          // Pass props from useMessageHandling hook
          input={input} 
          setInput={setInput}
          handleSubmit={handleSubmit} // Use the wrapped handleSubmit
          displayMessages={messageHandlingDisplayMessages || displayMessages} // Use state from hook or App
          streaming={messageHandlingStreaming || streaming} // Use state from hook or App
          currentResponse={messageHandlingCurrentResponse || currentResponse} // Use state from hook or App
          reasoningText={messageHandlingReasoningText || reasoningText} // Use state from hook or App
          isReasoning={isReasoning} // Pass isReasoning
          handleStop={handleStop} // Pass handleStop
          handleReplyComplete={handleReplyComplete} // Pass handleReplyComplete
          
          // Pass props from useConversationManagement hook or App state
          conversations={conversations} // Pass conversations if needed inside ChatArea (e.g., for header info)
          currentSessionHash={currentSessionHash} // Pass sessionHash
          activeDocuments={activeDocuments} // Pass activeDocuments
          setActiveDocuments={setActiveDocuments} // Pass setActiveDocuments
          
          // Pass general App state and handlers
          darkMode={darkMode}
          setDarkMode={setDarkMode} // Pass setDarkMode if needed inside ChatArea
          chatContainerRef={chatContainerRef} // Pass the ref
          handleScroll={() => {}} // Placeholder for scroll handling if needed
          handleEdit={handleEdit} // Pass handleEdit
          setDisplayMessages={setMessageHandlingDisplayMessages || setDisplayMessages} // Pass setDisplayMessages
          
          // Props specifically for ChatHeader (passed down through ChatArea)
          handleNewChat={handleNewChat} // Pass handleNewChat for header button
          handleExport={handleExport} // Pass handleExport for header button
          handleToggleSidebar={() => setIsSidebarExpanded(!isSidebarExpanded)} // Pass toggle for header button
          toggleDarkMode={toggleDarkMode} // Pass toggleDarkMode for header button
          setShowFileUpload={setShowFileUpload} // Pass setShowFileUpload for header button
          openSettings={openSettings} // Pass openSettings for header button
          currentTurns={currentTurns} // Pass currentTurns for header display
          
          // Props specifically for MessageList (passed down through ChatArea)
          handleRetry={handleRetry} // Pass handleRetry (ensure it's defined, likely from useMessageHandling)
          handleCopy={handleCopy} // Pass handleCopy (ensure it's defined)
          formatTime={formatTime} // Pass formatTime (ensure it's defined)
          highlightedMessageId={highlightedMessageId} // Pass highlightedMessageId (ensure it's defined)
          loadingHistory={loadingHistory} // Pass loadingHistory (ensure it's defined)
          
          // Props specifically for MessageInput (passed down through ChatArea)
          selectedModel={selectedModel} // Pass selectedModel (ensure it's defined)
          setSelectedModel={setSelectedModel} // Pass setSelectedModel (ensure it's defined)
          modelOptions={modelOptions} // Pass modelOptions (ensure it's defined)
          maxHistoryLength={maxHistoryLength} // Pass maxHistoryLength if needed by input/validation
        displayMessages={messageHandlingDisplayMessages || displayMessages}
        streaming={messageHandlingStreaming || streaming}
        currentResponse={messageHandlingCurrentResponse || currentResponse}
        reasoningText={messageHandlingReasoningText || reasoningText}
        isReasoning={isReasoning}
        handleStop={handleStop}
        darkMode={darkMode}
        activeDocuments={activeDocuments}
        sessionHash={currentSessionHash}
        chatContainerRef={chatContainerRef}
        handleScroll={() => {}} // Placeholder, might need actual implementation
        handleEdit={handleEdit}
        setDisplayMessages={setDisplayMessages} // Pass setDisplayMessages
        // Pass other necessary props from ChatArea's definition
        handleRetry={handleRetry} // Assuming handleRetry comes from useMessageHandling or similar
        handleCopy={handleCopy} // Assuming handleCopy comes from useMessageHandling or similar
        formatTime={formatTime} // Assuming formatTime comes from somewhere
        highlightedMessageId={highlightedMessageId} // Assuming highlightedMessageId exists
        loadingHistory={loadingHistory} // Assuming loadingHistory exists
        setActiveDocuments={setActiveDocuments}
        />
      </div>
    </div>
  );
};

export default App; 
