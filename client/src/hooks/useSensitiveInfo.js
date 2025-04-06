import { useState, useEffect } from 'react';
import { 
  maskSensitiveInfo, 
  unmaskSensitiveInfo, 
  ensureGlobalMapExists, 
  getSensitiveInfoMap,
  updateGlobalSensitiveInfoMap,
  getAllDocumentMaps
} from '../utils/SensitiveInfoMasker';

/**
 * 敏感信息保护相关的Hook
 * @param {string} sessionHash 当前会话哈希值
 * @returns {Object} 敏感信息保护相关的状态和函数
 */
function useSensitiveInfo(sessionHash) {
  // 是否启用敏感信息保护
  const [sensitiveInfoProtectionEnabled, setSensitiveInfoProtectionEnabled] = useState(() => {
    // 从localStorage获取设置，默认关闭
    const saved = localStorage.getItem('sensitiveInfoProtection');
    return saved ? JSON.parse(saved) : false;
  });
  
  // 初始化时确保全局映射表存在
  useEffect(() => {
    if (sensitiveInfoProtectionEnabled) {
      ensureGlobalMapExists();
      
      // 确保当前会话在映射表中有条目
      if (sessionHash && window.currentSensitiveInfoMap && !window.currentSensitiveInfoMap[sessionHash]) {
        window.currentSensitiveInfoMap[sessionHash] = {};
        console.log('为当前会话创建空的映射表，会话哈希值:', sessionHash);
        
        // 保存到localStorage
        try {
          localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        } catch (error) {
          console.error('保存全局映射表到localStorage时出错:', error);
        }
      }
    }
  }, [sensitiveInfoProtectionEnabled, sessionHash]);
  
  /**
   * 切换敏感信息保护
   */
  const toggleSensitiveInfoProtection = () => {
    setSensitiveInfoProtectionEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('sensitiveInfoProtection', JSON.stringify(newValue));
      
      if (newValue) {
        ensureGlobalMapExists();
        if (sessionHash && window.currentSensitiveInfoMap && !window.currentSensitiveInfoMap[sessionHash]) {
          window.currentSensitiveInfoMap[sessionHash] = {};
          console.log('启用敏感信息保护，为当前会话创建空的映射表，会话哈希值:', sessionHash);
          
          // 保存到localStorage
          try {
            localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
          } catch (error) {
            console.error('保存全局映射表到localStorage时出错:', error);
          }
        }
      }
      
      return newValue;
    });
  };
  
  /**
   * 处理输入文本的敏感信息
   * @param {string} text 输入文本
   * @returns {Object} 包含处理后的文本和处理信息
   */
  const processSensitiveText = (text) => {
    if (!sensitiveInfoProtectionEnabled || !text) {
      return { 
        processedText: text, 
        originalText: null, 
        isMasked: false 
      };
    }
    
    // 确保全局映射表存在
    ensureGlobalMapExists();
    
    // 掩码处理文本
    const maskedText = maskSensitiveInfo(text);
    
    // 检查是否有敏感信息被掩码
    const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
    const isMasked = possibleMaskPatterns.some(pattern => pattern.test(maskedText));
    
    if (isMasked) {
      console.log('文本中包含敏感信息，已进行掩码处理');
      
      // 获取并保存当前查询的敏感信息映射
      const queryMap = getSensitiveInfoMap();
      if (Object.keys(queryMap).length > 0) {
        // 将新的敏感信息映射合并到全局映射表中
        updateGlobalSensitiveInfoMap(queryMap, sessionHash);
        
        // 保存会话映射到localStorage
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
      }
      
      return {
        processedText: maskedText,
        originalText: text,
        isMasked: true
      };
    } else {
      console.log('文本中没有敏感信息，无需掩码处理');
      return {
        processedText: text,
        originalText: null,
        isMasked: false
      };
    }
  };
  
  /**
   * 恢复掩码处理后的文本
   * @param {string} maskedText 掩码处理后的文本
   * @param {Object} messageMap 消息中的敏感信息映射
   * @returns {string} 恢复后的文本
   */
  const recoverMaskedText = (maskedText, messageMap) => {
    if (!sensitiveInfoProtectionEnabled || !maskedText) {
      return maskedText;
    }
    
    // 检查是否包含掩码标识符
    const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
    const hasMasks = possibleMaskPatterns.some(pattern => pattern.test(maskedText));
    
    if (!hasMasks) {
      return maskedText;
    }
    
    // 如果提供了消息映射，优先使用消息映射
    if (messageMap && Object.keys(messageMap).length > 0) {
      return unmaskSensitiveInfo(maskedText, messageMap);
    }
    
    // 如果没有提供消息映射，尝试使用会话映射
    if (window.currentSensitiveInfoMap && window.currentSensitiveInfoMap[sessionHash]) {
      const sessionMap = window.currentSensitiveInfoMap[sessionHash];
      if (Object.keys(sessionMap).length > 0) {
        return unmaskSensitiveInfo(maskedText, sessionMap);
      }
    }
    
    // 如果会话映射也无法解决，尝试使用所有映射
    const allMaps = getAllDocumentMaps();
    if (Object.keys(allMaps).length > 0) {
      // 创建一个合并的映射表
      const mergedMap = {};
      
      // 首先添加会话映射
      if (window.currentSensitiveInfoMap && window.currentSensitiveInfoMap[sessionHash]) {
        Object.assign(mergedMap, window.currentSensitiveInfoMap[sessionHash]);
      }
      
      // 遍历所有文档的映射表
      Object.entries(allMaps).forEach(([docHash, docMap]) => {
        if (typeof docMap === 'object' && docHash !== sessionHash) {
          Object.entries(docMap).forEach(([key, value]) => {
            if (!mergedMap[key]) {
              mergedMap[key] = value;
            }
          });
        }
      });
      
      if (Object.keys(mergedMap).length > 0) {
        return unmaskSensitiveInfo(maskedText, mergedMap);
      }
    }
    
    // 如果所有尝试都失败，返回原文本
    return maskedText;
  };
  
  return {
    sensitiveInfoProtectionEnabled,
    toggleSensitiveInfoProtection,
    processSensitiveText,
    recoverMaskedText
  };
}

export default useSensitiveInfo; 