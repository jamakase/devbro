export interface RepoMetadata {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
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

interface GitHubRepoResponse {
  owner: {
    login: string;
  };
  name: string;
  full_name: string;
  description: string | null;
  default_branch: string;
  private: boolean;
  size: number;
}

interface GitHubBranchResponse {
  name: string;
  commit: {
    sha: string;
  };
}

export class GitHubService {
  private token: string | null = null;

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  async validateRepository(repoUrl: string): Promise<RepoValidationResult> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      return {
        valid: false,
        requiresAuth: false,
        message: "Invalid GitHub repository URL",
      };
    }

    const { owner, repo } = parsed;

    try {
      const response = await this.fetchApi(`/repos/${owner}/${repo}`);

      if (response.status === 404) {
        // Could be private or non-existent
        if (!this.token) {
          return {
            valid: false,
            requiresAuth: true,
            message: "Repository not found. It may be private - please provide a GitHub token.",
          };
        }
        return {
          valid: false,
          requiresAuth: false,
          message: "Repository not found",
        };
      }

      if (!response.ok) {
        return {
          valid: false,
          requiresAuth: false,
          message: `GitHub API error: ${response.status}`,
        };
      }

      const data = (await response.json()) as GitHubRepoResponse;

      return {
        valid: true,
        requiresAuth: data.private && !this.token,
        message: "Repository is accessible",
        metadata: {
          owner: data.owner.login,
          name: data.name,
          fullName: data.full_name,
          description: data.description,
          defaultBranch: data.default_branch,
          isPrivate: data.private,
          sizeKb: data.size,
        },
      };
    } catch (error) {
      return {
        valid: false,
        requiresAuth: false,
        message: error instanceof Error ? error.message : "Failed to validate repository",
      };
    }
  }

  async getRepositoryMetadata(repoUrl: string): Promise<RepoMetadata | null> {
    const result = await this.validateRepository(repoUrl);
    return result.metadata ?? null;
  }

  async listBranches(repoUrl: string): Promise<BranchInfo[]> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) return [];

    const { owner, repo } = parsed;

    try {
      const response = await this.fetchApi(`/repos/${owner}/${repo}/branches`);
      if (!response.ok) return [];

      const branches = (await response.json()) as GitHubBranchResponse[];
      const metadata = await this.getRepositoryMetadata(repoUrl);
      const defaultBranch = metadata?.defaultBranch ?? "main";

      return branches.map((b: { name: string; commit: { sha: string } }) => ({
        name: b.name,
        sha: b.commit.sha,
        isDefault: b.name === defaultBranch,
      }));
    } catch {
      return [];
    }
  }

  generateCloneCommand(repoUrl: string, branch?: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error("Invalid repository URL");
    }

    const { owner, repo } = parsed;
    let cloneUrl: string;

    if (this.token) {
      // Use token-authenticated HTTPS
      cloneUrl = `https://${this.token}@github.com/${owner}/${repo}.git`;
    } else {
      // Public HTTPS
      cloneUrl = `https://github.com/${owner}/${repo}.git`;
    }

    let command = `git clone ${cloneUrl} .`;

    if (branch) {
      command = `git clone --branch ${branch} ${cloneUrl} .`;
    }

    return command;
  }

  private parseRepoUrl(url: string): { owner: string; repo: string } | null {
    // Handle various GitHub URL formats
    const patterns = [
      // https://github.com/owner/repo
      /https?:\/\/github\.com\/([^\/]+)\/([^\/\.]+)/,
      // git@github.com:owner/repo.git
      /git@github\.com:([^\/]+)\/([^\/\.]+)/,
      // owner/repo
      /^([^\/]+)\/([^\/\.]+)$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1] && match[2]) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ""),
        };
      }
    }

    return null;
  }

  private async fetchApi(endpoint: string): Promise<Response> {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "agent-sandbox",
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return fetch(`https://api.github.com${endpoint}`, { headers });
  }
}
