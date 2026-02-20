import { NextRequest, NextResponse } from "next/server";
import { ServerRepository, TaskRepository } from "@agent-sandbox/server";
import type { ApiResponse, TaskStatus } from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();
const taskRepo = new TaskRepository();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { id, taskId } = await params;
    
    // 1. Authenticate Server
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Missing token" } },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    const server = await serverRepo.findById(id);
    if (!server) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Server not found" } },
        { status: 404 }
      );
    }

    if (server.token !== token) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Invalid token" } },
        { status: 401 }
      );
    }

    // 2. Validate Task Ownership
    const task = await taskRepo.findById(taskId);
    if (!task) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    if (task.serverId !== id) {
        // Allow if task is not assigned? No, it should be assigned before processing.
        // But the agent might have picked it up.
        // If task.serverId is null, we can assign it now?
        // The polling endpoint returns tasks with `serverId` matching.
        // So it should match.
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Task not assigned to this server" } },
        { status: 403 }
      );
    }

    // 3. Update Task
    const body = await request.json();
    const updates: any = {};
    
    if (body.status) updates.status = body.status as TaskStatus;
    if (body.containerId) updates.containerId = body.containerId;
    if (body.errorMessage) updates.errorMessage = body.errorMessage;
    if (body.config && typeof body.config === "object") {
      const currentConfig = task.config || {};
      updates.config = {
        ...currentConfig,
        ...body.config,
      };
    }
    
    if (body.output !== undefined || body.exitCode !== undefined) {
        const baseConfig = updates.config ?? task.config ?? {};
        updates.config = {
            ...baseConfig,
            lastResult: {
                success: body.status === 'completed',
                exitCode: body.exitCode ?? (body.status === 'completed' ? 0 : 1),
                output: body.output ?? ""
            }
        };
    }

    updates.lastActivityAt = new Date();

    const updatedTask = await taskRepo.update(taskId, updates);

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      success: true,
      data: { success: true },
    });

  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
