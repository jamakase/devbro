import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import Docker from "dockerode";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const docker = new Docker();

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
    const info = await docker.getContainer(task.containerId).inspect();
    const binds = info.HostConfig?.Binds || [];
    const labels = info.Config?.Labels || {};
    const image = info.Config?.Image || info.Image;
    const env = (info.Config?.Env || []).map((e: string) =>
      e.startsWith("ANTHROPIC_API_KEY=") ? "ANTHROPIC_API_KEY=***masked***" : e
    );
    return NextResponse.json({ containerId: task.containerId, image, labels, binds, env });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to inspect container" }, { status: 500 });
  }
}
