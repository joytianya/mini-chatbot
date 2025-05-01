import { useState, useCallback } from 'react';
import { ModelConfig } from '../types';
import { storageService } from '../utils/storage';

export const useModelConfig = () => {
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const savedConfigs = storageService.getModelConfigs();
    return savedConfigs.length > 0 ? savedConfigs[0].model_name : '';
  });

  const [availableModels, setAvailableModels] = useState<string[]>(() => {
    const saved = storageService.getItem('availableModels');
    return saved ? saved : [];
  });

  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(() => {
    const saved = storageService.getModelConfigs();
    return saved ? saved : [];
  });

  const [embeddingConfig, setEmbeddingConfig] = useState<ModelConfig | null>(() => {
    const saved = storageService.getEmbeddingConfig();
    return saved;
  });

  const saveModelConfig = useCallback((config: ModelConfig) => {
    setModelConfigs(prev => [config, ...prev]);
    storageService.saveModelConfig(config);
  }, []);

  const saveEmbeddingConfig = useCallback((config: ModelConfig) => {
    setEmbeddingConfig(config);
    storageService.saveEmbeddingConfig(config);
  }, []);

  return {
    selectedModel,
    setSelectedModel,
    availableModels,
    setAvailableModels,
    modelConfigs,
    setModelConfigs,
    embeddingConfig,
    setEmbeddingConfig,
    saveModelConfig,
    saveEmbeddingConfig
  };
};

export type ModelConfigState = ReturnType<typeof useModelConfig>;
