import type {
  ApiResponse,
  ListServersResponse,
  GetServerResponse,
  CreateServerRequest,
  CreateServerResponse,
  TestServerResponse,
  HealthResponse,
  GitHubStatusResponse,
  GitHubReposResponse,
  RepoMetadata,
  BranchInfo,
  CreateTaskRequest,
  Task,
  PullRequestPreview,
  CreatePullRequestRequest,
  CreatePullRequestResponse,
} from "@agent-sandbox/shared";

const API_BASE = "/api";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = (await response.json()) as ApiResponse<T>;

  if (!data.success) {
    throw new Error(data.error?.message ?? "API request failed");
  }

  return data.data as T;
}

// Server API
export const serverApi = {
  list: () => fetchApi<ListServersResponse>("/servers"),

  get: (id: string) => fetchApi<GetServerResponse>(`/servers/${id}`),

  create: (data: CreateServerRequest) =>
    fetchApi<CreateServerResponse>("/servers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: { name: string; metadata?: any }) =>
    fetchApi<{ id: string; token: string }>("/servers/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  test: (id: string) =>
    fetchApi<TestServerResponse>(`/servers/${id}/test`, {
      method: "POST",
    }),

  delete: (id: string, force = false) =>
    fetchApi<{ message: string }>(`/servers/${id}?force=${force}`, {
      method: "DELETE",
    }),
};

// Task API
export const taskApi = {
  create: (data: CreateTaskRequest) =>
    fetchApi<Task>("/tasks", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getPrPreview: (taskId: string, params?: { base?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.base) searchParams.set("base", params.base);
    const query = searchParams.toString();
    return fetchApi<PullRequestPreview>(
      `/tasks/${taskId}/pr-preview${query ? `?${query}` : ""}`
    );
  },

  createPullRequest: (taskId: string, data: CreatePullRequestRequest) =>
    fetchApi<CreatePullRequestResponse>(`/tasks/${taskId}/pull-request`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Health API
export const healthApi = {
  check: () => fetchApi<HealthResponse>("/health"),
};

// GitHub API
export const githubApi = {
  getStatus: () => fetchApi<GitHubStatusResponse>("/github/status"),

  disconnect: () =>
    fetchApi<{ success: true }>("/github/disconnect", {
      method: "POST",
    }),

  getRepos: (params?: { page?: number; perPage?: number; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.perPage) searchParams.set("per_page", params.perPage.toString());
    if (params?.search) searchParams.set("search", params.search);
    const query = searchParams.toString();
    return fetchApi<GitHubReposResponse>(`/github/repos${query ? `?${query}` : ""}`);
  },

  getBranches: (owner: string, repo: string) =>
    fetchApi<{ branches: BranchInfo[] }>(`/github/repos/${owner}/${repo}/branches`),

  validateRepo: (owner: string, repo: string) =>
    fetchApi<{ valid: boolean; metadata?: RepoMetadata; error?: string }>(
      `/github/repos/${owner}/${repo}/validate`
    ),
};
