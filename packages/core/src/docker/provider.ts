import Docker from "dockerode";
import { PassThrough, Readable } from "stream";
import type { ContainerCreateOptions, ContainerInfo } from "dockerode";
import {
  DEFAULT_CONTAINER_IMAGE,
  WORKSPACE_MOUNT_PATH,
  VOLUME_NAME_PREFIX,
  DEFAULT_MEMORY_LIMIT,
  DEFAULT_CPU_LIMIT,
  CONTAINER_STOP_TIMEOUT,
  HEALTH_CHECK_TIMEOUT,
} from "@agent-sandbox/shared";
import type { SandboxConfig, SandboxStatus } from "@agent-sandbox/shared";
import type { ContainerProvider, ContainerStats, ProviderHealthResult, VolumeStats } from "../types/provider.js";

export class DockerProvider implements ContainerProvider {
  protected docker: Docker;

  constructor(options?: Docker.DockerOptions) {
    this.docker = new Docker(options);
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    try {
      const info = await Promise.race([
        this.docker.version(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Health check timeout")), HEALTH_CHECK_TIMEOUT)
        ),
      ]);

      return {
        healthy: true,
        version: info.Version,
        message: `Docker ${info.Version} is available`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return {
        healthy: false,
        message: `Docker unavailable: ${message}. Make sure Docker Desktop is running.`,
      };
    }
  }

  async createContainer(
    sandboxId: string,
    config: SandboxConfig = {}
  ): Promise<{ containerId: string; volumeId: string }> {
    const volumeName = `${VOLUME_NAME_PREFIX}${sandboxId}`;

    // Create volume first
    await this.docker.createVolume({ Name: volumeName });

    // Parse memory limit
    const memoryBytes = this.parseMemoryLimit(config.memoryLimit ?? DEFAULT_MEMORY_LIMIT);
    const cpuCount = config.cpuLimit ?? DEFAULT_CPU_LIMIT;

    const createOptions: ContainerCreateOptions = {
      Image: DEFAULT_CONTAINER_IMAGE,
      Cmd: ["/bin/bash", "-c", "tail -f /dev/null"], // Keep container running
      Tty: true,
      OpenStdin: true,
      HostConfig: {
        Binds: [`${volumeName}:${WORKSPACE_MOUNT_PATH}`],
        Memory: memoryBytes,
        NanoCpus: cpuCount * 1e9,
        RestartPolicy: { Name: "unless-stopped" },
      },
      WorkingDir: WORKSPACE_MOUNT_PATH,
      Env: config.apiKey ? [`ANTHROPIC_API_KEY=${config.apiKey}`] : [],
      Labels: {
        "agent-sandbox.id": sandboxId,
        "agent-sandbox.volume": volumeName,
      },
    };

    // Pull image if needed
    await this.ensureImage(DEFAULT_CONTAINER_IMAGE);

    const container = await this.docker.createContainer(createOptions);

    return {
      containerId: container.id,
      volumeId: volumeName,
    };
  }

  async startContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    if (!info.State.Running) {
      await container.start();
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    const info = await container.inspect();

    if (info.State.Running) {
      await container.stop({ t: CONTAINER_STOP_TIMEOUT });
    }
  }

  async removeContainer(containerId: string, volumeId?: string, preserveVolume = false): Promise<void> {
    const container = this.docker.getContainer(containerId);

    try {
      const info = await container.inspect();

      // Stop if running
      if (info.State.Running) {
        await container.stop({ t: CONTAINER_STOP_TIMEOUT });
      }

      // Get volume name before removing container if not provided
      const volumeName = volumeId || info.Config.Labels?.["agent-sandbox.volume"];

      // Remove container
      await container.remove({ force: true });

      // Remove volume if requested
      if (!preserveVolume && volumeName) {
        try {
          const volume = this.docker.getVolume(volumeName);
          await volume.remove();
        } catch {
          // Volume may not exist or be in use
        }
      }
    } catch (error) {
      // Container may not exist
      if (!(error instanceof Error && error.message.includes("no such container"))) {
        throw error;
      }
    }
  }

  async inspectContainer(containerId: string): Promise<ContainerStats> {
    const container = this.docker.getContainer(containerId);

    try {
      const info = await container.inspect();
      const status = this.mapContainerState(info.State);

      const stats: ContainerStats = {
        status,
        containerId,
      };

      if (info.State.Running && info.State.StartedAt) {
        const startTime = new Date(info.State.StartedAt).getTime();
        stats.uptime = Math.floor((Date.now() - startTime) / 1000);

        // Get live stats
        try {
          const liveStats = await container.stats({ stream: false });
          stats.memoryUsage = liveStats.memory_stats.usage;

          const cpuDelta =
            liveStats.cpu_stats.cpu_usage.total_usage -
            liveStats.precpu_stats.cpu_usage.total_usage;
          const systemDelta =
            liveStats.cpu_stats.system_cpu_usage - liveStats.precpu_stats.system_cpu_usage;
          const cpuCount = liveStats.cpu_stats.online_cpus || 1;

          if (systemDelta > 0) {
            stats.cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100;
          }
        } catch {
          // Stats may not be available
        }
      }

      return stats;
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such container")) {
        return { status: "error", containerId };
      }
      throw error;
    }
  }

