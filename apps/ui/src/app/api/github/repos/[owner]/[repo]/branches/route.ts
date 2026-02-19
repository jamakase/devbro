import { NextResponse } from "next/server";
import { db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { BranchInfo } from "@agent-sandbox/shared";

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
}

// GET /api/github/repos/[owner]/[repo]/branches - List branches for a repo
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

    if (!githubAccount) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GITHUB_NOT_CONNECTED",
            message: "GitHub account not connected",
          },
        },
        { status: 400 }
      );
    }

    // Fetch repo metadata to get default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          Authorization: `Bearer ${githubAccount.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "agent-sandbox",
        },
      }
    );

    if (!repoResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GITHUB_API_ERROR",
            message: `Failed to fetch repository: ${repoResponse.status}`,
          },
        },
        { status: repoResponse.status }
      );
    }

    const repoData = await repoResponse.json();
    const defaultBranch = repoData.default_branch;

    // Fetch branches from GitHub API
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${githubAccount.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "agent-sandbox",
        },
      }
    );

    if (response.status === 401) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GITHUB_TOKEN_INVALID",
            message: "GitHub connection expired. Please reconnect.",
          },
        },
        { status: 401 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "GITHUB_API_ERROR",
            message: `GitHub API error: ${response.status}`,
          },
        },
        { status: 500 }
      );
    }

    const githubBranches = (await response.json()) as GitHubBranch[];

    // Transform to our format
    const branches: BranchInfo[] = githubBranches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      isDefault: branch.name === defaultBranch,
    }));

    // Sort: default branch first, then alphabetically
    branches.sort((a, b) => {
      if (a.isDefault) return -1;
      if (b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      success: true,
      data: { branches },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("Error fetching branches:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch branches" },
      },
      { status: 500 }
    );
  }
}
