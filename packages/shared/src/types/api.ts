import type { Sandbox, SandboxWithStats, CreateSandboxInput, CLITool } from "./sandbox.js";
import type { Server, ServerWithStats, CreateServerInput, ServerTestResult } from "./server.js";

// Generic API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// Sandbox API
export interface ListSandboxesResponse {
  sandboxes: SandboxWithStats[];
  total: number;
}

export interface GetSandboxResponse {
  sandbox: SandboxWithStats;
}

export interface CreateSandboxRequest extends CreateSandboxInput {}

export interface CreateSandboxResponse {
  sandbox: Sandbox;
}

export interface SandboxActionResponse {
  sandbox: Sandbox;
  message: string;
}

export interface RunTaskRequest {
  prompt: string;
  cliTool?: CLITool;
  githubBranch?: string;
}

export interface RunTaskResponse {
  success: boolean;
  exitCode: number;
  output: string;
}

export interface StartTaskRequest {
  prompt: string;
  cliTool: CLITool;
  githubRepo?: string;
  githubBranch?: string;
  serverId?: string | null;
  apiKey?: string;
  githubToken?: string;
  sandboxName?: string;
}

export interface StartTaskResponse {
  sandboxId: string;
  taskId: string;
  result: RunTaskResponse;
}

export type TaskRunStatus = "running" | "success" | "error";

export interface TaskRecord {
  id: string;
  sandboxId: string;
  prompt: string;
  cliTool: CLITool;
  githubBranch?: string;
  status: TaskRunStatus;
  startedAt: string;
  finishedAt?: string;
  exitCode?: number;
  output?: string;
}

export interface ListTasksResponse {
  tasks: TaskRecord[];
  total: number;
}

export interface SandboxEvent {
  timestamp: string;
  stage: string;
  message: string;
  status: "info" | "success" | "error";
}

// Server API
export interface ListServersResponse {
  servers: ServerWithStats[];
  total: number;
}

export interface GetServerResponse {
  server: ServerWithStats;
}

export interface CreateServerRequest extends CreateServerInput {}

export interface CreateServerResponse {
  server: Server;
}

export interface TestServerResponse {
  result: ServerTestResult;
}

// Health API
export interface HealthResponse {
  healthy: boolean;
  dockerAvailable: boolean;
  dockerVersion?: string;
  message: string;
}

// Settings API
export interface Settings {
  anthropicApiKey?: string;
  githubToken?: string;
  defaultMemoryLimit: string;
  defaultCpuLimit: number;
}

export interface GetSettingsResponse {
  settings: Settings;
}

export interface UpdateSettingsRequest {
  anthropicApiKey?: string;
  githubToken?: string;
  defaultMemoryLimit?: string;
  defaultCpuLimit?: number;
}

// Log streaming
export interface LogEntry {
  timestamp: string;
  stream: "stdout" | "stderr";
  message: string;
}
