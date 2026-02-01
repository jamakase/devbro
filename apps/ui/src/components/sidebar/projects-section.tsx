"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FolderGit2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectItem } from "./project-item";
import { Button } from "@/components/ui/button";
import type { ProjectWithTaskCount } from "@agent-sandbox/shared";

async function fetchProjects(): Promise<ProjectWithTaskCount[]> {
  const response = await fetch("/api/projects");
  if (!response.ok) throw new Error("Failed to fetch projects");
  return response.json();
}

export function ProjectsSection() {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        <FolderGit2 className="h-4 w-4" />
        <span className="flex-1 text-left">Projects</span>
        <span className="text-xs">{projects.length}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 space-y-1 border-l pl-2">
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              Loading...
            </p>
          ) : projects.length === 0 ? (
            <p className="px-3 py-2 text-xs text-muted-foreground">
              No projects yet
            </p>
          ) : (
            projects.map((project) => (
              <ProjectItem key={project.id} project={project} />
            ))
          )}
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs text-muted-foreground"
            asChild
          >
            <a href="/projects?new=true">
              <Plus className="h-3 w-3" />
              New Project
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
