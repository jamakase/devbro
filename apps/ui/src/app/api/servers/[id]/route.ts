import { NextRequest, NextResponse } from "next/server";
import { ServerRepository, TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, GetServerResponse } from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();
const taskRepo = new TaskRepository();

// GET /api/servers/:id - Get server details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { id } = await params;

    // Get all servers with stats and filter for the specific one
    const servers = await serverRepo.findByUserId(userId);
    const server = servers.find((s) => s.id === id);

    if (!server) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Server not found" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<GetServerResponse>>({
      success: true,
      data: { server },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/servers/:id - Remove server
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { id } = await params;

    const server = await serverRepo.findByIdAndUser(id, userId);

    if (!server) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Server not found" },
        },
        { status: 404 }
      );
    }

    // Check for associated tasks using findByUserId and filter
    const userServers = await serverRepo.findByUserId(userId);
    const serverWithStats = userServers.find((s) => s.id === id);
    const taskCount = serverWithStats?.taskCount ?? 0;

    if (taskCount > 0) {
      const { searchParams } = new URL(request.url);
      const force = searchParams.get("force") === "true";

      if (!force) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: "HAS_TASKS",
              message: `Server has ${taskCount} task(s). Use force=true to delete anyway.`,
            },
          },
          { status: 400 }
        );
      }
    }

    await serverRepo.delete(id, userId);

    return NextResponse.json<ApiResponse<{ message: string }>>({
      success: true,
      data: { message: "Server removed successfully" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/servers/:id - Update server
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const { id } = await params;

    const server = await serverRepo.findByIdAndUser(id, userId);

    if (!server) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Server not found" },
        },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updates: Parameters<typeof serverRepo.update>[2] = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.host !== undefined) updates.host = body.host;
    if (body.port !== undefined) updates.port = body.port;
    if (body.username !== undefined) updates.username = body.username;
    if (body.authType !== undefined) updates.authType = body.authType;
    if (body.privateKey !== undefined) updates.privateKey = body.privateKey;
    if (body.isDefault !== undefined) updates.isDefault = body.isDefault;

    const updated = await serverRepo.update(id, userId, updates);

    // Get fresh data with stats
    const servers = await serverRepo.findByUserId(userId);
    const serverWithStats = servers.find((s) => s.id === id);

    return NextResponse.json<ApiResponse<GetServerResponse>>({
      success: true,
      data: { server: serverWithStats ?? { ...updated!, taskCount: 0 } },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
