"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileViewerProps {
  taskId: string;
  path: string;
  onClose: () => void;
}

interface FileContentResponse {
  path: string;
  content: string;
}

async function fetchFileContent(
  taskId: string,
  path: string
): Promise<FileContentResponse> {
  const response = await fetch(
    `/api/tasks/${taskId}/files/content?path=${encodeURIComponent(path)}`
  );
  if (!response.ok) throw new Error("Failed to fetch file content");
  return response.json();
}

export function FileViewer({ taskId, path, onClose }: FileViewerProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["file-content", taskId, path],
    queryFn: () => fetchFileContent(taskId, path),
  });

  const fileName = path.split("/").pop() || path;

  return (
    <div className="border-t">
      <div className="flex items-center justify-between border-b p-2">
        <span className="text-sm font-medium truncate">{fileName}</span>
        <Button size="sm" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-64 overflow-auto">
        {isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Loading...</div>
        ) : error ? (
          <div className="p-4 text-sm text-destructive">
            Failed to load file content
          </div>
        ) : (
          <pre className="p-4 text-xs">
            <code>{data?.content}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
