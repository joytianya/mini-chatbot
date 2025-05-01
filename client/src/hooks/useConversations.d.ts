import { Conversation, Document, Message } from '../types/types';

interface ConversationsProps {
  setDisplayMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setRequestMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setSessionHash: React.Dispatch<React.SetStateAction<string>>;
  setActiveDocuments: React.Dispatch<React.SetStateAction<Document[]>>;
  setStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentResponse: React.Dispatch<React.SetStateAction<string>>;
  setReasoningText: React.Dispatch<React.SetStateAction<string>>;
  setUserHasScrolled: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ConversationsReturnType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  isSidebarExpanded: boolean;
  handleNewChat: () => void;
  handleConversationClick: (conversationId: string) => void;
  handleDeleteConversation: (conversationId: string) => void;
  handleClearAll: () => void;
  handleToggleSidebar: () => void;
}

declare function useConversations(props: ConversationsProps): ConversationsReturnType;

export default useConversations; 