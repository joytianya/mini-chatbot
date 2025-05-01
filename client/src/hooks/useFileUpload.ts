import { useCallback } from 'react';
import { apiService } from '../services/api';

export const useFileUpload = ({
  activeDocuments,
  setActiveDocuments,
  conversations,
  setConversations,
  embeddingConfig
}: {
  activeDocuments: Document[];
  setActiveDocuments: (docs: Document[]) => void;
  conversations: Conversation[];
  setConversations: (convs: Conversation[]) => void;
  embeddingConfig: ModelConfig | null;
}) => {
  const handleFileUpload = useCallback(async (files: File[]) => {
    if (!files || files.length === 0) {
      console.log('未选择文件');
      return;
    }

    try {
      console.log('准备上传文件:', files);
      
      const response = await apiService.uploadFiles(files, embeddingConfig);
      
      if (!response.success) {
        throw new Error(response.error || '上传失败');
      }

      if (response.data.documents && response.data.documents.length > 0) {
        setActiveDocuments(prev => [...prev, ...response.data.documents]);
        
        const currentConvId = conversations.find(conv => conv.active)?.id;
        if (currentConvId) {
          setConversations(prev => 
            prev.map(conv => 
              conv.id === currentConvId
                ? { ...conv, activeDocuments: [...(conv.activeDocuments || []), ...response.data.documents] }
                : conv
            )
          );
        }
      }
      
      return response.data;
    } catch (error) {
      console.error('文件上传出错:', error);
      throw error;
    }
  }, [activeDocuments, setActiveDocuments, conversations, setConversations, embeddingConfig]);

  return handleFileUpload;
};

export type FileUploadState = ReturnType<typeof useFileUpload>;
export type FileUploadActions = FileUploadState;
