import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { TaskRepository, MessageRepository } from "@agent-sandbox/server";
import { DockerClient } from "@agent-sandbox/core";
import { CLIProvisioner } from "@agent-sandbox/core";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const messageRepo = new MessageRepository();
const dockerClient = new DockerClient();
const provisioner = new CLIProvisioner(dockerClient as any);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const prompt: string = body?.prompt ?? "";
    const overrideKey: string | undefined = body?.anthropicApiKey;

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    let containerId = task.containerId;
    let volumeId = task.volumeId;
    const apiKey = overrideKey ?? (task.config as any)?.anthropicApiKey;

    if (!containerId) {
      const result = await dockerClient.createContainer(id, {
        ...task.config,
        cpuLimit: task.config.cpuLimit ? parseInt(task.config.cpuLimit) : undefined,
        apiKey,
      } as any);
      containerId = result.containerId;
      volumeId = result.volumeId;
    }

    if (containerId) {
      await dockerClient.startContainer(containerId);
    }

    const cliTool = task.cliTool === "claude" ? "claude-code" : "opencode";
    const install = await provisioner.installCLI(containerId!, cliTool as any);
    const result = await provisioner.executeTask(containerId!, cliTool as any, prompt, apiKey);

    await taskRepo.update(id, {
      status: result.success ? "running" : "error",
      containerId,
      volumeId,
      lastActivityAt: new Date(),
    });

    await messageRepo.create({
      taskId: id,
      role: "assistant",
      content: result.output ?? "",
      toolCalls: [
        {
          id: randomUUID(),
          type: "cli",
          name: cliTool,
          input: { prompt },
          output: result.output,
        },
      ],
    });

    return NextResponse.json({
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      installed: install.success,
      version: install.version,
      fallback: install.usedFallback,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to run task", message }, { status: 500 });
  }
}
