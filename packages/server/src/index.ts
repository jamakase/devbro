// Database (PostgreSQL with Drizzle)
export * from "./db/client.js";
export * from "./db/schema/index.js";
export { 
  eq, 
  and, 
  or, 
  desc, 
  asc, 
  gt, 
  lt, 
  gte, 
  lte, 
  like, 
  ilike, 
  not, 
  inArray, 
  notInArray, 
  isNull, 
  isNotNull, 
  sql 
} from "drizzle-orm";

// Auth
export { auth, isGitHubOAuthEnabled } from "./auth/index.js";

// Repositories
export * from "./repositories/user.js";
export * from "./repositories/project.js";
export * from "./repositories/task.js";
export * from "./repositories/message.js";
export * from "./repositories/server.js";
export * from "./repositories/sandbox.js";

// Provider Factory
export * from "./provider-factory.js";

// Note: SandboxRepository (SQLite) is deprecated and kept only for migration
// Use TaskRepository instead for all new code
