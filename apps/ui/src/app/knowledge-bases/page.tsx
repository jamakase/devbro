"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ApiResponse,
  KnowledgeBaseConfig,
  ProjectWithTaskCount,
  Task,
} from "@agent-sandbox/shared";

type KnowledgeBaseTask = {
  project: ProjectWithTaskCount;
  task: Task;
};

function normalizeKnowledgeBaseConfig(
  raw: KnowledgeBaseConfig | undefined
): KnowledgeBaseConfig {
  const enabled = raw?.enabled ?? false;
  return {
    enabled,
    indexing: raw?.indexing ?? { status: "idle" },
  };
}

async function fetchKnowledgeBaseTasks(): Promise<KnowledgeBaseTask[]> {
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

async function setKnowledgeBaseEnabled(taskId: string, enabled: boolean) {
  const res = await fetch(`/api/tasks/${taskId}/knowledge-base`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled }),
  });

  const json = (await res.json().catch(() => null)) as
    | ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }>
    | null;

  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message ?? "Failed to update knowledge base");
  }

  return json.data!.knowledgeBase;
}

async function buildKnowledgeBaseIndex(taskId: string) {
  const res = await fetch(`/api/tasks/${taskId}/knowledge-base/build`, {
    method: "POST",
  });

  const json = (await res.json().catch(() => null)) as
    | ApiResponse<{ knowledgeBase: KnowledgeBaseConfig }>
    | null;

  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message ?? "Failed to build index");
  }

  return json.data!.knowledgeBase;
}

export default function KnowledgeBasesPage() {
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["knowledge-bases"],
    queryFn: fetchKnowledgeBaseTasks,
  });

  const toggleMutation = useMutation({
    mutationFn: async (input: { taskId: string; enabled: boolean }) =>
      setKnowledgeBaseEnabled(input.taskId, input.enabled),
    onSuccess: (_kb, input) => {
      toast({
        title: input.enabled ? "Knowledge base enabled" : "Knowledge base disabled",
      });
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
    },
    onError: (err) => {
      toast({
        title: "Failed to update knowledge base",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const buildMutation = useMutation({
    mutationFn: async (input: { taskId: string }) => buildKnowledgeBaseIndex(input.taskId),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["knowledge-bases"] });
      const previous = queryClient.getQueryData<KnowledgeBaseTask[]>(["knowledge-bases"]);
      if (!previous) return { previous };

      queryClient.setQueryData<KnowledgeBaseTask[]>(
        ["knowledge-bases"],
        previous.map((item) => {
          if (item.task.id !== input.taskId) return item;
          const kb = normalizeKnowledgeBaseConfig(item.task.config?.knowledgeBase);
          return {
            ...item,
            task: {
              ...item.task,
              config: {
                ...item.task.config,
                knowledgeBase: {
                  ...kb,
                  enabled: true,
                  indexing: { status: "indexing", startedAt: new Date().toISOString() },
                },
              },
            },
          };
        })
      );

      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["knowledge-bases"], context.previous);
      }
      toast({
        title: "Index build failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Index built" });
      queryClient.invalidateQueries({ queryKey: ["knowledge-bases"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Knowledge Bases</h2>
        <p className="text-sm text-muted-foreground">
          Index code for fast retrieval during runs.
        </p>
      </div>

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <CardDescription>Fetching sandboxes and index status.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading knowledge bases...
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
            <CardTitle>No sandboxes yet</CardTitle>
            <CardDescription>Create a task to start indexing code.</CardDescription>
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
            const kb = normalizeKnowledgeBaseConfig(task.config?.knowledgeBase);
            const status = kb.indexing?.status ?? "idle";
            const lastIndexedAt = kb.indexing?.lastIndexedAt;
            const fileCount = kb.indexing?.fileCount;
            const errorMessage = kb.indexing?.errorMessage;

            const isIndexing = status === "indexing" || buildMutation.isPending;

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
                    {kb.enabled ? "Enabled" : "Disabled"}
                    {" • "}
                    Status: {status}
                    {typeof fileCount === "number" ? ` • ${fileCount} files` : null}
                    {lastIndexedAt
                      ? ` • Last indexed ${new Date(lastIndexedAt).toLocaleString()}`
                      : null}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {status === "error" && errorMessage ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                      {errorMessage}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant={kb.enabled ? "outline" : "default"}
                      onClick={() =>
                        toggleMutation.mutate({ taskId: task.id, enabled: !kb.enabled })
                      }
                      disabled={toggleMutation.isPending || isIndexing}
                    >
                      {toggleMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      {kb.enabled ? "Disable" : "Enable"}
                    </Button>

                    <Button
                      onClick={() => buildMutation.mutate({ taskId: task.id })}
                      disabled={!kb.enabled || isIndexing}
                    >
                      {isIndexing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Build Index
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
