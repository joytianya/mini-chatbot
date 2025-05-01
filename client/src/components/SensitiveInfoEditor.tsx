import React, { useState, useEffect, useRef, useCallback, ChangeEvent, FocusEvent, MouseEvent } from 'react';
import { maskSensitiveInfo, unmaskSensitiveInfo, getSensitiveInfoMap, clearSensitiveInfoMap } from '../utils/SensitiveInfoMasker';
import { toast } from 'react-toastify';
import { serverURL } from '../Config';

// --- Type Definitions ---

// Define the structure of the sensitive map if possible
// Example: Record<string, string> means an object with string keys and string values
type SensitiveMap = Record<string, string>;

// Define the structure for file content (could be File object or string)
type FileInput = File | string | { content: string } | null;

interface SensitiveInfoEditorProps {
  originalFile?: FileInput;
  processedFile?: FileInput;
  sensitiveMap?: SensitiveMap;
  // darkMode removed
  onSave?: (editedText: string, newMap: SensitiveMap) => Promise<void> | void; // Allow async save
  onClose?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

// --- Helper Functions --- (Assuming readFileContent exists or is defined elsewhere)
// Keeping the original readFileContent function here for now, converted to TS
async function readFileContent(file: FileInput): Promise<string | null> {
  if (!file) {
    return null;
  }
  if (typeof file === 'string') {
    return file;
  }
  if (typeof file === 'object' && 'content' in file && typeof file.content === 'string') {
    return file.content;
  }
  if (file instanceof File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('读取文件失败'));
      reader.readAsText(file);
    });
  }
  console.warn('readFileContent received unknown file type:', file);
  return null;
}

// --- Component ---

