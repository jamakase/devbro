import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!task.containerId) {
      return NextResponse.json({ error: "Container not started" }, { status: 400 });
    }
    return NextResponse.json({
      containerId: task.containerId,
      image: null,
      labels: {},
      binds: [],
      env: [],
      message: "Container inspection unavailable in serverless environment",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to inspect container" }, { status: 500 });
  }
}
