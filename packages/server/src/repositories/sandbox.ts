import { randomUUID } from "crypto";
import { getDatabase } from "../db/index.js";
import type {
  CreateSandboxInput,
  Sandbox,
  SandboxConfig,
  SandboxStatus,
} from "@agent-sandbox/shared";

type SandboxRow = {
  id: string;
  name: string;
  status: string;
  cli_tool: string;
  server_id: string | null;
  container_id: string | null;
  volume_id: string | null;
  config: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string | null;
};

export class SandboxRepository {
  private db = getDatabase();

  create(input: CreateSandboxInput): Sandbox {
    const id = randomUUID();
    const now = new Date().toISOString();
    const config = input.config ?? {};

    this.db
      .prepare(
        `
        INSERT INTO sandboxes (
          id,
          name,
          status,
          cli_tool,
          server_id,
          container_id,
          volume_id,
          config,
          error_message,
          created_at,
          updated_at,
          last_activity_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        input.name,
        "creating",
        input.cliTool,
        input.serverId ?? null,
        null,
        null,
        JSON.stringify(config),
        null,
        now,
        now,
        null
      );

    return {
      id,
      name: input.name,
      status: "creating",
      cliTool: input.cliTool,
      serverId: input.serverId ?? null,
      containerId: null,
      volumeId: null,
      config,
      createdAt: now,
      updatedAt: now,
      lastActivityAt: null,
      errorMessage: null,
    };
  }

  findById(id: string): Sandbox | null {
    const row = this.db
      .prepare("SELECT * FROM sandboxes WHERE id = ?")
      .get(id) as SandboxRow | undefined;
    return row ? this.mapRow(row) : null;
  }

  findAll(filters?: { status?: SandboxStatus; serverId?: string | null }): Sandbox[] {
    const clauses: string[] = [];
    const values: Array<string | null> = [];

    if (filters?.status) {
      clauses.push("status = ?");
      values.push(filters.status);
    }

    if (filters?.serverId !== undefined) {
      if (filters.serverId === null) {
        clauses.push("server_id IS NULL");
      } else {
        clauses.push("server_id = ?");
        values.push(filters.serverId);
      }
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT * FROM sandboxes ${where} ORDER BY updated_at DESC`)
      .all(...values) as SandboxRow[];

    return rows.map((row) => this.mapRow(row));
  }

  update(
    id: string,
    updates: Partial<{
      name: string;
      status: SandboxStatus;
      serverId: string | null;
      containerId: string | null;
      volumeId: string | null;
      config: SandboxConfig;
      errorMessage: string | null;
      lastActivityAt: string | null;
    }>
  ): Sandbox | null {
    const fields: Array<{ column: string; value: string | null }> = [];

    if (updates.name !== undefined) fields.push({ column: "name", value: updates.name });
    if (updates.status !== undefined) fields.push({ column: "status", value: updates.status });
    if (updates.serverId !== undefined) fields.push({ column: "server_id", value: updates.serverId });
    if (updates.containerId !== undefined) fields.push({ column: "container_id", value: updates.containerId });
    if (updates.volumeId !== undefined) fields.push({ column: "volume_id", value: updates.volumeId });
    if (updates.config !== undefined)
      fields.push({ column: "config", value: JSON.stringify(updates.config) });
    if (updates.errorMessage !== undefined)
      fields.push({ column: "error_message", value: updates.errorMessage });
    if (updates.lastActivityAt !== undefined)
      fields.push({ column: "last_activity_at", value: updates.lastActivityAt });

    const updatedAt = new Date().toISOString();
    fields.push({ column: "updated_at", value: updatedAt });

    if (fields.length === 0) {
      return this.findById(id);
    }

    const setClause = fields.map((field) => `${field.column} = ?`).join(", ");
    const values = fields.map((field) => field.value);

    this.db
      .prepare(`UPDATE sandboxes SET ${setClause} WHERE id = ?`)
      .run(...values, id);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare("DELETE FROM sandboxes WHERE id = ?").run(id);
    return result.changes > 0;
  }

  countByServerId(serverId: string): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as count FROM sandboxes WHERE server_id = ?")
      .get(serverId) as { count: number } | undefined;
    return row?.count ?? 0;
  }

  private mapRow(row: SandboxRow): Sandbox {
    let config: SandboxConfig = {};
    try {
      config = row.config ? (JSON.parse(row.config) as SandboxConfig) : {};
    } catch {
      config = {};
    }

    return {
      id: row.id,
      name: row.name,
      status: row.status as SandboxStatus,
      cliTool: row.cli_tool as Sandbox["cliTool"],
      serverId: row.server_id ?? null,
      containerId: row.container_id ?? null,
      volumeId: row.volume_id ?? null,
      config,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastActivityAt: row.last_activity_at ?? null,
      errorMessage: row.error_message ?? null,
    };
  }
}
