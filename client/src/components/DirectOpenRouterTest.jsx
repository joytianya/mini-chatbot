import React, { useState, useEffect } from 'react';
import '../styles/DirectOpenRouterTest.css';

function DirectOpenRouterTest() {
  const [testResults, setTestResults] = useState({
    connection: null,
    chinese: null,
    streaming: null
  });
  const [streamContent, setStreamContent] = useState('');
  const [streamReasoning, setStreamReasoning] = useState('');
  const [showReasoning, setShowReasoning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [streamingChat, setStreamingChat] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingReasoning, setStreamingReasoning] = useState('');
  const [showChatReasoning, setShowChatReasoning] = useState(false);
  
  const baseUrl = 'http://localhost:5001';
  
  // 测试连接
  const testConnection = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/api/direct_openrouter/test`);
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        connection: data
      }));
    } catch (error) {
      console.error('连接测试失败:', error);
      setTestResults(prev => ({
        ...prev,
        connection: { success: false, error: error.message }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 测试中文
  const testChinese = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${baseUrl}/api/direct_openrouter/test_chinese`);
      const data = await response.json();
      
      setTestResults(prev => ({
        ...prev,
        chinese: data
      }));
    } catch (error) {
      console.error('中文测试失败:', error);
      setTestResults(prev => ({
        ...prev,
        chinese: { success: false, error: error.message }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 测试流式响应
  const testStreaming = async () => {
    try {
      setIsLoading(true);
      setStreamContent('');
      setStreamReasoning('');
      
      const response = await fetch(`${baseUrl}/api/direct_openrouter/stream_test`);
      
      if (!response.ok) {
        throw new Error(`请求失败 (${response.status}): ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let streamedContent = '';
      let streamedReasoning = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line === 'data: [DONE]') {
            continue;
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.choices && data.choices[0] && data.choices[0].delta) {
                const delta = data.choices[0].delta;
                
                if (delta.content) {
                  streamedContent += delta.content;
                  setStreamContent(streamedContent);
                }
                
                if (delta.reasoning_content) {
                  streamedReasoning += delta.reasoning_content;
                  setStreamReasoning(streamedReasoning);
                }
              }
            } catch (error) {
              console.error('解析流式数据失败:', error, line);
            }
          }
        }
      }
      
      setTestResults(prev => ({
        ...prev,
        streaming: {
          success: true,
          data: {
            content: streamedContent,
            reasoning: streamedReasoning
          }
        }
      }));
    } catch (error) {
      console.error('流式测试失败:', error);
      setTestResults(prev => ({
        ...prev,
        streaming: { success: false, error: error.message }
      }));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 发送自定义聊天消息
  const sendChatMessage = async () => {
    if (!chatMessage.trim() || streamingChat) return;
    
    try {
      setIsLoading(true);
      setStreamingChat(true);
      setStreamingContent('');
      setStreamingReasoning('');
      
      // 准备消息
      const messages = [
        { role: 'system', content: '你是一个有用的AI助手。在回答时，先思考问题，在reasoning_content中写下思考过程，然后在content中给出正式回答。' },
        { role: 'user', content: chatMessage }
      ];
      
      const response = await fetch(`${baseUrl}/api/direct_openrouter/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages,
          stream: true
        })
      });
      
      if (!response.ok) {
        throw new Error(`请求失败 (${response.status}): ${response.statusText}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      let streamedContent = '';
      let streamedReasoning = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim()) continue;
          
          if (line === 'data: [DONE]') {
            continue;
          }
          
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.error) {
                throw new Error(data.error);
              }
              
              if (data.choices && data.choices[0] && data.choices[0].delta) {
                const delta = data.choices[0].delta;
                
                if (delta.content) {
                  streamedContent += delta.content;
                  setStreamingContent(streamedContent);
                }
                
                if (delta.reasoning_content) {
                  streamedReasoning += delta.reasoning_content;
                  setStreamingReasoning(streamedReasoning);
                }
              }
            } catch (error) {
              console.error('解析流式数据失败:', error, line);
            }
          }
        }
      }
      
      setChatResponse({
        success: true,
        content: streamedContent,
        reasoning: streamedReasoning
      });
    } catch (error) {
      console.error('聊天请求失败:', error);
      setChatResponse({
        success: false,
        error: error.message
      });
    } finally {
      setIsLoading(false);
      setStreamingChat(false);
    }
  };
  
  return (
    <div className="direct-openrouter-test">
      <h1>OpenRouter.ai 直接测试</h1>
      <p className="description">
        此组件直接使用服务器端的配置(.env文件)直接连接到OpenRouter.ai API
      </p>
      
      <div className="test-buttons">
        <button 
          onClick={testConnection} 
          disabled={isLoading}
          className="test-button"
        >
          测试连接
        </button>
        <button 
          onClick={testChinese} 
          disabled={isLoading}
          className="test-button"
        >
          测试中文
        </button>
        <button 
          onClick={testStreaming} 
          disabled={isLoading}
          className="test-button"
        >
          测试流式响应
        </button>
      </div>
      
      {isLoading && !streamingChat && (
        <div className="loading">
          <div className="spinner"></div>
          <p>请求中...</p>
        </div>
      )}
      
      {/* 连接测试结果 */}
      {testResults.connection && (
        <div className={`test-result ${testResults.connection.success ? 'success' : 'error'}`}>
          <h3>连接测试结果:</h3>
          {testResults.connection.success ? (
            <div>
              <p>✅ 连接成功!</p>
              <p>响应时间: {testResults.connection.elapsed_time?.toFixed(2) || '?'} 秒</p>
              <pre className="response-content">
                {JSON.stringify(testResults.connection.data?.choices?.[0]?.message?.content || {}, null, 2)}
              </pre>
            </div>
          ) : (
            <p>❌ 连接失败: {testResults.connection.error || '未知错误'}</p>
          )}
        </div>
      )}
      
      {/* 中文测试结果 */}
      {testResults.chinese && (
        <div className={`test-result ${testResults.chinese.success ? 'success' : 'error'}`}>
          <h3>中文测试结果:</h3>
          {testResults.chinese.success ? (
            <div>
              <p>✅ 中文测试成功!</p>
              <p>响应时间: {testResults.chinese.elapsed_time?.toFixed(2) || '?'} 秒</p>
              <pre className="response-content">
                {JSON.stringify(testResults.chinese.data?.choices?.[0]?.message?.content || {}, null, 2)}
              </pre>
            </div>
          ) : (
            <p>❌ 中文测试失败: {testResults.chinese.error || '未知错误'}</p>
          )}
        </div>
      )}
      
      {/* 流式响应测试结果 */}
      {testResults.streaming && (
        <div className={`test-result ${testResults.streaming.success ? 'success' : 'error'}`}>
          <h3>流式响应测试结果:</h3>
          {testResults.streaming.success ? (
            <div>
              <p>✅ 流式响应测试成功!</p>
              
              {streamReasoning && (
                <div className="reasoning-section">
                  <button 
                    onClick={() => setShowReasoning(!showReasoning)}
                    className="toggle-button"
                  >
                    {showReasoning ? '隐藏思考过程' : '显示思考过程'}
                  </button>
                  
                  {showReasoning && (
                    <div className="reasoning-box">
                      <h4>思考过程:</h4>
                      <pre className="reasoning-content">{streamReasoning}</pre>
                    </div>
                  )}
                </div>
              )}
              
              <div className="content-box">
                <h4>回复内容:</h4>
                <pre className="response-content">{streamContent}</pre>
              </div>
            </div>
          ) : (
            <p>❌ 流式响应测试失败: {testResults.streaming.error || '未知错误'}</p>
          )}
        </div>
      )}
      
      {/* 自定义聊天消息 */}
      <div className="custom-chat-section">
        <h3>发送自定义消息:</h3>
        <div className="chat-input-container">
          <textarea
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            placeholder="输入消息..."
            disabled={streamingChat}
            className="chat-input"
          />
          <button 
            onClick={sendChatMessage}
            disabled={!chatMessage.trim() || streamingChat}
            className="send-button"
          >
            发送
          </button>
        </div>
        
        {streamingChat && (
          <div className="loading chat-loading">
            <div className="spinner"></div>
            <p>正在生成回复...</p>
          </div>
        )}
        
        {/* 聊天响应 */}
        {chatResponse && (
          <div className={`chat-response ${chatResponse.success ? 'success' : 'error'}`}>
            {chatResponse.success ? (
              <div>
                {chatResponse.reasoning && (
                  <div className="reasoning-section">
                    <button 
                      onClick={() => setShowChatReasoning(!showChatReasoning)}
                      className="toggle-button"
                    >
                      {showChatReasoning ? '隐藏思考过程' : '显示思考过程'}
                    </button>
                    
                    {showChatReasoning && (
                      <div className="reasoning-box">
                        <h4>思考过程:</h4>
                        <pre className="reasoning-content">{chatResponse.reasoning}</pre>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="content-box">
                  <h4>回复内容:</h4>
                  <pre className="response-content">{chatResponse.content}</pre>
                </div>
              </div>
            ) : (
              <p className="error-message">❌ 请求失败: {chatResponse.error || '未知错误'}</p>
            )}
          </div>
        )}
        
        {/* 实时流式响应显示 */}
        {streamingChat && streamingContent && (
          <div className="streaming-response">
            <h4>实时响应:</h4>
            <pre className="streaming-content">{streamingContent}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default DirectOpenRouterTest; 