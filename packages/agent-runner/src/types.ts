export type AgentRunnerBackendId = string;

export interface AgentRunnerRequest {
  backend?: AgentRunnerBackendId;
  prompt: string;
  workspacePath: string;
  env?: Record<string, string>;
}

export interface PromptOption {
  id: string;
  label: string;
  value: string;
}

export type AgentRunnerEvent =
  | { type: "stdout"; message: string }
  | { type: "stderr"; message: string }
  | { type: "tool_call"; name: string; input: unknown; output?: string }
  | { type: "prompt"; promptId: string; question: string; options: PromptOption[]; expiresAt?: string }
  | { type: "prompt_answered"; promptId: string; option: string }
  | { type: "status"; status: "starting" | "running" | "completed" | "failed"; message?: string };

export interface AgentRunnerResult {
  success: boolean;
  exitCode: number;
}

export type AgentRunnerEmit = (event: AgentRunnerEvent) => void;

export interface AgentRunnerBackend {
  id: AgentRunnerBackendId;
  run(request: AgentRunnerRequest, emit: AgentRunnerEmit): Promise<AgentRunnerResult>;
}
