import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { DockerProvider } from "@agent-sandbox/core";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const dockerProvider = new DockerProvider();

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const tail = parseInt(searchParams.get("tail") || "100");
    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    if (!task.containerId) {
      return NextResponse.json({ error: "Container not started" }, { status: 400 });
    }
    const output = await dockerProvider.getLogs(task.containerId, tail);
    let buffer = "";
    await new Promise<void>((resolve, reject) => {
      output.on("data", (chunk) => {
        buffer += chunk.toString();
      });
      output.on("end", () => resolve());
      output.on("error", reject);
      setTimeout(() => resolve(), 1000);
    });
    return new NextResponse(buffer, { status: 200, headers: { "Content-Type": "text/plain" } });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to get logs" }, { status: 500 });
  }
}
