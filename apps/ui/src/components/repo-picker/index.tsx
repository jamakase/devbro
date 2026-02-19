"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { githubApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Github,
  Search,
  Lock,
  GitBranch,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { GitHubRepo, BranchInfo, RepoMetadata } from "@agent-sandbox/shared";
import { linkGitHubAccount } from "@/lib/auth-client";

interface RepoPickerProps {
  onSelect: (selection: {
    repoSource: "github" | "custom";
    repoUrl: string;
    branch?: string;
    githubRepoId?: number;
    githubRepoFullName?: string;
  }) => void;
  selectedRepo?: {
    repoSource: "github" | "custom";
    repoUrl: string;
    branch?: string;
  };
}

// Git URL validation regex
const GIT_URL_REGEX = /^(https:\/\/|git@)[\w.-]+[\/:][\w.-]+\/[\w.-]+(\.git)?$/;

export function RepoPicker({ onSelect, selectedRepo }: RepoPickerProps) {
  const [activeTab, setActiveTab] = useState<"github" | "custom">(
    selectedRepo?.repoSource || "github"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGitHubRepo, setSelectedGitHubRepo] = useState<GitHubRepo | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [customUrlError, setCustomUrlError] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);
  const [validatingCustomUrl, setValidatingCustomUrl] = useState(false);
  const [customRepoMetadata, setCustomRepoMetadata] = useState<RepoMetadata | null>(null);

  // Fetch GitHub connection status
  const { data: githubStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["github-status"],
    queryFn: githubApi.getStatus,
  });

  // Fetch GitHub repos
  const { data: reposData, isLoading: isLoadingRepos } = useQuery({
    queryKey: ["github-repos", searchQuery],
    queryFn: () =>
      githubApi.getRepos({
        search: searchQuery || undefined,
        perPage: 100,
      }),
    enabled: !!githubStatus?.connected,
  });

  // Fetch branches when a repo is selected
  const { data: branchesData, isLoading: isLoadingBranches } = useQuery({
    queryKey: ["github-branches", selectedGitHubRepo?.owner, selectedGitHubRepo?.name],
    queryFn: () =>
      githubApi.getBranches(
        selectedGitHubRepo!.owner,
        selectedGitHubRepo!.name
      ),
    enabled: !!selectedGitHubRepo && activeTab === "github",
  });

  // Set default branch when branches load
  useEffect(() => {
    if (branchesData?.branches && !selectedBranch) {
      const defaultBranch = branchesData.branches.find((b) => b.isDefault);
      if (defaultBranch) {
        setSelectedBranch(defaultBranch.name);
      }
    }
  }, [branchesData, selectedBranch]);

  // Restore selected repo from props
  useEffect(() => {
    if (selectedRepo) {
      setActiveTab(selectedRepo.repoSource);
      if (selectedRepo.repoSource === "custom") {
        setCustomUrl(selectedRepo.repoUrl);
      }
      if (selectedRepo.branch) {
        setSelectedBranch(selectedRepo.branch);
      }
    }
  }, [selectedRepo]);

  const handleConnectGitHub = async () => {
    setIsConnectingGitHub(true);
    try {
      const result = await linkGitHubAccount();
      if (result.error) {
        toast({
          title: "Failed to connect GitHub",
          description: result.error.message || "Please try again",
          variant: "destructive",
        });
        setIsConnectingGitHub(false);
      }
    } catch (error) {
      toast({
        title: "Failed to connect GitHub",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsConnectingGitHub(false);
    }
  };

  const handleSelectGitHubRepo = (repo: GitHubRepo) => {
    setSelectedGitHubRepo(repo);
    setSelectedBranch(repo.defaultBranch);
  };

  const handleConfirmGitHubSelection = () => {
    if (!selectedGitHubRepo) return;

    onSelect({
      repoSource: "github",
      repoUrl: selectedGitHubRepo.htmlUrl,
      branch: selectedBranch || selectedGitHubRepo.defaultBranch,
      githubRepoId: selectedGitHubRepo.id,
      githubRepoFullName: selectedGitHubRepo.fullName,
    });
  };

  const validateCustomUrl = useCallback(async () => {
    if (!customUrl) {
      setCustomUrlError("Please enter a repository URL");
      return false;
    }

    if (!GIT_URL_REGEX.test(customUrl)) {
      setCustomUrlError("Please enter a valid Git URL (https:// or git@)");
      return false;
    }

    setCustomUrlError("");
    setValidatingCustomUrl(true);
    setCustomRepoMetadata(null);

    try {
      // Parse owner/repo from URL
      const match = customUrl.match(/github\.com[/:]([^/]+)\/([^/\.]+)/);
      if (match) {
        const [, owner, repo] = match;
        const result = await githubApi.validateRepo(owner, repo);

        if (!result.valid) {
          if (result.error?.includes("private")) {
            setCustomUrlError("Private repository requires GitHub connection");
          } else {
            setCustomUrlError(result.error || "Repository not accessible");
          }
          setValidatingCustomUrl(false);
          return false;
        }

        setCustomRepoMetadata(result.metadata || null);
        if (result.metadata && !selectedBranch) {
          setSelectedBranch(result.metadata.defaultBranch);
        }
      }

      setValidatingCustomUrl(false);
      return true;
    } catch (error) {
      setCustomUrlError("Failed to validate repository");
      setValidatingCustomUrl(false);
      return false;
    }
  }, [customUrl, selectedBranch]);

  const handleConfirmCustomSelection = async () => {
    const isValid = await validateCustomUrl();
    if (!isValid) return;

    onSelect({
      repoSource: "custom",
      repoUrl: customUrl,
      branch: selectedBranch || undefined,
    });
  };

  // Filter repos based on search
  const filteredRepos = reposData?.repos || [];

  // Render disconnected state
  if (!githubStatus?.connected && activeTab === "github" && !isLoadingStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Repository Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Github className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Connect to GitHub</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect your GitHub account to browse and select from your repositories.
            </p>
            <Button
              className="mt-4"
              onClick={handleConnectGitHub}
              disabled={isConnectingGitHub}
            >
              {isConnectingGitHub ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-4 w-4" />
                  Connect GitHub
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setActiveTab("custom")}
          >
            Enter Custom Git URL
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Repository Selection
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "github" | "custom")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="github" disabled={!githubStatus?.connected}>
              <Github className="mr-2 h-4 w-4" />
              From GitHub
            </TabsTrigger>
            <TabsTrigger value="custom">
              <ExternalLink className="mr-2 h-4 w-4" />
              Custom URL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="github" className="space-y-4">
            {selectedGitHubRepo ? (
              // Show selected repo details
              <div className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold">{selectedGitHubRepo.fullName}</h4>
                      {selectedGitHubRepo.description && (
                        <p className="text-sm text-muted-foreground">
                          {selectedGitHubRepo.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        {selectedGitHubRepo.private && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Lock className="h-3 w-3" />
                            Private
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          Default: {selectedGitHubRepo.defaultBranch}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedGitHubRepo(null);
                        setSelectedBranch("");
                      }}
                    >
                      Change
                    </Button>
                  </div>
                </div>

                {/* Branch selector */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Branch</label>
                  {isLoadingBranches ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading branches...
                    </div>
                  ) : branchesData?.branches && branchesData.branches.length > 0 ? (
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branchesData.branches.map((branch) => (
                          <SelectItem key={branch.name} value={branch.name}>
                            {branch.name}
                            {branch.isDefault && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (default)
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Enter branch name"
                      value={selectedBranch}
                      onChange={(e) => setSelectedBranch(e.target.value)}
                    />
                  )}
                </div>

                <Button
                  className="w-full"
                  onClick={handleConfirmGitHubSelection}
                  disabled={!selectedBranch}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Selection
                </Button>
              </div>
            ) : (
              // Show repo list
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="max-h-[300px] overflow-y-auto rounded-lg border">
                  {isLoadingRepos ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : filteredRepos.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      {searchQuery
                        ? "No repositories found"
                        : "No repositories available"}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {filteredRepos.map((repo) => (
                        <button
                          key={repo.id}
                          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted transition-colors"
                          onClick={() => handleSelectGitHubRepo(repo)}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">
                                {repo.fullName}
                              </span>
                              {repo.private && (
                                <Lock className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              )}
                            </div>
                            {repo.description && (
                              <p className="text-sm text-muted-foreground truncate">
                                {repo.description}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {repo.defaultBranch}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Repository URL</label>
              <Input
                placeholder="https://github.com/owner/repo.git"
                value={customUrl}
                onChange={(e) => {
                  setCustomUrl(e.target.value);
                  setCustomUrlError("");
                  setCustomRepoMetadata(null);
                }}
              />
              {customUrlError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {customUrlError}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a Git URL (https:// or git@). Private repositories require GitHub connection.
              </p>
            </div>

            {/* Show metadata if available */}
            {customRepoMetadata && (
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold">{customRepoMetadata.fullName}</h4>
                {customRepoMetadata.description && (
                  <p className="text-sm text-muted-foreground">
                    {customRepoMetadata.description}
                  </p>
                )}
                <div className="mt-2 flex items-center gap-2 text-sm">
                  {customRepoMetadata.private && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Lock className="h-3 w-3" />
                      Private
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    Default: {customRepoMetadata.defaultBranch}
                  </span>
                </div>
              </div>
            )}

            {/* Branch selector for custom URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch</label>
              <Input
                placeholder={customRepoMetadata?.defaultBranch || "main"}
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use default branch
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleConfirmCustomSelection}
              disabled={!customUrl || validatingCustomUrl}
            >
              {validatingCustomUrl ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Selection
                </>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
