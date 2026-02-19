import { Readable } from "stream";
import type { SandboxConfig, SandboxStatus } from "@agent-sandbox/shared";

export interface ContainerStats {
  status: SandboxStatus;
  containerId: string;
  uptime?: number;
  memoryUsage?: number;
  cpuPercent?: number;
}

export interface ProviderHealthResult {
  healthy: boolean;
  version?: string;
  message: string;
}

export interface VolumeStats {
  name: string;
  size: number;
  createdAt: string;
  labels?: Record<string, string>;
}

export interface ContainerProvider {
  /**
   * Check if the provider is healthy and reachable
   */
  healthCheck(): Promise<ProviderHealthResult>;

  /**
   * Create a new container/sandbox
   * @returns Object containing container ID and volume ID
   */
  createContainer(
    sandboxId: string,
    config?: SandboxConfig
  ): Promise<{ containerId: string; volumeId: string }>;

  /**
   * Start an existing container
   */
  startContainer(containerId: string): Promise<void>;

  /**
   * Stop a running container
   */
  stopContainer(containerId: string): Promise<void>;

  /**
   * Get detailed information about a container
   */
  inspectContainer(containerId: string): Promise<ContainerStats>;

  /**
   * Get logs stream from the container
   */
  getLogs(containerId: string, tail?: number): Promise<Readable>;

  /**
   * Remove a container and optionally its volume
   */
  removeContainer(
    containerId: string,
    volumeId?: string,
    preserveVolume?: boolean
  ): Promise<void>;

  /**
   * List all containers managed by this provider
   */
  listContainers(): Promise<ContainerStats[]>;

  /**
   * Execute a command inside the container
   */
  executeCommand(
    containerId: string,
    command: string[]
  ): Promise<{ exitCode: number; output: string }>;

  /**
   * Create a persistent volume
   */
  createVolume(name: string, labels?: Record<string, string>): Promise<void>;

  /**
   * List available volumes
   */
  listVolumes(filter?: Record<string, string>): Promise<VolumeStats[]>;

  /**
   * Delete a volume
   */
  deleteVolume(name: string): Promise<void>;

  /**
   * Get volume size in bytes
   */
  getVolumeSize(name: string): Promise<number>;

  /**
   * Check if volume is currently in use
   */
  isVolumeInUse(name: string): Promise<boolean>;
}
