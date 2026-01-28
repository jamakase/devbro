import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// Connection string from environment
const connectionString = process.env["DATABASE_URL"];

// During build time, Next.js may try to import this module
// We provide a dummy connection that will fail at runtime if used
const isBuildTime =
  process.env.NODE_ENV === "production" && !connectionString;

let db: ReturnType<typeof drizzle<typeof schema>>;

if (isBuildTime) {
  // Create a proxy that throws helpful errors during build
  db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
    get() {
      throw new Error(
        "Database not available during build. Set DATABASE_URL environment variable."
      );
    },
  });
} else if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required");
} else {
  // Create postgres connection
  const client = postgres(connectionString);
  // Create drizzle instance with schema
  db = drizzle(client, { schema });
}

export { db };

// Export schema for convenience
export { schema };

// Type for database instance
export type Database = typeof db;
