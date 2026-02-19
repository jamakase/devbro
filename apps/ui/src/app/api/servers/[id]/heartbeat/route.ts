import { NextRequest, NextResponse } from "next/server";
import { ServerRepository } from "@agent-sandbox/server";
import type { ApiResponse } from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();

export async function POST(
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

    // 2. Parse Heartbeat Data
    const body = await request.json();
    const { stats } = body; // cpu, memory, disk usage, etc.

    // 3. Update server status and metadata
    await serverRepo.update(id, server.userId, {
      status: "connected",
      lastConnectedAt: new Date(),
      metadata: stats ? { ...server.metadata, stats } : server.metadata,
    });

    return NextResponse.json<ApiResponse<{ success: boolean }>>({
      success: true,
      data: { success: true },
    });

  } catch (error) {
    console.error("Error processing heartbeat:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
