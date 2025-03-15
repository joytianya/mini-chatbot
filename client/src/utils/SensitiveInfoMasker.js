/**
 * SensitiveInfoMasker.js
 * 
 * This utility handles detection and masking of sensitive information in text
 * and maintains a mapping between original and masked values.
 */

// 初始化全局映射表的函数
const initGlobalSensitiveInfoMap = () => {
  console.log('调用 initGlobalSensitiveInfoMap 函数');
  
  // 如果全局映射表已经存在且不为空，则不需要重新初始化
  if (window.currentSensitiveInfoMap && Object.keys(window.currentSensitiveInfoMap).length > 0) {
    console.log('全局敏感信息映射表已存在，条目数:', Object.keys(window.currentSensitiveInfoMap).length);
    return window.currentSensitiveInfoMap;
  }
  
  console.log('初始化全局敏感信息映射表');
  
  // 尝试从localStorage恢复全局映射表
  try {
    const savedMap = localStorage.getItem('globalSensitiveInfoMap');
    if (savedMap) {
      window.currentSensitiveInfoMap = JSON.parse(savedMap);
      console.log('从localStorage恢复全局敏感信息映射表');
      console.log('恢复的映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
      console.log('全局映射表详细内容:');
      Object.entries(window.currentSensitiveInfoMap).forEach(([key, value], index) => {
        console.log(`  ${index+1}. ${key} => ${value}`);
      });
    } else {
      // 初始化为对象，用于存储不同文档的映射表
      window.currentSensitiveInfoMap = {};
      console.log('未找到保存的全局映射表，初始化为空对象');
    }
  } catch (error) {
    console.error('恢复全局映射表时出错:', error);
    window.currentSensitiveInfoMap = {};
  }
  
  return window.currentSensitiveInfoMap;
};

// 立即初始化全局映射表
console.log('SensitiveInfoMasker.js 被加载，立即初始化全局映射表');
initGlobalSensitiveInfoMap();

// 确保全局映射表在每次页面加载时都被正确初始化
window.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，确保全局映射表初始化');
  initGlobalSensitiveInfoMap();
});

/**
 * 生成文件哈希值（简化版，实际应用中可能需要更复杂的哈希算法）
 * @param {File} file 文件对象
 * @returns {string} 哈希值
 */
