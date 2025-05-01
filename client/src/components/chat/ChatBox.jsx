import React, { useState, useRef, useEffect } from 'react';
import { serverURL } from '../../Config';
import MessageList from './MessageList';
import { MessageInput } from './MessageInput';

/**
 * ChatBox - A simplified chat interface component
 * This component handles the core chat functionality:
 * - Displaying messages
 * - Sending messages to the backend API
 * - Handling streaming responses
 */
const ChatBox = ({ 
  darkMode, 
  activeConversationId,
  onNewMessage,
  initialMessages = []
}) => {
  // State for messages and user input
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  
  // Refs
  const chatContainerRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, currentResponse]);
  
  // Handle message submission
  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Create user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: Date.now()
    };
    
    // Add user message to the UI
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Clear input and set loading state
    setInput('');
    setIsLoading(true);
    setStreaming(true);
    
    // Notify parent component about the new message
    if (onNewMessage) {
      onNewMessage(updatedMessages);
    }
    
    try {
      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;
      
      // Prepare the request payload
      const payload = {
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        conversation_id: activeConversationId || null,
        stream: true
      };
      
      // Make the API request
      const response = await fetch(`${serverURL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }
        
        // Decode and process the chunk
        const chunk = decoder.decode(value, { stream: true });
        responseText += chunk;
        setCurrentResponse(responseText);
      }
      
      // Create the assistant message
      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: responseText,
        timestamp: Date.now()
      };
      
      // Update messages with the assistant's response
      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Notify parent component about the completed conversation
      if (onNewMessage) {
        onNewMessage(finalMessages);
      }
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error sending message:', error);
        
        // Add an error message
        setMessages([
          ...updatedMessages,
          {
            id: `error-${Date.now()}`,
            role: 'system',
            content: `Error: ${error.message}`,
            timestamp: Date.now(),
            isError: true
          }
        ]);
      }
    } finally {
      setIsLoading(false);
      setStreaming(false);
      setCurrentResponse('');
      abortControllerRef.current = null;
    }
  };
  
  // Handle stopping the response generation
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreaming(false);
      
      // If we have a partial response, add it as a message
      if (currentResponse) {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: currentResponse,
          timestamp: Date.now(),
          isStopped: true
        };
        
        const updatedMessages = [...messages, assistantMessage];
        setMessages(updatedMessages);
        
        // Notify parent component
        if (onNewMessage) {
          onNewMessage(updatedMessages);
        }
        
        setCurrentResponse('');
      }
    }
  };
  
  // Format timestamp to readable time
  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  // Handle retry of the last message
  const handleRetry = () => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      // Remove the last assistant message
      const newMessages = messages.slice(0, -1);
      setMessages(newMessages);
      
      // If there's a user message before it, use that as input and submit
      if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'user') {
        setInput(newMessages[newMessages.length - 1].content);
        // We don't auto-submit to give the user a chance to edit
      }
    }
  };
  
  // Handle copying message content
  const handleCopy = (content) => {
    navigator.clipboard.writeText(content)
      .then(() => console.log('Content copied to clipboard'))
      .catch(err => console.error('Failed to copy: ', err));
  };
  
  // Handle editing a message
  const handleEdit = (messageId, newContent) => {
    const updatedMessages = messages.map(msg => 
      msg.id === messageId ? { ...msg, content: newContent } : msg
    );
    setMessages(updatedMessages);
    
    // Notify parent component
    if (onNewMessage) {
      onNewMessage(updatedMessages);
    }
  };
  
  return (
    <div className="chat-box">
      <div 
        className="chat-messages" 
        ref={chatContainerRef}
      >
        <MessageList 
          displayMessages={messages}
          currentResponse={streaming ? currentResponse : ''}
          streaming={streaming}
          handleRetry={handleRetry}
          handleCopy={handleCopy}
          handleEdit={handleEdit}
          darkMode={darkMode}
          formatTime={formatTime}
        />
      </div>
      
      <MessageInput 
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        handleStop={handleStop}
        streaming={streaming}
        disabled={isLoading && !streaming}
        darkMode={darkMode}
      />
    </div>
  );
};

export default ChatBox;
