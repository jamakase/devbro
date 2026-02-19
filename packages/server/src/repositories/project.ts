import { randomUUID } from "crypto";
import { eq, desc, and, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { projects, tasks } from "../db/schema/index.js";
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectWithTaskCount,
} from "@agent-sandbox/shared";

export class ProjectRepository {
  async create(userId: string, input: CreateProjectInput): Promise<Project> {
    const id = randomUUID();
    const now = new Date();

    const result = await db
      .insert(projects)
      .values({
        id,
        userId,
        name: input.name,
        description: input.description ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return result[0]!;
  }

  async findById(id: string): Promise<Project | null> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return result[0] ?? null;
  }

  async findByUserId(userId: string): Promise<ProjectWithTaskCount[]> {
    const result = await db
      .select({
        id: projects.id,
        userId: projects.userId,
        name: projects.name,
        description: projects.description,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        taskCount: count(tasks.id),
      })
      .from(projects)
      .leftJoin(tasks, eq(projects.id, tasks.projectId))
      .where(eq(projects.userId, userId))
      .groupBy(projects.id)
      .orderBy(desc(projects.updatedAt));

    return result;
  }

  async update(
    id: string,
    userId: string,
    input: UpdateProjectInput
  ): Promise<Project | null> {
    const result = await db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();

    return result.length > 0;
  }

  async findByNameAndUser(name: string, userId: string): Promise<Project | null> {
    const result = await db
      .select()
      .from(projects)
      .where(and(eq(projects.name, name), eq(projects.userId, userId)));

    return result[0] ?? null;
  }

  async existsByNameAndUser(name: string, userId: string): Promise<boolean> {
    const result = await db
      .select({ id: projects.id })
      .from(projects)
      .where(and(eq(projects.name, name), eq(projects.userId, userId)));

    return result.length > 0;
  }
}
