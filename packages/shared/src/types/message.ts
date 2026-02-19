export type MessageRole = "user" | "assistant" | "system";

export interface ToolCall {
  id: string;
  type: string;
  name: string;
  input: Record<string, unknown>;
  output?: string;
}

export interface PromptOption {
  id: string;
  label: string;
  value: string;
}

export interface PromptToolCallInput {
  promptId: string;
  question: string;
  options: PromptOption[];
  expiresAt?: string;
}

export interface PromptAnswerToolCallInput {
  promptId: string;
  toolCallId: string;
  answer: string;
}

export interface Message {
  id: string;
  taskId: string;
  role: MessageRole;
  content: string;
  toolCalls: ToolCall[] | null;
  timestamp: Date;
}

export interface CreateMessageInput {
  taskId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
}
