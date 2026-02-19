import { NextRequest, NextResponse } from "next/server";
import { ServerRepository } from "@agent-sandbox/server";
import { RemoteDockerProvider } from "@agent-sandbox/core";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, TestServerResponse } from "@agent-sandbox/shared";

const serverRepo = new ServerRepository();

// POST /api/servers/:id/test - Test server connection
export async function POST(
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

    // Update status to connecting
    await serverRepo.update(id, userId, { status: "connecting" });

    try {
      if (!server.username) {
        throw new Error("Username is required for SSH connection");
      }

      const remoteClient = new RemoteDockerProvider({
        host: server.host,
        port: server.port ?? 22,
        username: server.username,
        authType: (server.authType as any) || "ssh-agent",
        privateKey: server.privateKey || undefined,
      });

      await remoteClient.connect();
      const health = await remoteClient.healthCheck();
      await remoteClient.disconnect();

      if (health.healthy) {
        await serverRepo.update(id, userId, {
          status: "connected",
          lastConnectedAt: new Date(),
          errorMessage: null,
        });

        return NextResponse.json<ApiResponse<TestServerResponse>>({
          success: true,
          data: {
            result: {
              success: true,
              message: "Connection successful",
              dockerVersion: health.version,
            },
          },
        });
      } else {
        await serverRepo.update(id, userId, {
          status: "error",
          errorMessage: health.message,
        });

        return NextResponse.json<ApiResponse<TestServerResponse>>({
          success: true,
          data: {
            result: {
              success: false,
              message: health.message,
            },
          },
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection failed";

      await serverRepo.update(id, userId, {
        status: "error",
        errorMessage: message,
      });

      return NextResponse.json<ApiResponse<TestServerResponse>>({
        success: true,
        data: {
          result: {
            success: false,
            message,
          },
        },
      });
    }
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
