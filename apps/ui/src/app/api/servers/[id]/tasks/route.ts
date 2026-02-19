import { NextRequest, NextResponse } from "next/server";
import { ServerRepository, TaskRepository } from "@agent-sandbox/server";
import type { ApiResponse, Task } from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();
const taskRepo = new TaskRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
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

    // 2. Fetch pending tasks
    const tasks = await taskRepo.findPendingByServerId(id);

    // 3. Update server last connected status
    await serverRepo.update(id, server.userId, {
      status: "connected",
      lastConnectedAt: new Date(),
    });

    return NextResponse.json<ApiResponse<Task[]>>({
      success: true,
      data: tasks,
    });

  } catch (error) {
    console.error("Error fetching server tasks:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
