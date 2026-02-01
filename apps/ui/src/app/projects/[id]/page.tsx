"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Square, Trash, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Project, Task } from "@agent-sandbox/shared";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function fetchProject(id: string): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`);
  if (!response.ok) throw new Error("Failed to fetch project");
  return response.json();
}

async function fetchTasks(projectId: string): Promise<Task[]> {
  const response = await fetch(`/api/projects/${projectId}/tasks`);
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}

const statusColors = {
  creating: "bg-yellow-500",
  running: "bg-green-500",
  stopped: "bg-gray-500",
  completed: "bg-blue-500",
  error: "bg-red-500",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const projectId = params.id as string;

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [cliTool, setCliTool] = useState<"claude" | "opencode">("claude");

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetchProject(projectId),
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: () => fetchTasks(projectId),
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data: { name: string; cliTool: "claude" | "opencode" }) => {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create task");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      setShowCreateTask(false);
      setTaskName("");
    },
  });

  if (projectLoading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <p>Project not found</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Link
          href="/projects"
          className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
          </div>
          <Button onClick={() => setShowCreateTask(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {showCreateTask && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createTaskMutation.mutate({ name: taskName, cliTool });
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="taskName">Task Name</Label>
                <Input
                  id="taskName"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="Implement feature X"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>CLI Tool</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={cliTool === "claude" ? "default" : "outline"}
                    onClick={() => setCliTool("claude")}
                  >
                    Claude Code
                  </Button>
                  <Button
                    type="button"
                    variant={cliTool === "opencode" ? "default" : "outline"}
                    onClick={() => setCliTool("opencode")}
                  >
                    OpenCode
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createTaskMutation.isPending}>
                  {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateTask(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-4 text-lg font-semibold">Tasks</h2>

      {tasksLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No tasks yet. Create your first task to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Link key={task.id} href={`/projects/${projectId}/tasks/${task.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        statusColors[task.status] || "bg-gray-500"
                      }`}
                    />
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {task.cliTool === "claude" ? "Claude Code" : "OpenCode"} •{" "}
                        {task.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {task.status === "stopped" && (
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {task.status === "running" && (
                      <Button size="sm" variant="outline">
                        <Square className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
