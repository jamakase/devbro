"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  File,
  FileCode,
  FileJson,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileItem } from "./index";

interface TreeNodeProps {
  taskId: string;
  file: FileItem;
  path: string;
  level: number;
  expandedDirs: Set<string>;
  onToggleDir: (path: string) => void;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
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

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
    case "py":
    case "go":
    case "rs":
      return FileCode;
    case "json":
      return FileJson;
    case "md":
    case "txt":
      return FileText;
    default:
      return File;
  }
}

export function TreeNode({
  taskId,
  file,
  path,
  level,
  expandedDirs,
  onToggleDir,
  selectedFile,
  onSelectFile,
}: TreeNodeProps) {
  const fullPath = path === "/" ? `/${file.name}` : `${path}/${file.name}`;
  const isExpanded = expandedDirs.has(fullPath);
  const isSelected = selectedFile === fullPath;
  const isDirectory = file.type === "directory";

  const { data } = useQuery({
    queryKey: ["files", taskId, fullPath],
    queryFn: () => fetchFiles(taskId, fullPath),
    enabled: isDirectory && isExpanded,
  });

  const handleClick = () => {
    if (isDirectory) {
      onToggleDir(fullPath);
    } else {
      onSelectFile(fullPath);
    }
  };

  const FileIcon = isDirectory ? Folder : getFileIcon(file.name);

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 rounded px-2 py-1 text-left text-sm hover:bg-muted",
          isSelected && "bg-primary text-primary-foreground hover:bg-primary"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {isDirectory ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )
        ) : (
          <span className="w-4" />
        )}
        <FileIcon className="h-4 w-4 shrink-0" />
        <span className="truncate">{file.name}</span>
      </button>
      {isDirectory && isExpanded && data?.files && (
        <div>
          {data.files.map((child) => (
            <TreeNode
              key={child.name}
              taskId={taskId}
              file={child}
              path={fullPath}
              level={level + 1}
              expandedDirs={expandedDirs}
              onToggleDir={onToggleDir}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          ))}
        </div>
      )}
    </div>
  );
}
