import React from 'react'
// Assuming the hook is placed in the hooks directory
import { useDocumentUpload } from '../hooks/useDocumentUpload'

// Re-use or import the UploadResponse interface if needed here,
// otherwise it's encapsulated in the hook's usage.
interface UploadResponse {
  fileUrl: string
  fileName: string
}

interface DocumentUploaderProps {
  onUploadSuccess?: (data: UploadResponse) => void
  onError?: (error: Error) => void // Add onError prop
  // Add accepted file types prop for flexibility
  accept?: string
}

export function DocumentUploader({
  onUploadSuccess,
  onError,
  accept = ".txt,.pdf,.doc,.docx", // Default accepted types
}: DocumentUploaderProps): JSX.Element {
  // Use the custom hook
  const {
    isDragging,
    uploading,
    fileInputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    handleClick,
  } = useDocumentUpload({ onUploadSuccess, onError })

  // Tailwind classes remain mostly the same, derived from hook state
  const containerClasses = `
    flex flex-col items-center justify-center
    p-5 rounded-lg border-2 border-dashed cursor-pointer transition-all duration-300 ease-in-out
    ${isDragging
      ? 'border-blue-500 bg-blue-500/10 dark:border-blue-400 dark:bg-blue-400/10'
      : 'border-gray-300 bg-gray-50 hover:border-gray-400 dark:border-gray-600 dark:bg-gray-800 dark:hover:border-gray-500'
    }
    ${uploading ? 'opacity-75 cursor-not-allowed' : ''} // Add styles for uploading state
  `

  const iconColor = isDragging
    ? 'text-blue-500 dark:text-blue-400'
    : 'text-gray-400 dark:text-gray-500'

  const textColor = 'text-gray-700 dark:text-gray-300'
  const secondaryTextColor = 'text-gray-500 dark:text-gray-400'

  return (
    // Connect event handlers from the hook
    <div
      className={containerClasses}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={uploading ? undefined : handleClick} // Disable click when uploading
      role="button"
      tabIndex={uploading ? -1 : 0} // Disable focus when uploading
      aria-disabled={uploading} // Accessibility for disabled state
      onKeyDown={(e) => { if (!uploading && (e.key === 'Enter' || e.key === ' ')) handleClick() }}
    >
      <input
        type="file"
        ref={fileInputRef} // Connect ref from the hook
        onChange={handleFileSelect}
        className="hidden"
        accept={accept} // Use the accept prop
        disabled={uploading} // Disable input when uploading
      />
      {/* Icon */}
      <div className={`mb-2 ${iconColor} transition-colors duration-300 ease-in-out`}>
        {/* SVG remains the same */}
         <svg
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
      </div>
      {/* Main text */}
      <div className={`mb-1 text-base font-medium ${textColor}`}>
        {uploading ? '正在上传...' : '点击或拖拽文件到此处上传'}
      </div>
      {/* Secondary text */}
      <div className={`text-sm ${secondaryTextColor}`}>
        {/* Update secondary text to reflect the accept prop if needed, or keep static */}
        支持 {accept.split(',').map(t => t.trim().toUpperCase()).join(', ')} 格式
      </div>
    </div>
  )
}

// At the end of the file, add:
// 删除重复的默认导出声明，因为已在组件定义处使用了 export default
