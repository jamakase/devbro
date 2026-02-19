import * as k8s from '@kubernetes/client-node';
import { Readable, PassThrough } from 'stream';
import { ContainerProvider, ContainerStats, ProviderHealthResult, VolumeStats } from '../types/provider.js';
import { SandboxConfig, SandboxStatus } from '@agent-sandbox/shared';

const LABEL_SANDBOX_ID = 'agent-sandbox.id';
const LABEL_CREATED_BY = 'agent-sandbox.created-by';
const ANNOTATION_CONFIG = 'agent-sandbox.config';

export class KubernetesProvider implements ContainerProvider {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private k8sExec: k8s.Exec;
  private k8sLog: k8s.Log;
  private namespace: string;

  constructor(config?: { kubeConfigPath?: string; namespace?: string; kubeConfigContent?: string }) {
    this.kc = new k8s.KubeConfig();
    
    if (config?.kubeConfigContent) {
        this.kc.loadFromString(config.kubeConfigContent);
    } else if (config?.kubeConfigPath) {
      this.kc.loadFromFile(config.kubeConfigPath);
    } else {
      this.kc.loadFromDefault();
    }

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sExec = new k8s.Exec(this.kc);
    this.k8sLog = new k8s.Log(this.kc);
    this.namespace = config?.namespace || 'default';
  }

