import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, KnowledgeBaseConfig } from "@agent-sandbox/shared";

const taskRepo = new TaskRepository();

function normalizeKnowledgeBaseConfig(
  raw: KnowledgeBaseConfig | undefined
): KnowledgeBaseConfig {
  const enabled = raw?.enabled ?? false;
  const indexing = raw?.indexing;
  return {
    enabled,
    indexing: indexing ?? { status: enabled ? "idle" : "idle" },
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
        success: false,
        error: { code: "TASK_NOT_FOUND", message: "Task not found" },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const knowledgeBase = normalizeKnowledgeBaseConfig(task.config?.knowledgeBase);
    const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
      success: true,
      data: { knowledgeBase },
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      };
      return NextResponse.json(response, { status: 401 });
    }

    const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch knowledge base configuration",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as
      | { enabled?: boolean }
      | null;

    if (typeof body?.enabled !== "boolean") {
      const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
        success: false,
        error: { code: "VALIDATION_ERROR", message: "enabled must be a boolean" },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
        success: false,
        error: { code: "TASK_NOT_FOUND", message: "Task not found" },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const current = task.config ?? {};
    const currentKb = normalizeKnowledgeBaseConfig(current.knowledgeBase);

    const nextKb: KnowledgeBaseConfig = {
      enabled: body.enabled,
      indexing: body.enabled
        ? currentKb.indexing ?? { status: "idle" }
        : {
            status: "idle",
            lastIndexedAt: currentKb.indexing?.lastIndexedAt,
            fileCount: currentKb.indexing?.fileCount,
          },
    };

    const updated = await taskRepo.update(id, {
      config: { ...current, knowledgeBase: nextKb },
      lastActivityAt: new Date(),
    });

    if (!updated) {
      const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
        success: false,
        error: { code: "TASK_NOT_FOUND", message: "Task not found" },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
      success: true,
      data: { knowledgeBase: nextKb },
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      };
      return NextResponse.json(response, { status: 401 });
    }

    const response: ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }> = {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update knowledge base configuration",
      },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
