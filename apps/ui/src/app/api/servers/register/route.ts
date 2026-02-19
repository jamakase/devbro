import { NextRequest, NextResponse } from "next/server";
import { ServerRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import { randomUUID } from "crypto";
import type { ApiResponse } from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;
    const body = await request.json();

    const name = body.name || "Registered Server";
    const host = body.host || "unknown"; // Client should report its IP or hostname
    const port = body.port || 0;
    const metadata = body.metadata || {};

    // Generate a long-lived token for the server to authenticate
    const token = randomUUID();

    const server = await serverRepo.create(userId, {
      name,
      type: "registered",
      host,
      port,
      token,
      metadata,
      // Optional fields for SSH are omitted
    });

    // Mark as connected immediately since it just registered
    await serverRepo.update(server.id, userId, {
        status: "connected",
        lastConnectedAt: new Date(),
    });

    return NextResponse.json<ApiResponse<{ id: string; token: string }>>({
      success: true,
      data: {
        id: server.id,
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Internal server error" },
      },
      { status: 500 }
    );
  }
}
