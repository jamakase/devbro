"use client";

import Link from "next/link";
import { Folder, MoreVertical, Trash } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ProjectWithTaskCount } from "@agent-sandbox/shared";

interface ProjectCardProps {
  project: ProjectWithTaskCount;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Folder className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-medium">
              {project.name}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
              {project.description}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {project.taskCount} {project.taskCount === 1 ? "task" : "tasks"}
            </span>
            <span>Updated {formatDate(project.updatedAt)}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
