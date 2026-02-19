import { randomUUID } from "crypto";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db/client.js";
import { tasks, projects } from "../db/schema/index.js";
import type {
  Task,
  TaskStatus,
  CreateTaskInput,
  TaskConfig,
} from "@agent-sandbox/shared";

export class TaskRepository {
  async create(projectId: string, input: CreateTaskInput): Promise<Task> {
    const id = randomUUID();
    const now = new Date();

    const result = await db
      .insert(tasks)
      .values({
        id,
        projectId,
        name: input.name,
        status: "creating",
        cliTool: input.cliTool,
        serverId: input.serverId ?? null,
        config: input.config ?? {},
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapRow(result[0]!);
  }

  async findById(id: string): Promise<Task | null> {
    const result = await db.select().from(tasks).where(eq(tasks.id, id));
    return result[0] ? this.mapRow(result[0]) : null;
  }

  async findByProjectId(projectId: string): Promise<Task[]> {
    const result = await db
      .select()
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(desc(tasks.updatedAt));

    return result.map(this.mapRow);
  }

  async findByProjectIdWithOwnerCheck(
    projectId: string,
    userId: string
  ): Promise<Task[]> {
    const result: Array<{ task: typeof tasks.$inferSelect }> = await db
      .select({
        task: tasks,
      })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.projectId, projectId), eq(projects.userId, userId)))
      .orderBy(desc(tasks.updatedAt));

    return result.map((row) => this.mapRow(row.task));
  }

  async findPendingByServerId(serverId: string): Promise<Task[]> {
    const result = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.serverId, serverId), eq(tasks.status, "pending")))
      .orderBy(desc(tasks.createdAt));
    return result.map(this.mapRow);
  }

  async update(
    id: string,
    updates: Partial<{
      name: string;
      status: TaskStatus;
      containerId: string | null;
      volumeId: string | null;
      serverId: string | null;
      config: TaskConfig;
      errorMessage: string | null;
      lastActivityAt: Date | null;
    }>
  ): Promise<Task | null> {
    const result = await db
      .update(tasks)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    return result[0] ? this.mapRow(result[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  async deleteWithOwnerCheck(id: string, userId: string): Promise<boolean> {
    // First check ownership
    const task = await db
      .select({ taskId: tasks.id })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.id, id), eq(projects.userId, userId)));

    if (task.length === 0) return false;

    const result = await db.delete(tasks).where(eq(tasks.id, id)).returning();
    return result.length > 0;
  }

  async getTaskWithOwnerCheck(
    taskId: string,
    userId: string
  ): Promise<Task | null> {
    const result = await db
      .select({ task: tasks })
      .from(tasks)
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .where(and(eq(tasks.id, taskId), eq(projects.userId, userId)));

    return result[0] ? this.mapRow(result[0].task) : null;
  }

  private mapRow(row: typeof tasks.$inferSelect): Task {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      status: row.status as TaskStatus,
      cliTool: row.cliTool as "claude" | "opencode",
      serverId: row.serverId,
      containerId: row.containerId,
      volumeId: row.volumeId,
      config: row.config as TaskConfig,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastActivityAt: row.lastActivityAt,
    };
  }
}
