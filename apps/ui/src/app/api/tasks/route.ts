import { NextResponse } from "next/server";
import { z } from "zod";
import { TaskRepository, ProjectRepository } from "@agent-sandbox/server";
import { requireAuth } from "@/lib/auth-server";

const createTaskSchema = z.object({
  name: z.string().max(100).optional(),
  cliTool: z.enum(["claude", "opencode"]),
  serverId: z.string().optional(),
  config: z
    .object({
      githubRepo: z.string().optional(),
      githubBranch: z.string().optional(),
      memoryLimit: z.string().optional(),
      cpuLimit: z.string().optional(),
      anthropicApiKey: z.string().optional(),
      githubToken: z.string().optional(),
      prompt: z.string().optional(),
    })
    .optional(),
});

const taskRepo = new TaskRepository();
const projectRepo = new ProjectRepository();

// POST /api/tasks - Create a new task (auto-managing project association)
export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    // Determine Project ID
    let projectId: string;
    const githubRepo = validation.data.config?.githubRepo;

    if (githubRepo) {
      // If repo provided, find or create project for it
      // Extract repo name (e.g., "owner/repo" or just "repo")
      // We'll use the full "owner/repo" as project name if possible, or just repo name
      const projectName = githubRepo; 
      
      const existingProject = await projectRepo.findByNameAndUser(
        projectName,
        session.user.id
      );

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        // Create new project for this repo
        const newProject = await projectRepo.create(session.user.id, {
          name: projectName,
          description: `Auto-created project for ${githubRepo}`,
        });
        projectId = newProject.id;
      }
    } else {
      // If no repo, put in a "General" or "Miscellaneous" project?
      // Or require repo? The spec says repo is selected.
      // Let's assume for now we use a "General" project if no repo.
      const generalProjectName = "General";
      const existingProject = await projectRepo.findByNameAndUser(
        generalProjectName,
        session.user.id
      );

      if (existingProject) {
        projectId = existingProject.id;
      } else {
        const newProject = await projectRepo.create(session.user.id, {
          name: generalProjectName,
          description: "General tasks without specific repository",
        });
        projectId = newProject.id;
      }
    }

    const taskData = {
      ...validation.data,
      name: validation.data.name || githubRepo?.split('/').pop() || "Untitled Task",
    };

    const task = await taskRepo.create(projectId, taskData);
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
