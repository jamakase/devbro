"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, GitPullRequest, Loader2, Play, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileTree } from "@/components/file-tree";
import { Conversation } from "@/components/conversation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type {
  ApiResponse,
  CreatePullRequestResponse,
  PullRequestPreview,
  Task,
} from "@agent-sandbox/shared";

async function fetchTask(taskId: string): Promise<Task> {
  const response = await fetch(`/api/tasks/${taskId}`);
  if (!response.ok) throw new Error("Failed to fetch task");
  return response.json();
}

class ApiRequestError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

async function fetchApiData<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const body = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  if (!body) {
    throw new ApiRequestError("API request failed");
  }

  if (!body.success) {
    throw new ApiRequestError(
      body.error?.message ?? "API request failed",
      body.error?.code
    );
  }

  return body.data as T;
}

const statusColors = {
  pending: "bg-orange-500",
  creating: "bg-yellow-500",
  running: "bg-green-500",
  stopped: "bg-gray-500",
  completed: "bg-blue-500",
  error: "bg-red-500",
};

export default function TaskDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const taskId = params.taskId as string;
  const queryClient = useQueryClient();
  const [showPrDialog, setShowPrDialog] = useState(false);
  const [prTitle, setPrTitle] = useState("");
  const [prBody, setPrBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [prCreateError, setPrCreateError] = useState<ApiRequestError | null>(null);
  const [createdPr, setCreatedPr] = useState<CreatePullRequestResponse | null>(null);

  const { data: task, isLoading, error } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => fetchTask(taskId),
  });

  const {
    data: prPreview,
    isLoading: prPreviewLoading,
    error: prPreviewError,
    refetch: refetchPrPreview,
  } = useQuery({
    queryKey: ["task", taskId, "prPreview"],
    queryFn: () => fetchApiData<PullRequestPreview>(`/api/tasks/${taskId}/pr-preview`),
    enabled: showPrDialog,
  });

  useEffect(() => {
    if (!showPrDialog) return;
    if (!prPreview?.files?.length) return;
    if (selectedFile) return;
    setSelectedFile(prPreview.files[0]?.filename ?? null);
  }, [prPreview?.files, selectedFile, showPrDialog]);

  const createPrMutation = useMutation({
    mutationFn: async () => {
      return fetchApiData<CreatePullRequestResponse>(`/api/tasks/${taskId}/pull-request`, {
        method: "POST",
        body: JSON.stringify({
          title: prTitle,
          body: prBody || undefined,
          base: prPreview?.base,
        }),
      });
    },
    onSuccess: (data) => {
      setPrCreateError(null);
      setCreatedPr(data);
      toast({ title: "Pull request created", description: `#${data.number}` });
    },
    onError: (err) => {
      setCreatedPr(null);
      setPrCreateError(err instanceof ApiRequestError ? err : new ApiRequestError("Failed to create pull request"));
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading task...</p>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <p className="text-destructive">Failed to load task</p>
        <Link
          href={`/projects/${projectId}`}
          className="mt-2 text-sm text-muted-foreground hover:text-foreground"
        >
          Back to project
        </Link>
      </div>
    );
  }

  const canCreatePr = Boolean(task.config?.githubRepo && task.config?.githubBranch);
  const activeFile = prPreview?.files?.find((f) => f.filename === selectedFile) ?? null;
  const prPreviewErrorCode =
    prPreviewError instanceof ApiRequestError ? prPreviewError.code : undefined;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/projects/${projectId}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                statusColors[task.status] || "bg-gray-500"
              }`}
            />
            <h1 className="text-lg font-semibold">{task.name}</h1>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {task.cliTool === "claude" ? "Claude Code" : "OpenCode"}
          </span>
        </div>
        <div className="flex gap-2">
          {canCreatePr && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowPrDialog(true);
                setCreatedPr(null);
                setPrCreateError(null);
                if (!prTitle) {
                  setPrTitle(task.name || "Pull request");
                }
              }}
            >
              <GitPullRequest className="mr-1 h-4 w-4" />
              Create PR
            </Button>
          )}
          {task.status === "stopped" && (
            <Button size="sm">
              <Play className="mr-1 h-4 w-4" />
              Start
            </Button>
          )}
          {task.status === "running" && (
            <Button size="sm" variant="outline">
              <Square className="mr-1 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {task.config?.lastResult && (
        <div className="border-b p-4 bg-muted/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
                Execution Result
                <span className={`text-xs px-2 py-0.5 rounded-full ${task.config.lastResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {task.config.lastResult.success ? 'Success' : 'Failed'}
                </span>
                <span className="text-xs text-muted-foreground">Exit Code: {task.config.lastResult.exitCode}</span>
            </h3>
            <pre className="bg-black text-white p-4 rounded-md overflow-auto max-h-60 text-sm font-mono whitespace-pre-wrap">
                {task.config.lastResult.output}
            </pre>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 border-r overflow-hidden">
          <FileTree taskId={taskId} />
        </div>

        <div className="flex-1 overflow-hidden">
          <Conversation taskId={taskId} />
        </div>
      </div>

      {showPrDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-5xl rounded-lg border bg-background shadow-lg">
            <div className="flex items-start justify-between border-b p-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Create pull request</h2>
                <p className="text-sm text-muted-foreground">
                  {task.config?.githubRepo} · {task.config?.githubBranch}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowPrDialog(false);
                  setCreatedPr(null);
                  setPrCreateError(null);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4 p-4">
              {createdPr && (
                <div className="rounded-md border bg-muted p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-semibold">Pull request created</div>
                      <div className="text-sm text-muted-foreground">
                        #{createdPr.number}
                      </div>
                      <a
                        href={createdPr.htmlUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline break-all"
                      >
                        {createdPr.htmlUrl}
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copyToClipboard(createdPr.htmlUrl)}
                      >
                        Copy URL
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          setShowPrDialog(false);
                          setCreatedPr(null);
                          setPrCreateError(null);
                          setSelectedFile(null);
                          queryClient.invalidateQueries({
                            queryKey: ["task", taskId, "prPreview"],
                          });
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pr-title">Title</Label>
                  <Input
                    id="pr-title"
                    value={prTitle}
                    onChange={(e) => setPrTitle(e.target.value)}
                    placeholder="Short, descriptive title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pr-body">Description</Label>
                  <Textarea
                    id="pr-body"
                    value={prBody}
                    onChange={(e) => setPrBody(e.target.value)}
                    placeholder="Optional description"
                    rows={4}
                  />
                </div>
              </div>

              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b px-4 py-3">
                  <div className="text-sm font-medium">Changes</div>
                  <div className="text-xs text-muted-foreground">
                    {prPreview
                      ? `${prPreview.filesChanged} files · +${prPreview.totalAdditions} −${prPreview.totalDeletions} · base ${prPreview.base}`
                      : ""}
                  </div>
                </div>
                <div className="flex h-[420px] overflow-hidden">
                  <div className="w-80 shrink-0 border-r">
                    {prPreviewLoading && (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Loading changes...
                      </div>
                    )}
                    {!prPreviewLoading && prPreviewError && (
                      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                        <p className="text-sm text-destructive">
                          {prPreviewError instanceof Error
                            ? prPreviewError.message
                            : "Failed to load changes"}
                        </p>
                        {(prPreviewErrorCode === "GITHUB_NOT_CONNECTED" ||
                          prPreviewErrorCode === "GITHUB_TOKEN_INVALID") && (
                          <Link href="/settings">
                            <Button size="sm" variant="outline">
                              Connect GitHub
                            </Button>
                          </Link>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => refetchPrPreview()}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                    {!prPreviewLoading &&
                      !prPreviewError &&
                      (!prPreview?.files?.length ? (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          No changes found
                        </div>
                      ) : (
                        <div className="h-full overflow-auto">
                          {prPreview.files.map((file) => (
                            <button
                              key={file.filename}
                              type="button"
                              onClick={() => setSelectedFile(file.filename)}
                              className={cn(
                                "flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left text-sm hover:bg-muted/50",
                                selectedFile === file.filename && "bg-muted"
                              )}
                            >
                              <span className="flex-1 break-words">
                                {file.filename}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                +{file.additions} −{file.deletions}
                              </span>
                            </button>
                          ))}
                        </div>
                      ))}
                  </div>

                  <div className="flex-1 overflow-auto p-3">
                    {!activeFile ? (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Select a file to view diff
                      </div>
                    ) : activeFile.patch ? (
                      <pre className="rounded-md bg-muted/30 p-3 text-xs leading-5 overflow-auto">
                        {activeFile.patch.split("\n").map((line, idx) => (
                          <div
                            key={idx}
                            className={cn(
                              "whitespace-pre",
                              line.startsWith("+") &&
                                !line.startsWith("+++")
                                ? "text-emerald-700"
                                : "",
                              line.startsWith("-") &&
                                !line.startsWith("---")
                                ? "text-red-700"
                                : "",
                              line.startsWith("@@") ? "text-blue-700" : "",
                              line.startsWith("diff ") ? "text-muted-foreground" : ""
                            )}
                          >
                            {line}
                          </div>
                        ))}
                        {activeFile.patchTruncated && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            Diff truncated
                          </div>
                        )}
                      </pre>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                        <p>Diff is too large to display inline.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPrDialog(false);
                    setCreatedPr(null);
                    setPrCreateError(null);
                  }}
                  disabled={createPrMutation.isPending}
                >
                  Cancel
                </Button>
                {prCreateError && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-destructive">
                      {prCreateError.message}
                    </div>
                    {(prCreateError.code === "GITHUB_NOT_CONNECTED" ||
                      prCreateError.code === "GITHUB_TOKEN_INVALID") && (
                      <Link href="/settings">
                        <Button size="sm" variant="outline" type="button">
                          Connect GitHub
                        </Button>
                      </Link>
                    )}
                  </div>
                )}
                <Button
                  onClick={() => createPrMutation.mutate()}
                  disabled={
                    createPrMutation.isPending ||
                    !canCreatePr ||
                    !prTitle.trim() ||
                    prPreviewLoading ||
                    Boolean(prPreviewError) ||
                    Boolean(createdPr)
                  }
                >
                  {createPrMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GitPullRequest className="mr-2 h-4 w-4" />
                  )}
                  Create PR
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
