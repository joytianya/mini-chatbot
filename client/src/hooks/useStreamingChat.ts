import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, ModelConfig } from '../types';

interface StreamingChatOptions {
  apiUrl: string;
  initialMessages?: Message[];
  onError?: (error: Error) => void;
}

export const useStreamingChat = (options: StreamingChatOptions) => {
  const { apiUrl, initialMessages = [], onError } = options;
  
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingProcess, setThinkingProcess] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    const savedSessionId = localStorage.getItem('sessionId');
    return savedSessionId ? JSON.parse(savedSessionId) : uuidv4();
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('streamingChatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  // Save session ID to localStorage
  useEffect(() => {
    localStorage.setItem('sessionId', JSON.stringify(sessionId));
  }, [sessionId]);

  // Load messages from localStorage on initial render
  useEffect(() => {
    const savedMessages = localStorage.getItem('streamingChatMessages');
    if (savedMessages && initialMessages.length === 0) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error('Failed to parse saved messages:', error);
      }
    }
  }, [initialMessages]);

  const addMessage = useCallback((message: Message) => {
    setMessages(prev => [...prev, message]);
  }, []);

  const updateLastMessage = useCallback((content: string) => {
    setMessages(prev => {
      const newMessages = [...prev];
      if (newMessages.length > 0) {
        const lastMessage = { ...newMessages[newMessages.length - 1] };
        lastMessage.content = content;
        newMessages[newMessages.length - 1] = lastMessage;
      }
      return newMessages;
    });
  }, []);

  const sendMessage = useCallback(async (messageText: string, modelConfig: ModelConfig) => {
    if (!messageText.trim()) return;

    // Create user message
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString()
    };

    // Add user message to the messages array
    addMessage(userMessage);
    
    // Clear input field and set streaming state
    setInput('');
    setIsStreaming(true);
    setThinkingProcess('');
    setIsThinking(false);

    // Create placeholder for assistant response
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    
    // Add empty assistant message that will be updated with streaming content
    addMessage(assistantMessage);

    // Create a new AbortController for this request
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      // Prepare the request
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: messages.concat(userMessage).map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          sessionHash: sessionId,
          model_name: modelConfig.modelName,
          api_key: modelConfig.api_key,
          base_url: modelConfig.api_url,
          web_search: modelConfig.webSearch || false,
          deep_research: modelConfig.deepResearch || false
        }),
        signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is null');

      let assistantResponseText = '';
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(5);
            
            // Check if the stream is done
            if (data === '[DONE]') {
              setIsStreaming(false);
              setIsThinking(false);
              break;
            }
            
            try {
              const parsedData = JSON.parse(data);
              
              // Handle thinking process content
              if (parsedData.choices?.[0]?.delta?.reasoning_content) {
                const reasoningContent = parsedData.choices[0].delta.reasoning_content;
                setThinkingProcess(prev => prev + reasoningContent);
                setIsThinking(true);
              } 
              // Handle regular content
              else if (parsedData.choices?.[0]?.delta?.content) {
                const content = parsedData.choices[0].delta.content;
                assistantResponseText += content;
                updateLastMessage(assistantResponseText);
                setIsThinking(false);
              }
            } catch (error) {
              console.error('Error parsing streaming data:', error);
            }
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was aborted');
      } else {
        console.error('Error sending message:', error);
        if (onError) onError(error instanceof Error ? error : new Error(String(error)));
        
        // Update the last message to show the error
        updateLastMessage('Sorry, an error occurred while processing your request.');
      }
      setIsStreaming(false);
      setIsThinking(false);
    }
  }, [apiUrl, messages, sessionId, addMessage, updateLastMessage, onError]);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setIsThinking(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    localStorage.removeItem('streamingChatMessages');
    setSessionId(uuidv4());
  }, []);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    thinkingProcess,
    isThinking,
    sendMessage,
    stopStreaming,
    clearMessages,
    sessionId
  };
};

export default useStreamingChat;