export function SensitiveInfoEditor({
  originalFile = null,
  processedFile = null,
  sensitiveMap = {},
  onSave = null,
  onClose = () => {},
  onFocus = () => {},
  onBlur = () => {},
}: SensitiveInfoEditorProps): JSX.Element {

  const [originalText, setOriginalText] = useState<string>('');
  const [maskedText, setMaskedText] = useState<string>(''); // The text currently displayed (potentially edited)
  const [initialMaskedText, setInitialMaskedText] = useState<string>(''); // Stores the initial masked text for reset
  const [currentSensitiveMap, setCurrentSensitiveMap] = useState<SensitiveMap>(sensitiveMap);
  const [showMap, setShowMap] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  // userEdits seems unused, removed for now
  // const [userEdits, setUserEdits] = useState({});
  // editedText is redundant with maskedText state, removed
  // const [editedText, setEditedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false); // Tracks if the textarea has focus/user is actively editing
  const [error, setError] = useState<string | null>(null);
  const [showUnmasked, setShowUnmasked] = useState<boolean>(false);
  const [unmaskedText, setUnmaskedText] = useState<string>('');

  const hasInitialized = useRef<boolean>(false);
  const editorContainerRef = useRef<HTMLDivElement>(null); // Ref for the main editor container
  const textAreaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  // Store callbacks in ref to prevent re-renders if parent passes new functions
  const callbacksRef = useRef({ onFocus, onBlur, onClose, onSave });
  useEffect(() => {
    callbacksRef.current = { onFocus, onBlur, onClose, onSave };
  }, [onFocus, onBlur, onClose, onSave]);

  // Initialization Effect
  useEffect(() => {
    if (hasInitialized.current) return;

    const initializeEditor = async () => {
      console.log('Initializing SensitiveInfoEditor...');
      setIsLoading(true);
      setError(null); // Reset error on init

      try {
        let loadedOriginalText: string | null = null;
        let loadedProcessedText: string | null = null;
        let loadedMap: SensitiveMap = { ...sensitiveMap }; // Start with passed map

        // 1. Load Original Text
        if (originalFile) {
          loadedOriginalText = await readFileContent(originalFile);
          if (loadedOriginalText !== null) {
            setOriginalText(loadedOriginalText);
            console.log('Original text loaded:', loadedOriginalText.substring(0, 100));
          } else {
            console.warn('Failed to load original file content.');
            setOriginalText('无法加载原始文件内容');
            setError('无法加载原始文件内容');
          }
        } else {
          setOriginalText('未提供原始文件');
          console.log('No original file provided.');
        }

        // 2. Load Processed (Masked) Text or Generate it
        if (processedFile) {
          loadedProcessedText = await readFileContent(processedFile);
          if (loadedProcessedText !== null) {
            setMaskedText(loadedProcessedText);
            setInitialMaskedText(loadedProcessedText); // Store initial state
            console.log('Processed text loaded:', loadedProcessedText.substring(0, 100));
          } else {
            console.warn('Failed to load processed file content.');
            setMaskedText('无法加载已处理文件内容');
            setInitialMaskedText('无法加载已处理文件内容');
            if (!error) setError('无法加载已处理文件内容');
          }
        } else if (loadedOriginalText) {
          // Generate mask if no processed file but original exists
          console.log('No processed file, generating mask...');
          clearSensitiveInfoMap(); // Clear any previous global map state
          const generatedMask = maskSensitiveInfo(loadedOriginalText);
          const generatedMap = getSensitiveInfoMap();
          setMaskedText(generatedMask);
          setInitialMaskedText(generatedMask); // Store initial state
          loadedMap = { ...loadedMap, ...generatedMap }; // Merge maps
          console.log('Mask generated, map size:', Object.keys(generatedMap).length);
        } else {
          setMaskedText('未提供已处理文件或原始文件');
          setInitialMaskedText('未提供已处理文件或原始文件');
          console.log('No processed or original file to determine masked text.');
          if (!error) setError('未提供已处理文件或原始文件');
        }

        // 3. Set the final sensitive map
        setCurrentSensitiveMap(loadedMap);
        console.log('Final sensitive map set, size:', Object.keys(loadedMap).length);

      } catch (err: any) {
        console.error('Error initializing editor:', err);
        setError(`初始化失败: ${err.message}`);
        setOriginalText('初始化错误');
        setMaskedText('初始化错误');
        setInitialMaskedText('初始化错误');
      } finally {
        setIsLoading(false);
        hasInitialized.current = true;
        console.log('Initialization complete.');
        callbacksRef.current.onFocus(); // Notify parent focus on init
      }
    };

    initializeEditor();

    // Cleanup: Notify parent on blur when component unmounts
    return () => {
      callbacksRef.current.onBlur();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // --- Event Handlers ---

  const handleTextareaFocus = useCallback((e: FocusEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    if (!isEditing) {
      setIsEditing(true);
      callbacksRef.current.onFocus();
      console.log('Textarea focused');
    }
  }, [isEditing, callbacksRef]);

  // Blur handling needs care to not close prematurely when clicking buttons inside
  const handleTextareaBlur = useCallback((e: FocusEvent<HTMLTextAreaElement>) => {
    e.stopPropagation();
    // Use setTimeout to check relatedTarget after the focus has truly shifted
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (!editorContainerRef.current?.contains(activeElement)) {
        setIsEditing(false);
        callbacksRef.current.onBlur();
        console.log('Textarea blurred, focus left editor');
      } else {
        console.log('Textarea blurred, focus still inside editor');
      }
    }, 0);
  }, [callbacksRef]);

  const handleTextUpdate = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setMaskedText(e.target.value);
  }, []);

  // Re-mask the original text
  const handleRemask = useCallback(() => {
    if (!originalText || originalText.startsWith('无法') || originalText.startsWith('未提供')) {
      toast.error("没有有效的原始文本可供重新掩码");
      return;
    }
    console.log('Remasking original text...');
    clearSensitiveInfoMap(); // Clear previous global map state
    const newMasked = maskSensitiveInfo(originalText);
    const newMap = getSensitiveInfoMap();
    setMaskedText(newMasked);
    setInitialMaskedText(newMasked); // Update initial state as well after remask
    setCurrentSensitiveMap(newMap);
    setShowUnmasked(false); // Hide unmasked view after remasking
    toast.success("文本已重新进行敏感信息掩码");
    console.log('Remask complete, new map size:', Object.keys(newMap).length);
  }, [originalText]);

  // Restore the initially loaded/generated masked text
  const handleRestore = useCallback(() => {
    console.log('Restoring initial masked text...');
    if (initialMaskedText !== maskedText) {
      setMaskedText(initialMaskedText);
      // Optionally reset the map if remask could have changed it,
      // but typically restore should just revert text edits.
      // If map comes from `processedFile`, it should be static.
      // If map was generated, `handleRemask` sets the correct map.
      toast.info("已恢复到上次保存或初始状态");
    } else {
      toast.info("当前内容已经是初始状态");
    }
    setShowUnmasked(false); // Hide unmasked view after restoring
  }, [initialMaskedText, maskedText]);

  const handleSaveClick = useCallback(async () => {
    if (typeof callbacksRef.current.onSave !== 'function') {
      toast.warn("未提供保存处理程序");
      console.warn('onSave prop is not a function.');
      return;
    }
    if (!maskedText) {
      toast.error("没有可保存的内容");
      return;
    }

    setIsSaving(true);
    setError(null);
    console.log('Saving sensitive info...');

    try {
      // Here, we assume the `maskSensitiveInfo` function (or similar logic)
      // might have been implicitly run by editing, or `handleRemask` was used.
      // We pass the *current* masked text and the *current* map.
      // The parent component is responsible for storing/using this data.
      // If the parent needs the *original* text re-masked with the *current* map,
      // that logic would need to be different or handled by the parent.
      await callbacksRef.current.onSave(maskedText, currentSensitiveMap);
      toast.success("保存成功！");
      callbacksRef.current.onClose(); // Close after successful save
    } catch (err: any) {
      console.error('Error saving sensitive info:', err);
      setError(`保存失败: ${err.message}`);
      toast.error(`保存失败: ${err.message}`);
    } finally {
      setIsSaving(false);
      console.log('Save attempt finished.');
    }
  }, [maskedText, currentSensitiveMap, callbacksRef]);

  const handleToggleMap = useCallback(() => {
    setShowMap(prev => !prev);
  }, []);

  const handleToggleUnmasked = useCallback(() => {
    if (!showUnmasked) {
      if (!maskedText || Object.keys(currentSensitiveMap).length === 0) {
        toast.warn("没有可供反映射的内容或映射表为空");
        return;
      }
      console.log('Unmasking text...');
      try {
        const unmasked = unmaskSensitiveInfo(maskedText, currentSensitiveMap);
        setUnmaskedText(unmasked);
        console.log('Unmasking successful.');
      } catch (err: any) {
        console.error("Error during unmasking:", err);
        toast.error(`反映射时出错: ${err.message}`);
        setUnmaskedText("反映射时出错");
      }
    }
    setShowUnmasked(prev => !prev);
  }, [showUnmasked, maskedText, currentSensitiveMap]);

  // --- Render Logic ---

  // Tailwind classes
  const containerClasses = "flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden";
  const headerClasses = "flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700";
  const titleClasses = "text-lg font-semibold";
  const buttonClasses = "px-3 py-1 rounded text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";
  const primaryButtonClasses = `${buttonClasses} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`;
  const secondaryButtonClasses = `${buttonClasses} bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500`;
  const dangerButtonClasses = `${buttonClasses} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`;
  const editorAreaClasses = "flex-1 p-3 overflow-auto"; // Changed from grid to flex
  const textareaClasses = "w-full h-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-sm leading-relaxed";
  const mapContainerClasses = `p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 overflow-auto max-h-60`; // Max height for map
  const mapEntryClasses = "text-xs font-mono mb-1";
  const footerClasses = "p-3 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3";

  if (isLoading) {
    return (
      <div className={`${containerClasses} items-center justify-center`}>
        <p>正在加载编辑器...</p>
        {/* Add a spinner maybe */}
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${containerClasses} items-center justify-center p-4`}>
        <p className="text-red-600 dark:text-red-400 font-semibold">错误:</p>
        <p className="text-red-500 dark:text-red-400 text-sm mt-2">{error}</p>
        <button onClick={callbacksRef.current.onClose} className={`${secondaryButtonClasses} mt-4`}>关闭</button>
      </div>
    );
  }

  return (
    <div ref={editorContainerRef} id="sensitive-info-editor" className={containerClasses}>
      {/* Header */}
      <div className={headerClasses}>
        <h3 className={titleClasses}>敏感信息编辑</h3>
        <div className="flex items-center space-x-2">
          <button onClick={handleToggleMap} className={secondaryButtonClasses}>
            {showMap ? '隐藏' : '显示'}映射表 ({Object.keys(currentSensitiveMap).length})
          </button>
          <button onClick={handleToggleUnmasked} className={secondaryButtonClasses} disabled={!maskedText || maskedText.startsWith('无法') || maskedText.startsWith('未')}>
            {showUnmasked ? '显示掩码文本' : '显示反映射文本'}
          </button>
          <button onClick={handleRemask} className={secondaryButtonClasses} disabled={!originalText || originalText.startsWith('无法') || originalText.startsWith('未')}>
            重新掩码
          </button>
          <button onClick={handleRestore} className={secondaryButtonClasses} disabled={maskedText === initialMaskedText}>
            恢复初始
          </button>
        </div>
      </div>

      {/* Editor Area */}
      <div className={editorAreaClasses}>
        <textarea
          ref={textAreaRef}
          className={textareaClasses}
          value={showUnmasked ? unmaskedText : maskedText}
          onChange={handleTextUpdate}
          onFocus={handleTextareaFocus}
          onBlur={handleTextareaBlur}
          // Disable editing when showing unmasked version
          readOnly={showUnmasked}
          placeholder={showUnmasked ? "反映射文本 (只读)" : "编辑掩码后的文本..."}
        />
      </div>

      {/* Sensitive Info Map (Conditional) */}
      {showMap && (
        <div className={mapContainerClasses}>
          <h4 className="text-sm font-semibold mb-2">敏感信息映射表:</h4>
          {Object.entries(currentSensitiveMap).map(([key, value]) => (
            <p key={key} className={mapEntryClasses}>
              <span className="text-blue-600 dark:text-blue-400">{key}</span>
              <span className="mx-2">=&gt;</span>
              <span className="text-green-600 dark:text-green-400">{value}</span>
            </p>
          ))}
          {Object.keys(currentSensitiveMap).length === 0 && (
            <p className="text-xs text-gray-500 italic">映射表为空。</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className={footerClasses}>
        <button onClick={callbacksRef.current.onClose} className={secondaryButtonClasses}>
          关闭
        </button>
        {onSave && ( // Only show save button if onSave prop is provided
          <button
            onClick={handleSaveClick}
            className={primaryButtonClasses}
            disabled={isSaving || maskedText === initialMaskedText} // Disable if saving or no changes
          >
            {isSaving ? '正在保存...' : '保存并关闭'}
          </button>
        )}
      </div>
    </div>
  );
}