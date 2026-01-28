import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();

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

    // TODO: Stop Docker container using core package
    // For now, just update status
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
