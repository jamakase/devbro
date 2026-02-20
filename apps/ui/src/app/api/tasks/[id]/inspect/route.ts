import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { ProviderFactory, ServerRepository, TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();
const serverRepo = new ServerRepository();

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
    if (task.serverId) {
      const server = await serverRepo.findById(task.serverId);
      if (!server) {
        return NextResponse.json({ error: "Server not found" }, { status: 404 });
      }
      if (server.type === "registered") {
        const existingRequest = (task.config as any)?.inspectRequest as any;
        if (existingRequest?.status === "completed" && existingRequest.result) {
          return NextResponse.json(existingRequest.result);
        }
        if (existingRequest?.status === "failed") {
          return NextResponse.json(
            { error: existingRequest.errorMessage || "Inspection failed" },
            { status: 502 }
          );
        }
        if (existingRequest?.status === "pending") {
          return NextResponse.json(
            { status: "pending", requestId: existingRequest.id },
            { status: 202 }
          );
        }
        const inspectRequest = {
          id: randomUUID(),
          status: "pending",
          requestedAt: new Date().toISOString(),
        };
        await taskRepo.update(task.id, {
          config: {
            ...(task.config as any),
            inspectRequest,
          } as any,
          lastActivityAt: new Date(),
        });
        return NextResponse.json(
          { status: "pending", requestId: inspectRequest.id },
          { status: 202 }
        );
      }
      const provider = ProviderFactory.getProvider(server);
      const stats = await provider.inspectContainer(task.containerId);
      return NextResponse.json(stats);
    }
    return NextResponse.json({ error: "Server not configured" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to inspect container" }, { status: 500 });
  }
}
