import React, { useState, useEffect, useCallback, ChangeEvent } from 'react'

// --- Type Definitions ---

interface ModelConfig {
  id: number
  name: string
  base_url: string
  api_key: string
  model_name: string
}

interface EmbeddingConfig {
  id: number
  name: string
  embedding_base_url: string
  embedding_api_key: string
  embedding_model_name: string
}

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  // darkMode prop removed
  initialSettings?: { // Make initialSettings optional and more specific
    modelConfigs?: ModelConfig[]
    embeddingConfigs?: EmbeddingConfig[]
  }
  onSave: (settings: {
    configs: ModelConfig[]
    modelNames: string[]
    embeddingConfigs: EmbeddingConfig[]
  }) => void
}

type ConfigType = 'model' | 'embedding'

// --- Utility Functions ---

// Helper to safely parse JSON from localStorage
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : defaultValue
  } catch (error) {
    console.error(`Error loading ${key} from localStorage:`, error)
    return defaultValue
  }
}

// Helper to save JSON to localStorage
function saveToLocalStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Error saving ${key} to localStorage:`, error)
  }
}

// --- Default Configurations ---

const defaultModelConfig: Omit<ModelConfig, 'id'> = {
  name: '默认配置',
  base_url: '',
  api_key: '',
  model_name: '',
}

const defaultEmbeddingConfig: Omit<EmbeddingConfig, 'id'> = {
  name: '默认Embedding配置',
  embedding_base_url: '',
  embedding_api_key: '',
  embedding_model_name: '',
}

// --- Component ---

export function Settings({ isOpen, onClose, initialSettings, onSave }: SettingsProps): JSX.Element | null {
  const [activeTab, setActiveTab] = useState<ConfigType>('model')

  const [modelConfigs, setModelConfigs] = useState<ModelConfig[]>(() =>
    loadFromLocalStorage<ModelConfig[]>('modelConfigs', initialSettings?.modelConfigs ?? [{ id: Date.now(), ...defaultModelConfig }])
  )

  const [embeddingConfigs, setEmbeddingConfigs] = useState<EmbeddingConfig[]>(() =>
    loadFromLocalStorage<EmbeddingConfig[]>('embeddingConfigs', initialSettings?.embeddingConfigs ?? [{ id: Date.now(), ...defaultEmbeddingConfig }])
  )

  // --- Event Handlers (Memoized) ---

  const handleAddConfig = useCallback((type: ConfigType) => {
    if (type === 'model') {
      setModelConfigs(prev => [...prev, { id: Date.now(), name: `配置 ${prev.length + 1}`, ...defaultModelConfig }])
    } else {
      setEmbeddingConfigs(prev => [...prev, { id: Date.now(), name: `Embedding配置 ${prev.length + 1}`, ...defaultEmbeddingConfig }])
    }
  }, [])

  const handleConfigChange = useCallback(<T extends ModelConfig | EmbeddingConfig>(
    type: ConfigType,
    id: number,
    field: keyof T,
    value: string
  ) => {
    const setState = type === 'model' ? setModelConfigs : setEmbeddingConfigs
    setState(prev => prev.map(config =>
      config.id === id ? { ...config, [field]: value } : config
    ) as any) // Using 'any' temporarily, refine if possible
  }, [])

  const handleDeleteConfig = useCallback((type: ConfigType, id: number) => {
    const setState = type === 'model' ? setModelConfigs : setEmbeddingConfigs
    setState(prev => prev.filter(config => config.id !== id))
  }, [])

  const moveConfig = useCallback((type: ConfigType, id: number, direction: 'up' | 'down') => {
    const setState = type === 'model' ? setModelConfigs : setEmbeddingConfigs;
    setState(prev => {
      const index = prev.findIndex(config => config.id === id);
      const swapIndex = direction === 'up' ? index - 1 : index + 1;

      if (index < 0 || swapIndex < 0 || swapIndex >= prev.length) {
        return prev; // Cannot move
      }

      const newConfigs = [...prev];
      [newConfigs[index], newConfigs[swapIndex]] = [newConfigs[swapIndex], newConfigs[index]]; // Swap elements
      return newConfigs;
    });
  }, [])

  const handleSave = useCallback(() => {
    saveToLocalStorage('modelConfigs', modelConfigs)
    saveToLocalStorage('embeddingConfigs', embeddingConfigs)

    const modelNames = modelConfigs
      .map(config => config.model_name)
      .filter(name => name?.trim()) // Ensure name exists and is not just whitespace

    onSave({
      configs: modelConfigs,
      modelNames: modelNames,
      embeddingConfigs: embeddingConfigs,
    })
    onClose()
  }, [modelConfigs, embeddingConfigs, onSave, onClose])

  // --- Render Logic ---

  if (!isOpen) return null

  // Tailwind classes (centralized for reuse)
  const inputClasses = "w-full px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
  const labelClasses = "block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300"
  const buttonClasses = "px-3 py-1 rounded text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
  const smallButtonClasses = "p-1 rounded border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
  const deleteButtonClasses = `${buttonClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`
  const tabButtonClasses = (isActive: boolean) => `
    px-4 py-2 text-sm font-medium rounded-md transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900
    ${isActive
      ? 'bg-indigo-600 text-white'
      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
    }
  `
  const modalOverlayClasses = "fixed inset-0 z-40 bg-black bg-opacity-50 backdrop-blur-sm"
  const modalContentClasses = "fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-xl flex flex-col overflow-hidden" // Changed position to right sidebar
  const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700"
  const modalBodyClasses = "flex-1 overflow-y-auto p-4 space-y-6"
  const modalFooterClasses = "flex justify-end p-4 border-t border-gray-200 dark:border-gray-700 space-x-3"
  const configGroupClasses = "p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 space-y-3"
  const configHeaderClasses = "flex items-center justify-between"


  // Render function for config groups
  const renderConfigFields = (type: ConfigType, configs: Array<ModelConfig | EmbeddingConfig>) => {
    return configs.map((config, index) => (
      <div key={config.id} className={configGroupClasses}>
        <div className={configHeaderClasses}>
          {/* Config Name Input */}
           <input
              type="text"
              value={config.name}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleConfigChange(type, config.id, 'name' as keyof typeof config, e.target.value)}
              placeholder="配置名称"
              className={`${inputClasses} w-auto flex-grow mr-4`} // Adjusted width
            />

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
             {/* Move Up Button */}
            <button
              onClick={() => moveConfig(type, config.id, 'up')}
              disabled={index === 0}
              className={smallButtonClasses}
              title="上移"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
            </button>
             {/* Move Down Button */}
            <button
              onClick={() => moveConfig(type, config.id, 'down')}
              disabled={index === configs.length - 1}
              className={smallButtonClasses}
              title="下移"
            >
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {/* Delete Button */}
            {configs.length > 1 && ( // Only show delete if more than one config exists
                <button
                    onClick={() => handleDeleteConfig(type, config.id)}
                    className={`${smallButtonClasses} text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 border-red-300 dark:border-red-500`}
                    title="删除"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            )}
          </div>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 gap-3">
          {type === 'model' && 'base_url' in config ? (
            <>
              <div>
                <label htmlFor={`base_url_${config.id}`} className={labelClasses}>Base URL:</label>
                <input
                  id={`base_url_${config.id}`}
                  type="text"
                  value={(config as ModelConfig).base_url}
                  onChange={(e) => handleConfigChange(type, config.id, 'base_url', e.target.value)}
                  placeholder="输入 Base URL (例如 http://localhost:1234/v1)"
                  className={inputClasses}
                />
              </div>
               <div>
                <label htmlFor={`api_key_${config.id}`} className={labelClasses}>API Key:</label>
                <input
                  id={`api_key_${config.id}`}
                  type="password" // Use password type for keys
                  value={(config as ModelConfig).api_key}
                  onChange={(e) => handleConfigChange(type, config.id, 'api_key', e.target.value)}
                  placeholder="输入 API Key (可选)"
                  className={inputClasses}
                />
              </div>
              <div>
                <label htmlFor={`model_name_${config.id}`} className={labelClasses}>模型名称:</label>
                <input
                   id={`model_name_${config.id}`}
                  type="text"
                  value={(config as ModelConfig).model_name}
                  onChange={(e) => handleConfigChange(type, config.id, 'model_name', e.target.value)}
                  placeholder="输入模型名称 (例如 gpt-4)"
                  className={inputClasses}
                />
              </div>
            </>
          ) : type === 'embedding' && 'embedding_base_url' in config ? (
             <>
              <div>
                <label htmlFor={`emb_base_url_${config.id}`} className={labelClasses}>Embedding Base URL:</label>
                <input
                   id={`emb_base_url_${config.id}`}
                  type="text"
                  value={(config as EmbeddingConfig).embedding_base_url}
                  onChange={(e) => handleConfigChange(type, config.id, 'embedding_base_url', e.target.value)}
                  placeholder="输入 Embedding Base URL"
                  className={inputClasses}
                />
              </div>
               <div>
                <label htmlFor={`emb_api_key_${config.id}`} className={labelClasses}>Embedding API Key:</label>
                <input
                   id={`emb_api_key_${config.id}`}
                  type="password"
                  value={(config as EmbeddingConfig).embedding_api_key}
                  onChange={(e) => handleConfigChange(type, config.id, 'embedding_api_key', e.target.value)}
                  placeholder="输入 Embedding API Key (可选)"
                  className={inputClasses}
                />
              </div>
              <div>
                 <label htmlFor={`emb_model_name_${config.id}`} className={labelClasses}>Embedding 模型名称:</label>
                <input
                   id={`emb_model_name_${config.id}`}
                  type="text"
                  value={(config as EmbeddingConfig).embedding_model_name}
                  onChange={(e) => handleConfigChange(type, config.id, 'embedding_model_name', e.target.value)}
                  placeholder="输入 Embedding 模型名称"
                  className={inputClasses}
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    ))
  }

  return (
    <>
       {/* Overlay */}
      <div className={modalOverlayClasses} onClick={onClose} aria-hidden="true"></div>

      {/* Modal Content */}
      <div className={modalContentClasses} role="dialog" aria-modal="true" aria-labelledby="settings-title">
         {/* Header */}
        <div className={modalHeaderClasses}>
          <h2 id="settings-title" className="text-lg font-semibold text-gray-900 dark:text-white">
            设置
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="关闭设置"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {/* Body */}
        <div className={modalBodyClasses}>
          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav className="-mb-px flex space-x-4" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('model')}
                className={tabButtonClasses(activeTab === 'model')}
                aria-current={activeTab === 'model' ? 'page' : undefined}
              >
                模型配置
              </button>
              <button
                onClick={() => setActiveTab('embedding')}
                 className={tabButtonClasses(activeTab === 'embedding')}
                 aria-current={activeTab === 'embedding' ? 'page' : undefined}
              >
                Embedding 配置
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'model' && (
              <div className="space-y-4">
                {renderConfigFields('model', modelConfigs)}
                <button onClick={() => handleAddConfig('model')} className={`${buttonClasses} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500 w-full`}>
                  + 添加模型配置
                </button>
              </div>
            )}
            {activeTab === 'embedding' && (
              <div className="space-y-4">
                {renderConfigFields('embedding', embeddingConfigs)}
                 <button onClick={() => handleAddConfig('embedding')} className={`${buttonClasses} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500 w-full`}>
                  + 添加 Embedding 配置
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={modalFooterClasses}>
          <button onClick={onClose} className={`${buttonClasses} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500`}>
            取消
          </button>
          <button onClick={handleSave} className={`${buttonClasses} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`}>
            保存设置
          </button>
        </div>
      </div>
    </>
  )
}

// Note: ModelConfigSelector seems to be defined later in the original file.
// It should be converted separately or integrated/removed if not used.
// For now, focusing on the main Settings component.