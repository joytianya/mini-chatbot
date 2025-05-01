import React, { useState } from 'react';
import useTheme from './hooks/useTheme';
import { useModelConfig } from './hooks/useModelConfig';
import useStreamingChat from './hooks/useStreamingChat';
import StreamingChatInterface from './components/StreamingChat/StreamingChatInterface';
import { serverURL } from './Config';
import ErrorBoundary from './components/ErrorBoundary';
import './components/StreamingChat/StreamingChat.css';

const StreamingChatApp: React.FC = () => {
  // Theme management
  const { darkMode, setDarkMode } = useTheme();
  
  // Model configuration management
  const { 
    modelConfigs, 
    availableModels, 
    selectedModel, 
    setSelectedModel 
  } = useModelConfig();

  // Get the current model config
  const currentModelConfig = modelConfigs.find(config => config.modelName === selectedModel) || modelConfigs[0];

  // Error handling state
  const [error, setError] = useState<string | null>(null);

  // Initialize streaming chat hook
  const {
    messages,
    input,
    setInput,
    isStreaming,
    thinkingProcess,
    isThinking,
    sendMessage,
    stopStreaming,
    clearMessages
  } = useStreamingChat({
    apiUrl: serverURL,
    onError: (error) => setError(error.message)
  });

  // Handle message submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    
    sendMessage(input, currentModelConfig);
  };

  // Handle stopping the streaming response
  const handleStop = () => {
    stopStreaming();
  };

  // Handle clearing the chat
  const handleClear = () => {
    clearMessages();
    setError(null);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <ErrorBoundary>
      <div className={`streaming-app-container ${darkMode ? 'dark-mode' : ''}`}>
        {/* Header */}
        <header className="streaming-app-header">
          <h1>AI Assistant</h1>
          <div className="streaming-app-controls">
            {/* Model selector */}
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isStreaming}
              className="model-selector"
            >
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            
            {/* Dark mode toggle */}
            <button 
              onClick={toggleDarkMode}
              className="theme-toggle-button"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            
            {/* Clear chat button */}
            <button 
              onClick={handleClear}
              className="clear-chat-button"
              disabled={isStreaming || messages.length === 0}
            >
              Clear Chat
            </button>
          </div>
        </header>
        
        {/* Error display */}
        {error && (
          <div className="error-container">
            <p className="error-message">{error}</p>
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        {/* Main chat interface */}
        <StreamingChatInterface
          messages={messages}
          input={input}
          setInput={setInput}
          handleSubmit={handleSubmit}
          isStreaming={isStreaming}
          thinkingProcess={thinkingProcess}
          isThinking={isThinking}
          darkMode={darkMode}
          handleStop={handleStop}
        />
      </div>
    </ErrorBoundary>
  );
};

export default StreamingChatApp;
