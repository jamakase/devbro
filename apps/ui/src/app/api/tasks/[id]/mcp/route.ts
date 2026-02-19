import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, McpConfig } from "@agent-sandbox/shared";

const taskRepo = new TaskRepository();

function normalizeMcpConfig(raw: McpConfig | undefined): McpConfig {
  const servers = raw?.mcpServers ?? {};
  const entries = Object.entries(servers).filter(([key, value]) => {
    if (typeof key !== "string" || key.length === 0) return false;
    if (!value || typeof value !== "object") return false;
    const v = value as { command?: unknown; args?: unknown; env?: unknown };
    if (typeof v.command !== "string" || v.command.length === 0) return false;
    if (v.args !== undefined && !Array.isArray(v.args)) return false;
    if (v.env !== undefined && (typeof v.env !== "object" || v.env === null)) return false;
    return true;
  });

  const normalized: McpConfig["mcpServers"] = {};
  for (const [key, value] of entries) {
    const v = value as { command: string; args?: unknown; env?: unknown };
    normalized[key] = {
      command: v.command,
      args: Array.isArray(v.args) ? v.args.filter((a): a is string => typeof a === "string") : undefined,
      env:
        v.env && typeof v.env === "object"
          ? Object.fromEntries(
              Object.entries(v.env as Record<string, unknown>).filter(
                (e): e is [string, string] => typeof e[0] === "string" && typeof e[1] === "string"
              )
            )
          : undefined,
    };
  }

  return { mcpServers: normalized };
}

const mcpSchema = z.object({
  mcpServers: z.record(
    z.string().min(1),
    z.object({
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      env: z.record(z.string(), z.string()).optional(),
    })
  ),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const mcp = normalizeMcpConfig(task.config?.mcp);
    return NextResponse.json<ApiResponse<{ mcp: McpConfig }>>({
      success: true,
      data: { mcp },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch MCP config" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json().catch(() => null);

    const validation = mcpSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message ?? "Validation error",
          },
        },
        { status: 400 }
      );
    }

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const current = task.config ?? {};
    const mcp = normalizeMcpConfig(validation.data);

    const updated = await taskRepo.update(id, {
      config: { ...current, mcp },
      lastActivityAt: new Date(),
    });

    if (!updated) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ mcp: McpConfig }>>({
      success: true,
      data: { mcp },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update MCP config" } },
      { status: 500 }
    );
  }
}
