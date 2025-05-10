import React, { useState, useRef } from 'react';

const PasteTest = () => {
  const [inputValue, setInputValue] = useState('');
  const [pasteCount, setPasteCount] = useState(0);
  const [lastPastedText, setLastPastedText] = useState('');
  const inputRef = useRef(null);

  const handleChange = (e) => {
    setInputValue(e.target.value);
    console.log('onChange triggered:', e.target.value);
  };

  const handlePaste = (e) => {
    // 获取粘贴的文本
    const pastedText = e.clipboardData.getData('text');
    console.log('粘贴事件触发，内容:', pastedText);
    
    // 更新状态
    setPasteCount(prev => prev + 1);
    setLastPastedText(pastedText);
    
    // 不阻止默认行为
    // e.preventDefault(); // 注释掉这行，允许默认粘贴行为
  };

  const forcePaste = () => {
    // 尝试通过编程方式插入文本
    navigator.clipboard.readText()
      .then(text => {
        // 手动更新输入值
        const newValue = inputValue + text;
        setInputValue(newValue);
        setLastPastedText(text);
        setPasteCount(prev => prev + 1);
        console.log('手动粘贴成功:', text);
      })
      .catch(err => {
        console.error('无法读取剪贴板:', err);
        alert('无法访问剪贴板。请确保您的浏览器允许访问剪贴板。');
      });
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h2>粘贴测试页面</h2>
      <p>请尝试在下面的输入框中粘贴内容</p>
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="test-input" style={{ display: 'block', marginBottom: '5px' }}>
          测试输入框:
        </label>
        <input
          id="test-input"
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onPaste={handlePaste}
          style={{ 
            width: '100%', 
            padding: '10px',
            border: '2px solid #4f46e5',
            borderRadius: '4px'
          }}
          placeholder="在此粘贴文本..."
        />
      </div>
      
      <button 
        onClick={forcePaste}
        style={{
          padding: '10px 15px',
          backgroundColor: '#4f46e5',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        尝试编程方式粘贴
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>粘贴统计</h3>
        <p>粘贴次数: {pasteCount}</p>
        <p>当前输入值: "{inputValue}"</p>
        <p>最后粘贴的文本: "{lastPastedText}"</p>
      </div>
    </div>
  );
};

export default PasteTest;
