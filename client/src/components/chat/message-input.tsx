import * as React from 'react'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = '输入消息...'
}: MessageInputProps): React.ReactElement {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  return (
    <div className="flex w-full items-end gap-2 border-t bg-background p-4">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        rows={1}
        className={cn(
          'min-h-[44px] w-full resize-none rounded-md border bg-transparent px-3 py-2',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      />
      <button
        onClick={onSubmit}
        disabled={disabled || !value.trim()}
        className={cn(
          'rounded-md bg-primary px-4 py-2 text-primary-foreground',
          'hover:bg-primary/90',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          (disabled || !value.trim()) && 'cursor-not-allowed opacity-50'
        )}
      >
        发送
      </button>
    </div>
  )
} 