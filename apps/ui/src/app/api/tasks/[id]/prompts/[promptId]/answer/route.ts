import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskRepository, MessageRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, PromptAnswerToolCallInput, PromptToolCallInput } from "@agent-sandbox/shared";
import { randomUUID } from "crypto";

const taskRepo = new TaskRepository();
const messageRepo = new MessageRepository();

const answerSchema = z.object({
  toolCallId: z.string().min(1),
  answer: z.string().min(1).max(4096),
});

function isPromptToolCallInput(input: unknown): input is PromptToolCallInput {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.promptId !== "string") return false;
  if (typeof obj.question !== "string") return false;
  if (!Array.isArray(obj.options)) return false;
  return true;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; promptId: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: taskId, promptId } = await params;
    const body = await request.json();

    const validation = answerSchema.safeParse(body);
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

    const task = await taskRepo.getTaskWithOwnerCheck(taskId, session.user.id);
    if (!task) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "TASK_NOT_FOUND", message: "Task not found" } },
        { status: 404 }
      );
    }

    const messages = await messageRepo.findByTaskId(taskId, { limit: 200 });
    const promptMessage = messages.find((m) =>
      (m.toolCalls ?? []).some((tc) => tc.type === "prompt" && isPromptToolCallInput(tc.input) && tc.input.promptId === promptId)
    );

    if (!promptMessage) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "PROMPT_NOT_FOUND", message: "Prompt not found" } },
        { status: 404 }
      );
    }

    const promptToolCall = (promptMessage.toolCalls ?? []).find(
      (tc) => tc.type === "prompt" && tc.id === validation.data.toolCallId && isPromptToolCallInput(tc.input)
    );

    if (!promptToolCall) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "PROMPT_NOT_FOUND", message: "Prompt option set not found" } },
        { status: 404 }
      );
    }

    const expiresAt = isPromptToolCallInput(promptToolCall.input) ? promptToolCall.input.expiresAt : undefined;
    if (expiresAt) {
      const expiresMs = Date.parse(expiresAt);
      if (!Number.isNaN(expiresMs) && Date.now() > expiresMs) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: { code: "PROMPT_EXPIRED", message: "Prompt has expired" } },
          { status: 409 }
        );
      }
    }

    const key = `${promptId}:${validation.data.toolCallId}`;
    const alreadyAnswered = messages.some((m) =>
      (m.toolCalls ?? []).some((tc) => {
        if (tc.type !== "prompt_answer") return false;
        const input = tc.input as Record<string, unknown>;
        return `${input.promptId ?? ""}:${input.toolCallId ?? ""}` === key;
      })
    );

    if (alreadyAnswered) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "ALREADY_ANSWERED", message: "Prompt already answered" } },
        { status: 409 }
      );
    }

    const toolCallInput: PromptAnswerToolCallInput = {
      promptId,
      toolCallId: validation.data.toolCallId,
      answer: validation.data.answer,
    };

    await messageRepo.create({
      taskId,
      role: "user",
      content: validation.data.answer,
      toolCalls: [
        {
          id: randomUUID(),
          type: "prompt_answer",
          name: "prompt_answer",
          input: toolCallInput as unknown as Record<string, unknown>,
        },
      ],
    });

    return NextResponse.json<ApiResponse<{ success: true }>>({
      success: true,
      data: { success: true },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to send prompt answer" } },
      { status: 500 }
    );
  }
}
