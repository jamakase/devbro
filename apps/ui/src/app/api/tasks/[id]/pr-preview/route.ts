import { NextResponse } from "next/server";
import { TaskRepository, db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { ApiResponse, PullRequestPreview } from "@agent-sandbox/shared";

const taskRepo = new TaskRepository();

interface GitHubRepoResponse {
  default_branch: string;
}

interface GitHubCompareFile {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

interface GitHubCompareResponse {
  files: GitHubCompareFile[];
  ahead_by: number;
  behind_by: number;
  total_commits: number;
}

function parseRepoFullName(repoFullName: string): { owner: string; repo: string } | null {
  const match = repoFullName.trim().match(/^([^/]+)\/([^/]+)$/);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]! };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: { code: "TASK_NOT_FOUND", message: "Task not found" },
      };
      return NextResponse.json(response, { status: 404 });
    }

    const repoFullName = task.config?.githubRepo;
    const head = task.config?.githubBranch;
    if (!repoFullName || !head) {
      const response: ApiResponse<PullRequestPreview> = {
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
      const response: ApiResponse<PullRequestPreview> = {
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
      const response: ApiResponse<PullRequestPreview> = {
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

    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers,
    });

    if (repoRes.status === 401) {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: {
          code: "GITHUB_TOKEN_INVALID",
          message: "GitHub connection expired. Please reconnect.",
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    if (repoRes.status === 404) {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: {
          code: "REPO_NOT_FOUND",
          message: "Repository not found or not accessible",
        },
      };
      return NextResponse.json(response, { status: 404 });
    }

    if (!repoRes.ok) {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: {
          code: "GITHUB_API_ERROR",
          message: `Failed to fetch repository metadata: ${repoRes.status}`,
        },
      };
      return NextResponse.json(response, { status: 500 });
    }

    const repoJson = (await repoRes.json()) as GitHubRepoResponse;

    const { searchParams } = new URL(request.url);
    const base = searchParams.get("base") || repoJson.default_branch;

    const compareRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/compare/${encodeURIComponent(
        base
      )}...${encodeURIComponent(head)}`,
      { headers }
    );

    if (compareRes.status === 422) {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: {
          code: "COMPARE_FAILED",
          message: "Failed to compare branches. Ensure the head branch exists on GitHub.",
        },
      };
      return NextResponse.json(response, { status: 422 });
    }

    if (!compareRes.ok) {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: {
          code: "GITHUB_API_ERROR",
          message: `Failed to fetch compare: ${compareRes.status}`,
        },
      };
      return NextResponse.json(response, { status: 500 });
    }

    const compareJson = (await compareRes.json()) as GitHubCompareResponse;
    const maxPatchChars = 20000;

    const files = (compareJson.files ?? []).map((file) => {
      const patch = file.patch ?? null;
      const patchTruncated = typeof patch === "string" && patch.length > maxPatchChars;
      return {
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: patchTruncated && patch ? patch.slice(0, maxPatchChars) : patch,
        patchTruncated,
      };
    });

    const preview: PullRequestPreview = {
      repoFullName,
      base,
      head,
      filesChanged: files.length,
      totalAdditions: files.reduce((sum, f) => sum + f.additions, 0),
      totalDeletions: files.reduce((sum, f) => sum + f.deletions, 0),
      files,
    };

    const response: ApiResponse<PullRequestPreview> = {
      success: true,
      data: preview,
    };
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      const response: ApiResponse<PullRequestPreview> = {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Unauthorized" },
      };
      return NextResponse.json(response, { status: 401 });
    }

    const response: ApiResponse<PullRequestPreview> = {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to build PR preview" },
    };
    return NextResponse.json(response, { status: 500 });
  }
}
