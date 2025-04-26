import * as React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Message as MessageType } from '@/types/chat'
import { TypingIndicator } from './typing-indicator'

interface MessageProps {
  message: MessageType
  isTyping?: boolean
}

export function Message({ message, isTyping }: MessageProps): React.ReactElement {
  const isUser = message.role === 'user'
  
  return (
    <div className={cn(
      'flex w-full gap-4 p-4',
      isUser ? 'flex-row-reverse' : 'flex-row'
    )}>
      <Avatar className="h-8 w-8">
        <AvatarImage
          src={isUser ? '/user-avatar.png' : '/assistant-avatar.png'}
          alt={isUser ? '用户' : '助手'}
        />
        <AvatarFallback>{isUser ? 'U' : 'A'}</AvatarFallback>
      </Avatar>
      
      <div className={cn(
        'flex max-w-[80%] flex-col gap-2',
        isUser ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          'rounded-lg p-4',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          {message.content}
          {isTyping && <TypingIndicator />}
        </div>
      </div>
    </div>
  )
}

export default React.memo(Message) 