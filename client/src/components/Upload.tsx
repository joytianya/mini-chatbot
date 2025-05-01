import React, { useRef, useState, useEffect, useCallback, ChangeEvent } from 'react'
import { serverURL } from '../Config' // Assuming correct path
import { toast } from 'react-toastify'
// Removed import './Upload.css'

// --- Type Definitions ---

// Define the structure of the file object used internally
interface UploadedFile {
  id: string // Unique ID generated client-side initially, potentially updated with server ID
  name: string
  type: string
  size: number
  status: 'uploading' | 'completed' | 'error'
  serverId?: string // Optional ID returned by the server
}

// Define the expected structure of the result from handleFileUpload prop
// This needs to match what handleFileUpload actually provides
interface FileUploadResult {
   originalFile: File // The original file object
   processedFile?: { // Information about the processed file
       id: string; // Server-side document ID
       name?: string;
       content?: string; // Optional content if returned/needed
   } | null
   sensitiveMap?: Record<string, string> | null
}

interface UploadProps {
  // darkMode removed
  onUploadSuccess?: (activeDocuments: Array<{ id: string, name: string }>) => void // Callback with list of active docs
  sensitiveInfoProtectionEnabled?: boolean
  // Required prop for handling the actual upload logic (likely from a hook or parent)
  handleFileUpload: (
    files: File[],
    embeddingConfig: any, // Define a proper type for embeddingConfig if possible
    onComplete: (doc: { id: string }) => void, // Simplified onComplete
    onError: (errorMsg: string) => void, // Simplified onError
    sensitiveEnabled: boolean
  ) => Promise<FileUploadResult[] | null> // Define the return type accurately
  // Callback to potentially update parent state with detailed file info (optional)
  setUploadedFileInfo?: (info: {
    originalFile: File
    processedFile?: FileUploadResult['processedFile']
    sensitiveMap?: Record<string, string> | null
  }) => void
  // Optional: callback specifically for successful upload results
  handleUploadSuccess?: (results: FileUploadResult[]) => void
   // Optional: callback to set input content, e.g., in a chat interface
  setInput?: (content: string) => void;
}

// --- Helper Functions ---

// Function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// --- Component ---

