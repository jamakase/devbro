"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ChevronDown, ChevronRight, Folder } from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskItem } from "./task-item";
import type { ProjectWithTaskCount, Task } from "@agent-sandbox/shared";

interface ProjectItemProps {
  project: ProjectWithTaskCount;
}

async function fetchTasks(projectId: string): Promise<Task[]> {
  const response = await fetch(`/api/projects/${projectId}/tasks`);
  if (!response.ok) throw new Error("Failed to fetch tasks");
  return response.json();
}

export function ProjectItem({ project }: ProjectItemProps) {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(false);

  const isActive =
    pathname === `/projects/${project.id}` ||
    pathname.startsWith(`/projects/${project.id}/`);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", project.id],
    queryFn: () => fetchTasks(project.id),
    enabled: isExpanded,
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-muted rounded"
        >
          {isExpanded ? (
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        <Link
          href={`/projects/${project.id}`}
          className={cn(
            "flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Folder className="h-4 w-4" />
          <span className="flex-1 truncate">{project.name}</span>
          {project.taskCount > 0 && (
            <span className="text-xs opacity-60">{project.taskCount}</span>
          )}
        </Link>
      </div>

      {isExpanded && (
        <div className="ml-5 space-y-1 border-l pl-2">
          {isLoading ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">
              Loading...
            </p>
          ) : tasks.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No tasks</p>
          ) : (
            tasks.map((task) => (
              <TaskItem key={task.id} task={task} projectId={project.id} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
