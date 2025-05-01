import { Conversation, Document, Message, ModelConfig } from '../types/types';

interface MessageSubmissionProps {
  displayMessages: Message[];
  setDisplayMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  requestMessages: Message[];
  setRequestMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  streaming: boolean;
  setStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentResponse: React.Dispatch<React.SetStateAction<string>>;
  setReasoningText: React.Dispatch<React.SetStateAction<string>>;
  setIsReasoning: React.Dispatch<React.SetStateAction<boolean>>;
  sessionHash: string;
  activeDocuments: Document[];
  processStreamResponse: (response: Response) => Promise<string>;
  getConfigForModel: (modelName: string) => ModelConfig | null;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
}

interface MessageSubmissionReturnType {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sensitiveInfoProtectionEnabled: boolean;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleRetry: () => Promise<void>;
  handleEdit: (messageId: string, newContent: string) => void;
  toggleSensitiveInfoProtection: () => void;
}

declare function useMessageSubmission(props: MessageSubmissionProps): MessageSubmissionReturnType;

export default useMessageSubmission; 