  async healthCheck(): Promise<ProviderHealthResult> {
    try {
      // Use list pods as health check
      await this.k8sApi.listNamespacedPod({
        namespace: this.namespace,
        limit: 1
      });
      return {
        healthy: true,
        version: 'connected',
        message: 'Connected to Kubernetes cluster',
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async createContainer(
    sandboxId: string,
    config?: SandboxConfig
  ): Promise<{ containerId: string; volumeId: string }> {
    const name = `sandbox-${sandboxId}`;
    const volumeName = `pvc-${sandboxId}`;

    // 1. Create PVC if it doesn't exist
    await this.ensurePVC(volumeName, sandboxId);

    // 2. Create Pod
    const pod = this.createPodManifest(name, volumeName, sandboxId, config);
    
    try {
      await this.k8sApi.createNamespacedPod({
        namespace: this.namespace,
        body: pod
      });
    } catch (error: any) {
      if (error.response?.statusCode === 409) {
        // Already exists, ignore
      } else {
        throw error;
      }
    }

    return { containerId: name, volumeId: volumeName };
  }

  async startContainer(containerId: string): Promise<void> {
    // In K8s, "starting" a container that was "stopped" (deleted) means recreating it.
    // We need to fetch the config to recreate it.
    // For now, we assume if the pod exists, it's running.
    // If it doesn't exist, we need the original config to recreate it, which is hard here.
    // BUT, we can store the config in the PVC annotations or just assume the caller handles lifecycle.
    
    // Check if pod exists
    try {
      await this.k8sApi.readNamespacedPod({
        name: containerId,
        namespace: this.namespace
      });
      // It exists, so it's likely running or pending.
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        throw new Error(`Pod ${containerId} not found. Cannot start a deleted pod without config.`);
      }
      throw error;
    }
  }

  async stopContainer(containerId: string): Promise<void> {
    // In K8s, "stopping" usually means deleting the pod.
    try {
      await this.k8sApi.deleteNamespacedPod({
        name: containerId,
        namespace: this.namespace
      });
    } catch (error: any) {
      if (error.response?.statusCode !== 404) {
        throw error;
      }
    }
  }

  async inspectContainer(containerId: string): Promise<ContainerStats> {
    try {
      const pod = await this.k8sApi.readNamespacedPod({
        name: containerId,
        namespace: this.namespace
      });
      
      let status: SandboxStatus = 'unknown' as SandboxStatus;
      const phase = pod.status?.phase;

      if (phase === 'Running') status = 'running';
      else if (phase === 'Pending') status = 'creating';
      else if (phase === 'Succeeded' || phase === 'Failed') status = 'stopped';
      else status = 'stopped';
      
      // Calculate uptime
      let uptime = 0;
      if (pod.status?.startTime) {
        uptime = (Date.now() - new Date(pod.status.startTime).getTime()) / 1000;
      }

      return {
        containerId,
        status,
        uptime,
      };
    } catch (error: any) {
      if (error.response?.statusCode === 404) {
        return {
            containerId,
            status: 'stopped', // Treat missing pod as stopped
        };
      }
      throw error;
    }
  }

  async getLogs(containerId: string, tail?: number): Promise<Readable> {
    // k8s log stream
    const logStream = new Readable({
        read() {}
    });

    const logOptions = {
        follow: true,
        tailLines: tail,
        pretty: false,
        timestamps: false,
    };

    // Use k8sLog utility
    // Note: The library's logStream returns a promise that resolves to a request object, 
    // but we need to pipe the stream.
    // A simpler way is to use the raw request.
    
    // We'll wrap the stream logic.
    // For simplicity with this library version, we might need to handle it carefully.
    
    // This is a simplified implementation. Real-world needs robust stream handling.
    // @ts-ignore
    const stream = await this.k8sLog.log(this.namespace, containerId, containerId, logStream, logOptions);
    
    return logStream;
  }

  async removeContainer(
    containerId: string,
    volumeId?: string,
    preserveVolume?: boolean
  ): Promise<void> {
    // Delete Pod
    try {
        await this.k8sApi.deleteNamespacedPod({
          name: containerId,
          namespace: this.namespace
        });
    } catch (e: any) {
        if (e.response?.statusCode !== 404) throw e;
    }

    // Delete PVC if requested
    if (volumeId && !preserveVolume) {
        await this.deleteVolume(volumeId);
    }
  }

  async listContainers(): Promise<ContainerStats[]> {
    const list = await this.k8sApi.listNamespacedPod({
        namespace: this.namespace,
        labelSelector: `${LABEL_CREATED_BY}=agent-sandbox`
    });

    return list.items.map((pod: k8s.V1Pod) => {
        let status: SandboxStatus = 'unknown' as SandboxStatus;
        const phase = pod.status?.phase;
        if (phase === 'Running') status = 'running';
        else if (phase === 'Pending') status = 'creating';
        else status = 'stopped';

        return {
            containerId: pod.metadata?.name || '',
            status,
        };
    });
  }

  async executeCommand(
    containerId: string,
    command: string[]
  ): Promise<{ exitCode: number; output: string }> {
    // k8sExec
    // The exec library requires a Writable stream for stdout/stderr
    // and returns a WebSocket.
    
    // We'll use a wrapper to capture output.
    let stdoutOutput = '';
    let stderrOutput = '';
    
    const stdoutStream = new PassThrough();
    const stderrStream = new PassThrough();

    stdoutStream.on('data', (chunk) => {
        stdoutOutput += chunk.toString();
    });

    stderrStream.on('data', (chunk) => {
        stderrOutput += chunk.toString();
    });

    return new Promise(async (resolve, reject) => {
        try {
            // exec method signature: (namespace, podName, containerName, command, stdout, stderr, stdin, tty, statusCallback)
            await this.k8sExec.exec(
                this.namespace,
                containerId,
                containerId, // assume container name matches pod name or is the first one
                command,
                stdoutStream,
                stderrStream,
                null,
                false,
                (status: k8s.V1Status) => {
                    const output = stdoutOutput + stderrOutput;
                    if (status.status === 'Success' || !status.status) { // Success or undefined (sometimes)
                        resolve({ exitCode: 0, output });
                    } else {
                        resolve({ exitCode: 1, output: output + "\n" + (status.message || "Failed") });
                    }
                }
            );
        } catch (e) {
            reject(e);
        }
    });
  }

  async createVolume(name: string, labels?: Record<string, string>): Promise<void> {
    const pvc: k8s.V1PersistentVolumeClaim = {
        metadata: {
            name,
            labels: {
                ...labels,
                [LABEL_CREATED_BY]: 'agent-sandbox',
            }
        },
        spec: {
            accessModes: ['ReadWriteOnce'],
            resources: {
                requests: {
                    storage: '1Gi'
                }
            }
        }
    };
    await this.k8sApi.createNamespacedPersistentVolumeClaim({
        namespace: this.namespace,
        body: pvc
    });
  }

  async listVolumes(filter?: Record<string, string>): Promise<VolumeStats[]> {
    let labelSelector = `${LABEL_CREATED_BY}=agent-sandbox`;
    if (filter) {
        Object.entries(filter).forEach(([k, v]) => {
            labelSelector += `,${k}=${v}`;
        });
    }

    const list = await this.k8sApi.listNamespacedPersistentVolumeClaim({
        namespace: this.namespace,
        labelSelector
    });

    return list.items.map((pvc: k8s.V1PersistentVolumeClaim) => ({
        name: pvc.metadata?.name || '',
        size: 0, // Hard to get actual usage without metrics
        createdAt: pvc.metadata?.creationTimestamp?.toISOString() || new Date().toISOString(),
        labels: pvc.metadata?.labels || {},
    }));
  }

  async deleteVolume(name: string): Promise<void> {
    try {
        await this.k8sApi.deleteNamespacedPersistentVolumeClaim({
            name,
            namespace: this.namespace
        });
    } catch (e: any) {
        if (e.response?.statusCode !== 404) throw e;
    }
  }

  async getVolumeSize(name: string): Promise<number> {
    return 0; // Not easily available
  }

  async isVolumeInUse(name: string): Promise<boolean> {
    // Check if any pod mounts this PVC
    const list = await this.k8sApi.listNamespacedPod({
        namespace: this.namespace
    });
    return list.items.some((pod: k8s.V1Pod) => 
        pod.spec?.volumes?.some((v: k8s.V1Volume) => v.persistentVolumeClaim?.claimName === name)
    );
  }

  // Helper methods

  private async ensurePVC(name: string, sandboxId: string): Promise<void> {
    try {
        await this.k8sApi.readNamespacedPersistentVolumeClaim({
            name,
            namespace: this.namespace
        });
    } catch (e: any) {
        if (e.response?.statusCode === 404) {
            await this.createVolume(name, { [LABEL_SANDBOX_ID]: sandboxId });
        } else {
            throw e;
        }
    }
  }

  private createPodManifest(
    name: string, 
    volumeName: string, 
    sandboxId: string, 
    config?: SandboxConfig
  ): k8s.V1Pod {
    return {
        metadata: {
            name,
            labels: {
                [LABEL_SANDBOX_ID]: sandboxId,
                [LABEL_CREATED_BY]: 'agent-sandbox',
            }
        },
        spec: {
            containers: [{
                name: name, // Container name same as pod name
                image: config?.image || 'node:18-slim', // Default image
                command: ['/bin/sh', '-c', 'sleep infinity'], // Keep alive
                env: config?.env ? Object.entries(config.env).map(([k, v]) => ({ name: k, value: v })) : [],
                workingDir: '/workspace',
                volumeMounts: [{
                    name: 'workspace',
                    mountPath: '/workspace'
                }],
                resources: {
                    limits: {
                        cpu: config?.cpuLimit ? String(config.cpuLimit) : '1',
                        memory: config?.memoryLimit ? config.memoryLimit : '1Gi'
                    }
                }
            }],
            volumes: [{
                name: 'workspace',
                persistentVolumeClaim: {
                    claimName: volumeName
                }
            }],
            restartPolicy: 'Always'
        }
    };
  }
}
