import { RefObject } from 'react';
import { Message, ModelConfig } from '../types/types';

interface ChatCoreReturnType {
  displayMessages: Message[];
  setDisplayMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  requestMessages: Message[];
  setRequestMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  streaming: boolean;
  setStreaming: React.Dispatch<React.SetStateAction<boolean>>;
  currentResponse: string;
  setCurrentResponse: React.Dispatch<React.SetStateAction<string>>;
  reasoningText: string;
  setReasoningText: React.Dispatch<React.SetStateAction<string>>;
  isReasoning: boolean;
  setIsReasoning: React.Dispatch<React.SetStateAction<boolean>>;
  sessionHash: string;
  setSessionHash: React.Dispatch<React.SetStateAction<string>>;
  highlightedMessageId: string | null;
  chatContainerRef: RefObject<HTMLDivElement>;
  userHasScrolled: boolean;
  setUserHasScrolled: React.Dispatch<React.SetStateAction<boolean>>;
  currentTurns: number;
  scrollToBottom: () => void;
  handleScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  handleStop: () => void;
  processStreamResponse: (response: Response) => Promise<string>;
  getConfigForModel: (modelName: string) => ModelConfig | null;
  formatTime: (timestamp: number) => string;
  loadingHistory: boolean;
}

declare function useChatCore(): ChatCoreReturnType;

export default useChatCore; 