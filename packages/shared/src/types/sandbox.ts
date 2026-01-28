export type SandboxStatus =
  | "creating"
  | "stopped"
  | "starting"
  | "running"
  | "stopping"
  | "error"
  | "setup_failed";

export type CLITool = "claude-code" | "opencode";

export interface SandboxConfig {
  memoryLimit?: string; // e.g., "2g"
  cpuLimit?: number; // e.g., 2
  githubRepo?: string;
  githubBranch?: string;
  githubToken?: string;
  apiKey?: string; // Anthropic API key for the CLI
}

export interface Sandbox {
  id: string;
  name: string;
  status: SandboxStatus;
  cliTool: CLITool;
  serverId: string | null; // null = local Docker
  containerId: string | null;
  volumeId: string | null;
  config: SandboxConfig;
  createdAt: string;
  updatedAt: string;
  lastActivityAt: string | null;
  errorMessage: string | null;
}

export interface CreateSandboxInput {
  name: string;
  cliTool: CLITool;
  serverId?: string | null;
  config?: SandboxConfig;
}

export interface SandboxWithStats extends Sandbox {
  uptime?: number; // seconds
  memoryUsage?: number; // bytes
  cpuPercent?: number;
}
