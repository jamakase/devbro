"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCall as ToolCallType } from "@agent-sandbox/shared";

interface ToolCallProps {
  toolCall: ToolCallType;
}

export function ToolCall({ toolCall }: ToolCallProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
