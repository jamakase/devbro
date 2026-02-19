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
import { SKILLS_CATALOG } from "@agent-sandbox/shared";
import type { ApiResponse, ProjectWithTaskCount, SkillsConfig, Task } from "@agent-sandbox/shared";

type SkillsTask = {
  project: ProjectWithTaskCount;
  task: Task;
};

function normalizeSkillsConfig(raw: SkillsConfig | undefined): Required<SkillsConfig> {
  const allowed = new Set<string>(SKILLS_CATALOG.map((s) => s.id));
  const enabledSkillIds = (raw?.enabledSkillIds ?? [])
    .filter((id): id is string => typeof id === "string")
    .filter((id) => allowed.has(id));

  return { enabledSkillIds: Array.from(new Set(enabledSkillIds)) };
}

async function fetchSkillsTasks(): Promise<SkillsTask[]> {
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

async function setEnabledSkillIds(taskId: string, enabledSkillIds: string[]) {
  const res = await fetch(`/api/tasks/${taskId}/skills`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabledSkillIds }),
  });

  const json = (await res.json().catch(() => null)) as ApiResponse<{ skills: SkillsConfig }> | null;

  if (!res.ok || !json?.success) {
    throw new Error(json?.error?.message ?? "Failed to update skills");
  }

  return normalizeSkillsConfig(json.data!.skills);
}

export default function SkillsPage() {
  const queryClient = useQueryClient();

  const {
    data: items = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkillsTasks,
  });

  const toggleMutation = useMutation({
    mutationFn: async (input: { taskId: string; enabledSkillIds: string[] }) =>
      setEnabledSkillIds(input.taskId, input.enabledSkillIds),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["skills"] });
      const previous = queryClient.getQueryData<SkillsTask[]>(["skills"]);
      if (!previous) return { previous };

      queryClient.setQueryData<SkillsTask[]>(
        ["skills"],
        previous.map((item) => {
          if (item.task.id !== input.taskId) return item;
          return {
            ...item,
            task: {
              ...item.task,
              config: {
                ...item.task.config,
                skills: { enabledSkillIds: input.enabledSkillIds },
              },
            },
          };
        })
      );

      return { previous };
    },
    onError: (err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["skills"], context.previous);
      }
      toast({
        title: "Failed to update skills",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({ title: "Skills updated" });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Skills</h2>
        <p className="text-sm text-muted-foreground">
          Configure agent skills copied into a sandbox.
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
            Loading skills...
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
            <CardDescription>Create a task to configure skills.</CardDescription>
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
            const skills = normalizeSkillsConfig(task.config?.skills);
            const enabled = new Set(skills.enabledSkillIds);

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
                    {skills.enabledSkillIds.length} enabled
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SKILLS_CATALOG.map((skill) => {
                    const isEnabled = enabled.has(skill.id);
                    const next = isEnabled
                      ? skills.enabledSkillIds.filter((id) => id !== skill.id)
                      : [...skills.enabledSkillIds, skill.id];

                    return (
                      <div key={skill.id} className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{skill.name}</div>
                          {skill.description ? (
                            <div className="text-sm text-muted-foreground">
                              {skill.description}
                            </div>
                          ) : null}
                        </div>
                        <Button
                          size="sm"
                          variant={isEnabled ? "secondary" : "outline"}
                          disabled={toggleMutation.isPending}
                          onClick={() =>
                            toggleMutation.mutate({
                              taskId: task.id,
                              enabledSkillIds: next,
                            })
                          }
                        >
                          {isEnabled ? "Enabled" : "Disabled"}
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
