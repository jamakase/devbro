import { NextResponse } from "next/server";
import { db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import type { GitHubRepo } from "@agent-sandbox/shared";

interface GitHubApiRepo {
  id: number;
  full_name: string;
  name: string;
  owner: {
    login: string;
  };
  private: boolean;
  default_branch: string;
  description: string | null;
  updated_at: string;
  html_url: string;
}

// GET /api/github/repos - List user's GitHub repositories
export async function GET(request: Request) {
  try {
    const session = await requireAuth();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = Math.min(parseInt(searchParams.get("per_page") || "30", 10), 100);
    const search = searchParams.get("search") || "";

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

    // Fetch repos from GitHub API
    const response = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=100&page=1`,
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

    const githubRepos = (await response.json()) as GitHubApiRepo[];

    // Filter by search term if provided
    let filteredRepos = githubRepos;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRepos = githubRepos.filter(
        (repo) =>
          repo.name.toLowerCase().includes(searchLower) ||
          repo.full_name.toLowerCase().includes(searchLower)
      );
    }

    // Paginate results
    const total = filteredRepos.length;
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedRepos = filteredRepos.slice(startIndex, endIndex);

    // Transform to our format
    const repos: GitHubRepo[] = paginatedRepos.map((repo) => ({
      id: repo.id,
      fullName: repo.full_name,
      name: repo.name,
      owner: repo.owner.login,
      private: repo.private,
      defaultBranch: repo.default_branch,
      description: repo.description,
      updatedAt: repo.updated_at,
      htmlUrl: repo.html_url,
    }));

    return NextResponse.json({
      success: true,
      data: {
        repos,
        total,
        page,
        perPage,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("Error fetching GitHub repos:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch repositories" },
      },
      { status: 500 }
    );
  }
}
