import { NextResponse } from "next/server";
import { db, accounts, eq, and } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

// POST /api/github/disconnect - Remove GitHub connection
export async function POST() {
  try {
    const session = await requireAuth();

    // Delete the GitHub account record
    await db
      .delete(accounts)
      .where(
        and(
          eq(accounts.userId, session.user.id),
          eq(accounts.providerId, "github")
        )
      );

    return NextResponse.json({
      success: true,
      data: { success: true },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    console.error("Error disconnecting GitHub:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to disconnect GitHub" },
      },
      { status: 500 }
    );
  }
}
