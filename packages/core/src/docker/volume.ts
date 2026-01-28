import Docker from "dockerode";
import { VOLUME_NAME_PREFIX, VOLUME_SIZE_WARNING_THRESHOLD } from "@agent-sandbox/shared";

export interface VolumeInfo {
  name: string;
  sandboxId: string | null;
  size: number;
  createdAt: string;
  isOrphaned: boolean;
  sizeWarning: boolean;
}

export interface VolumeCleanupResult {
  removed: string[];
  freedBytes: number;
  errors: Array<{ volume: string; error: string }>;
}

export class VolumeManager {
  private docker: Docker;

  constructor(docker: Docker) {
    this.docker = docker;
  }

  async createVolume(sandboxId: string): Promise<string> {
    const volumeName = `${VOLUME_NAME_PREFIX}${sandboxId}`;

    await this.docker.createVolume({
      Name: volumeName,
      Labels: {
        "agent-sandbox.id": sandboxId,
        "agent-sandbox.created": new Date().toISOString(),
      },
    });

    return volumeName;
  }

  async listVolumes(knownSandboxIds: Set<string>): Promise<VolumeInfo[]> {
    const { Volumes } = await this.docker.listVolumes({
      filters: {
        name: [VOLUME_NAME_PREFIX],
      },
    });

    const volumeInfos: VolumeInfo[] = [];

    for (const vol of Volumes ?? []) {
      if (!vol.Name.startsWith(VOLUME_NAME_PREFIX)) continue;

      const sandboxId = vol.Name.slice(VOLUME_NAME_PREFIX.length);
      const isOrphaned = !knownSandboxIds.has(sandboxId);

      // Get volume size using docker system df
      const size = await this.getVolumeSize(vol.Name);

      volumeInfos.push({
        name: vol.Name,
        sandboxId: isOrphaned ? null : sandboxId,
        size,
        createdAt:
          vol.Labels?.["agent-sandbox.created"] ??
          (vol as { CreatedAt?: string }).CreatedAt ??
          "",
        isOrphaned,
        sizeWarning: size > VOLUME_SIZE_WARNING_THRESHOLD,
      });
    }

    return volumeInfos;
  }

  async deleteVolume(volumeName: string, checkInUse = true): Promise<void> {
    if (checkInUse) {
      const inUse = await this.isVolumeInUse(volumeName);
      if (inUse) {
        throw new Error("Volume is in use by running sandbox");
      }
    }

    const volume = this.docker.getVolume(volumeName);
    await volume.remove();
  }

  async getOrphanedVolumes(knownSandboxIds: Set<string>): Promise<VolumeInfo[]> {
    const volumes = await this.listVolumes(knownSandboxIds);
    return volumes.filter((v) => v.isOrphaned);
  }

  async cleanupOrphanedVolumes(knownSandboxIds: Set<string>): Promise<VolumeCleanupResult> {
    const orphaned = await this.getOrphanedVolumes(knownSandboxIds);
    const result: VolumeCleanupResult = {
      removed: [],
      freedBytes: 0,
      errors: [],
    };

    for (const volume of orphaned) {
      try {
        await this.deleteVolume(volume.name, false);
        result.removed.push(volume.name);
        result.freedBytes += volume.size;
      } catch (error) {
        result.errors.push({
          volume: volume.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return result;
  }

  private async isVolumeInUse(volumeName: string): Promise<boolean> {
    const containers = await this.docker.listContainers({
      all: true,
      filters: {
        volume: [volumeName],
      },
    });

    return containers.some((c) => c.State === "running");
  }

  private async getVolumeSize(volumeName: string): Promise<number> {
    try {
      // Use docker system df to get volume sizes
      const df = await this.docker.df();
      const volumeInfo = df.Volumes?.find(
        (v: { Name: string; UsageData?: { Size?: number } }) => v.Name === volumeName
      );
      return volumeInfo?.UsageData?.Size ?? 0;
    } catch {
      return 0;
    }
  }
}
