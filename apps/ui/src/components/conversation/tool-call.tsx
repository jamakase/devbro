"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ToolCall as ToolCallType } from "@agent-sandbox/shared";

interface ToolCallProps {
  toolCall: ToolCallType;
  taskId: string;
  promptAnswers: Record<string, { answer: string }>;
}

function isPromptToolCallInput(input: unknown): input is {
  promptId: string;
  question: string;
  options: Array<{ id: string; label: string; value: string }>;
  expiresAt?: string;
} {
  if (!input || typeof input !== "object") return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.promptId !== "string") return false;
  if (typeof obj.question !== "string") return false;
  if (!Array.isArray(obj.options)) return false;
  return obj.options.every((opt) => {
    if (!opt || typeof opt !== "object") return false;
    const o = opt as Record<string, unknown>;
    return (
      typeof o.id === "string" &&
      typeof o.label === "string" &&
      typeof o.value === "string"
    );
  });
}

export function ToolCall({ toolCall, taskId, promptAnswers }: ToolCallProps) {
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [localAnswered, setLocalAnswered] = useState<string | null>(null);

  if (toolCall.type === "prompt" && isPromptToolCallInput(toolCall.input)) {
    const promptInput = toolCall.input;
    const promptId = promptInput.promptId;
    const answerKey = `${promptId}:${toolCall.id}`;
    const answered = localAnswered ?? promptAnswers[answerKey]?.answer ?? null;

    const expiresAtMs = promptInput.expiresAt ? Date.parse(promptInput.expiresAt) : NaN;
    const isExpired = Number.isFinite(expiresAtMs) ? Date.now() > expiresAtMs : false;
    const disabled = isSubmitting || isExpired || Boolean(answered);

    const submit = async (answer: string) => {
      if (disabled) return;
      setIsSubmitting(true);
      setSubmitError(null);
      try {
        const response = await fetch(
          `/api/tasks/${taskId}/prompts/${encodeURIComponent(promptId)}/answer`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              toolCallId: toolCall.id,
              answer,
            }),
          }
        );

        const json = (await response.json().catch(() => null)) as
          | { success: boolean; error?: { code?: string; message?: string } }
          | null;

        if (!response.ok || !json?.success) {
          const code = json?.error?.code;
          if (code === "PROMPT_EXPIRED") {
            setSubmitError("This prompt has expired.");
            return;
          }
          if (code === "ALREADY_ANSWERED") {
            setSubmitError("This prompt was already answered.");
            return;
          }
          setSubmitError(json?.error?.message ?? "Failed to submit answer.");
          return;
        }

        setLocalAnswered(answer);
        await queryClient.invalidateQueries({ queryKey: ["messages", taskId] });
      } catch {
        setSubmitError("Failed to submit answer.");
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="rounded border bg-muted/50 p-3 space-y-2">
        <div className="flex items-start gap-2">
          <Wrench className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <div className="text-sm font-medium">{promptInput.question}</div>
            {isExpired && !answered && (
              <div className="text-xs text-destructive">Prompt expired</div>
            )}
            {answered && (
              <div className="text-xs text-muted-foreground">
                Answered: <span className="font-medium text-foreground">{answered}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {promptInput.options.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              variant={answered === opt.value ? "default" : "outline"}
              size="sm"
              disabled={disabled}
              onClick={() => void submit(opt.value)}
            >
              {opt.label}
            </Button>
          ))}
        </div>

        {submitError && <div className="text-xs text-destructive">{submitError}</div>}
      </div>
    );
  }

  return (
    <div className="rounded border bg-muted/50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 p-2 text-left text-sm hover:bg-muted"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <Wrench className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{toolCall.name}</span>
        <span className="text-xs text-muted-foreground">({toolCall.type})</span>
      </button>
      {isExpanded && (
        <div className="border-t p-2 space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">
              Input
            </p>
            <pre className="rounded bg-background p-2 text-xs overflow-auto max-h-32">
              {JSON.stringify(toolCall.input, null, 2)}
            </pre>
          </div>
          {toolCall.output && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Output
              </p>
              <pre className="rounded bg-background p-2 text-xs overflow-auto max-h-32">
                {toolCall.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
