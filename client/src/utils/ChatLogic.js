// 创建新对话
const createNewChat = () => {
  try {
    // 清除之前的文档状态
    clearDocumentState();
    
    // 生成新的会话哈希
    const newSessionHash = generateSessionHash();
    
    // 更新状态
    setSessionHash(newSessionHash);
    setMessages([]);
    setCurrentDocumentId(null); // 重置当前文档ID
    setCurrentDocument(null);   // 重置当前文档
    setDocumentContent(null);   // 重置文档内容
    
    // 清除相关的 localStorage 数据
    localStorage.removeItem('currentDocumentId');
    localStorage.removeItem('currentDocument');
    localStorage.removeItem('documentContent');
    localStorage.removeItem('querySensitiveMappings');
    
    // 重置敏感信息映射
    clearSensitiveInfoMap();
    
    console.log('新对话创建成功', {
      sessionHash: newSessionHash,
      documentsCleared: true
    });
    
    return newSessionHash;
  } catch (err) {
    console.error('创建新对话失败:', err);
    throw err;
  }
};

// 清除文档状态的辅助函数
const clearDocumentState = () => {
  try {
    // 清除文档相关的状态
    setCurrentDocumentId(null);
    setCurrentDocument(null);
    setDocumentContent(null);
    
    // 清除本地存储中的文档数据
    const keysToRemove = [
      'currentDocumentId',
      'currentDocument',
      'documentContent',
      'querySensitiveMappings'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`清除 ${key} 时出错:`, e);
      }
    });
    
    // 清除敏感信息映射
    clearSensitiveInfoMap();
    
    console.log('文档状态已清除');
  } catch (err) {
    console.error('清除文档状态时出错:', err);
    // 不抛出错误，让程序继续运行
  }
}; 