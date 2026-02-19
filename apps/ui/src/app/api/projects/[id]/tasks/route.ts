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
      skills: z
        .object({
          enabledSkillIds: z.array(z.string().min(1)).max(100).optional(),
        })
        .optional(),
      mcp: z
        .object({
          mcpServers: z.record(
            z.string().min(1),
            z.object({
              command: z.string().min(1),
              args: z.array(z.string()).optional(),
              env: z.record(z.string(), z.string()).optional(),
            })
          ),
        })
        .optional(),
      bootstrap: z
        .object({
          pullSpecs: z.boolean().optional(),
          specsRepoUrl: z.string().optional(),
          specsBranch: z.string().optional(),
          enableKnowledgeBase: z.boolean().optional(),
          buildKnowledgeBaseIndex: z.boolean().optional(),
          enabledSkillIds: z.array(z.string().min(1)).max(100).optional(),
          mcpConfig: z
            .object({
              mcpServers: z.record(
                z.string().min(1),
                z.object({
                  command: z.string().min(1),
                  args: z.array(z.string()).optional(),
                  env: z.record(z.string(), z.string()).optional(),
                })
              ),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
});

const taskRepo = new TaskRepository();
const projectRepo = new ProjectRepository();

// GET /api/projects/[id]/tasks - List tasks for a project
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: projectId } = await params;

    // Verify project ownership
    const project = await projectRepo.findById(projectId);
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const tasks = await taskRepo.findByProjectId(projectId);
    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tasks - Create a new task
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id: projectId } = await params;
    const body = await request.json();

    // Verify project ownership
    const project = await projectRepo.findById(projectId);
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const validation = createTaskSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message ?? "Validation error" },
        { status: 400 }
      );
    }

    const taskData = {
      ...validation.data,
      name: validation.data.name || validation.data.config?.githubRepo?.split('/').pop() || "Untitled Task",
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
