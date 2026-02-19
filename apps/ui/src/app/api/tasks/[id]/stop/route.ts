import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { DockerProvider } from "@agent-sandbox/core";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const dockerProvider = new DockerProvider();

// POST /api/tasks/[id]/stop - Stop task's container
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

    if (task.status === "stopped") {
      return NextResponse.json(task);
    }

    if (task.containerId) {
      try {
        await dockerProvider.stopContainer(task.containerId);
      } catch (error) {
        console.error("Error stopping container:", error);
        // Continue to update status even if docker stop fails (maybe already stopped)
      }
    }

    const updatedTask = await taskRepo.update(id, {
      status: "stopped",
      lastActivityAt: new Date(),
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error stopping task:", error);
    return NextResponse.json(
      { error: "Failed to stop task" },
      { status: 500 }
    );
  }
}
