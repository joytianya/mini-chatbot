import React, { useState, useEffect } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo } from '../utils/SensitiveInfoMasker';

const SensitiveInfoTester = ({ darkMode }) => {
  const [inputText, setInputText] = useState('');
  const [maskedText, setMaskedText] = useState('');
  const [sensitiveMap, setSensitiveMap] = useState({});
  const [showOriginal, setShowOriginal] = useState(false);
  const [highlightedText, setHighlightedText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 处理掩码
  const handleMask = () => {
    if (!inputText) {
      alert('请输入测试文本');
      return;
    }

    // 清除之前的敏感信息映射
    window.currentSensitiveInfoMap = {};
    
    // 掩码处理
    const masked = maskSensitiveInfo(inputText);
    setMaskedText(masked);
    
    // 获取敏感信息映射
    const map = window.currentSensitiveInfoMap || {};
    setSensitiveMap(map);
    
    // 默认显示掩码后的文本
    setShowOriginal(false);
    
    // 清除高亮
    setHighlightedText('');
  };

  // 处理反向映射
  const handleToggleOriginal = () => {
    setShowOriginal(!showOriginal);
  };

  // 处理关键词搜索
  const handleSearch = () => {
    if (!searchKeyword) {
      setHighlightedText('');
      return;
    }

    const displayText = showOriginal 
      ? unmaskSensitiveInfo(maskedText, sensitiveMap)
      : maskedText;
    
    // 使用正则表达式进行高亮
    const regex = new RegExp(`(${searchKeyword})`, 'gi');
    const highlighted = displayText.replace(regex, '<span class="highlight">$1</span>');
    setHighlightedText(highlighted);
  };

  // 当显示模式或关键词变化时，更新高亮
  useEffect(() => {
    if (searchKeyword) {
      handleSearch();
    }
  }, [showOriginal, searchKeyword]);

  // 获取显示内容
  const getDisplayContent = () => {
    if (!maskedText) return '';
    
    return showOriginal 
      ? unmaskSensitiveInfo(maskedText, sensitiveMap)
      : maskedText;
  };

  return (
    <div style={{
      padding: '20px',
      backgroundColor: darkMode ? '#2d2d2d' : '#fff',
      borderRadius: '8px',
      color: darkMode ? '#e0e0e0' : '#333'
    }}>
      <h2 style={{ marginTop: 0 }}>敏感信息掩码测试</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>输入测试文本</h3>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="在此输入包含敏感信息的文本..."
          style={{
            width: '100%',
            height: '150px',
            padding: '10px',
            borderRadius: '4px',
            border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
            backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
            color: darkMode ? '#fff' : '#333',
            resize: 'vertical',
            fontFamily: 'monospace'
          }}
        />
        
        <div style={{ marginTop: '10px' }}>
          <button
            onClick={handleMask}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            测试掩码
          </button>
          
          <button
            onClick={() => {
              setInputText(`测试电话号码识别功能
===========================

普通11位手机号码：
13812345678
14712345678
15612345678

带前缀的手机号码：
电话：13812345678
联系电话：14712345678
手机：15612345678

混合在文本中的手机号码：
我的手机号是13812345678，请联系我。
如有问题，请拨打客服电话14712345678。`);
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: darkMode ? '#444' : '#f0f0f0',
              color: darkMode ? '#fff' : '#333',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            加载示例
          </button>
        </div>
      </div>
      
      {maskedText && (
        <>
          <div style={{ marginBottom: '20px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '10px'
            }}>
              <h3 style={{ margin: 0 }}>处理结果</h3>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索关键词..."
                  style={{
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                    backgroundColor: darkMode ? '#3d3d3d' : '#fff',
                    color: darkMode ? '#fff' : '#333'
                  }}
                />
                
                <button
                  onClick={handleSearch}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  搜索
                </button>
                
                <button
                  onClick={handleToggleOriginal}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: darkMode ? '#444' : '#f0f0f0',
                    color: darkMode ? '#fff' : '#333',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {showOriginal ? '显示掩码信息' : '显示原始信息'}
                </button>
              </div>
            </div>
            
            <div
              style={{
                padding: '15px',
                borderRadius: '4px',
                border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
                color: darkMode ? '#fff' : '#333',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                maxHeight: '300px',
                overflowY: 'auto'
              }}
            >
              {highlightedText ? (
                <div dangerouslySetInnerHTML={{ __html: highlightedText }} />
              ) : (
                getDisplayContent()
              )}
            </div>
          </div>
          
          <div>
            <h3>敏感信息映射</h3>
            <div
              style={{
                padding: '15px',
                borderRadius: '4px',
                border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
                backgroundColor: darkMode ? '#3d3d3d' : '#f9f9f9',
                color: darkMode ? '#fff' : '#333',
                fontFamily: 'monospace',
                maxHeight: '200px',
                overflowY: 'auto'
              }}
            >
              {Object.keys(sensitiveMap).length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '8px', 
                        borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}` 
                      }}>掩码ID</th>
                      <th style={{ 
                        textAlign: 'left', 
                        padding: '8px', 
                        borderBottom: `1px solid ${darkMode ? '#555' : '#ddd'}` 
                      }}>原始值</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sensitiveMap).map(([key, value], index) => (
                      <tr key={index}>
                        <td style={{ 
                          padding: '8px', 
                          borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}` 
                        }}>{key}</td>
                        <td style={{ 
                          padding: '8px', 
                          borderBottom: `1px solid ${darkMode ? '#444' : '#eee'}` 
                        }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>没有检测到敏感信息</p>
              )}
            </div>
          </div>
        </>
      )}
      
      <style jsx>{`
        .highlight {
          background-color: ${darkMode ? '#ffcc00' : '#ffff00'};
          color: ${darkMode ? '#000' : '#000'};
          padding: 0 2px;
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

export default SensitiveInfoTester; 