  async listContainers(): Promise<ContainerStats[]> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        label: ["agent-sandbox.id"],
      },
    });

    return containers.map(info => ({
        containerId: info.Id,
        status: this.mapContainerStateStr(info.State),
        // Minimal stats for list view
    }));
  }

  async getLogs(
    containerId: string,
    tail = 100
  ): Promise<Readable> {
    const container = this.docker.getContainer(containerId);

    const logStream = await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
      tail,
      timestamps: true,
    });

    // Docker multiplexes stdout/stderr, demux it
    const output = new PassThrough();
    this.docker.modem.demuxStream(logStream, output, output);

    return output;
  }

  // Not in interface but needed for functionality? 
  // Wait, interface has `execute`? No, I added `execute` to the interface in my thought but not in the file I created?
  // Let me check the interface file I created.
  
  /*
  export interface ContainerProvider {
  ...
  }
  */
  
  // I need to check `packages/core/src/types/provider.ts` content again.
  // I might have missed `execute`.
  
  async executeCommand(containerId: string, command: string[]): Promise<{ exitCode: number; output: string }> {
    const container = this.docker.getContainer(containerId);

    const exec = await container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
      let output = "";
      const outputStream = new PassThrough();

      outputStream.on("data", (chunk) => {
        output += chunk.toString();
      });

      this.docker.modem.demuxStream(stream, outputStream, outputStream);

      stream.on("end", async () => {
        try {
          const inspectResult = await exec.inspect();
          resolve({
            exitCode: inspectResult.ExitCode ?? 1,
            output: output.trim(),
          });
        } catch (error) {
          reject(error);
        }
      });

      stream.on("error", reject);
    });
  }

  async createVolume(name: string, labels?: Record<string, string>): Promise<void> {
    await this.docker.createVolume({
      Name: name,
      Labels: {
        ...labels,
        "agent-sandbox.created": new Date().toISOString(),
      },
    });
  }

  async listVolumes(filter?: Record<string, string>): Promise<VolumeStats[]> {
    const filters: Record<string, string[]> = {};
    if (filter) {
      if (filter.label) {
        filters.label = [filter.label];
      }
      if (filter.name) {
        filters.name = [filter.name];
      }
    }

    const { Volumes } = await this.docker.listVolumes({ filters });

    const volumeStats: VolumeStats[] = [];
    for (const vol of Volumes ?? []) {
       // Get volume size using docker system df (expensive operation, maybe we should optimize this later)
       // For now, consistent with VolumeManager
       let size = 0;
       try {
         size = await this.getVolumeSize(vol.Name);
       } catch {
         // ignore error
       }

       volumeStats.push({
         name: vol.Name,
         size,
         createdAt: vol.Labels?.["agent-sandbox.created"] ?? (vol as any).CreatedAt ?? "",
         labels: vol.Labels,
       });
    }
    return volumeStats;
  }

  async deleteVolume(name: string): Promise<void> {
    const volume = this.docker.getVolume(name);
    await volume.remove();
  }

  async getVolumeSize(name: string): Promise<number> {
    try {
      const df = await this.docker.df();
      const volumeInfo = df.Volumes?.find(
        (v: { Name: string; UsageData?: { Size?: number } }) => v.Name === name
      );
      return volumeInfo?.UsageData?.Size ?? 0;
    } catch {
      return 0;
    }
  }

  async isVolumeInUse(name: string): Promise<boolean> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        volume: [name],
      },
    });
    return containers.some((c) => c.State === "running");
  }

  private async ensureImage(imageName: string): Promise<void> {
    try {
      await this.docker.getImage(imageName).inspect();
    } catch {
      // Image doesn't exist, pull it
      const stream = await this.docker.pull(imageName);
      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(stream, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  private parseMemoryLimit(limit: string): number {
    const match = limit.match(/^(\d+)([kmg]?)$/i);
    if (!match) {
      return 2 * 1024 * 1024 * 1024; // Default 2GB
    }

    const value = parseInt(match[1]!, 10);
    const unit = (match[2] ?? "").toLowerCase();

    switch (unit) {
      case "k":
        return value * 1024;
      case "m":
        return value * 1024 * 1024;
      case "g":
        return value * 1024 * 1024 * 1024;
      default:
        return value;
    }
  }

  private mapContainerState(state: Docker.ContainerInspectInfo["State"]): SandboxStatus {
    if (state.Running) return "running";
    if (state.Paused) return "stopped";
    if (state.Restarting) return "starting";
    if (state.Dead || state.OOMKilled) return "error";
    return "stopped";
  }

  private mapContainerStateStr(state: string): SandboxStatus {
     // Docker listContainers returns State as string
     // "created", "restarting", "running", "removing", "paused", "exited", "dead"
     switch(state) {
        case "running": return "running";
        case "restarting": return "starting";
        case "paused": 
        case "exited": return "stopped";
        case "dead": return "error";
        default: return "stopped";
     }
  }
}
