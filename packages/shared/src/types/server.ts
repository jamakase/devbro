export type ServerAuthType = "ssh-key" | "ssh-agent";

export type ServerStatus = "connected" | "disconnected" | "connecting" | "error";

export interface Server {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: ServerAuthType;
  privateKey?: string; // Only for ssh-key auth
  status: ServerStatus;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastConnectedAt: Date | null;
  errorMessage: string | null;
}

export interface CreateServerInput {
  name: string;
  host: string;
  port?: number;
  username: string;
  authType: ServerAuthType;
  privateKey?: string;
}

export interface ServerWithStats extends Server {
  taskCount: number;
  cpuUsage?: number;
  memoryUsage?: number;
  memoryTotal?: number;
  diskUsage?: number;
  diskTotal?: number;
}

export interface ServerTestResult {
  success: boolean;
  message: string;
  dockerVersion?: string;
}
