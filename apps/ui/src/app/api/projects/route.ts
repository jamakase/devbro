import { NextResponse } from "next/server";
import { z } from "zod";
import { ProjectRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
});

const projectRepo = new ProjectRepository();

// GET /api/projects - List user's projects
export async function GET() {
  try {
    const session = await requireAuth();
    const projects = await projectRepo.findByUserId(session.user.id);
    return NextResponse.json(projects);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create a new project
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = createProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const exists = await projectRepo.existsByNameAndUser(
      validation.data.name,
      session.user.id
    );
    if (exists) {
      return NextResponse.json(
        { error: "Project name already exists" },
        { status: 400 }
      );
    }

    const project = await projectRepo.create(session.user.id, validation.data);
    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
