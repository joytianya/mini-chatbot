import * as React from 'react'

export function TypingIndicator(): React.ReactElement {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-current" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.2s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:0.4s]" />
    </div>
  )
} 