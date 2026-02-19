import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import { SKILLS_CATALOG } from "@agent-sandbox/shared";
import type { ApiResponse, SkillDefinition, SkillsConfig } from "@agent-sandbox/shared";

const taskRepo = new TaskRepository();

function normalizeSkillsConfig(raw: SkillsConfig | undefined): SkillsConfig {
  const allowed = new Set<string>(SKILLS_CATALOG.map((s) => s.id));
  const enabledSkillIds = (raw?.enabledSkillIds ?? [])
    .filter((id): id is string => typeof id === "string")
    .filter((id) => allowed.has(id));

  return {
    enabledSkillIds: Array.from(new Set(enabledSkillIds)),
  };
}

const updateSchema = z.object({
  enabledSkillIds: z.array(z.string().min(1)).max(100),
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

    const skills = normalizeSkillsConfig(task.config?.skills);
    const response: ApiResponse<{ catalog: SkillDefinition[]; skills: SkillsConfig }> = {
      success: true,
      data: { catalog: [...SKILLS_CATALOG], skills },
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch skills" } },
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

    const validation = updateSchema.safeParse(body);
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

    const allowed = new Set<string>(SKILLS_CATALOG.map((s) => s.id));
    const invalidIds = validation.data.enabledSkillIds.filter((id) => !allowed.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Unknown skill id",
            details: { invalidIds },
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
    const skills = normalizeSkillsConfig({ enabledSkillIds: validation.data.enabledSkillIds });

    const updated = await taskRepo.update(id, {
      config: { ...current, skills },
      lastActivityAt: new Date(),
    });

    if (!updated) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<{ skills: SkillsConfig }>>({
      success: true,
      data: { skills },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update skills" } },
      { status: 500 }
    );
  }
}
