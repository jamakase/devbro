import { NextRequest, NextResponse } from "next/server";
import { ServerRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type {
  ApiResponse,
  CreateServerRequest,
  CreateServerResponse,
  ListServersResponse,
} from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();

// POST /api/servers - Add server
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const body = (await request.json()) as CreateServerRequest;

    if (!body.name || !body.host || !body.username || !body.authType) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Name, host, username, and authType are required",
          },
        },
        { status: 400 }
      );
    }

    // Check for duplicate (per user)
    const existing = await serverRepo.findByHostPortAndUser(
      body.host,
      body.port ?? 22,
      userId
    );
    if (existing) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: { code: "DUPLICATE", message: "Server already configured" },
        },
        { status: 409 }
      );
    }

    const server = await serverRepo.create(userId, body);

    return NextResponse.json<ApiResponse<CreateServerResponse>>({
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

// GET /api/servers - List servers for current user
export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.user.id;

    const servers = await serverRepo.findByUserId(userId);

    return NextResponse.json<ApiResponse<ListServersResponse>>({
      success: true,
      data: { servers, total: servers.length },
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
