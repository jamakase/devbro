import type {
  ApiResponse,
  ListServersResponse,
  GetServerResponse,
  CreateServerRequest,
  CreateServerResponse,
  TestServerResponse,
  HealthResponse,
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

  test: (id: string) =>
    fetchApi<TestServerResponse>(`/servers/${id}/test`, {
      method: "POST",
    }),

  delete: (id: string, force = false) =>
    fetchApi<{ message: string }>(`/servers/${id}?force=${force}`, {
      method: "DELETE",
    }),
};

// Health API
export const healthApi = {
  check: () => fetchApi<HealthResponse>("/health"),
};
