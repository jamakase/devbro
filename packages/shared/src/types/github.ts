// GitHub OAuth and Repository Types

export interface GitHubStatusResponse {
  connected: boolean;
  username?: string;
  error?: string;
}

export interface GitHubReposResponse {
  repos: GitHubRepo[];
  total: number;
  page: number;
  perPage: number;
}

export interface GitHubRepo {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  updatedAt: string;
  htmlUrl: string;
}

export interface RepoMetadata {
  id: number;
  fullName: string;
  name: string;
  owner: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  sizeKb: number;
}

export interface BranchInfo {
  name: string;
  sha: string;
  isDefault: boolean;
}

export interface RepoValidationResult {
  valid: boolean;
  requiresAuth: boolean;
  message: string;
  metadata?: RepoMetadata;
}

export interface PullRequestPreviewFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
  patchTruncated: boolean;
}

export interface PullRequestPreview {
  repoFullName: string;
  base: string;
  head: string;
  filesChanged: number;
  totalAdditions: number;
  totalDeletions: number;
  files: PullRequestPreviewFile[];
}

export interface CreatePullRequestRequest {
  title: string;
  body?: string;
  base?: string;
}

export interface CreatePullRequestResponse {
  number: number;
  url: string;
  htmlUrl: string;
}

// Task configuration with repo source
export interface TaskRepoConfig {
  repoSource: "github" | "custom";
  githubRepoId?: number;
  githubRepoFullName?: string;
  repoUrl: string;
  branch?: string;
}
