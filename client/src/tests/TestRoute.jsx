import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './TestRoute.css';

/**
 * 测试路由组件 - 用于测试应用的各个组件
 */
const TestRoute = () => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [consoleErrors, setConsoleErrors] = useState([]);
  
  // 捕获控制台错误
  useEffect(() => {
    // 保存原始的 console.error
    const originalConsoleError = console.error;
    
    // 重写 console.error
    console.error = function(...args) {
      // 调用原始的 console.error
      originalConsoleError.apply(console, args);
      
      // 记录错误
      setConsoleErrors(prev => [...prev, {
        id: Date.now(),
        message: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '),
        timestamp: new Date().toISOString()
      }]);
    };
    
    // 清理函数
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  // 运行测试
  const runTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    // 测试 localStorage
    try {
      // 测试设置值
      localStorage.setItem('test_key', JSON.stringify({ test: 'value' }));
      
      // 测试获取值
      const retrieved = JSON.parse(localStorage.getItem('test_key'));
      
      setTestResults(prev => ({
        ...prev,
        localStorage: {
          status: retrieved && retrieved.test === 'value' ? 'passed' : 'failed',
          message: retrieved && retrieved.test === 'value' 
            ? 'localStorage 可以正常存取数据' 
            : 'localStorage 存取数据失败'
        }
      }));
      
      // 清理测试数据
      localStorage.removeItem('test_key');
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        localStorage: {
          status: 'failed',
          message: `测试过程中出错: ${error.message}`,
          error
        }
      }));
    }
    
    // 测试组件渲染
    try {
      // 检查关键组件是否存在
      const chatComponent = document.querySelector('.chat-container');
      const sidebarComponent = document.querySelector('.sidebar');
      const messageListComponent = document.querySelector('.messages-container');
      const messageInputComponent = document.querySelector('.input-area');
      
      setTestResults(prev => ({
        ...prev,
        components: {
          chat: {
            status: chatComponent ? 'passed' : 'failed',
            message: chatComponent ? 'Chat 组件成功渲染' : 'Chat 组件未能渲染'
          },
          sidebar: {
            status: sidebarComponent ? 'passed' : 'failed',
            message: sidebarComponent ? 'Sidebar 组件成功渲染' : 'Sidebar 组件未能渲染'
          },
          messageList: {
            status: messageListComponent ? 'passed' : 'failed',
            message: messageListComponent ? 'MessageList 组件成功渲染' : 'MessageList 组件未能渲染'
          },
          messageInput: {
            status: messageInputComponent ? 'passed' : 'failed',
            message: messageInputComponent ? 'MessageInput 组件成功渲染' : 'MessageInput 组件未能渲染'
          }
        }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        components: {
          status: 'failed',
          message: `测试过程中出错: ${error.message}`,
          error
        }
      }));
    }
    
    setIsRunning(false);
  };
  
  // 清除控制台错误
  const clearConsoleErrors = () => {
    setConsoleErrors([]);
  };
  
  return (
    <div className="test-route">
      <h1>聊天应用测试页面</h1>
      
      <div className="test-navigation">
        <Link to="/" className="nav-link">返回主应用</Link>
      </div>
      
      <div className="test-controls">
        <button 
          onClick={runTests} 
          disabled={isRunning}
          className="test-button"
        >
          {isRunning ? '测试运行中...' : '运行测试'}
        </button>
      </div>
      
      <div className="test-results-container">
        <h2>测试结果</h2>
        
        {Object.keys(testResults).length === 0 ? (
          <p className="no-results">尚未运行任何测试</p>
        ) : (
          <div className="results-grid">
            {Object.entries(testResults).map(([testName, result]) => {
              if (typeof result === 'object' && !Array.isArray(result)) {
                if (Object.keys(result).includes('status')) {
                  // 单个测试结果
                  return (
                    <div 
                      key={testName}
                      className={`result-card ${result.status}`}
                    >
                      <h3>{testName}</h3>
                      <div className="result-status">{result.status === 'passed' ? '通过' : '失败'}</div>
                      <p>{result.message}</p>
                      {result.error && (
                        <pre className="error-details">{JSON.stringify(result.error, null, 2)}</pre>
                      )}
                    </div>
                  );
                } else {
                  // 测试组
                  return (
                    <div key={testName} className="result-group">
                      <h3>{testName}</h3>
                      <div className="group-results">
                        {Object.entries(result).map(([subTestName, subResult]) => (
                          <div 
                            key={`${testName}-${subTestName}`}
                            className={`result-card ${subResult.status}`}
                          >
                            <h4>{subTestName}</h4>
                            <div className="result-status">
                              {subResult.status === 'passed' ? '通过' : '失败'}
                            </div>
                            <p>{subResult.message}</p>
                            {subResult.error && (
                              <pre className="error-details">{JSON.stringify(subResult.error, null, 2)}</pre>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
              }
              return null;
            })}
          </div>
        )}
      </div>
      
      <div className="console-errors-container">
        <div className="console-header">
          <h2>控制台错误 ({consoleErrors.length})</h2>
          {consoleErrors.length > 0 && (
            <button 
              onClick={clearConsoleErrors}
              className="clear-button"
            >
              清除错误
            </button>
          )}
        </div>
        
        {consoleErrors.length === 0 ? (
          <p className="no-errors">没有控制台错误</p>
        ) : (
          <div className="errors-list">
            {consoleErrors.map(error => (
              <div key={error.id} className="error-item">
                <div className="error-time">
                  {new Date(error.timestamp).toLocaleTimeString()}
                </div>
                <div className="error-message">{error.message}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestRoute;
