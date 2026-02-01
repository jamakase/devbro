import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { DockerClient } from "@agent-sandbox/core";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const dockerClient = new DockerClient();

// POST /api/tasks/[id]/start - Start task's container
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === "running") {
      return NextResponse.json(task);
    }

    let containerId = task.containerId;
    let volumeId = task.volumeId;

    try {
      if (!containerId) {
        // Create new container if not exists
        const result = await dockerClient.createContainer(id, {
          ...task.config,
          cpuLimit: task.config.cpuLimit ? parseInt(task.config.cpuLimit) : undefined,
          apiKey: task.config.anthropicApiKey,
        });
        containerId = result.containerId;
        volumeId = result.volumeId;
      }

      // Start the container
      if (containerId) {
        await dockerClient.startContainer(containerId);
      }
    } catch (dockerError) {
      console.error("Docker error:", dockerError);
      // Determine if it's a "container not found" error to try recreation?
      // For now, fail
      throw new Error(`Failed to start container: ${dockerError instanceof Error ? dockerError.message : String(dockerError)}`);
    }

    const updatedTask = await taskRepo.update(id, {
      status: "running",
      containerId,
      volumeId,
      lastActivityAt: new Date(),
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error starting task:", error);
    return NextResponse.json(
      { error: "Failed to start task" },
      { status: 500 }
    );
  }
}
