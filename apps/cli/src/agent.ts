import Conf from "conf";
import fetch from "node-fetch";
import { DockerProvider, CLIProvisioner, ContainerProvider } from "@agent-sandbox/core";
import { Task, ApiResponse, CLITool } from "@agent-sandbox/shared";

const config = new Conf({ projectName: "agent-sandbox-cli" });

export async function startAgent() {
  console.log("startAgent entry");
  const url = config.get("url") as string;
  const serverId = config.get("serverId") as string;
  const token = config.get("token") as string;

  console.log(`Starting agent for server ${serverId} connecting to ${url}...`);

  const containerProvider: ContainerProvider = new DockerProvider({ socketPath: "/var/run/docker.sock" });
  const provisioner = new CLIProvisioner(containerProvider);

  // Health check
  const health = await containerProvider.healthCheck();
  if (!health.healthy) {
      console.error("Container provider not healthy:", health.message);
      // We continue anyway, maybe it recovers? But for now exit.
      // process.exit(1);
      console.warn("Continuing despite Docker health check failure...");
  }

  console.log("Agent started. Polling for tasks...");

  // Polling loop
  while (true) {
    try {
      // 1. Heartbeat
      await sendHeartbeat(url, serverId, token, {
          dockerVersion: health.version,
      });

      // 2. Get Tasks
      const tasks = await getPendingTasks(url, serverId, token);

      for (const task of tasks) {
          console.log(`Processing task ${task.id}: ${task.name}`);
          await processTask(task, containerProvider, provisioner, url, serverId, token);
      }

    } catch (e) {
      console.error("Error in polling loop:", e);
    }
    await new Promise(r => setTimeout(r, 5000));
  }
}

async function sendHeartbeat(baseUrl: string, serverId: string, token: string, stats: any) {
    const res = await fetch(`${baseUrl}/api/servers/${serverId}/heartbeat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ stats })
    });
    if (!res.ok) throw new Error(`Heartbeat failed: ${res.statusText}`);
}

async function getPendingTasks(baseUrl: string, serverId: string, token: string): Promise<Task[]> {
    const res = await fetch(`${baseUrl}/api/servers/${serverId}/tasks`, {
        headers: {
            "Authorization": `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error(`Get tasks failed: ${res.statusText}`);
    const json = await res.json() as ApiResponse<Task[]>;
    if (!json.success || !json.data) return [];
    return json.data;
}

async function processTask(
    task: Task, 
    provider: ContainerProvider, 
    provisioner: CLIProvisioner, 
    baseUrl: string, 
    serverId: string, 
    token: string
) {
    const inspectRequest = (task.config as any)?.inspectRequest as any;
    if (inspectRequest?.status === "pending") {
        await handleInspectRequest(task, provider, baseUrl, serverId, token, inspectRequest);
        return;
    }
    await updateTaskStatus(baseUrl, serverId, token, task.id, "running");

    try {
        // Create container
        const { containerId } = await provider.createContainer(task.id, {
            ...task.config,
            cpuLimit: task.config.cpuLimit ? parseInt(task.config.cpuLimit) : undefined
        });
        await provider.startContainer(containerId);
        
        // Update task with containerId
        await updateTaskStatus(baseUrl, serverId, token, task.id, "running", { containerId });

        // Install CLI
        const toolName = (task.cliTool === "claude" ? "claude-code" : "opencode") as CLITool;
        
        const installResult = await provisioner.installAgent(containerId, toolName);
        if (!installResult.success) {
            throw new Error(installResult.message);
        }

        // Setup environment (repo clone)
        if (task.config?.githubRepo) {
             const setup = await provisioner.setupEnvironment(containerId, task.config);
             if (!setup.success) throw new Error(setup.message);
        }

        // Execute Task
        const prompt = task.config?.prompt;
        if (prompt) {
            const apiKey = task.config?.anthropicApiKey;
            const result = await provisioner.executeAgentTask(containerId, toolName, prompt, apiKey);
            
            await updateTaskStatus(baseUrl, serverId, token, task.id, result.success ? "completed" : "error", {
                exitCode: result.exitCode,
                output: result.output
            });
        } else {
             await updateTaskStatus(baseUrl, serverId, token, task.id, "completed", {
                 output: "No prompt provided, environment setup only."
             });
        }

    } catch (error) {
        console.error(`Task ${task.id} failed:`, error);
        await updateTaskStatus(baseUrl, serverId, token, task.id, "error", { 
            errorMessage: error instanceof Error ? error.message : String(error) 
        });
    }
}

async function handleInspectRequest(
    task: Task,
    provider: ContainerProvider,
    baseUrl: string,
    serverId: string,
    token: string,
    inspectRequest: any
) {
    const completedAt = new Date().toISOString();
    if (!task.containerId) {
        await updateTaskStatus(baseUrl, serverId, token, task.id, undefined, {
            config: {
                ...task.config,
                inspectRequest: {
                    ...inspectRequest,
                    status: "failed",
                    completedAt,
                    errorMessage: "Container not started",
                },
            },
        });
        return;
    }
    try {
        const result = await provider.inspectContainer(task.containerId);
        await updateTaskStatus(baseUrl, serverId, token, task.id, undefined, {
            config: {
                ...task.config,
                inspectRequest: {
                    ...inspectRequest,
                    status: "completed",
                    completedAt,
                    result,
                },
            },
        });
    } catch (error) {
        await updateTaskStatus(baseUrl, serverId, token, task.id, undefined, {
            config: {
                ...task.config,
                inspectRequest: {
                    ...inspectRequest,
                    status: "failed",
                    completedAt,
                    errorMessage: error instanceof Error ? error.message : String(error),
                },
            },
        });
    }
}

async function updateTaskStatus(
    baseUrl: string, 
    serverId: string, 
    token: string, 
    taskId: string, 
    status?: string,
    updates?: any
) {
    // We need to implement this endpoint on the server
    const res = await fetch(`${baseUrl}/api/servers/${serverId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...(status ? { status } : {}), ...updates })
    });
    // Ignore errors for now or log
    if (!res.ok) console.error(`Failed to update task status: ${res.statusText}`);
}
