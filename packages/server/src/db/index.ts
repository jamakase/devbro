import Database from "better-sqlite3";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  // Default to .data directory in project root
  const dataDir = process.env["DATA_DIR"] ?? join(process.cwd(), ".data");

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, "agent-sandbox.db");
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent access
  db.pragma("journal_mode = WAL");

  // Initialize schema
  initializeSchema(db);

  return db;
}

function initializeSchema(db: Database.Database): void {
  // Sandboxes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sandboxes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'creating',
      cli_tool TEXT NOT NULL,
      server_id TEXT,
      container_id TEXT,
      volume_id TEXT,
      config TEXT NOT NULL DEFAULT '{}',
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_activity_at TEXT,
      FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL
    )
  `);

  // Servers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      private_key TEXT,
      status TEXT NOT NULL DEFAULT 'disconnected',
      is_default INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_connected_at TEXT,
      UNIQUE(host, port)
    )
  `);

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Initialize default settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
  `);

  insertSetting.run("default_memory_limit", "2g");
  insertSetting.run("default_cpu_limit", "2");

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sandboxes_status ON sandboxes(status);
    CREATE INDEX IF NOT EXISTS idx_sandboxes_server_id ON sandboxes(server_id);
    CREATE INDEX IF NOT EXISTS idx_servers_is_default ON servers(is_default);
  `);
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
