"use client";

import { useQuery } from "@tanstack/react-query";
import { Message as MessageComponent } from "./message";
import type { Message } from "@agent-sandbox/shared";

interface ConversationProps {
  taskId: string;
}

async function fetchMessages(taskId: string): Promise<Message[]> {
  const response = await fetch(`/api/tasks/${taskId}/messages`);
  if (!response.ok) throw new Error("Failed to fetch messages");
  return response.json();
}

export function Conversation({ taskId }: ConversationProps) {
  const { data: messages = [], isLoading, error } = useQuery({
    queryKey: ["messages", taskId],
    queryFn: () => fetchMessages(taskId),
    refetchInterval: 5000, // Refresh every 5 seconds for live updates
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading conversation...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load conversation
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No messages yet. Start a task to see the conversation.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <h3 className="text-sm font-medium">Conversation</h3>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageComponent key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
}
