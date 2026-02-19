"use client";

import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolCall } from "./tool-call";
import type { Message as MessageType } from "@agent-sandbox/shared";

interface MessageProps {
  message: MessageType;
  promptAnswers: Record<string, { answer: string }>;
}

export function Message({ message, promptAnswers }: MessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  return (
    <div
      className={cn(
        "flex gap-3",
        isUser && "flex-row-reverse"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "flex-1 space-y-2",
          isUser && "text-right"
        )}
      >
        <div
          className={cn(
            "inline-block rounded-lg px-4 py-2",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}
        >
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-2">
            {message.toolCalls.map((toolCall) => (
              <ToolCall
                key={toolCall.id}
                toolCall={toolCall}
                taskId={message.taskId}
                promptAnswers={promptAnswers}
              />
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}
