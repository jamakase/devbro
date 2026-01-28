import { NextResponse } from "next/server";
import { TaskRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const taskRepo = new TaskRepository();

// GET /api/tasks/[id]/files - Get directory listing from task's volume
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") || "/";

    // Verify task ownership
    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (!task.volumeId) {
      return NextResponse.json(
        { error: "Task has no volume" },
        { status: 400 }
      );
    }

    // TODO: Use core package to list files in volume
    // For now, return mock data
    const files = [
      {
        name: "src",
        type: "directory" as const,
        size: 0,
        modifiedAt: new Date().toISOString(),
      },
      {
        name: "package.json",
        type: "file" as const,
        size: 1024,
        modifiedAt: new Date().toISOString(),
      },
      {
        name: "README.md",
        type: "file" as const,
        size: 512,
        modifiedAt: new Date().toISOString(),
      },
    ];

    return NextResponse.json({ path, files });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
