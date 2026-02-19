"use client";

import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApiResponse, McpConfig, ProjectWithTaskCount, Task } from "@agent-sandbox/shared";

type McpTask = {
  project: ProjectWithTaskCount;
  task: Task;
};

const EMPTY_MCP: McpConfig = { mcpServers: {} };

function normalizeMcpConfig(raw: McpConfig | undefined): McpConfig {
  if (!raw || typeof raw !== "object") return EMPTY_MCP;
  const servers = raw.mcpServers;
  if (!servers || typeof servers !== "object") return EMPTY_MCP;
  return { mcpServers: servers };
}

async function fetchMcpTasks(): Promise<McpTask[]> {
  const projectsRes = await fetch("/api/projects");
  if (!projectsRes.ok) throw new Error("Failed to fetch projects");
  const projects = (await projectsRes.json()) as ProjectWithTaskCount[];

  const tasksByProject = await Promise.all(
    projects.map(async (project) => {
      const tasksRes = await fetch(`/api/projects/${project.id}/tasks`);
      if (!tasksRes.ok) throw new Error(`Failed to fetch tasks for ${project.name}`);
      const tasks = (await tasksRes.json()) as Task[];
      return tasks.map((task) => ({ project, task }));
    })
  );

  return tasksByProject.flat();
}

async function setTaskMcp(taskId: string, mcp: McpConfig) {
  const res = await fetch(`/api/tasks/${taskId}/mcp`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mcp),
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<{ mcp: McpConfig }> | null;

  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message ?? "Failed to update MCP config");
  }

  return json.data!.mcp;
}

export default function McpsPage() {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["mcps"],
    queryFn: fetchMcpTasks,
  });

  const saveMutation = useMutation({
    mutationFn: async (input: { taskId: string; mcp: McpConfig }) =>
      setTaskMcp(input.taskId, input.mcp),
    onSuccess: (mcp, input) => {
      toast({ title: "MCP config saved" });
      setDrafts((prev) => ({
        ...prev,
        [input.taskId]: JSON.stringify(normalizeMcpConfig(mcp), null, 2),
      }));
      queryClient.invalidateQueries({ queryKey: ["mcps"] });
    },
    onError: (err) => {
      toast({
        title: "Failed to save MCP config",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">MCPs</h2>
        <p className="text-sm text-muted-foreground">
          Manage Model Context Protocol servers available to the agent.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Fetching tasks.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading MCP configuration...
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Failed to load</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : "Unknown error"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No tasks yet</CardTitle>
            <CardDescription>Create a task to configure MCPs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/tasks/new">New Task</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map(({ project, task }) => {
            const current = normalizeMcpConfig(task.config?.mcp);
            const defaultDraft = JSON.stringify(current, null, 2);
            const draft = drafts[task.id] ?? defaultDraft;

            return (
              <Card key={task.id}>
                <CardHeader className="space-y-1">
                  <CardTitle className="text-base">
                    <Link
                      href={`/projects/${project.id}/tasks/${task.id}`}
                      className="hover:underline"
                    >
                      {task.name}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    <span className="font-medium">{project.name}</span>
                    {" • "}
                    {Object.keys(current.mcpServers ?? {}).length} servers
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    value={draft}
                    onChange={(e) =>
                      setDrafts((prev) => ({ ...prev, [task.id]: e.target.value }))
                    }
                    rows={10}
                    spellCheck={false}
                    className="font-mono text-xs"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      variant="outline"
                      disabled={saveMutation.isPending}
                      onClick={() =>
                        setDrafts((prev) => ({ ...prev, [task.id]: defaultDraft }))
                      }
                    >
                      Reset
                    </Button>
                    <Button
                      disabled={saveMutation.isPending}
                      onClick={() => {
                        let parsed: unknown;
                        try {
                          parsed = JSON.parse(draft);
                        } catch {
                          toast({
                            title: "Invalid JSON",
                            description: "Fix the JSON before saving.",
                            variant: "destructive",
                          });
                          return;
                        }

                        if (!parsed || typeof parsed !== "object") {
                          toast({
                            title: "Invalid MCP config",
                            description: "Expected an object with mcpServers.",
                            variant: "destructive",
                          });
                          return;
                        }

                        saveMutation.mutate({ taskId: task.id, mcp: parsed as McpConfig });
                      }}
                    >
                      {saveMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
