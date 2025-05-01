import { useState, useRef, DragEvent, ChangeEvent, useCallback } from 'react'

// Re-use or import the UploadResponse interface
interface UploadResponse {
  fileUrl: string
  fileName: string
}

interface UseDocumentUploadProps {
  onUploadSuccess?: (data: UploadResponse) => void
  // Add onError callback for better error handling propagation
  onError?: (error: Error) => void
}

interface UseDocumentUploadReturn {
  isDragging: boolean
  uploading: boolean
  fileInputRef: React.RefObject<HTMLInputElement>
  handleDragEnter: (e: DragEvent<HTMLDivElement>) => void
  handleDragLeave: (e: DragEvent<HTMLDivElement>) => void
  handleDragOver: (e: DragEvent<HTMLDivElement>) => void
  handleDrop: (e: DragEvent<HTMLDivElement>) => Promise<void>
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => Promise<void>
  handleClick: () => void
}

export function useDocumentUpload({
  onUploadSuccess,
  onError,
}: UseDocumentUploadProps): UseDocumentUploadReturn {
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = useCallback(async (file: File): Promise<void> => {
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMsg = `Upload failed with status: ${response.status}`
        try {
          const errorData = await response.json()
          errorMsg = errorData.message || errorMsg
        } catch (parseError) {
          // Ignore
        }
        throw new Error(errorMsg)
      }

      const data: UploadResponse = await response.json()
      onUploadSuccess?.(data)
      console.log('Upload successful:', data) // Keep for debugging or replace with toast

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error('上传文件时发生未知错误')
      console.error('Error uploading file:', err)
      onError?.(err) // Propagate error
      // Consider showing toast here or letting the component decide based on onError
    } finally {
      setUploading(false)
    }
  }, [onUploadSuccess, onError]) // Add dependencies

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    if (e.relatedTarget === null || !(e.currentTarget.contains(e.relatedTarget as Node))) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      await handleFileUpload(files[0])
    }
  }, [handleFileUpload]) // Add dependency

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const files = e.target.files
    if (files && files.length > 0) {
      await handleFileUpload(files[0])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [handleFileUpload]) // Add dependency

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  return {
    isDragging,
    uploading,
    fileInputRef,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    handleClick,
  }
} 