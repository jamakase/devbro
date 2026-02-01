"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTree } from "@/components/file-tree";
import { Conversation } from "@/components/conversation";
import type { Task } from "@agent-sandbox/shared";

async function fetchTask(taskId: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${taskId}`);
  if (!response.ok) throw new Error("Failed to fetch task");
  return response.json();
}

const statusColors = {
  creating: "bg-yellow-500",
  running: "bg-green-500",
  stopped: "bg-gray-500",
  completed: "bg-blue-500",
  error: "bg-red-500",
};

export default function TaskDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const taskId = params.taskId as string;

  const { data: task, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId),
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-destructive">Failed to load task</p>
        <Link
          href={`/projects/${projectId}`}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                statusColors[task.status] || "bg-gray-500"
              }`}
            />
            <h1 className="text-lg font-semibold">{task.name}</h1>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {task.cliTool === "claude" ? "Claude Code" : "OpenCode"}
          </span>
        </div>
        <div className="flex gap-2">
          {task.status === "stopped" && (
            <Button size="sm">
              <Play className="mr-1 h-4 w-4" />
              Start
            </Button>
          )}
          {task.status === "running" && (
            <Button size="sm" variant="outline">
              <Square className="mr-1 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Split view */}
      <div className="flex flex-1 overflow-hidden">
        {/* File tree */}
        <div className="w-64 border-r overflow-hidden">
          <FileTree taskId={taskId} />
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-hidden">
          <Conversation taskId={taskId} />
        </div>
      </div>
    </div>
  );
}
