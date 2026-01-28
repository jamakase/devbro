export type TaskStatus =
  | "creating"
  | "running"
  | "stopped"
  | "error"
  | "completed";

export type CliTool = "claude" | "opencode";

export interface TaskConfig {
  githubRepo?: string;
  githubBranch?: string;
  memoryLimit?: string;
  cpuLimit?: string;
  anthropicApiKey?: string;
  githubToken?: string;
  prompt?: string;
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
