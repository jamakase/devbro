import { randomUUID } from "crypto";
import { eq, and, desc, count } from "drizzle-orm";
import { db } from "../db/client.js";
import { servers, tasks } from "../db/schema/index.js";
import type {
  Server,
  ServerStatus,
  ServerAuthType,
  ServerType,
  CreateServerInput,
  ServerWithStats,
} from "@agent-sandbox/shared";

export class ServerRepository {
  async create(userId: string, input: CreateServerInput): Promise<Server> {
    const id = randomUUID();
    const now = new Date();

    const result = await db
      .insert(servers)
      .values({
        id,
        userId,
        name: input.name,
        type: input.type ?? "ssh",
        host: input.host,
        port: input.port ?? 22,
        username: input.username,
        authType: input.authType,
        privateKey: input.privateKey ?? null,
        token: input.token ?? null,
        metadata: input.metadata ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return this.mapRow(result[0]!);
  }

  async findById(id: string): Promise<Server | null> {
    const result = await db.select().from(servers).where(eq(servers.id, id));
    return result[0] ? this.mapRow(result[0]) : null;
  }

  async findByIdAndUser(id: string, userId: string): Promise<Server | null> {
    const result = await db
      .select()
      .from(servers)
      .where(and(eq(servers.id, id), eq(servers.userId, userId)));
    return result[0] ? this.mapRow(result[0]) : null;
  }

  async findByHostPortAndUser(
    host: string,
    port: number,
    userId: string
  ): Promise<Server | null> {
    const result = await db
      .select()
      .from(servers)
      .where(
        and(
          eq(servers.host, host),
          eq(servers.port, port),
          eq(servers.userId, userId)
        )
      );
    return result[0] ? this.mapRow(result[0]) : null;
  }

  async findByUserId(userId: string): Promise<ServerWithStats[]> {
    const result = await db
      .select({
        server: servers,
        taskCount: count(tasks.id),
      })
      .from(servers)
      .leftJoin(tasks, eq(servers.id, tasks.serverId))
      .where(eq(servers.userId, userId))
      .groupBy(servers.id)
      .orderBy(desc(servers.isDefault), servers.name);

    return result.map((r) => ({
      ...this.mapRow(r.server),
      taskCount: r.taskCount,
    }));
  }

  async findDefaultByUser(userId: string): Promise<Server | null> {
    const result = await db
      .select()
      .from(servers)
      .where(and(eq(servers.userId, userId), eq(servers.isDefault, true)));
    return result[0] ? this.mapRow(result[0]) : null;
  }

  async update(
    id: string,
    userId: string,
    updates: Partial<{
      name: string;
      type: ServerType;
      host: string;
      port: number;
      username: string | null;
      authType: ServerAuthType | null;
      privateKey: string | null;
      token: string | null;
      metadata: Record<string, any> | null;
      status: ServerStatus;
      isDefault: boolean;
      errorMessage: string | null;
      lastConnectedAt: Date | null;
    }>
  ): Promise<Server | null> {
    // If setting as default, unset other defaults first
    if (updates.isDefault) {
      await db
        .update(servers)
        .set({ isDefault: false })
        .where(eq(servers.userId, userId));
    }

    const result = await db
      .update(servers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(servers.id, id), eq(servers.userId, userId)))
      .returning();

    return result[0] ? this.mapRow(result[0]) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(servers)
      .where(and(eq(servers.id, id), eq(servers.userId, userId)))
      .returning();
    return result.length > 0;
  }

  private mapRow(row: typeof servers.$inferSelect): Server {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      type: (row.type as ServerType) ?? "ssh",
      host: row.host,
      port: row.port ?? undefined,
      username: row.username ?? undefined,
      authType: (row.authType as ServerAuthType) ?? undefined,
      privateKey: row.privateKey ?? undefined,
      token: row.token ?? undefined,
      metadata: (row.metadata as Record<string, any>) ?? null,
      status: row.status as ServerStatus,
      isDefault: row.isDefault,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastConnectedAt: row.lastConnectedAt,
    };
  }
}
