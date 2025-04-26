import * as React from 'react'
import { Message as MessageType } from '@/types/chat'
import { MessageList } from './message-list'
import { MessageInput } from './message-input'

interface ChatContainerProps {
  messages: MessageType[]
  onSendMessage: (content: string) => void
  isTyping?: boolean
}

export function ChatContainer({
  messages,
  onSendMessage,
  isTyping = false
}: ChatContainerProps): React.ReactElement {
  const [input, setInput] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = () => {
    const trimmedInput = input.trim()
    if (trimmedInput) {
      onSendMessage(trimmedInput)
      setInput('')
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden"
      >
        <MessageList messages={messages} isTyping={isTyping} />
      </div>
      <MessageInput
        value={input}
        onChange={setInput}
        onSubmit={handleSubmit}
        disabled={isTyping}
      />
    </div>
  )
} 