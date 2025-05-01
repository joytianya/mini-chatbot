import React from 'react';
import { ModelConfig } from '../../types/types';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { configs: ModelConfig[], modelNames: string[] }) => void;
  modelConfigs: ModelConfig[];
  availableModels: string[];
}

declare const Settings: React.FC<SettingsProps>;

export default Settings; 