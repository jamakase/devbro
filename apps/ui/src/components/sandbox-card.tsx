"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Square, Trash2, Terminal, MessageSquare } from "lucide-react";
import type { SandboxWithStats } from "@agent-sandbox/shared";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  running: "bg-green-500",
  stopped: "bg-gray-400",
  creating: "bg-blue-500",
  starting: "bg-yellow-500",
  stopping: "bg-yellow-500",
  error: "bg-red-500",
  setup_failed: "bg-red-500",
};

interface SandboxCardProps {
  sandbox: SandboxWithStats;
  onStart: () => void;
  onStop: () => void;
  onDestroy: () => void;
  onViewLogs: () => void;
  onViewChat: () => void;
}

export function SandboxCard({
  sandbox,
  onStart,
  onStop,
  onDestroy,
  onViewLogs,
  onViewChat,
}: SandboxCardProps) {
  const isRunning = sandbox.status === "running";
  const isBusy = ["creating", "starting", "stopping"].includes(sandbox.status);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-medium">{sandbox.name}</CardTitle>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "h-2.5 w-2.5 rounded-full",
              statusColors[sandbox.status] ?? "bg-gray-400"
            )}
          />
          <span className="text-sm text-muted-foreground capitalize">
            {sandbox.status.replace("_", " ")}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">CLI Tool</span>
            <span className="font-medium">{sandbox.cliTool}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Server</span>
            <span className="font-medium">
              {sandbox.serverId ? "Remote" : "Local"}
            </span>
          </div>
          {isRunning && sandbox.uptime !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium">{formatUptime(sandbox.uptime)}</span>
            </div>
          )}
          {isRunning && sandbox.memoryUsage !== undefined && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Memory</span>
              <span className="font-medium">
                {formatBytes(sandbox.memoryUsage)}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {isRunning ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              disabled={isBusy}
            >
              <Square className="h-4 w-4 mr-1" />
              Stop
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onStart}
              disabled={isBusy}
            >
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onViewLogs}>
            <Terminal className="h-4 w-4 mr-1" />
            Logs
          </Button>
          <Button variant="outline" size="sm" onClick={onViewChat}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Chat
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDestroy}
            disabled={isBusy}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
