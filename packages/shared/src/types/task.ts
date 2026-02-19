export type TaskStatus =
  | "pending"
  | "creating"
  | "running"
  | "stopped"
  | "error"
  | "completed";

export type CliTool = "claude" | "opencode";

export type KnowledgeBaseIndexStatus = "idle" | "indexing" | "ready" | "error";

export interface KnowledgeBaseIndexState {
  status: KnowledgeBaseIndexStatus;
  startedAt?: string;
  finishedAt?: string;
  lastIndexedAt?: string;
  fileCount?: number;
  errorMessage?: string;
}

export interface KnowledgeBaseConfig {
  enabled: boolean;
  indexing?: KnowledgeBaseIndexState;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description?: string;
}

export interface SkillsConfig {
  enabledSkillIds?: string[];
}

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}

export interface SandboxBootstrapPlan {
  pullSpecs?: boolean;
  specsRepoUrl?: string;
  specsBranch?: string;
  enableKnowledgeBase?: boolean;
  buildKnowledgeBaseIndex?: boolean;
  enabledSkillIds?: string[];
  mcpConfig?: McpConfig;
}

export interface TaskConfig {
  githubRepo?: string;
  githubBranch?: string;
  memoryLimit?: string;
  cpuLimit?: string;
  anthropicApiKey?: string;
  githubToken?: string;
  prompt?: string;
  knowledgeBase?: KnowledgeBaseConfig;
  skills?: SkillsConfig;
  mcp?: McpConfig;
  bootstrap?: SandboxBootstrapPlan;
  lastResult?: {
    success: boolean;
    exitCode: number;
    output: string;
  };
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  status: TaskStatus;
  cliTool: CliTool;
  serverId: string | null;
  containerId: string | null;
  volumeId: string | null;
  config: TaskConfig;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date | null;
}

export interface CreateTaskInput {
  name: string;
  cliTool: CliTool;
  serverId?: string;
  config?: TaskConfig;
}

export interface TaskWithProject extends Task {
  project: {
    id: string;
    name: string;
  };
}
