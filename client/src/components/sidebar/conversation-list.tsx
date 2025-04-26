import * as React from 'react'
import { Chat } from '@/types/chat'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils'

interface ConversationListProps {
  conversations: Chat[]
  selectedId?: string
  onSelect: (id: string) => void
  onNewChat: () => void
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewChat
}: ConversationListProps): React.ReactElement {
  return (
    <div className="flex h-full flex-col gap-2 bg-sidebar p-4">
      <button
        onClick={onNewChat}
        className={cn(
          'flex items-center gap-2 rounded-lg border border-border/50 px-4 py-2',
          'hover:bg-accent/50 transition-colors',
          'text-base font-medium'
        )}
      >
        <PlusIcon className="h-5 w-5" />
        新对话
      </button>
      
      <div className="relative mt-2">
        <input
          type="text"
          placeholder="搜索对话..."
          className={cn(
            'w-full rounded-lg border border-border/50 bg-transparent px-4 py-2',
            'focus:outline-none focus:ring-2 focus:ring-ring/50',
            'placeholder:text-muted-foreground'
          )}
        />
        <SearchIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      <div className="mt-4 flex-1 space-y-2 overflow-y-auto">
        {conversations.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelect(chat.id)}
            className={cn(
              'w-full rounded-lg px-4 py-3 text-left transition-colors',
              'hover:bg-accent/50',
              selectedId === chat.id && 'bg-accent'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="line-clamp-1 flex-1 font-medium">
                {chat.title || '新对话'}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatDate(chat.updatedAt)}
              </span>
            </div>
            {chat.messages.length > 0 && (
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {chat.messages[chat.messages.length - 1].content}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5v14m-7-7h14" />
    </svg>
  )
}

function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  )
} 