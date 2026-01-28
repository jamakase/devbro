"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TreeNode } from "./tree-node";
import { FileViewer } from "./file-viewer";

interface FileTreeProps {
  taskId: string;
}

export interface FileItem {
  name: string;
  type: "file" | "directory";
  size: number;
  modifiedAt: string;
}

interface FilesResponse {
  path: string;
  files: FileItem[];
}

async function fetchFiles(taskId: string, path: string): Promise<FilesResponse> {
  const response = await fetch(
    `/api/tasks/${taskId}/files?path=${encodeURIComponent(path)}`
  );
  if (!response.ok) throw new Error("Failed to fetch files");
  return response.json();
}

export function FileTree({ taskId }: FileTreeProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(["/"]))

  const { data, isLoading, error } = useQuery({
    queryKey: ["files", taskId, "/"],
    queryFn: () => fetchFiles(taskId, "/"),
  });

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading files...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        Failed to load files
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-2">
        <h3 className="text-sm font-medium">Files</h3>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="p-2">
          {data?.files.map((file) => (
            <TreeNode
              key={file.name}
              taskId={taskId}
              file={file}
              path="/"
              level={0}
              expandedDirs={expandedDirs}
              onToggleDir={toggleDir}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
            />
          ))}
        </div>
      </div>
      {selectedFile && (
        <FileViewer
          taskId={taskId}
          path={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
