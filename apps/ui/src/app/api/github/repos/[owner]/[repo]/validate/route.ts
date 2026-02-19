import { NextResponse } from "next/server";
import { db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { RepoMetadata } from "@agent-sandbox/shared";

interface GitHubRepoResponse {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  description: string | null;
  default_branch: string;
  private: boolean;
  size: number;
}

// GET /api/github/repos/[owner]/[repo]/validate - Validate repo accessibility
export async function GET(
  request: Request,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const session = await requireAuth();
    const { owner, repo } = await params;

    // Get user's GitHub account
    const githubAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.providerId, "github")
      ),
    });

    // Try to fetch repo from GitHub API
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "agent-sandbox",
    };

    if (githubAccount?.accessToken) {
      headers["Authorization"] = `Bearer ${githubAccount.accessToken}`;
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers }
    );

    if (response.status === 404) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          error: "Repository not found. It may be private or doesn't exist.",
        },
      });
    }

    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          error: "Private repository requires GitHub connection.",
        },
      });
    }

    if (!response.ok) {
      return NextResponse.json({
        success: true,
        data: {
          valid: false,
          error: `GitHub API error: ${response.status}`,
        },
      });
    }

    const data = (await response.json()) as GitHubRepoResponse;

    const metadata: RepoMetadata = {
      id: data.id,
      fullName: data.full_name,
      name: data.name,
      owner: data.owner.login,
      description: data.description,
      defaultBranch: data.default_branch,
      private: data.private,
      sizeKb: data.size,
    };

    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        metadata,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("Error validating repo:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to validate repository" },
      },
      { status: 500 }
    );
  }
}