export function Upload({
  onUploadSuccess,
  sensitiveInfoProtectionEnabled = false, // Default value
  handleFileUpload,
  setUploadedFileInfo,
  handleUploadSuccess: parentHandleUploadSuccess, // Rename to avoid conflict
  setInput,
}: UploadProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploadingGlobal, setIsUploadingGlobal] = useState<boolean>(false) // Tracks if *any* file is uploading
  // Upload progress is complex with external handler, removed state for now
  // const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({}) // fileId -> thumbnail type ('pdf', 'txt', 'doc', 'image', 'file')
  const [activeDocuments, setActiveDocuments] = useState<Array<{ id: string, name: string }>>([]) // Tracks docs successfully processed by server

   // Effect to potentially load initial active documents if needed (e.g., from parent state)
   // useEffect(() => { ... }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Processes a single file: updates UI, calls external handler, manages state
  const processSingleFile = useCallback(async (file: File): Promise<FileUploadResult | null> => {
    const fileId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` // Unique client-side ID

    const newFileEntry: UploadedFile = {
      id: fileId,
      name: file.name,
      type: file.type,
      size: file.size,
      status: 'uploading',
    }

    setUploadedFiles(prev => [...prev, newFileEntry])
    setUploadError(null) // Clear previous errors for this new upload
    setIsUploadingGlobal(true); // Set global uploading state

    generateThumbnail(file, fileId);

    try {
        // TODO: Get embedding config properly, not hardcoded/localStorage here
        const savedEmbeddingConfigs = localStorage.getItem('embeddingConfigs');
        const embeddingConfigs = savedEmbeddingConfigs ? JSON.parse(savedEmbeddingConfigs) : [];
        const embeddingConfig = embeddingConfigs[0]; // Example: Use first config

        let serverDocId: string | null = null;

        const results = await handleFileUpload(
            [file],
            embeddingConfig, // Pass the config
            (doc) => { // onComplete callback
                console.log(`Upload completed for ${file.name}, server ID: ${doc.id}`);
                serverDocId = doc.id; // Store the server ID
                 // Update file status using server ID if available, otherwise use local ID
                setUploadedFiles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, status: 'completed', serverId: doc.id } : f
                ));
            },
            (errorMsg) => { // onError callback
                console.error(`Upload error for ${file.name}: ${errorMsg}`);
                 setUploadedFiles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, status: 'error' } : f
                ));
                setUploadError(`"${file.name}": ${errorMsg}`); // Show specific error
                toast.error(`上传 "${file.name}" 失败: ${errorMsg}`);
                // Remove thumbnail on error
                 setThumbnails(prev => {
                   const newThumbs = { ...prev };
                   delete newThumbs[fileId];
                   return newThumbs;
                 });
            },
            sensitiveInfoProtectionEnabled ?? false
        );

        if (!results || results.length === 0) {
           // Handle cases where handleFileUpload returns null/empty but didn't call onError
           throw new Error('上传处理函数未返回有效结果');
        }

        const result = results[0]; // Assuming one file processed returns one result

         // If onComplete wasn't called (e.g., error before server response but after handleFileUpload returned)
         // Ensure status is updated based on result existence
        if (result) {
             setUploadedFiles(prev => prev.map(f =>
                (f.id === fileId && f.status === 'uploading')
                    ? { ...f, status: 'completed', serverId: serverDocId ?? fileId } // Use server ID if we got one
                    : f
             ));
             return { ...result, originalFile: file }; // Ensure originalFile is included
        } else {
             setUploadedFiles(prev => prev.map(f =>
                f.id === fileId ? { ...f, status: 'error' } : f
            ));
            return null;
        }

    } catch (error: any) {
        console.error('Error processing file:', file.name, error);
        setUploadError(`处理 "${file.name}" 出错: ${error.message}`);
         setUploadedFiles(prev => prev.map(f =>
            f.id === fileId ? { ...f, status: 'error' } : f
        ));
         // Remove thumbnail on error
        setThumbnails(prev => {
            const newThumbs = { ...prev };
            delete newThumbs[fileId];
            return newThumbs;
        });
        toast.error(`处理 "${file.name}" 出错`);
        return null; // Indicate failure
    } finally {
       // Check if any uploads are still in progress after a short delay
       // Use serverId for checking completion status if available
       setTimeout(() => {
           setUploadedFiles(prev => {
               const anyStillUploading = prev.some(f => f.status === 'uploading');
               if (!anyStillUploading) {
                   setIsUploadingGlobal(false);
                   console.log('All uploads finished.');
               }
               return prev;
           });
       }, 500);
    }
}, [handleFileUpload, sensitiveInfoProtectionEnabled]) // Add dependencies


  // Handles the file input change event
  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    console.log(`Processing ${files.length} file(s)...`);
    const processedResults: FileUploadResult[] = [];

    // Process files sequentially for clearer feedback, or use Promise.all for parallel
    for (const file of files) {
      const result = await processSingleFile(file);
      if (result) {
         processedResults.push(result);
         // Set input for the first successfully processed file's content
         if (processedResults.length === 1 && result.processedFile?.content && setInput) {
             console.log('Setting input with processed content');
             setInput(result.processedFile.content);
         }
      }
    }
    console.log(`${processedResults.length} file(s) processed successfully.`);

    if (processedResults.length > 0) {
      // Update active documents list based on server IDs
      const newActiveDocs = processedResults
        .filter(r => r.processedFile?.id) // Filter results that have a server ID
        .map(r => ({
             id: r.processedFile!.id, // Use non-null assertion as we filtered
             name: r.processedFile!.name || r.originalFile.name,
        }));

      // Merge with existing active documents, avoiding duplicates
      setActiveDocuments(prevActiveDocs => {
         const currentIds = new Set(prevActiveDocs.map(d => d.id));
         const uniqueNewDocs = newActiveDocs.filter(d => !currentIds.has(d.id));
         return [...prevActiveDocs, ...uniqueNewDocs];
      });

      // Call parent callbacks
      if (onUploadSuccess) {
         // Pass the updated list of active documents
          setActiveDocuments(prevActiveDocs => {
             const currentIds = new Set(prevActiveDocs.map(d => d.id));
             const uniqueNewDocs = newActiveDocs.filter(d => !currentIds.has(d.id));
             const updatedList = [...prevActiveDocs, ...uniqueNewDocs];
             onUploadSuccess(updatedList); // Call with the final list
             return updatedList; // Return for state update
         });
      }
      if (setUploadedFileInfo && processedResults[0]) {
        // Pass info of the first processed file
        setUploadedFileInfo({
          originalFile: processedResults[0].originalFile,
          processedFile: processedResults[0].processedFile,
          sensitiveMap: processedResults[0].sensitiveMap,
        })
      }
      if (parentHandleUploadSuccess) {
        parentHandleUploadSuccess(processedResults)
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [processSingleFile, onUploadSuccess, setUploadedFileInfo, parentHandleUploadSuccess, setInput]) // Dependencies


  // Generates a simple type-based thumbnail key
  const generateThumbnail = useCallback((file: File, fileId: string) => {
      let thumbType = 'file'; // Default
      if (file.type.startsWith('image/')) thumbType = 'image';
      else if (file.type === 'application/pdf') thumbType = 'pdf';
      else if (file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')) thumbType = 'txt';
      else if (file.type === 'application/msword' || file.type.startsWith('application/vnd.openxmlformats-officedocument.wordprocessingml') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) thumbType = 'doc';
      else if (file.type === 'application/json' || file.name.endsWith('.json')) thumbType = 'json';
      else if (file.type === 'text/csv' || file.name.endsWith('.csv')) thumbType = 'csv';
      // Add more types as needed

      if (thumbType === 'image') {
         // Generate actual image thumbnail preview
         const reader = new FileReader();
         reader.onload = (e) => {
            setThumbnails(prev => ({ ...prev, [fileId]: e.target?.result as string }));
         };
         reader.readAsDataURL(file);
      } else {
          // Use type key for icon lookup
          setThumbnails(prev => ({ ...prev, [fileId]: thumbType }));
      }
  }, []);

 // Handles deleting a file from the list
 const handleDeleteFile = useCallback((fileIdToDelete: string) => {
    if (window.confirm('确定要删除此文件记录吗？（这不会从服务器删除）')) {
        console.log('Deleting file record:', fileIdToDelete);
        setUploadedFiles(prev => prev.filter(f => f.id !== fileIdToDelete));
        setThumbnails(prev => {
            const newThumbs = { ...prev };
            delete newThumbs[fileIdToDelete];
            return newThumbs;
        });
         // Also remove from active documents if it was added
         setActiveDocuments(prev => prev.filter(doc => {
            // Find the corresponding uploadedFile entry to check serverId if available
            const deletedFileEntry = uploadedFiles.find(f => f.id === fileIdToDelete);
            // If serverId exists and matches, remove from active docs
            if (deletedFileEntry?.serverId && deletedFileEntry.serverId === doc.id) {
                return false;
            }
            // If no serverId, maybe check against the local ID if that's used as fallback?
            // This depends on how IDs are handled between client and server.
            // For now, primarily rely on serverId match.
             // Or maybe just filter based on the id passed if it *is* the server id?
            if (doc.id === fileIdToDelete) return false; // If fileIdToDelete *is* the server ID

            return true;
         }));
         // TODO: Add logic to potentially notify the server about deletion if required
    }
 }, [uploadedFiles]); // Dependency on uploadedFiles for finding serverId


 // --- Render Logic ---

 // Tailwind classes
 const containerClasses = "relative inline-block w-full"; // Keep container relative for potential absolute elements
 const buttonClasses = "w-full max-w-xs px-4 py-2 rounded-md text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center space-x-2";
 const primaryButtonClasses = `${buttonClasses} bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500`;
 const fileListClasses = "mt-4 space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-500 scrollbar-track-gray-100 dark:scrollbar-track-gray-800"; // Added max-height and scroll
 const fileCardClasses = (status: UploadedFile['status']) => `
    flex items-center justify-between p-2 rounded-md border bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ease-in-out
    ${status === 'error' ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-700'}
    ${status === 'uploading' ? 'animate-pulse border-blue-500 dark:border-blue-400' : ''}
 `;
 const thumbnailClasses = "w-8 h-8 flex-shrink-0 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden mr-3";
 const fileInfoClasses = "flex-1 min-w-0"; // Allow shrinking
 const fileNameClasses = "text-sm font-medium text-gray-900 dark:text-gray-100 truncate";
 const fileSizeClasses = "text-xs text-gray-500 dark:text-gray-400";
 const statusIconClasses = "w-5 h-5 ml-2";
 const deleteButtonClasses = "ml-2 p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-500 dark:hover:text-red-400 focus:outline-none focus:ring-1 focus:ring-red-500 transition-colors duration-150";
 const spinnerClasses = "animate-spin w-4 h-4 text-blue-600 dark:text-blue-400"; // Tailwind spin animation

 // Thumbnail rendering logic
 const renderThumbnail = (fileId: string, fileType: string) => {
    const thumbSrc = thumbnails[fileId];
     const iconSize = "w-5 h-5 text-gray-500 dark:text-gray-400"; // Consistent icon size

    if (thumbSrc && thumbSrc.startsWith('data:image/')) {
      // Actual image preview
      return <img src={thumbSrc} alt="Preview" className="w-full h-full object-cover" />;
    }
     // Icon based on type key
    switch(thumbSrc) {
         case 'pdf': return <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M...pdf-icon-path..." clipRule="evenodd"></path></svg>; // Replace with actual SVG path
         case 'txt': return <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="...txt-icon-path..." clipRule="evenodd"></path></svg>; // Replace
         case 'doc': return <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="...doc-icon-path..." clipRule="evenodd"></path></svg>; // Replace
         case 'json': return <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="...json-icon-path..." clipRule="evenodd"></path></svg>; // Replace
         case 'csv': return <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="...csv-icon-path..." clipRule="evenodd"></path></svg>; // Replace
         default: return <svg className={iconSize} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="...default-file-icon-path..." clipRule="evenodd"></path></svg>; // Replace
    }
     // Placeholder for actual SVG paths - you'd need to add these
 };

 // Status Indicator rendering logic
 const renderStatusIndicator = (status: UploadedFile['status']) => {
    switch(status) {
        case 'uploading':
            return <div className={spinnerClasses} role="status" aria-label="上传中"></div>;
        case 'completed':
            return <svg className={`${statusIconClasses} text-green-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>;
         case 'error':
            return <svg className={`${statusIconClasses} text-red-500`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path></svg>;
        default:
            return null;
    }
 };


  return (
    <div className={containerClasses}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple // Allow multiple file selection
        // Add accept attribute if needed: accept=".pdf,.txt,.docx"
      />
      <button
        type="button"
        onClick={handleClick}
        className={primaryButtonClasses}
        disabled={isUploadingGlobal}
      >
        {isUploadingGlobal ? (
          <>
             <div className={spinnerClasses} role="status"></div>
             <span>正在上传...</span>
          </>
        ) : (
           <>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
             <span>选择或拖放文件</span>
             {/* TODO: Add Drag and Drop functionality */}
           </>
        )}
      </button>

       {/* Upload Error Display */}
       {uploadError && !isUploadingGlobal && ( // Show last error only when not actively uploading
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">上传出错: {uploadError}</p>
        )}

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className={fileListClasses}>
          {uploadedFiles.map((file) => (
            <div key={file.id} className={fileCardClasses(file.status)}>
              <div className={thumbnailClasses}>
                 {renderThumbnail(file.id, file.type)}
              </div>
              <div className={fileInfoClasses}>
                <p className={fileNameClasses}>{file.name}</p>
                <p className={fileSizeClasses}>{formatFileSize(file.size)}</p>
                 {/* Progress bar could be added here if progress state is available */}
              </div>
              {renderStatusIndicator(file.status)}
              {/* Show delete button only for completed or error states? */} 
              {(file.status === 'completed' || file.status === 'error') && (
                 <button
                   onClick={() => handleDeleteFile(file.serverId ?? file.id)} // Prefer serverId for deletion if available
                   className={deleteButtonClasses}
                   aria-label={`删除文件 ${file.name}`}
                 >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                 </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}