export const generateFileHash = (file) => {
  if (!file) return 'default';
  
  // 简单哈希算法：文件名+大小+最后修改时间
  const hashSource = `${file.name}_${file.size}_${file.lastModified}`;
  console.log('生成文件哈希，源数据:', hashSource);
  
  // 简单的字符串哈希函数
  let hash = 0;
  for (let i = 0; i < hashSource.length; i++) {
    const char = hashSource.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  // 转换为16进制字符串
  const hashHex = Math.abs(hash).toString(16);
  console.log('生成的文件哈希值:', hashHex);
  
  return hashHex;
};

/**
 * 确保全局映射表存在
 * 在每次使用前调用此函数，确保全局映射表存在
 * @param {string} [docHash] 文档哈希值，如果提供则返回特定文档的映射表
 */
export const ensureGlobalMapExists = (docHash) => {
  console.log('调用 ensureGlobalMapExists 函数', docHash ? `文档哈希: ${docHash}` : '无文档哈希');
  
  if (!window.currentSensitiveInfoMap) {
    console.log('全局映射表不存在，初始化全局敏感信息映射表');
    
    // 尝试从localStorage恢复全局映射表
    try {
      const savedMap = localStorage.getItem('globalSensitiveInfoMap');
      if (savedMap) {
        window.currentSensitiveInfoMap = JSON.parse(savedMap);
        console.log('从localStorage恢复全局敏感信息映射表');
        console.log('恢复的映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
        console.log('全局映射表详细内容:');
        Object.entries(window.currentSensitiveInfoMap).forEach(([key, value], index) => {
          console.log(`  ${index+1}. ${key} => ${value}`);
        });
      } else {
        window.currentSensitiveInfoMap = {};
        console.log('未找到保存的全局映射表，初始化为空对象');
      }
    } catch (error) {
      console.error('恢复全局映射表时出错:', error);
      window.currentSensitiveInfoMap = {};
    }
  } else {
    console.log('全局映射表已存在，条目数:', Object.keys(window.currentSensitiveInfoMap).length);
    
    // 检查全局映射表是否为空，如果为空尝试从localStorage恢复
    if (Object.keys(window.currentSensitiveInfoMap).length === 0) {
      console.log('全局映射表为空，尝试从localStorage恢复');
      try {
        const savedMap = localStorage.getItem('globalSensitiveInfoMap');
        if (savedMap) {
          window.currentSensitiveInfoMap = JSON.parse(savedMap);
          console.log('从localStorage恢复全局敏感信息映射表');
          console.log('恢复的映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
          console.log('全局映射表详细内容:');
          Object.entries(window.currentSensitiveInfoMap).forEach(([key, value], index) => {
            console.log(`  ${index+1}. ${key} => ${value}`);
          });
        }
      } catch (error) {
        console.error('恢复全局映射表时出错:', error);
      }
    }
  }
  
  // 如果提供了文档哈希，返回特定文档的映射表
  if (docHash) {
    // 如果该文档的映射表不存在，初始化为空对象
    if (!window.currentSensitiveInfoMap[docHash]) {
      console.log(`文档 ${docHash} 的映射表不存在，初始化为空对象`);
      window.currentSensitiveInfoMap[docHash] = {};
    }
    
    console.log(`返回文档 ${docHash} 的映射表，条目数:`, Object.keys(window.currentSensitiveInfoMap[docHash]).length);
    return window.currentSensitiveInfoMap[docHash];
  }
  
  // 如果没有提供文档哈希，返回默认映射表或第一个非空的文档映射表
  if (!window.currentSensitiveInfoMap['default']) {
    window.currentSensitiveInfoMap['default'] = {};
  }
  
  // 检查默认映射表是否为空
  if (Object.keys(window.currentSensitiveInfoMap['default']).length === 0) {
    console.log('默认映射表为空，尝试查找非空的文档映射表');
    
    // 查找第一个非空的文档映射表
    const nonEmptyMapKey = Object.keys(window.currentSensitiveInfoMap).find(key => 
      key !== 'default' && 
      typeof window.currentSensitiveInfoMap[key] === 'object' && 
      Object.keys(window.currentSensitiveInfoMap[key]).length > 0
    );
    
    if (nonEmptyMapKey) {
      console.log(`找到非空的文档映射表: ${nonEmptyMapKey}，条目数:`, Object.keys(window.currentSensitiveInfoMap[nonEmptyMapKey]).length);
      console.log(`使用文档 ${nonEmptyMapKey} 的映射表代替默认映射表`);
      return window.currentSensitiveInfoMap[nonEmptyMapKey];
    } else {
      console.log('未找到非空的文档映射表，返回空的默认映射表');
    }
  }
  
  console.log('返回默认映射表，条目数:', Object.keys(window.currentSensitiveInfoMap['default']).length);
  return window.currentSensitiveInfoMap['default'];
};

/**
 * 清除当前敏感信息映射
 * @param {string} [docHash] 文档哈希值，如果提供则只清除特定文档的映射表
 */
export const clearSensitiveInfoMap = (docHash) => {
  console.log('清除敏感信息映射表', docHash ? `文档哈希: ${docHash}` : '所有映射表');
  
  ensureGlobalMapExists();
  
  if (docHash) {
    // 只清除特定文档的映射表
    if (window.currentSensitiveInfoMap[docHash]) {
      console.log(`原文档 ${docHash} 映射表条目数:`, Object.keys(window.currentSensitiveInfoMap[docHash]).length);
      window.currentSensitiveInfoMap[docHash] = {};
      console.log(`清除后文档 ${docHash} 映射表条目数:`, Object.keys(window.currentSensitiveInfoMap[docHash]).length);
    } else {
      console.log(`文档 ${docHash} 的映射表不存在，无需清除`);
    }
  } else {
    // 清除所有映射表
    console.log('原映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
    window.currentSensitiveInfoMap = {};
    console.log('清除后映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
  }
  
  // 更新localStorage中的映射表
  try {
    localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
    console.log('已更新localStorage中的全局映射表');
  } catch (error) {
    console.error('更新localStorage中的全局映射表时出错:', error);
  }
};

/**
 * 获取当前敏感信息映射
 * @param {string} [docHash] 文档哈希值，如果提供则返回特定文档的映射表
 * @returns {Object} 敏感信息映射
 */
export const getSensitiveInfoMap = (docHash) => {
  if (docHash) {
    const docMap = ensureGlobalMapExists(docHash);
    return {...docMap};
  }
  
  const defaultMap = ensureGlobalMapExists();
  return {...defaultMap};
};

/**
 * 更新全局敏感信息映射表
 * @param {Object} newMap 新的映射表
 * @param {string} [docHash] 文档哈希值，如果提供则更新特定文档的映射表
 * @param {boolean} replace 是否替换现有映射表，默认为false（合并）
 */
export const updateGlobalSensitiveInfoMap = (newMap, docHash, replace = false) => {
  if (!newMap) return;
  
  ensureGlobalMapExists();
  console.log('更新敏感信息映射表', docHash ? `文档哈希: ${docHash}` : '默认映射表');
  
  if (docHash) {
    // 更新特定文档的映射表
    if (!window.currentSensitiveInfoMap[docHash]) {
      window.currentSensitiveInfoMap[docHash] = {};
    }
    
    console.log(`原文档 ${docHash} 映射表条目数:`, Object.keys(window.currentSensitiveInfoMap[docHash]).length);
    
    if (replace) {
      // 替换现有映射表
      window.currentSensitiveInfoMap[docHash] = {...newMap};
      console.log(`文档 ${docHash} 映射表已替换`);
    } else {
      // 合并到现有映射表
      window.currentSensitiveInfoMap[docHash] = {
        ...window.currentSensitiveInfoMap[docHash],
        ...newMap
      };
      console.log(`新映射已合并到文档 ${docHash} 映射表`);
    }
    
    console.log(`更新后文档 ${docHash} 映射表条目数:`, Object.keys(window.currentSensitiveInfoMap[docHash]).length);
    console.log(`文档 ${docHash} 映射表详细内容:`);
    Object.entries(window.currentSensitiveInfoMap[docHash]).forEach(([key, value], index) => {
      console.log(`  ${index+1}. ${key} => ${value}`);
    });
  } else {
    // 更新默认映射表
    if (!window.currentSensitiveInfoMap['default']) {
      window.currentSensitiveInfoMap['default'] = {};
    }
    
    console.log('原默认映射表条目数:', Object.keys(window.currentSensitiveInfoMap['default']).length);
    
    if (replace) {
      // 替换现有映射表
      window.currentSensitiveInfoMap['default'] = {...newMap};
      console.log('默认映射表已替换');
    } else {
      // 合并到现有映射表
      window.currentSensitiveInfoMap['default'] = {
        ...window.currentSensitiveInfoMap['default'],
        ...newMap
      };
      console.log('新映射已合并到默认映射表');
    }
    
    console.log('更新后默认映射表条目数:', Object.keys(window.currentSensitiveInfoMap['default']).length);
    console.log('默认映射表详细内容:');
    Object.entries(window.currentSensitiveInfoMap['default']).forEach(([key, value], index) => {
      console.log(`  ${index+1}. ${key} => ${value}`);
    });
  }
  
  // 将更新后的全局映射表保存到localStorage
  try {
    localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
    console.log('已将更新后的全局映射表保存到localStorage');
  } catch (error) {
    console.error('保存全局映射表到localStorage时出错:', error);
  }
};

/**
 * 获取所有文档的映射表
 * @returns {Object} 所有文档的映射表
 */
export const getAllDocumentMaps = () => {
  ensureGlobalMapExists();
  return {...window.currentSensitiveInfoMap};
};

/**
 * 敏感信息检测和掩码处理
 * @param {string} text 需要处理的文本
 * @param {string} [sessionHash] 会话哈希值，如果提供则使用该会话的映射表
 * @returns {string} 处理后的文本
 */
export const maskSensitiveInfo = (text, sessionHash) => {
  if (!text) return text;
  
  ensureGlobalMapExists();
  console.log('开始处理文本，长度:', text.length);
  console.log('文本示例:', text.substring(0, 100));
  console.log('会话哈希值:', sessionHash || '未提供');
  
  // 获取映射表
  let sensitiveInfoMap;
  if (sessionHash && window.currentSensitiveInfoMap) {
    // 如果提供了会话哈希值，使用该会话的映射表
    if (!window.currentSensitiveInfoMap[sessionHash]) {
      window.currentSensitiveInfoMap[sessionHash] = {};
      console.log(`为会话 ${sessionHash} 创建新的映射表`);
    }
    sensitiveInfoMap = window.currentSensitiveInfoMap[sessionHash];
    console.log(`使用会话 ${sessionHash} 的映射表，条目数:`, Object.keys(sensitiveInfoMap).length);
  } else {
    // 否则使用默认映射表
    sensitiveInfoMap = ensureGlobalMapExists();
    console.log('使用默认映射表，条目数:', Object.keys(sensitiveInfoMap).length);
  }
  
  // 在处理前先记录当前映射表的状态
  console.log('处理前的敏感信息映射表状态:');
  console.log('  映射表条目数:', Object.keys(sensitiveInfoMap).length);
  if (Object.keys(sensitiveInfoMap).length > 0) {
    console.log('  当前映射表中的键:', Object.keys(sensitiveInfoMap));
  }
  
  // 敏感信息模式列表
  const patterns = [
    // 手机号码 - 修改正则表达式，匹配所有11位数字
    {
      regex: /\b1\d{10}\b/g,
      mask: (match) => {
        console.log(`检测到手机号码: ${match}`);
        const maskId = `[[PHONE_${Object.keys(sensitiveInfoMap).length}]]`;
        sensitiveInfoMap[maskId] = match;
        console.log(`掩码替换: ${match} -> ${maskId}, 已添加到映射表`);
        return maskId;
      }
    },
    // 带前缀的手机号码 - 同样修改正则表达式
    {
      regex: /(?:电话|联系电话|手机|联系方式|联系|电话号码|手机号码|手机号|电话号|联系电话|联系号码|联系人电话|电话|Tel|Telephone|Phone|Mobile|Contact|联系人|联系人号码)[:：]?\s*1\d{10}/g,
      mask: (match) => {
        console.log(`检测到带前缀的手机号码: ${match}`);
        // 提取手机号码
        const phoneNumber = match.match(/1\d{10}/)[0];
        const maskId = `[[PHONE_${Object.keys(sensitiveInfoMap).length}]]`;
        sensitiveInfoMap[maskId] = phoneNumber;
        // 保留前缀，替换手机号
        const masked = match.replace(phoneNumber, maskId);
        console.log(`掩码替换: ${match} -> ${masked}, 已添加到映射表`);
        return masked;
      }
    },
    // 邮箱
    {
      regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
      mask: (match) => {
        console.log(`检测到邮箱: ${match}`);
        const maskId = `[[EMAIL_${Object.keys(sensitiveInfoMap).length}]]`;
        sensitiveInfoMap[maskId] = match;
        console.log(`掩码替换: ${match} -> ${maskId}, 已添加到映射表`);
        return maskId;
      }
    },
    // 身份证号
    {
      regex: /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}(?:\d|X|x)\b/g,
      mask: (match) => {
        console.log(`检测到身份证号: ${match}`);
        const maskId = `[[ID_${Object.keys(sensitiveInfoMap).length}]]`;
        sensitiveInfoMap[maskId] = match;
        console.log(`掩码替换: ${match} -> ${maskId}, 已添加到映射表`);
        return maskId;
      }
    },
    // 银行卡号
    {
      regex: /\b\d{16,19}\b/g,
      mask: (match) => {
        // 只处理可能是银行卡的数字
        if (match.length >= 16 && match.length <= 19) {
          console.log(`检测到银行卡号: ${match}`);
          const maskId = `[[CARD_${Object.keys(sensitiveInfoMap).length}]]`;
          sensitiveInfoMap[maskId] = match;
          console.log(`掩码替换: ${match} -> ${maskId}, 已添加到映射表`);
          return maskId;
        }
        return match;
      }
    },
    // 地址信息
    {
      regex: /(?:北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆|香港|澳门)(?:省|市|自治区|特别行政区)?[\u4e00-\u9fa5]{2,}(?:街道|镇|乡|村|路|街|巷|号楼|单元|室)/g,
      mask: (match) => {
        console.log(`检测到地址信息: ${match}`);
        const maskId = `[[ADDR_${Object.keys(sensitiveInfoMap).length}]]`;
        sensitiveInfoMap[maskId] = match;
        console.log(`掩码替换: ${match} -> ${maskId}, 已添加到映射表`);
        return maskId;
      }
    },
    // 姓名（中文姓名，2-4个汉字）
    {
      regex: /(?:姓名[：:]\s*([a-zA-Z]+))|[\u4e00-\u9fa5]{2,4}(?:先生|女士|小姐|老师|教授|医生|同学|经理|总监|主任)/g,
      mask: (match) => {
        console.log(`检测到姓名: ${match}`);
        const maskId = `[[NAME_${Object.keys(sensitiveInfoMap).length}]]`;
        sensitiveInfoMap[maskId] = match;
        console.log(`掩码替换: ${match} -> ${maskId}, 已添加到映射表`);
        return maskId;
      }
    }
  ];
  
  let processedText = text;
  
  // 应用所有模式
  patterns.forEach(pattern => {
    processedText = processedText.replace(pattern.regex, pattern.mask);
  });
  
  // 检查是否有敏感信息被掩码
  const hasMaskedInfo = Object.keys(sensitiveInfoMap).length > 0;
  console.log(`敏感信息掩码处理完成，${hasMaskedInfo ? '检测到敏感信息' : '未检测到敏感信息'}`);
  if (hasMaskedInfo) {
    console.log(`敏感信息映射条目数: ${Object.keys(sensitiveInfoMap).length}`);
    console.log('敏感信息映射详细内容:');
    Object.entries(sensitiveInfoMap).forEach(([key, value], index) => {
      console.log(`  ${index+1}. ${key} => ${value}`);
    });
    
    // 检查处理后的文本中是否包含掩码标识符
    const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
    const maskIdsInText = [];
    possibleMaskPatterns.forEach(pattern => {
      const matches = processedText.match(new RegExp(pattern, 'g'));
      if (matches) {
        maskIdsInText.push(...matches);
      }
    });
    
    if (maskIdsInText.length > 0) {
      console.log('处理后文本中的掩码标识符:', maskIdsInText);
      
      // 检查这些标识符是否都在映射表中
      const missingMaskIds = maskIdsInText.filter(id => !sensitiveInfoMap[id]);
      if (missingMaskIds.length > 0) {
        console.warn('警告：以下掩码标识符在映射表中不存在:', missingMaskIds);
        console.warn('当前映射表中的键:', Object.keys(sensitiveInfoMap));
      } else {
        console.log('所有掩码标识符在映射表中都存在');
      }
    }
    
    console.log('处理后文本示例:', processedText.substring(0, 100));
    
    // 将更新后的映射表保存到localStorage
    if (sessionHash) {
      try {
        localStorage.setItem('globalSensitiveInfoMap', JSON.stringify(window.currentSensitiveInfoMap));
        console.log('已将更新后的全局映射表保存到localStorage');
      } catch (error) {
        console.error('保存全局映射表到localStorage时出错:', error);
      }
    }
  }
  
  return processedText;
};

/**
 * 将掩码后的敏感信息恢复为原始信息
 * @param {string} text - 包含掩码后敏感信息的文本
 * @param {Object} sensitiveInfoMap - 敏感信息映射表
 * @param {boolean} [useLooseMatching=false] - 是否使用宽松匹配（不要求单词边界）
 * @returns {string} - 恢复原始敏感信息后的文本
 */
export function unmaskSensitiveInfo(text, sensitiveInfoMap, useLooseMatching = false) {
  if (!text) return text;
  
  // 确保全局映射表存在
  ensureGlobalMapExists();
  
  // 如果没有提供映射表，尝试使用全局映射表
  if (!sensitiveInfoMap || Object.keys(sensitiveInfoMap).length === 0) {
    console.log('未提供映射表或映射表为空，尝试使用全局映射表');
    
    // 检查文本中是否包含掩码标识符
    const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
    const maskIdsInText = [];
    possibleMaskPatterns.forEach(pattern => {
      const matches = text.match(new RegExp(pattern, 'g'));
      if (matches) {
        maskIdsInText.push(...matches);
      }
    });
    
    if (maskIdsInText.length > 0) {
      console.log('文本中检测到的掩码标识符:', maskIdsInText);
      
      // 创建一个合并的映射表，包含所有文档的映射
      const mergedMap = {};
      
      // 获取所有文档的映射表
      const allMaps = getAllDocumentMaps();
      
      // 遍历所有文档的映射表，查找掩码标识符
      let foundMappings = false;
      Object.entries(allMaps).forEach(([docHash, docMap]) => {
        if (typeof docMap === 'object') {
          maskIdsInText.forEach(id => {
            if (docMap[id] && !mergedMap[id]) {
              mergedMap[id] = docMap[id];
              console.log(`从文档 ${docHash} 的映射表添加: ${id} => ${docMap[id]}`);
              foundMappings = true;
            }
          });
        }
      });
      
      if (foundMappings) {
        console.log('使用合并后的全局映射表进行反映射，映射条目数:', Object.keys(mergedMap).length);
        sensitiveInfoMap = mergedMap;
      } else {
        console.warn('在所有文档的映射表中都没有找到匹配的掩码标识符');
        return text;
      }
    } else {
      console.log('文本中没有检测到掩码标识符，无需反映射');
      return text;
    }
  }
  
  console.log('开始反映射敏感信息');
  console.log('映射表条目数:', Object.keys(sensitiveInfoMap).length);
  console.log('映射表详细内容:');
  Object.entries(sensitiveInfoMap).forEach(([key, value], index) => {
    console.log(`  ${index+1}. ${key} => ${value}`);
  });

  // 检查文本中是否包含掩码标识符
  const possibleMaskPatterns = [/\[\[PHONE_\d+\]\]/, /\[\[EMAIL_\d+\]\]/, /\[\[ID_\d+\]\]/, /\[\[CARD_\d+\]\]/, /\[\[ADDR_\d+\]\]/, /\[\[NAME_\d+\]\]/];
  const maskIdsInText = [];
  possibleMaskPatterns.forEach(pattern => {
    const matches = text.match(new RegExp(pattern, 'g'));
    if (matches) {
      maskIdsInText.push(...matches);
    }
  });
  
  if (maskIdsInText.length > 0) {
    console.log('文本中检测到的掩码标识符:', maskIdsInText);
    
    // 检查这些标识符是否在映射表中
    const missingMaskIds = maskIdsInText.filter(id => !sensitiveInfoMap[id]);
    if (missingMaskIds.length > 0) {
      console.warn('警告：以下掩码标识符在映射表中不存在:', missingMaskIds);
      console.warn('当前映射表中的键:', Object.keys(sensitiveInfoMap));
      
      // 尝试从所有文档的映射表中查找缺失的标识符
      console.log('尝试从所有文档的映射表中查找缺失的标识符');
      const allMaps = getAllDocumentMaps();
      let foundMissingMappings = false;
      
      // 创建一个新的映射表，包含原始映射表和从全局映射表中找到的缺失映射
      const enhancedMap = {...sensitiveInfoMap};
      
      // 遍历所有文档的映射表，查找缺失的掩码标识符
      Object.entries(allMaps).forEach(([docHash, docMap]) => {
        if (typeof docMap === 'object') {
          missingMaskIds.forEach(id => {
            if (docMap[id] && !enhancedMap[id]) {
              enhancedMap[id] = docMap[id];
              console.log(`从文档 ${docHash} 的映射表添加缺失的映射: ${id} => ${docMap[id]}`);
              foundMissingMappings = true;
            }
          });
        }
      });
      
      if (foundMissingMappings) {
        console.log('使用增强后的映射表进行反映射');
        sensitiveInfoMap = enhancedMap;
      } else {
        console.warn('在所有文档的映射表中都没有找到缺失的掩码标识符');
      }
    }
  } else {
    console.log('文本中没有检测到掩码标识符，无需反映射');
    return text;
  }

  // 按键长度排序，确保先替换较长的键
  const sortedKeys = Object.keys(sensitiveInfoMap).sort((a, b) => b.length - a.length);
  
  let result = text;
  let replacementCount = 0;
  
  for (const key of sortedKeys) {
    const value = sensitiveInfoMap[key];
    if (!value) continue;
    
    try {
      // 使用正则表达式进行替换，对于带有[[]]的标识符，不需要使用单词边界
      const pattern = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      
      const beforeReplacement = result;
      result = result.replace(pattern, value);
      
      // 检查是否进行了替换
      if (beforeReplacement !== result) {
        const count = (beforeReplacement.match(pattern) || []).length;
        replacementCount += count;
        console.log(`替换 "${key}" 为 "${value}" 成功，替换了 ${count} 处`);
      }
    } catch (error) {
      console.error(`替换 "${key}" 时出错:`, error);
    }
  }
  
  console.log(`反映射完成，共替换了 ${replacementCount} 处敏感信息`);
  
  // 检查是否还有未替换的掩码标识符
  const remainingMaskIds = [];
  possibleMaskPatterns.forEach(pattern => {
    const matches = result.match(new RegExp(pattern, 'g'));
    if (matches) {
      remainingMaskIds.push(...matches);
    }
  });
  
  if (remainingMaskIds.length > 0) {
    console.warn('警告：反映射后仍有未替换的掩码标识符:', remainingMaskIds);
  }
  
  return result;
}

/**
 * 处理文件中的敏感信息
 * @param {File} file 需要处理的文件
 * @returns {Promise<Object>} 处理结果，包含原始文件、处理后的文件和敏感信息映射
 */
export const processSensitiveFile = async (file) => {
  return new Promise((resolve, reject) => {
    // 确保全局映射表存在
    ensureGlobalMapExists();
    
    // 生成文件哈希值
    const fileHash = generateFileHash(file);
    console.log(`处理文件 ${file.name}，哈希值: ${fileHash}`);
    
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const content = event.target.result;
        console.log(`原始文件内容长度: ${content.length}`);
        console.log(`原始文件内容示例: ${content.substring(0, 100)}...`);
        
        // 记录处理前的全局映射表状态
        console.log('处理文件前的全局映射表状态:');
        console.log('全局映射表条目数:', Object.keys(window.currentSensitiveInfoMap).length);
        
        // 清除之前的敏感信息映射（只清除该文件的映射）
        clearSensitiveInfoMap(fileHash);
        
        // 掩码处理文件内容
        console.log('开始掩码处理文件内容...');
        
        // 临时存储掩码处理过程中生成的映射
        const tempMap = {};
        window.currentTempMap = tempMap;
        
        // 掩码处理函数（修改为使用临时映射表）
        const maskSensitiveInfoForFile = (text) => {
          if (!text) return text;
          
          console.log('开始处理文本，长度:', text.length);
          console.log('文本示例:', text.substring(0, 100));
          
          // 敏感信息模式列表
          const patterns = [
            // 手机号码 - 修改正则表达式，匹配所有11位数字
            {
              regex: /\b1\d{10}\b/g,
              mask: (match) => {
                console.log(`检测到手机号码: ${match}`);
                const maskId = `[[PHONE_${Object.keys(tempMap).length}]]`;
                tempMap[maskId] = match;
                console.log(`掩码替换: ${match} -> ${maskId}, 已添加到临时映射表`);
                return maskId;
              }
            },
            // 带前缀的手机号码 - 同样修改正则表达式
            {
              regex: /(?:电话|联系电话|手机|联系方式|联系|电话号码|手机号码|手机号|电话号|联系电话|联系号码|联系人电话|电话|Tel|Telephone|Phone|Mobile|Contact|联系人|联系人号码)[:：]?\s*1\d{10}/g,
              mask: (match) => {
                console.log(`检测到带前缀的手机号码: ${match}`);
                // 提取手机号码
                const phoneNumber = match.match(/1\d{10}/)[0];
                const maskId = `[[PHONE_${Object.keys(tempMap).length}]]`;
                tempMap[maskId] = phoneNumber;
                // 保留前缀，替换手机号
                const masked = match.replace(phoneNumber, maskId);
                console.log(`掩码替换: ${match} -> ${masked}, 已添加到临时映射表`);
                return masked;
              }
            },
            // 邮箱
            {
              regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
              mask: (match) => {
                console.log(`检测到邮箱: ${match}`);
                const maskId = `[[EMAIL_${Object.keys(tempMap).length}]]`;
                tempMap[maskId] = match;
                console.log(`掩码替换: ${match} -> ${maskId}, 已添加到临时映射表`);
                return maskId;
              }
            },
            // 身份证号
            {
              regex: /\b[1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}(?:\d|X|x)\b/g,
              mask: (match) => {
                console.log(`检测到身份证号: ${match}`);
                const maskId = `[[ID_${Object.keys(tempMap).length}]]`;
                tempMap[maskId] = match;
                console.log(`掩码替换: ${match} -> ${maskId}, 已添加到临时映射表`);
                return maskId;
              }
            },
            // 银行卡号
            {
              regex: /\b\d{16,19}\b/g,
              mask: (match) => {
                // 只处理可能是银行卡的数字
                if (match.length >= 16 && match.length <= 19) {
                  console.log(`检测到银行卡号: ${match}`);
                  const maskId = `[[CARD_${Object.keys(tempMap).length}]]`;
                  tempMap[maskId] = match;
                  console.log(`掩码替换: ${match} -> ${maskId}, 已添加到临时映射表`);
                  return maskId;
                }
                return match;
              }
            },
            // 地址信息
            {
              regex: /(?:北京|上海|天津|重庆|河北|山西|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|海南|四川|贵州|云南|陕西|甘肃|青海|台湾|内蒙古|广西|西藏|宁夏|新疆|香港|澳门)(?:省|市|自治区|特别行政区)?[\u4e00-\u9fa5]{2,}(?:街道|镇|乡|村|路|街|巷|号楼|单元|室)/g,
              mask: (match) => {
                console.log(`检测到地址信息: ${match}`);
                const maskId = `[[ADDR_${Object.keys(tempMap).length}]]`;
                tempMap[maskId] = match;
                console.log(`掩码替换: ${match} -> ${maskId}, 已添加到临时映射表`);
                return maskId;
              }
            },
            // 姓名（中文姓名，2-4个汉字）
            {
              regex: /(?:姓名[：:]\s*([a-zA-Z]+))|[\u4e00-\u9fa5]{2,4}(?:先生|女士|小姐|老师|教授|医生|同学|经理|总监|主任)/g,
              mask: (match) => {
                console.log(`检测到姓名: ${match}`);
                const maskId = `[[NAME_${Object.keys(tempMap).length}]]`;
                tempMap[maskId] = match;
                console.log(`掩码替换: ${match} -> ${maskId}, 已添加到临时映射表`);
                return maskId;
              }
            }
          ];
          
          let processedText = text;
          
          // 应用所有模式
          patterns.forEach(pattern => {
            processedText = processedText.replace(pattern.regex, pattern.mask);
          });
          
          // 检查是否有敏感信息被掩码
          const hasMaskedInfo = Object.keys(tempMap).length > 0;
          console.log(`敏感信息掩码处理完成，${hasMaskedInfo ? '检测到敏感信息' : '未检测到敏感信息'}`);
          if (hasMaskedInfo) {
            console.log(`敏感信息映射条目数: ${Object.keys(tempMap).length}`);
            console.log('敏感信息映射详细内容:');
            Object.entries(tempMap).forEach(([key, value], index) => {
              console.log(`  ${index+1}. ${key} => ${value}`);
            });
          }
          
          return processedText;
        };
        
        const processedContent = maskSensitiveInfoForFile(content);
        console.log(`掩码处理后文件内容长度: ${processedContent.length}`);
        console.log(`掩码处理后文件内容示例: ${processedContent.substring(0, 100)}...`);
        
        // 获取敏感信息映射
        const sensitiveMap = {...tempMap};
        console.log(`敏感信息映射条目数: ${Object.keys(sensitiveMap).length}`);
        if (Object.keys(sensitiveMap).length > 0) {
          console.log(`敏感信息映射示例: `, Object.entries(sensitiveMap).slice(0, 3));
          
          // 将敏感信息映射保存到全局映射表（使用文件哈希作为键）
          updateGlobalSensitiveInfoMap(sensitiveMap, fileHash);
        } else {
          console.log('没有检测到敏感信息');
        }
        
        // 清除临时映射表
        delete window.currentTempMap;
        
        // 创建新的文件名，添加_masked后缀
        const fileNameParts = file.name.split('.');
        const extension = fileNameParts.pop();
        const baseName = fileNameParts.join('.');
        const maskedFileName = `${baseName}_masked.${extension}`;
        console.log(`原始文件名: ${file.name}, 掩码处理后文件名: ${maskedFileName}`);
        
        // 创建新的文件对象 - 使用Blob确保内容被正确处理
        const blob = new Blob([processedContent], { type: file.type });
        const processedFile = new File(
          [blob], 
          maskedFileName, 
          { type: file.type }
        );
        
        console.log(`处理完成，新文件大小: ${processedFile.size} 字节`);
        
        // 创建原始文件的副本，以便在编辑器中显示
        const originalBlob = new Blob([content], { type: file.type });
        const originalFileCopy = new File(
          [originalBlob],
          file.name,
          { type: file.type }
        );
        
        console.log('返回处理结果，包含原始文件副本、处理后的文件和敏感信息映射');
        
        resolve({
          originalFile: originalFileCopy,
          processedFile: processedFile,
          sensitiveMap: sensitiveMap,
          fileHash: fileHash  // 添加文件哈希值到返回结果
        });
      } catch (error) {
        console.error('处理文件敏感信息时出错:', error);
        reject(error);
      }
    };
    
    reader.onerror = (error) => {
      console.error('读取文件时出错:', error);
      reject(error);
    };
    
    // 读取文件内容
    if (file.type.includes('text') || file.type.includes('json') || 
        file.type.includes('csv') || file.name.endsWith('.txt') || 
        file.name.endsWith('.json') || file.name.endsWith('.csv') ||
        file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      console.log(`开始读取文件 ${file.name}...`);
      
      // 对于PDF文件，我们不进行内容处理，直接返回原始文件
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        console.log('检测到PDF文件，不进行内容处理，直接返回原始文件');
        resolve({
          originalFile: file,
          processedFile: file,
          sensitiveMap: {},
          fileHash: fileHash
        });
        return;
      }
      
      reader.readAsText(file);
    } else {
      // 对于非文本文件，不再直接返回原始文件，而是抛出错误
      reject(new Error(`不支持处理 ${file.type || '未知'} 类型的文件。只能处理文本类型的文件和PDF文件。`));
    }
  });
}; 