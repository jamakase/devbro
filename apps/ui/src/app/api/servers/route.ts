import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
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

    if (!body.name) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Name is required",
          },
        },
        { status: 400 }
      );
    }

    if (body.type === "registered") {
         // Generate token if not provided
         if (!body.token) {
             body.token = randomUUID();
         }
         // Set dummy values for required DB fields if needed, or rely on schema allowing nulls (check schema)
         // Based on previous code, host seems required.
         if (!body.host) body.host = "agent"; 
    } else if (body.type === "kubernetes") {
         if (!body.metadata?.kubeconfig) {
             return NextResponse.json<ApiResponse<never>>(
                 {
                 success: false,
                 error: {
                     code: "VALIDATION_ERROR",
                     message: "Kubeconfig is required for Kubernetes servers",
                 },
                 },
                 { status: 400 }
             );
         }
         if (!body.host) body.host = "kubernetes";
    } else {
        // SSH validation
        if (!body.host || !body.username || !body.authType) {
            return NextResponse.json<ApiResponse<never>>(
                {
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Host, username, and authType are required for SSH servers",
                },
                },
                { status: 400 }
             );
        }
    }

    // Check for duplicate (per user)
    // Only for SSH? For registered, name duplication check maybe?
    // findByHostPortAndUser uses host/port.
    if (body.type !== "registered" && body.type !== "kubernetes") {
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
