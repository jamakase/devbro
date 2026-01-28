/**
 * Migration script to move data from SQLite to PostgreSQL
 *
 * This script:
 * 1. Reads existing data from SQLite database
 * 2. Creates a default admin user in PostgreSQL
 * 3. Creates a default project for migrated sandboxes
 * 4. Migrates sandboxes as tasks under the default project
 * 5. Migrates servers associated with the admin user
 *
 * Usage:
 *   npx tsx scripts/migrate-sqlite-to-pg.ts
 *
 * Prerequisites:
 *   - DATABASE_URL environment variable set for PostgreSQL
 *   - Existing SQLite database at .data/agent-sandbox.db (or DATA_DIR env var)
 */

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "crypto";
import { join } from "path";
import { existsSync } from "fs";

// Define SQLite row types
interface SqliteSandboxRow {
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
}

interface SqliteServerRow {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: string;
  private_key: string | null;
  status: string;
  is_default: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  last_connected_at: string | null;
}

async function migrate() {
  console.log("Starting SQLite to PostgreSQL migration...\n");

  // Check for PostgreSQL connection
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  // Check for SQLite database
  const dataDir = process.env.DATA_DIR ?? join(process.cwd(), ".data");
  const sqliteDbPath = join(dataDir, "agent-sandbox.db");

  if (!existsSync(sqliteDbPath)) {
    console.log("No SQLite database found at:", sqliteDbPath);
    console.log("Nothing to migrate. Creating default admin user and project...\n");

    // Connect to PostgreSQL
    const client = postgres(databaseUrl);
    const db = drizzle(client);

    await createDefaultUserAndProject(db, client);
    await client.end();
    return;
  }

  console.log("SQLite database found at:", sqliteDbPath);

  // Open SQLite database
  const sqlite = new Database(sqliteDbPath, { readonly: true });

  // Connect to PostgreSQL
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Read SQLite data
    const sandboxes = sqlite
      .prepare("SELECT * FROM sandboxes")
      .all() as SqliteSandboxRow[];
    const servers = sqlite
      .prepare("SELECT * FROM servers")
      .all() as SqliteServerRow[];

    console.log(`Found ${sandboxes.length} sandboxes and ${servers.length} servers in SQLite\n`);

    // Create default admin user and project
    const { userId, projectId } = await createDefaultUserAndProject(db, client);

    // Create a mapping of old server IDs to new server IDs
    const serverIdMap = new Map<string, string>();

    // Migrate servers
    if (servers.length > 0) {
      console.log("Migrating servers...");
      for (const server of servers) {
        const newId = randomUUID();
        serverIdMap.set(server.id, newId);

        await client`
          INSERT INTO servers (
            id, user_id, name, host, port, username, auth_type,
            private_key, status, is_default, error_message,
            created_at, updated_at, last_connected_at
          ) VALUES (
            ${newId},
            ${userId},
            ${server.name},
            ${server.host},
            ${server.port},
            ${server.username},
            ${server.auth_type},
            ${server.private_key},
            ${server.status},
            ${server.is_default === 1},
            ${server.error_message},
            ${new Date(server.created_at)},
            ${new Date(server.updated_at)},
            ${server.last_connected_at ? new Date(server.last_connected_at) : null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        console.log(`  - Migrated server: ${server.name}`);
      }
      console.log();
    }

    // Migrate sandboxes as tasks
    if (sandboxes.length > 0) {
      console.log("Migrating sandboxes as tasks...");
      for (const sandbox of sandboxes) {
        const taskId = randomUUID();
        const newServerId = sandbox.server_id
          ? serverIdMap.get(sandbox.server_id) ?? null
          : null;

        let config = {};
        try {
          config = sandbox.config ? JSON.parse(sandbox.config) : {};
        } catch {
          config = {};
        }

        await client`
          INSERT INTO tasks (
            id, project_id, name, status, cli_tool, server_id,
            container_id, volume_id, config, error_message,
            created_at, updated_at, last_activity_at
          ) VALUES (
            ${taskId},
            ${projectId},
            ${sandbox.name},
            ${sandbox.status},
            ${sandbox.cli_tool},
            ${newServerId},
            ${sandbox.container_id},
            ${sandbox.volume_id},
            ${config},
            ${sandbox.error_message},
            ${new Date(sandbox.created_at)},
            ${new Date(sandbox.updated_at)},
            ${sandbox.last_activity_at ? new Date(sandbox.last_activity_at) : null}
          )
          ON CONFLICT (id) DO NOTHING
        `;
        console.log(`  - Migrated sandbox as task: ${sandbox.name}`);
      }
      console.log();
    }

    console.log("Migration completed successfully!");
    console.log(`  - Admin user ID: ${userId}`);
    console.log(`  - Default project ID: ${projectId}`);
    console.log(`  - Migrated ${servers.length} servers`);
    console.log(`  - Migrated ${sandboxes.length} sandboxes as tasks`);
  } finally {
    sqlite.close();
    await client.end();
  }
}

async function createDefaultUserAndProject(
  db: ReturnType<typeof drizzle>,
  client: ReturnType<typeof postgres>
): Promise<{ userId: string; projectId: string }> {
  const userId = randomUUID();
  const projectId = randomUUID();
  const now = new Date();

  // Check if admin user already exists
  const existingUser = await client`
    SELECT id FROM "user" WHERE email = 'admin@localhost'
  `;

  if (existingUser.length > 0) {
    console.log("Admin user already exists, checking for default project...");
    const existingUserId = existingUser[0].id as string;

    // Check for existing default project
    const existingProject = await client`
      SELECT id FROM projects WHERE user_id = ${existingUserId} AND name = 'Default Project'
    `;

    if (existingProject.length > 0) {
      console.log("Default project already exists");
      return {
        userId: existingUserId,
        projectId: existingProject[0].id as string,
      };
    }

    // Create default project for existing admin
    await client`
      INSERT INTO projects (id, user_id, name, description, created_at, updated_at)
      VALUES (${projectId}, ${existingUserId}, 'Default Project', 'Migrated sandboxes from legacy system', ${now}, ${now})
    `;
    console.log("Created default project for existing admin user");

    return { userId: existingUserId, projectId };
  }

  // Create admin user
  console.log("Creating default admin user...");
  await client`
    INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
    VALUES (${userId}, 'Admin', 'admin@localhost', true, ${now}, ${now})
  `;

  // Create default project
  console.log("Creating default project...");
  await client`
    INSERT INTO projects (id, user_id, name, description, created_at, updated_at)
    VALUES (${projectId}, ${userId}, 'Default Project', 'Migrated sandboxes from legacy system', ${now}, ${now})
  `;

  console.log("Created admin user and default project\n");

  return { userId, projectId };
}

// Run migration
migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
