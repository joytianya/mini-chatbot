import * as React from 'react'
import { Message as MessageType } from '@/types/chat'
import { Message } from './Message'

interface MessageListProps {
  messages: MessageType[]
  isTyping?: boolean
}

export function MessageList({ messages, isTyping }: MessageListProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((message) => (
        <Message
          key={message.id}
          message={message}
          isTyping={isTyping && message === messages[messages.length - 1]}
        />
      ))}
    </div>
  )
} 