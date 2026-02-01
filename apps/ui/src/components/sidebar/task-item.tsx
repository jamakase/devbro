"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Circle, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Task } from "@agent-sandbox/shared";

interface TaskItemProps {
  task: Task;
  projectId: string;
}

const statusIcons = {
  creating: Loader2,
  running: Circle,
  stopped: Circle,
  completed: CheckCircle,
  error: AlertCircle,
};

const statusColors = {
  creating: "text-yellow-500 animate-spin",
  running: "text-green-500",
  stopped: "text-muted-foreground",
  completed: "text-green-500",
  error: "text-destructive",
};

export function TaskItem({ task, projectId }: TaskItemProps) {
  const pathname = usePathname();
  const isActive = pathname === `/projects/${projectId}/tasks/${task.id}`;

  const StatusIcon = statusIcons[task.status] || Circle;
  const statusColor = statusColors[task.status] || "text-muted-foreground";

  return (
    <Link
      href={`/projects/${projectId}/tasks/${task.id}`}
      className={cn(
        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <StatusIcon className={cn("h-3 w-3", isActive ? "" : statusColor)} />
      <span className="flex-1 truncate">{task.name}</span>
    </Link>
  );
}
