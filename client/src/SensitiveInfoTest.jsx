import React, { useState } from 'react';
import SensitiveInfoTester from './components/SensitiveInfoTester';

const SensitiveInfoTest = () => {
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div style={{
      padding: '20px',
      backgroundColor: darkMode ? '#1a1a1a' : '#f5f5f5',
      minHeight: '100vh',
      color: darkMode ? '#e0e0e0' : '#333'
    }}>
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto',
        backgroundColor: darkMode ? '#2d2d2d' : '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '15px 20px',
          borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0 }}>敏感信息掩码测试</h1>
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px 16px',
              backgroundColor: darkMode ? '#444' : '#f0f0f0',
              color: darkMode ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {darkMode ? '☀️ 浅色模式' : '🌙 深色模式'}
          </button>
        </div>
        
        <div style={{ padding: '20px' }}>
          <SensitiveInfoTester darkMode={darkMode} />
        </div>
        
        <div style={{
          padding: '15px 20px',
          borderTop: `1px solid ${darkMode ? '#444' : '#eee'}`,
          textAlign: 'center',
          fontSize: '14px',
          color: darkMode ? '#aaa' : '#888'
        }}>
          敏感信息掩码测试工具 - 用于测试电话号码识别和反向映射功能
        </div>
      </div>
    </div>
  );
};

export default SensitiveInfoTest; 