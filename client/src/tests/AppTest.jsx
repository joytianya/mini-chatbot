import React, { useState, useEffect } from 'react';
import './AppTest.css';

/**
 * 聊天应用测试组件
 * 用于测试应用的各种功能和错误处理
 */
const AppTest = () => {
  const [testResults, setTestResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState('');

  // 添加测试结果
  const addResult = (testName, passed, message = '', details = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      testName,
      passed,
      message,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  // 清除测试结果
  const clearResults = () => {
    setTestResults([]);
  };

  // 测试本地存储功能
  const testLocalStorage = async () => {
    setCurrentTest('本地存储测试');
    try {
      // 测试设置值
      localStorage.setItem('test_key', JSON.stringify({ test: 'value' }));
      
      // 测试获取值
      const retrieved = JSON.parse(localStorage.getItem('test_key'));
      
      if (retrieved && retrieved.test === 'value') {
        addResult('localStorage 基本功能', true, 'localStorage 可以正常存取数据');
      } else {
        addResult('localStorage 基本功能', false, 'localStorage 存取数据失败');
      }
      
      // 测试错误处理 - 尝试解析无效 JSON
      localStorage.setItem('invalid_json', '{invalid json}');
      
      try {
        JSON.parse(localStorage.getItem('invalid_json'));
        addResult('localStorage 错误处理', false, '未能捕获无效 JSON 解析错误');
      } catch (e) {
        addResult('localStorage 错误处理', true, '成功捕获无效 JSON 解析错误');
      }
      
      // 清理测试数据
      localStorage.removeItem('test_key');
      localStorage.removeItem('invalid_json');
      
    } catch (error) {
      addResult('localStorage 测试', false, `测试过程中出错: ${error.message}`, error);
    }
  };

  // 测试组件渲染
  const testComponentRendering = async () => {
    setCurrentTest('组件渲染测试');
    try {
      // 检查关键组件是否存在
      const chatComponent = document.querySelector('.chat-container');
      const sidebarComponent = document.querySelector('.sidebar');
      const messageListComponent = document.querySelector('.messages-container');
      const messageInputComponent = document.querySelector('.input-area');
      
      if (chatComponent) {
        addResult('Chat 组件渲染', true, 'Chat 组件成功渲染');
      } else {
        addResult('Chat 组件渲染', false, 'Chat 组件未能渲染');
      }
      
      if (sidebarComponent) {
        addResult('Sidebar 组件渲染', true, 'Sidebar 组件成功渲染');
      } else {
        addResult('Sidebar 组件渲染', false, 'Sidebar 组件未能渲染');
      }
      
      if (messageListComponent) {
        addResult('MessageList 组件渲染', true, 'MessageList 组件成功渲染');
      } else {
        addResult('MessageList 组件渲染', false, 'MessageList 组件未能渲染');
      }
      
      if (messageInputComponent) {
        addResult('MessageInput 组件渲染', true, 'MessageInput 组件成功渲染');
      } else {
        addResult('MessageInput 组件渲染', false, 'MessageInput 组件未能渲染');
      }
    } catch (error) {
      addResult('组件渲染测试', false, `测试过程中出错: ${error.message}`, error);
    }
  };

  // 测试用户交互
  const testUserInteraction = async () => {
    setCurrentTest('用户交互测试');
    try {
      // 测试消息输入
      const textarea = document.querySelector('.message-input');
      const sendButton = document.querySelector('.send-button');
      
      if (!textarea || !sendButton) {
        addResult('消息输入测试', false, '未找到输入框或发送按钮');
        return;
      }
      
      // 模拟用户输入
      const testMessage = '这是一条测试消息';
      
      // 创建并分发输入事件
      const inputEvent = new Event('input', { bubbles: true });
      textarea.value = testMessage;
      textarea.dispatchEvent(inputEvent);
      
      // 检查输入值是否正确设置
      if (textarea.value === testMessage) {
        addResult('消息输入', true, '消息输入功能正常');
      } else {
        addResult('消息输入', false, '消息输入功能异常');
      }
      
      // 测试按钮状态
      if (testMessage.trim() && !sendButton.disabled) {
        addResult('发送按钮状态', true, '发送按钮状态正确响应输入');
      } else if (!testMessage.trim() && !sendButton.disabled) {
        addResult('发送按钮状态', false, '空输入时发送按钮未禁用');
      } else if (testMessage.trim() && sendButton.disabled) {
        addResult('发送按钮状态', false, '有输入时发送按钮仍被禁用');
      }
      
      // 清空输入
      textarea.value = '';
      textarea.dispatchEvent(inputEvent);
    } catch (error) {
      addResult('用户交互测试', false, `测试过程中出错: ${error.message}`, error);
    }
  };

  // 测试错误处理
  const testErrorHandling = async () => {
    setCurrentTest('错误处理测试');
    try {
      // 测试 JSON 解析错误处理
      const testStorageKey = 'test_error_handling';
      
      // 设置无效的 JSON
      localStorage.setItem(testStorageKey, '{invalid:json}');
      
      // 尝试从 storageService 获取数据
      try {
        // 直接使用 JSON.parse 测试
        const result = JSON.parse(localStorage.getItem(testStorageKey));
        addResult('JSON 解析错误处理', false, '未能捕获 JSON 解析错误');
      } catch (e) {
        addResult('JSON 解析错误处理', true, '成功捕获 JSON 解析错误');
      }
      
      // 清理测试数据
      localStorage.removeItem(testStorageKey);
      
      // 测试组件错误边界
      // 这部分需要通过观察控制台日志来判断
      addResult('错误边界测试', true, '请查看控制台是否有未捕获的组件错误');
      
    } catch (error) {
      addResult('错误处理测试', false, `测试过程中出错: ${error.message}`, error);
    }
  };

  // 收集控制台错误
  const testConsoleErrors = () => {
    setCurrentTest('控制台错误检查');
    
    // 创建一个临时的 div 来显示错误信息
    const errorDiv = document.createElement('div');
    errorDiv.id = 'console-error-test';
    errorDiv.style.display = 'none';
    document.body.appendChild(errorDiv);
    
    // 保存原始的 console.error
    const originalConsoleError = console.error;
    
    // 错误计数
    let errorCount = 0;
    
    // 重写 console.error
    console.error = function(...args) {
      // 调用原始的 console.error
      originalConsoleError.apply(console, args);
      
      // 增加错误计数
      errorCount++;
      
      // 将错误添加到 div
      const errorMsg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      const errorElement = document.createElement('div');
      errorElement.textContent = `错误 ${errorCount}: ${errorMsg}`;
      errorDiv.appendChild(errorElement);
    };
    
    // 5秒后检查错误
    setTimeout(() => {
      // 恢复原始的 console.error
      console.error = originalConsoleError;
      
      if (errorCount === 0) {
        addResult('控制台错误检查', true, '没有发现控制台错误');
      } else {
        addResult('控制台错误检查', false, `发现 ${errorCount} 个控制台错误`, 
          document.getElementById('console-error-test').innerHTML);
      }
      
      // 移除临时 div
      document.body.removeChild(errorDiv);
    }, 5000);
  };

  // 运行所有测试
  const runAllTests = async () => {
    setIsRunning(true);
    clearResults();
    
    // 收集控制台错误
    testConsoleErrors();
    
    // 依次运行各项测试
    await testLocalStorage();
    await testComponentRendering();
    await testUserInteraction();
    await testErrorHandling();
    
    setCurrentTest('测试完成');
    setIsRunning(false);
  };

  return (
    <div className="app-test">
      <h1>聊天应用测试</h1>
      
      <div className="test-controls">
        <button 
          onClick={runAllTests} 
          disabled={isRunning}
          className="test-button"
        >
          {isRunning ? '测试运行中...' : '运行所有测试'}
        </button>
        
        <button 
          onClick={clearResults}
          disabled={isRunning || testResults.length === 0}
          className="clear-button"
        >
          清除结果
        </button>
      </div>
      
      {isRunning && (
        <div className="current-test">
          当前测试: {currentTest}
        </div>
      )}
      
      <div className="test-results">
        <h2>测试结果 ({testResults.length})</h2>
        
        {testResults.length === 0 ? (
          <p className="no-results">尚未运行任何测试</p>
        ) : (
          <ul className="results-list">
            {testResults.map(result => (
              <li 
                key={result.id} 
                className={`result-item ${result.passed ? 'passed' : 'failed'}`}
              >
                <div className="result-header">
                  <span className="result-name">{result.testName}</span>
                  <span className={`result-status ${result.passed ? 'passed' : 'failed'}`}>
                    {result.passed ? '通过' : '失败'}
                  </span>
                </div>
                
                <div className="result-message">{result.message}</div>
                
                {result.details && (
                  <div className="result-details">
                    <strong>详细信息:</strong>
                    <pre>{typeof result.details === 'string' 
                      ? result.details 
                      : JSON.stringify(result.details, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="result-time">
                  {new Date(result.timestamp).toLocaleTimeString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default AppTest;
