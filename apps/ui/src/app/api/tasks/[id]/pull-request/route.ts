import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskRepository, db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, CreatePullRequestResponse } from "@agent-sandbox/shared";

const taskRepo = new TaskRepository();

const createPullRequestSchema = z.object({
  title: z.string().min(1).max(256),
  body: z.string().max(65536).optional(),
  base: z.string().max(255).optional(),
});

interface GitHubRepoResponse {
  default_branch: string;
}

interface GitHubCreatePullResponse {
  number: number;
  url: string;
  html_url: string;
}

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } | null {
  const match = repoFullName.trim().match(/^([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]! };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    const validation = createPullRequestSchema.safeParse(body);
    if (!validation.success) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: validation.error.issues[0]?.message ?? "Validation error",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: { code: "TASK_NOT_FOUND", message: "Task not found" },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const repoFullName = task.config?.githubRepo;
    const head = task.config?.githubBranch;
    if (!repoFullName || !head) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "REPO_NOT_CONFIGURED",
          message: "Task is missing githubRepo or githubBranch",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const parsed = parseRepoFullName(repoFullName);
    if (!parsed) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "INVALID_REPO_FORMAT",
          message: "githubRepo must be in the form owner/repo",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const githubAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.providerId, "github")
      ),
    });

    if (!githubAccount?.accessToken) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "GITHUB_NOT_CONNECTED",
          message: "GitHub account not connected",
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { owner, repo } = parsed;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${githubAccount.accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "agent-sandbox",
    };

    let base = validation.data.base;
    if (!base) {
      const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers,
      });
      if (repoRes.status === 401) {
        const response: ApiResponse<CreatePullRequestResponse> = {
          success: false,
          error: {
            code: "GITHUB_TOKEN_INVALID",
            message: "GitHub connection expired. Please reconnect.",
          },
        };
        return NextResponse.json(response, { status: 401 });
      }
      if (!repoRes.ok) {
        const response: ApiResponse<CreatePullRequestResponse> = {
          success: false,
          error: {
            code: "GITHUB_API_ERROR",
            message: `Failed to fetch repository metadata: ${repoRes.status}`,
          },
        };
        return NextResponse.json(response, { status: 500 });
      }
      const repoJson = (await repoRes.json()) as GitHubRepoResponse;
      base = repoJson.default_branch;
    }

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        title: validation.data.title,
        body: validation.data.body ?? "",
        base,
        head,
      }),
    });

    if (prRes.status === 401) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "GITHUB_TOKEN_INVALID",
          message: "GitHub connection expired. Please reconnect.",
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (prRes.status === 403) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "GITHUB_PERMISSION_DENIED",
          message: "GitHub permissions are insufficient to create a pull request",
        },
      };
      return NextResponse.json(response, { status: 403 });
    }

    if (prRes.status === 422) {
      let details: unknown = undefined;
      try {
        details = await prRes.json();
      } catch {}
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "PR_CREATION_FAILED",
          message: "Failed to create pull request. Ensure the head branch exists on GitHub.",
          details: typeof details === "object" && details !== null ? (details as Record<string, unknown>) : undefined,
        },
      };
      return NextResponse.json(response, { status: 422 });
    }

    if (!prRes.ok) {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: {
          code: "GITHUB_API_ERROR",
          message: `Failed to create pull request: ${prRes.status}`,
        },
      };
      return NextResponse.json(response, { status: 500 });
    }

    const prJson = (await prRes.json()) as GitHubCreatePullResponse;
    const data: CreatePullRequestResponse = {
      number: prJson.number,
      url: prJson.url,
      htmlUrl: prJson.html_url,
    };

    const response: ApiResponse<CreatePullRequestResponse> = {
      success: true,
      data,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      const response: ApiResponse<CreatePullRequestResponse> = {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      };
      return NextResponse.json(response, { status: 401 });
    }
    const response: ApiResponse<CreatePullRequestResponse> = {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to create pull request" },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
