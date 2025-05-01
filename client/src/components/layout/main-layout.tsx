import * as React from 'react'
import { cn } from '@/lib/utils'
import { ConversationList } from '../sidebar/conversation-list'
import { ChatContainer } from '../chat/chat-container'
import { Message as MessageType, Chat } from '@/types/chat'

interface MainLayoutProps {
  className?: string
}

export function MainLayout({ className }: MainLayoutProps): React.ReactElement {
  const [conversations, setConversations] = React.useState<Chat[]>([])
  const [selectedId, setSelectedId] = React.useState<string>()
  const [isTyping, setIsTyping] = React.useState(false)

  const selectedChat = React.useMemo(() => {
    return conversations.find((chat) => chat.id === selectedId)
  }, [conversations, selectedId])

  const handleNewChat = React.useCallback(() => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: '',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    setConversations((prev) => [newChat, ...prev])
    setSelectedId(newChat.id)
  }, [])

  const handleSendMessage = React.useCallback(
    async (content: string) => {
      if (!selectedId) return

      const userMessage: MessageType = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: Date.now()
      }

      setConversations((prev) =>
        prev.map((chat) =>
          chat.id === selectedId
            ? {
                ...chat,
                messages: [...chat.messages, userMessage],
                title: chat.title || content,
                updatedAt: Date.now()
              }
            : chat
        )
      )

      setIsTyping(true)
      try {
        // TODO: 调用 API 获取助手回复
        await new Promise((resolve) => setTimeout(resolve, 1000))
        const assistantMessage: MessageType = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '这是一个示例回复',
          timestamp: Date.now()
        }

        setConversations((prev) =>
          prev.map((chat) =>
            chat.id === selectedId
              ? {
                  ...chat,
                  messages: [...chat.messages, assistantMessage],
                  updatedAt: Date.now()
                }
              : chat
          )
        )
      } finally {
        setIsTyping(false)
      }
    },
    [selectedId]
  )

  return (
    <div className={cn('flex h-screen', className)}>
      <div className="w-80 border-r border-[hsl(var(--border))]/50">
        <ConversationList
          conversations={conversations}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onNewChat={handleNewChat}
        />
      </div>
      <div className="flex-1">
        {selectedChat ? (
          <ChatContainer
            messages={selectedChat.messages}
            onSendMessage={handleSendMessage}
            isTyping={isTyping}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <button
              onClick={handleNewChat}
              className={cn(
                'flex items-center gap-2 rounded-lg border border-[hsl(var(--border))]/50 px-6 py-3',
                'hover:bg-accent/50 transition-colors',
                'text-lg font-medium'
              )}
            >
              <PlusIcon className="h-6 w-6" />
              开始新对话
            </button>
          </div>
        )}
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