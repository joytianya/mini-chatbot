import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import '../styles/TestBackendConnection.css';
import toast from 'react-hot-toast';

function TestBackendConnection() {
  const [testResults, setTestResults] = useState({
    connection: null,
    serverStatus: null,
    backendChatAPI: null,
    directAPI: null
  });
  const [isTesting, setIsTesting] = useState(false);
  const [testMessage, setTestMessage] = useState('');
  const [apiSettings, setApiSettings] = useState({
    base_url: 'https://openrouter.ai/api/v1',
    api_key: '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',
    model_name: 'qwen/qwen3-1.7b:free'
  });
  // 定义后端地址，解决代理问题
  const backendUrl = 'http://localhost:5001';

  // 从本地存储中加载API设置
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('apiSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed && parsed.base_url && parsed.api_key && parsed.model_name) {
          setApiSettings(parsed);
          console.log('已加载API设置:', parsed);
        }
      }
    } catch (error) {
      console.error('加载API设置时出错:', error);
    }
  }, []);

  const runTests = async () => {
    setIsTesting(true);
    setTestResults({
      connection: null,
      serverStatus: null,
      backendChatAPI: null,
      directAPI: null
    });
    
    try {
      // 测试1: 基本连接
      setTestMessage('测试基本连接...');
      const connectionResult = await testConnection();
      setTestResults(prev => ({...prev, connection: connectionResult}));
      
      // 测试2: 服务器状态
      setTestMessage('测试服务器状态...');
      const statusResult = await testServerStatus();
      setTestResults(prev => ({...prev, serverStatus: statusResult}));
      
      // 测试3: 后端ChatAPI
      setTestMessage('测试后端Chat API响应...');
      const chatResult = await testBackendChatAPI();
      setTestResults(prev => ({...prev, backendChatAPI: chatResult}));
      
      // 测试4: 直接API请求
      setTestMessage('测试直接API请求...');
      const directResult = await testDirectAPI();
      setTestResults(prev => ({...prev, directAPI: directResult}));
      
      setTestMessage('测试完成');
      toast.success('所有测试已完成');
    } catch (error) {
      console.error('测试过程出错:', error);
      setTestMessage(`测试失败: ${error.message}`);
      toast.error(`测试失败: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };
  
  // 运行单个测试的函数
  const runSingleTest = async (testName) => {
    if (isTesting) return;
    
    setIsTesting(true);
    setTestResults(prev => ({...prev, [testName]: null}));
    
    try {
      setTestMessage(`正在运行${testName}测试...`);
      let result;
      
      switch(testName) {
        case 'connection':
          result = await testConnection();
          break;
        case 'serverStatus':
          result = await testServerStatus();
          break;
        case 'backendChatAPI':
          result = await testBackendChatAPI();
          break;
        case 'directAPI':
          result = await testDirectAPI();
          break;
        default:
          throw new Error('未知的测试类型');
      }
      
      setTestResults(prev => ({...prev, [testName]: result}));
      setTestMessage(`${testName}测试完成`);
      
      if (result.success) {
        toast.success(`${testName}测试成功`);
      } else {
        toast.error(`${testName}测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error(`${testName}测试出错:`, error);
      setTestMessage(`${testName}测试失败: ${error.message}`);
      toast.error(`${testName}测试失败: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };
  
  const testConnection = async () => {
    try {
      await apiService.testConnection();
      return { success: true, message: '连接成功' };
    } catch (error) {
      console.error('连接测试失败:', error);
      return { success: false, message: `连接失败: ${error.message}` };
    }
  };
  
  const testServerStatus = async () => {
    try {
      // 使用直接的后端URL而不是相对路径
      const apiUrl = `${backendUrl}/api/test`;
      console.log('测试服务器状态URL:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`状态码: ${response.status}`);
      }
      const data = await response.json();
      return { success: true, message: '服务器状态正常', data };
    } catch (error) {
      console.error('服务器状态测试失败:', error);
      return { success: false, message: `服务器状态异常: ${error.message}` };
    }
  };
  
  const testBackendChatAPI = async () => {
    try {
      // 使用直接的后端URL而不是相对路径
      const apiUrl = `${backendUrl}/api/chat`;
      console.log('测试后端Chat API URL:', apiUrl);
      
      const testMessages = [
        { role: "system", content: "你是一个有帮助的助手。" },
        { role: "user", content: "你好，请回复一些中文内容测试编码。" }
      ];
      
      // 构建与Python测试脚本相同的请求负载
      const payload = {
        messages: testMessages,
        base_url: apiSettings.base_url,
        api_key: apiSettings.api_key,
        model_name: apiSettings.model_name,
        web_search: false,
        deep_research: false,
        stream: true  // 确保使用流式响应
      };
      
      console.log('发送测试请求到后端API:', {
        ...payload,
        api_key: payload.api_key.substring(0, 8) + '...'
      });
      
      // 打印当前的URL信息，帮助调试
      console.log('当前页面URL:', window.location.href);
      console.log('基础路径:', window.location.pathname);
      console.log('使用直接后端URL:', apiUrl);
      
      const startTime = Date.now();
      
      // 创建请求头 - 使用标准小写格式
      const headers = {
        'content-type': 'application/json',
        'accept': 'text/event-stream',  // 关键: 接受流式响应
        'http-referer': window.location.origin + '/mini-chatbot/',
        'x-title': 'Mini-Chatbot Test'
      };
      
      console.log('请求头:', headers);
      
      // 直接使用XMLHttpRequest发送POST请求，避免浏览器自动处理的预检请求问题
      console.log('使用XMLHttpRequest直接发送POST请求...');
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', apiUrl, true);
        
        // 设置请求头
        Object.keys(headers).forEach(key => {
          xhr.setRequestHeader(key, headers[key]);
        });
        
        // 处理加载完成事件
        xhr.onload = function() {
          const responseTime = Date.now() - startTime;
          console.log('XHR请求完成，状态码:', xhr.status);
          console.log('XHR响应头:', xhr.getAllResponseHeaders());
          
          if (xhr.status >= 200 && xhr.status < 300) {
            // 成功处理流式响应
            console.log('XMLHttpRequest成功，状态码:', xhr.status);
            
            try {
              // 解析流式响应文本
              const responseText = xhr.responseText;
              console.log('收到原始响应:', responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
              
              // 解析SSE格式
              const lines = responseText.split('\n');
              let fullResponse = [];
              let errorMessage = null;
              
              // 处理SSE格式响应
              for (const line of lines) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const data_str = line.substring(6);  // 移除 "data: " 前缀
                    const data = JSON.parse(data_str);
                    
                    // 检查是否有错误
                    if (data.error) {
                      errorMessage = data.error;
                      console.error('API返回错误:', errorMessage);
                      continue;
                    }
                    
                    // 提取内容
                    if (data.choices && data.choices.length > 0) {
                      let content = '';
                      if (data.choices[0].delta && data.choices[0].delta.content) {
                        content = data.choices[0].delta.content;
                      } else if (data.choices[0].message && data.choices[0].message.content) {
                        content = data.choices[0].message.content;
                      }
                      
                      if (content) {
                        fullResponse.push(content);
                      }
                    }
                  } catch (e) {
                    console.error('解析流式数据出错:', e, '原始行:', line);
                  }
                }
              }
              
              const completeResponse = fullResponse.join('');
              console.log('解析后的响应内容:', completeResponse.substring(0, 100) + (completeResponse.length > 100 ? '...' : ''));
              
              if (errorMessage) {
                resolve({ 
                  success: false, 
                  message: `API响应错误: ${errorMessage}` 
                });
              } else {
                resolve({ 
                  success: true, 
                  message: `API响应正常 (${responseTime}ms)`,
                  data: {
                    content: completeResponse,
                    responseTime
                  }
                });
              }
            } catch (parseError) {
              console.error('解析响应出错:', parseError);
              resolve({
                success: false,
                message: `解析响应失败: ${parseError.message}`
              });
            }
          } else {
            // 处理错误响应
            console.error('XMLHttpRequest失败，状态码:', xhr.status);
            let errorMessage = `状态码: ${xhr.status}`;
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              errorMessage += `, 错误: ${errorResponse.error || xhr.statusText}`;
            } catch (e) {
              errorMessage += `, 错误: ${xhr.responseText || xhr.statusText}`;
            }
            
            resolve({
              success: false,
              message: errorMessage
            });
          }
        };
        
        // 处理错误事件
        xhr.onerror = function(e) {
          console.error('XMLHttpRequest网络错误:', e);
          reject(new Error('网络请求失败，请检查网络连接'));
        };
        
        // 发送请求
        xhr.send(JSON.stringify(payload));
      }).catch(error => {
        console.error('请求过程中出错:', error);
        return { success: false, message: `请求失败: ${error.message}` };
      });
    } catch (error) {
      console.error('后端API测试失败:', error);
      return { success: false, message: `API响应异常: ${error.message}` };
    }
  };
  
  const testDirectAPI = async () => {
    try {
      console.log('开始直接API测试 - 使用OpenRouter API');
      
      // 收集配置进行测试
      const { base_url, api_key, model_name } = apiSettings;
      
      console.log('API设置:', { 
        base_url, 
        model_name,
        api_key: api_key ? `${api_key.substring(0, 5)}...` : '未设置' // 只显示部分API密钥
      });
      
      // 创建测试消息
      const testMessages = [
        { role: "system", content: "你是一个有帮助的助手。" },
        { role: "user", content: "你好，请回复一些中文内容测试。" }
      ];
      
      // 构建请求头 - 使用小写格式统一处理
      const headers = {
        'content-type': 'application/json',
        'authorization': `Bearer ${api_key}`
      };
      
      // 如果是OpenRouter，添加额外的请求头
      if (base_url.includes('openrouter')) {
        headers['http-referer'] = window.location.origin + '/mini-chatbot/';
        headers['x-title'] = 'Mini-Chatbot Test';
      }
      
      console.log('请求URL:', `${base_url}/chat/completions`);
      console.log('请求头:', headers);
      
      // 构建请求体
      const payload = {
        model: model_name,
        messages: testMessages,
        stream: false,
        max_tokens: 150
      };
      
      console.log('请求体:', JSON.stringify(payload));
      
      // 发送请求
      const startTime = Date.now();
      const response = await fetch(`${base_url}/chat/completions`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });
      
      const responseTime = Date.now() - startTime;
      
      // 记录响应状态
      console.log(`API响应状态: ${response.status} ${response.statusText}`);
      console.log('响应头:', Object.fromEntries([...response.headers.entries()]));
      
      // 检查响应状态
      if (!response.ok) {
        // 尝试获取错误信息
        let errorText = '';
        try {
          errorText = await response.text();
          console.log('错误响应文本:', errorText);
          
          // 尝试解析为JSON
          try {
            const errorJson = JSON.parse(errorText);
            console.log('错误响应JSON:', errorJson);
            errorText = JSON.stringify(errorJson, null, 2);
          } catch (e) {
            console.log('错误响应不是有效的JSON');
          }
        } catch (e) {
          console.error('读取错误响应时出错:', e);
        }
        
        throw new Error(`状态码: ${response.status}, 错误: ${response.statusText}\n${errorText}`);
      }
      
      // 解析响应数据
      const data = await response.json();
      console.log('API响应数据:', data);
      
      // 提取回复内容
      const reply = data.choices && data.choices[0] && data.choices[0].message 
        ? data.choices[0].message.content 
        : '无法从API响应中提取内容';
      
      return {
        success: true,
        message: `直接API测试成功 (${responseTime}ms)`,
        data: {
          reply,
          fullResponse: data,
          responseTime
        }
      };
    } catch (error) {
      console.error('直接API测试失败:', error);
      toast.error(`API测试失败: ${error.message}`);
      return { 
        success: false, 
        message: `直接API测试失败: ${error.message}` 
      };
    }
  };
  
  // 显示测试结果
  const renderTestResults = () => {
    return (
      <div className="test-results">
        <h3>测试结果</h3>
        {Object.entries(testResults).map(([key, result]) => {
          if (result === null) return null;
          
          return (
            <div key={key} className={`result-item ${result.success ? 'success' : 'error'}`}>
              <div className="result-title">
                <span className="test-name">{getTestName(key)}</span>
                <span className="result-status">{result.success ? '✅ 成功' : '❌ 失败'}</span>
              </div>
              <div className="result-message">{result.message}</div>
              
              {/* 添加响应预览区域 */}
              {result.data && (
                <div className="response-preview">
                  {key === 'directAPI' && result.data.reply && (
                    <div className="api-response">
                      <h4>API 回复:</h4>
                      <div className="response-content">{result.data.reply}</div>
                      <div className="response-time">响应时间: {result.data.responseTime}ms</div>
                      
                      <details>
                        <summary>完整响应 (点击展开)</summary>
                        <pre>{JSON.stringify(result.data.fullResponse, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                  
                  {key === 'backendChatAPI' && result.data && result.data.content && (
                    <div className="api-response">
                      <h4>后端API回复:</h4>
                      <div className="response-content">{result.data.content}</div>
                      <div className="response-time">响应时间: {result.data.responseTime}ms</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // 展示当前的API设置
  const renderAPISettings = () => {
    return (
      <div className="api-settings-display">
        <h3>当前API设置</h3>
        <div className="settings-item">
          <span className="setting-name">API基础URL:</span>
          <span className="setting-value">{apiSettings.base_url}</span>
        </div>
        <div className="settings-item">
          <span className="setting-name">模型名称:</span>
          <span className="setting-value">{apiSettings.model_name}</span>
        </div>
        <div className="settings-item">
          <span className="setting-name">API密钥:</span>
          <span className="setting-value">{apiSettings.api_key ? `${apiSettings.api_key.substring(0, 5)}...` : '未设置'}</span>
        </div>
        <div className="settings-note">
          <small>注意: API设置从localStorage加载。如需修改，请使用设置页面。</small>
        </div>
      </div>
    );
  };

  // 获取测试名称
  const getTestName = (key) => {
    const names = {
      connection: '基本连接',
      serverStatus: '服务器状态',
      backendChatAPI: '后端Chat API',
      directAPI: '直接API请求'
    };
    return names[key] || key;
  };

  return (
    <div className="test-backend-container">
      <h2>后端连接测试</h2>
      
      {renderAPISettings()}
      
      <div className="test-actions">
        <button className="test-button" onClick={runTests} disabled={isTesting}>
          {isTesting ? '测试中...' : '运行所有测试'}
        </button>
        
        <div className="single-test-buttons">
          <button 
            className="run-single-test-button" 
            onClick={() => runSingleTest('connection')} 
            disabled={isTesting}
          >
            测试基本连接
          </button>
          <button 
            className="run-single-test-button" 
            onClick={() => runSingleTest('serverStatus')} 
            disabled={isTesting}
          >
            测试服务器状态
          </button>
          <button 
            className="run-single-test-button" 
            onClick={() => runSingleTest('backendChatAPI')} 
            disabled={isTesting}
          >
            测试后端Chat API
          </button>
          <button 
            className="run-single-test-button" 
            onClick={() => runSingleTest('directAPI')} 
            disabled={isTesting}
          >
            测试直接API请求
          </button>
        </div>
      </div>
      
      {testMessage && (
        <div className="test-message">{testMessage}</div>
      )}
      
      {renderTestResults()}
    </div>
  );
}

export default TestBackendConnection; 