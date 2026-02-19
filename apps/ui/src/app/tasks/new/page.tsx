"use client";

import { useState, type ChangeEvent, type FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { serverApi, taskApi, githubApi } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { 
  Loader2, 
  ChevronDown, 
  Image as ImageIcon, 
  ArrowUp, 
  Search, 
  ListFilter,
  GitBranch,
  Github,
  X,
  Check,
  Sparkles,
  Shield,
  FileText,
  CheckCircle
} from "lucide-react";
import type { CreateTaskRequest } from "@agent-sandbox/shared";

// Quick action suggestions
const QUICK_ACTIONS = [
  { label: "Run security audit", icon: Shield },
  { label: "Improve AGENTS.md", icon: FileText },
  { label: "Solve a TODO", icon: CheckCircle },
];

export default function NewTaskPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [description, setDescription] = useState("");
  const [selectedServerId, setSelectedServerId] = useState<string>("default");
  
  // Repo/branch selection state
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<{
    fullName: string;
    branch: string;
    repoUrl: string;
  } | null>(null);
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [branchSelectorOpen, setBranchSelectorOpen] = useState(false);
  const [availableBranches, setAvailableBranches] = useState<string[]>(["main"]);

  // Fetch servers
  const {
    data: serversData,
    isLoading: isLoadingServers,
  } = useQuery({
    queryKey: ["servers"],
    queryFn: serverApi.list,
  });

  // Fetch GitHub repos for the picker
  const { data: reposData, isLoading: isLoadingRepos } = useQuery({
    queryKey: ["github-repos"],
    queryFn: () => githubApi.getRepos({ perPage: 100 }),
  });

  // Fetch branches when repo is selected
  useEffect(() => {
    if (selectedRepo) {
      const [owner, repo] = selectedRepo.fullName.split('/');
      if (owner && repo) {
        githubApi.getBranches(owner, repo).then(data => {
          if (data.branches) {
            setAvailableBranches(data.branches.map(b => b.name));
            const defaultBranch = data.branches.find(b => b.isDefault);
            if (defaultBranch) {
              setSelectedBranch(defaultBranch.name);
            }
          }
        }).catch(() => {
          setAvailableBranches(["main"]);
        });
      }
    }
  }, [selectedRepo]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 400) + "px";
    }
  }, [description]);

  const servers = serversData?.servers || [];

  // Create Task Mutation
  const createTaskMutation = useMutation({
    mutationFn: (data: CreateTaskRequest) => taskApi.create(data),
    onSuccess: (task) => {
      toast({
        title: "Task started",
        description: "Your task has been successfully started.",
      });
      
      if (task.projectId && task.id) {
        router.push(`/projects/${task.projectId}/tasks/${task.id}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();

    if (!description.trim()) {
      toast({
        title: "Description required",
        description: "Please enter a task description.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRepo) {
      toast({
        title: "Repository required",
        description: "Please select a repository.",
        variant: "destructive",
      });
      return;
    }

    const payload: CreateTaskRequest = {
      cliTool: "claude",
      serverId: selectedServerId === "default" ? undefined : selectedServerId,
      config: {
        githubRepo: selectedRepo.fullName,
        githubBranch: selectedBranch,
        prompt: description,
      },
    };

    createTaskMutation.mutate(payload);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  const handleQuickAction = (action: string) => {
    setDescription(action);
    textareaRef.current?.focus();
  };

  const handleRepoSelect = (repo: { fullName: string; htmlUrl: string }) => {
    setSelectedRepo({
      fullName: repo.fullName,
      branch: "main",
      repoUrl: repo.htmlUrl,
    });
    setShowRepoPicker(false);
  };

  const filteredRepos = reposData?.repos?.filter(repo => 
    repo.fullName.toLowerCase().includes((selectedRepo?.fullName || "").toLowerCase())
  ) || [];

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-3xl space-y-6">
        {/* Main Input Card */}
        <div className="relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl">
          {/* Header - Repo/Branch Selector */}
          <div className="flex items-center gap-2 border-b border-border/50 px-4 py-3">
            {selectedRepo ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowRepoPicker(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>{selectedRepo.fullName}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
                <span className="text-muted-foreground/50">/</span>
                <div className="relative">
                  <button
                    onClick={() => setBranchSelectorOpen(!branchSelectorOpen)}
                    className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>{selectedBranch}</span>
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  
                  {/* Branch Dropdown */}
                  {branchSelectorOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setBranchSelectorOpen(false)}
                      />
                      <div className="absolute top-full left-0 z-50 mt-1 w-48 rounded-md border bg-popover shadow-md">
                        <div className="max-h-48 overflow-y-auto py-1">
                          {availableBranches.map((branch) => (
                            <button
                              key={branch}
                              onClick={() => {
                                setSelectedBranch(branch);
                                setBranchSelectorOpen(false);
                              }}
                              className="flex w-full items-center justify-between px-3 py-1.5 text-sm hover:bg-accent"
                            >
                              <span>{branch}</span>
                              {branch === selectedBranch && (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowRepoPicker(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                <span>Select repository</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Textarea */}
          <div className="p-4">
            <textarea
              ref={textareaRef}
              placeholder="Ask Cursor to build, fix bugs, explore"
              className="w-full resize-none bg-transparent text-lg placeholder:text-muted-foreground/60 focus:outline-none min-h-[120px]"
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>

          {/* Bottom Bar */}
          <div className="flex items-center justify-between px-4 pb-4">
            <div className="flex items-center gap-2">
              {/* Model Selector */}
              <button className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors">
                <Sparkles className="h-3 w-3" />
                <span>GPT-5.2 Codex High</span>
                <ChevronDown className="h-3 w-3" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Image Upload Button */}
              <button 
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
                title="Attach image"
              >
                <ImageIcon className="h-4 w-4" />
              </button>

              {/* Server Selector */}
              <select
                value={selectedServerId}
                onChange={(e) => setSelectedServerId(e.target.value)}
                className="h-8 rounded-lg border border-border/50 bg-background/50 px-3 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                disabled={isLoadingServers}
              >
                <option value="default">Localhost</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>

              {/* Send Button */}
              <button
                onClick={() => handleSubmit()}
                disabled={!description.trim() || !selectedRepo || createTaskMutation.isPending}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {createTaskMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleQuickAction(action.label)}
              className="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/30 px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <action.icon className="h-3 w-3" />
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <Search className="h-3.5 w-3.5" />
            <span>Search tasks</span>
          </button>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <ListFilter className="h-3.5 w-3.5" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Repo Picker Modal */}
      {showRepoPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRepoPicker(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-xl border bg-card p-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Select Repository</h3>
              <button
                onClick={() => setShowRepoPicker(false)}
                className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-1">
              {isLoadingRepos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reposData?.repos?.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No repositories found
                </div>
              ) : (
                reposData?.repos?.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoSelect({ fullName: repo.fullName, htmlUrl: repo.htmlUrl })}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-accent transition-colors"
                  >
                    <Github className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{repo.fullName}</p>
                      {repo.description && (
                        <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                      )}
                    </div>
                    {selectedRepo?.fullName === repo.fullName && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
