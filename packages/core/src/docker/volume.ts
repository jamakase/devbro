import { VOLUME_NAME_PREFIX, VOLUME_SIZE_WARNING_THRESHOLD } from "@agent-sandbox/shared";
import type { ContainerProvider } from "../types/provider.js";

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
  private provider: ContainerProvider;

  constructor(provider: ContainerProvider) {
    this.provider = provider;
  }

  async createVolume(sandboxId: string): Promise<string> {
    const volumeName = `${VOLUME_NAME_PREFIX}${sandboxId}`;

    await this.provider.createVolume(volumeName, {
      "agent-sandbox.id": sandboxId,
    });

    return volumeName;
  }

  async listVolumes(knownSandboxIds: Set<string>): Promise<VolumeInfo[]> {
    const volumes = await this.provider.listVolumes({
      name: VOLUME_NAME_PREFIX,
    });

    const volumeInfos: VolumeInfo[] = [];

    for (const vol of volumes) {
      if (!vol.name.startsWith(VOLUME_NAME_PREFIX)) continue;

      const sandboxId = vol.name.slice(VOLUME_NAME_PREFIX.length);
      const isOrphaned = !knownSandboxIds.has(sandboxId);

      volumeInfos.push({
        name: vol.name,
        sandboxId: isOrphaned ? null : sandboxId,
        size: vol.size,
        createdAt: vol.createdAt,
        isOrphaned,
        sizeWarning: vol.size > VOLUME_SIZE_WARNING_THRESHOLD,
      });
    }

    return volumeInfos;
  }

  async deleteVolume(volumeName: string, checkInUse = true): Promise<void> {
    if (checkInUse) {
      const inUse = await this.provider.isVolumeInUse(volumeName);
      if (inUse) {
        throw new Error("Volume is in use by running sandbox");
      }
    }

    await this.provider.deleteVolume(volumeName);
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
}

