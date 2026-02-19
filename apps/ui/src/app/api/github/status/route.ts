import { NextResponse } from "next/server";
import { db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";
import { isGitHubOAuthEnabled } from "@agent-sandbox/server";

// GET /api/github/status - Check if user has connected GitHub
export async function GET() {
  try {
    const session = await requireAuth();

    // Check if GitHub OAuth is enabled
    if (!isGitHubOAuthEnabled) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          error: "GitHub OAuth is not configured",
        },
      });
    }

    // Check if user has a GitHub account linked
    const githubAccount = await db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, session.user.id),
        eq(accounts.providerId, "github")
      ),
    });

    if (!githubAccount) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
        },
      });
    }

    // Fetch GitHub username from GitHub API
    let username: string | undefined;
    try {
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubAccount.accessToken}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "agent-sandbox",
        },
      });

      if (response.ok) {
        const data = await response.json();
        username = data.login;
      } else if (response.status === 401) {
        // Token is invalid/revoked
        return NextResponse.json({
          success: true,
          data: {
            connected: false,
            error: "GitHub connection expired. Please reconnect.",
          },
        });
      }
    } catch (error) {
      console.error("Error fetching GitHub user:", error);
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        username: username || githubAccount.accountId,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("Error checking GitHub status:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to check GitHub status" },
      },
      { status: 500 }
    );
  }
}
