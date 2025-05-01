import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './DiagnosticPage.css';

/**
 * 诊断页面 - 用于诊断和修复应用程序问题
 */
const DiagnosticPage = () => {
  const [consoleErrors, setConsoleErrors] = useState([]);
  const [componentStatus, setComponentStatus] = useState({});
  const [localStorageStatus, setLocalStorageStatus] = useState({});
  const [isRunningTests, setIsRunningTests] = useState(false);
  
  // 捕获控制台错误
  useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = function(...args) {
      originalConsoleError.apply(console, args);
      
      setConsoleErrors(prev => [
        ...prev,
        {
          id: Date.now(),
          message: args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
          ).join(' '),
          timestamp: new Date().toISOString()
        }
      ]);
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);
  
  // 检查组件状态
  const checkComponentStatus = () => {
    const status = {};
    
    try {
      // 检查 React 是否正常加载
      status.react = {
        status: typeof React === 'object' ? 'ok' : 'error',
        message: typeof React === 'object' ? 'React 已正确加载' : 'React 未正确加载'
      };
      
      // 检查 DOM 元素
      const chatContainer = document.querySelector('.chat-container');
      status.chatContainer = {
        status: chatContainer ? 'ok' : 'error',
        message: chatContainer ? 'Chat 容器已找到' : 'Chat 容器未找到'
      };
      
      const sidebar = document.querySelector('.sidebar');
      status.sidebar = {
        status: sidebar ? 'ok' : 'error',
        message: sidebar ? 'Sidebar 组件已找到' : 'Sidebar 组件未找到'
      };
      
      const messageList = document.querySelector('.messages-container');
      status.messageList = {
        status: messageList ? 'ok' : 'error',
        message: messageList ? 'MessageList 组件已找到' : 'MessageList 组件未找到'
      };
      
      const messageInput = document.querySelector('.input-area');
      status.messageInput = {
        status: messageInput ? 'ok' : 'error',
        message: messageInput ? 'MessageInput 组件已找到' : 'MessageInput 组件未找到'
      };
    } catch (error) {
      status.error = {
        status: 'error',
        message: `检查组件状态时出错: ${error.message}`,
        error
      };
    }
    
    setComponentStatus(status);
  };
  
  // 检查 localStorage 状态
  const checkLocalStorageStatus = () => {
    const status = {};
    
    try {
      // 测试 localStorage 是否可用
      const testKey = '_test_key_' + Date.now();
      localStorage.setItem(testKey, 'test');
      const testValue = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      status.available = {
        status: testValue === 'test' ? 'ok' : 'error',
        message: testValue === 'test' ? 'localStorage 可用' : 'localStorage 不可用'
      };
      
      // 检查现有数据
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        keys.push(localStorage.key(i));
      }
      
      status.keys = {
        status: 'info',
        message: `找到 ${keys.length} 个键`,
        keys
      };
      
      // 检查关键数据
      const checkKey = (key) => {
        try {
          const value = localStorage.getItem(key);
          const parsed = value ? JSON.parse(value) : null;
          return {
            status: value ? 'ok' : 'warning',
            message: value ? `${key} 存在并可解析` : `${key} 不存在`,
            value: parsed
          };
        } catch (error) {
          return {
            status: 'error',
            message: `${key} 存在但无法解析: ${error.message}`,
            error
          };
        }
      };
      
      status.conversations = checkKey('conversations');
      status.activeDocuments = checkKey('activeDocuments');
      status.isSidebarExpanded = checkKey('isSidebarExpanded');
      status.darkMode = checkKey('darkMode');
    } catch (error) {
      status.error = {
        status: 'error',
        message: `检查 localStorage 时出错: ${error.message}`,
        error
      };
    }
    
    setLocalStorageStatus(status);
  };
  
  // 运行所有测试
  const runAllTests = () => {
    setIsRunningTests(true);
    setConsoleErrors([]);
    
    try {
      checkComponentStatus();
      checkLocalStorageStatus();
    } finally {
      setIsRunningTests(false);
    }
  };
  
  // 清除所有错误
  const clearErrors = () => {
    setConsoleErrors([]);
  };
  
  // 清除 localStorage
  const clearLocalStorage = () => {
    if (window.confirm('确定要清除所有本地存储数据吗？这将删除所有对话历史和设置。')) {
      localStorage.clear();
      checkLocalStorageStatus();
    }
  };
  
  // 修复常见问题
  const fixCommonIssues = () => {
    try {
      // 初始化关键数据结构
      if (!localStorage.getItem('conversations')) {
        localStorage.setItem('conversations', JSON.stringify([]));
      }
      
      if (!localStorage.getItem('activeDocuments')) {
        localStorage.setItem('activeDocuments', JSON.stringify([]));
      }
      
      if (localStorage.getItem('isSidebarExpanded') === null) {
        localStorage.setItem('isSidebarExpanded', JSON.stringify(true));
      }
      
      if (localStorage.getItem('darkMode') === null) {
        localStorage.setItem('darkMode', JSON.stringify(false));
      }
      
      // 重新检查状态
      checkLocalStorageStatus();
      
      alert('已尝试修复常见问题。请刷新页面查看效果。');
    } catch (error) {
      alert(`修复过程中出错: ${error.message}`);
    }
  };
  
  return (
    <div className="diagnostic-page">
      <header className="diagnostic-header">
        <h1>Mini Chatbot 诊断页面</h1>
        <nav className="diagnostic-nav">
          <Link to="/" className="nav-link">返回主页</Link>
          <Link to="/test-route" className="nav-link">测试页面</Link>
        </nav>
      </header>
      
      <main className="diagnostic-content">
        <section className="diagnostic-actions">
          <button 
            className="action-button primary"
            onClick={runAllTests}
            disabled={isRunningTests}
          >
            {isRunningTests ? '测试运行中...' : '运行诊断测试'}
          </button>
          
          <button 
            className="action-button warning"
            onClick={fixCommonIssues}
          >
            修复常见问题
          </button>
          
          <button 
            className="action-button danger"
            onClick={clearLocalStorage}
          >
            清除本地存储
          </button>
          
          <button 
            className="action-button secondary"
            onClick={clearErrors}
            disabled={consoleErrors.length === 0}
          >
            清除错误日志
          </button>
        </section>
        
        <section className="diagnostic-results">
          <div className="result-card">
            <h2>组件状态</h2>
            {Object.keys(componentStatus).length === 0 ? (
              <p className="no-data">尚未运行组件检查</p>
            ) : (
              <ul className="status-list">
                {Object.entries(componentStatus).map(([key, value]) => (
                  <li key={key} className={`status-item ${value.status}`}>
                    <span className="status-key">{key}:</span>
                    <span className="status-message">{value.message}</span>
                    {value.error && (
                      <pre className="status-error">{JSON.stringify(value.error, null, 2)}</pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="result-card">
            <h2>本地存储状态</h2>
            {Object.keys(localStorageStatus).length === 0 ? (
              <p className="no-data">尚未运行本地存储检查</p>
            ) : (
              <ul className="status-list">
                {Object.entries(localStorageStatus).map(([key, value]) => (
                  <li key={key} className={`status-item ${value.status}`}>
                    <span className="status-key">{key}:</span>
                    <span className="status-message">{value.message}</span>
                    {value.keys && (
                      <div className="status-details">
                        <strong>键列表:</strong>
                        <ul className="key-list">
                          {value.keys.map(k => (
                            <li key={k}>{k}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {value.value && (
                      <div className="status-details">
                        <strong>值:</strong>
                        <pre>{JSON.stringify(value.value, null, 2)}</pre>
                      </div>
                    )}
                    {value.error && (
                      <pre className="status-error">{JSON.stringify(value.error, null, 2)}</pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="result-card">
            <h2>控制台错误 ({consoleErrors.length})</h2>
            {consoleErrors.length === 0 ? (
              <p className="no-data">没有捕获到控制台错误</p>
            ) : (
              <ul className="error-list">
                {consoleErrors.map(error => (
                  <li key={error.id} className="error-item">
                    <div className="error-time">
                      {new Date(error.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="error-message">{error.message}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      
      <footer className="diagnostic-footer">
        <p>此诊断页面用于帮助识别和修复 Mini Chatbot 应用程序中的问题。</p>
      </footer>
    </div>
  );
};

export default DiagnosticPage;
