import { NextResponse } from "next/server";
import { DockerClient } from "@agent-sandbox/core";
import type { ApiResponse, HealthResponse } from "@agent-sandbox/shared";

const dockerClient = new DockerClient();

// GET /api/health - Docker health check
export async function GET() {
  try {
    const health = await dockerClient.healthCheck();

    return NextResponse.json<ApiResponse<HealthResponse>>({
      success: true,
      data: {
        healthy: health.healthy,
        dockerAvailable: health.healthy,
        dockerVersion: health.version,
        message: health.message,
      },
    });
  } catch (error) {
    return NextResponse.json<ApiResponse<HealthResponse>>({
      success: true,
      data: {
        healthy: false,
        dockerAvailable: false,
        message: error instanceof Error ? error.message : "Health check failed",
      },
    });
  }
}
