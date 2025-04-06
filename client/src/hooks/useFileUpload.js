import { useState } from 'react';
import { processSensitiveFile } from '../utils/SensitiveInfoMasker';
import { serverURL } from '../Config';

/**
 * 文件上传相关的Hook
 * @returns {Object} 文件上传相关的状态和函数
 */
function useFileUpload() {
  // 上传状态
  const [uploadStatus, setUploadStatus] = useState('idle'); // 'idle', 'uploading', 'success', 'error'

  /**
   * 处理文件上传
   * @param {FileList} files 文件列表
   * @param {Object} embeddingConfig 嵌入模型配置
   * @param {Function} setActiveDocuments 设置活动文档的函数
   * @param {boolean} sensitiveInfoProtectionEnabled 是否启用敏感信息保护
   * @returns {Promise<Array|null>} 处理结果
   */
  const handleFileUpload = async (files, embeddingConfig, setActiveDocuments, sensitiveInfoProtectionEnabled) => {
    if (!files || files.length === 0) {
      console.error('没有选择文件');
      return null;
    }

    // 检查文件类型，如果启用了敏感信息保护，只允许上传文本文件和PDF文件
    if (sensitiveInfoProtectionEnabled) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isTextFile = file.type.includes('text') || file.type.includes('json') || 
                          file.type.includes('csv') || file.name.endsWith('.txt') || 
                          file.name.endsWith('.json') || file.name.endsWith('.csv');
        const isPdfFile = file.type === 'application/pdf' || file.name.endsWith('.pdf');
        
        if (!isTextFile && !isPdfFile) {
          alert(`敏感信息保护模式下只能上传文本文件和PDF文件。${file.name} 不是支持的文件类型。`);
          return null;
        }
      }
    }

    try {
      setUploadStatus('uploading');
      const formData = new FormData();
      
      // 用于跟踪处理后的文件
      const processedFiles = [];
      // 用于存储处理结果
      const processResults = [];
      
      // 处理每个文件
      for (let i = 0; i < files.length; i++) {
        let fileToUpload = files[i];
        let sensitiveMap = {};
        
        // 如果启用了敏感信息保护，处理文件内容
        if (sensitiveInfoProtectionEnabled) {
          try {
            console.log(`开始处理文件敏感信息: ${files[i].name}`);
            
            // 先读取原始文件内容，用于调试
            const reader = new FileReader();
            reader.readAsText(files[i]);
            await new Promise((resolve) => {
              reader.onload = (event) => {
                const content = event.target.result;
                console.log(`原始文件内容长度: ${content.length}`);
                console.log(`原始文件内容示例: ${content.substring(0, 200)}...`);
                resolve();
              };
            });
            
            // 处理文件敏感信息
            const result = await processSensitiveFile(files[i]);
            fileToUpload = result.processedFile;
            sensitiveMap = result.sensitiveMap;
            
            console.log(`文件处理完成: ${files[i].name} -> ${fileToUpload.name}`);
            console.log(`敏感信息映射条目数: ${Object.keys(sensitiveMap).length}`);
            
            // 读取处理后的文件内容，用于调试
            const processedReader = new FileReader();
            processedReader.readAsText(fileToUpload);
            await new Promise((resolve) => {
              processedReader.onload = (event) => {
                const content = event.target.result;
                console.log(`处理后文件内容长度: ${content.length}`);
                console.log(`处理后文件内容示例: ${content.substring(0, 200)}...`);
                resolve();
              };
            });
            
            // 保存处理后的文件信息
            processedFiles.push(fileToUpload);
            
            // 保存处理结果
            processResults.push({
              originalFile: files[i],
              processedFile: fileToUpload,
              sensitiveMap: sensitiveMap
            });
            
            // 保存敏感信息映射到localStorage，使用掩码处理后的文件名作为键
            if (Object.keys(sensitiveMap).length > 0) {
              const mapKey = `sensitiveMap_${fileToUpload.name}`;
              localStorage.setItem(mapKey, JSON.stringify(sensitiveMap));
              console.log(`文件 ${files[i].name} 的敏感信息已保存到 ${mapKey}`);
            }
          } catch (error) {
            console.error('处理文件敏感信息时出错:', error);
            // 不再使用原始文件，而是中止上传并提示用户
            setUploadStatus('error');
            alert(`处理文件 ${files[i].name} 的敏感信息时出错: ${error.message}`);
            return null;
          }
        } else {
          // 如果不启用敏感信息保护，直接使用原始文件
          processedFiles.push(fileToUpload);
          processResults.push({
            originalFile: files[i],
            processedFile: fileToUpload,
            sensitiveMap: {}
          });
        }
        
        // 使用正确的参数名 'documents'
        console.log(`添加文件到表单: ${fileToUpload.name}, 大小: ${fileToUpload.size} 字节`);
        formData.append('documents', fileToUpload);
      }
      
      // 添加embedding配置
      if (embeddingConfig) {
        formData.append('embedding_base_url', embeddingConfig.embedding_base_url || '');
        formData.append('embedding_api_key', embeddingConfig.embedding_api_key || '');
        formData.append('embedding_model_name', embeddingConfig.embedding_model_name || '');
      }
      
      // 添加敏感信息保护标志
      formData.append('sensitive_info_protected', sensitiveInfoProtectionEnabled ? 'true' : 'false');

      // 在上传前检查文件内容
      if (sensitiveInfoProtectionEnabled && processedFiles.length > 0) {
        console.log('准备检查处理后的文件内容...');
        
        // 检查是否为PDF文件，如果是则跳过内容检查
        const isPdfFile = processedFiles[0].type === 'application/pdf' || processedFiles[0].name.endsWith('.pdf');
        if (isPdfFile) {
          console.log('检测到PDF文件，跳过内容检查');
        } else {
          const checkFileContent = async () => {
            try {
              return new Promise((resolve, reject) => {
                const fileReader = new FileReader();
                fileReader.onload = (event) => {
                  const content = event.target.result;
                  console.log(`上传前检查文件内容: ${processedFiles[0].name}`);
                  console.log(`文件内容示例: ${content.substring(0, 200)}...`);
                  // 检查是否包含手机号码
                  const phoneRegex = /\b1\d{10}\b/;
                  const containsPhone = phoneRegex.test(content);
                  console.log(`文件是否包含未掩码的手机号码: ${containsPhone}`);
                  
                  if (containsPhone) {
                    console.error('警告：掩码处理后的文件仍包含未掩码的手机号码');
                    // 如果文件仍包含敏感信息，中止上传
                    reject(new Error('掩码处理失败：文件仍包含未掩码的敏感信息'));
                  } else {
                    resolve();
                  }
                };
                fileReader.readAsText(processedFiles[0]);
              });
            } catch (error) {
              console.error('读取文件内容时出错:', error);
              throw error;
            }
          };
          
          try {
            await checkFileContent();
          } catch (error) {
            setUploadStatus('error');
            alert(`上传前检查失败: ${error.message}`);
            return null;
          }
        }
      }

      // 使用正确的API端点路径 '/upload'
      console.log('发送上传请求到:', `${serverURL}/upload`);
      const response = await fetch(`${serverURL}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        mode: 'cors'
      });

      const result = await response.json();
      console.log('上传响应:', result);
      
      if (result.document_id) {
        setUploadStatus('success');
        
        // 创建活动文档对象
        const uploadedDocument = {
          id: result.document_id,
          name: processedFiles.length === 1 ? processedFiles[0].name : `上传的${processedFiles.length}个文件`,
          timestamp: Date.now()
        };
        
        // 更新活动文档
        setActiveDocuments(prevDocs => {
          const newDocs = [...prevDocs, uploadedDocument];
          
          // 更新localStorage中的activeDocuments
          const savedConversations = localStorage.getItem('conversations');
          if (savedConversations) {
            const conversations = JSON.parse(savedConversations);
            const updatedConversations = conversations.map(conv => {
              if (conv.active) {
                return {
                  ...conv,
                  activeDocuments: newDocs
                };
              }
              return conv;
            });
            localStorage.setItem('conversations', JSON.stringify(updatedConversations));
          }
          
          return newDocs;
        });
        
        // 根据敏感信息保护状态显示不同的成功消息
        if (sensitiveInfoProtectionEnabled) {
          const fileNames = processedFiles.map(f => f.name).join(', ');
          alert(`文件上传成功！敏感信息已被保护。\n\n文档ID: ${result.document_id}\n\n上传的文件: ${fileNames}\n\n注意：上传的是经过掩码处理的文件，原始敏感信息已在本地保存，不会发送到服务器。`);
        } else {
          const fileNames = files.map(f => f.name).join(', ');
          alert(`文件上传成功！文档ID: ${result.document_id}\n\n上传的文件: ${fileNames}\n\n注意：文件未经敏感信息处理，如有敏感内容请谨慎使用。`);
        }
        
        // 返回处理结果
        return processResults;
      } else {
        setUploadStatus('error');
        alert(`上传失败: ${result.error || '未知错误'}`);
        return null;
      }
    } catch (error) {
      console.error('上传文件时出错:', error);
      setUploadStatus('error');
      alert(`上传出错: ${error.message}`);
      return null;
    }
  };

  return {
    uploadStatus,
    setUploadStatus,
    handleFileUpload
  };
}

export default useFileUpload; 