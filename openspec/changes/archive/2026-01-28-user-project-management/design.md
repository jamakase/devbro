## Context

The platform is a monorepo with four packages: `core` (Docker/SSH), `server` (database/repositories), `shared` (types), and `ui` (Next.js frontend). Currently uses SQLite with better-sqlite3, no authentication, and stores settings in localStorage. The existing repository pattern in `packages/server` provides a clean abstraction layer that can be extended.

The UI already has TanStack Query for data fetching, a sidebar navigation component, and API routes following Next.js App Router conventions. The file tree API exists (`/api/sandboxes/[id]/files`) but has no corresponding UI component.

## Goals / Non-Goals

**Goals:**
- Multi-tenant platform with user isolation
- Type-safe database layer with Zod validation end-to-end
- Hierarchical data model: User → Projects → Tasks → Conversations
- Production-ready PostgreSQL with migration support
- Validated environment configuration

**Non-Goals:**
- OAuth/social login (email/password only for v1)
- Team/organization features
- Real-time collaboration
- Role-based access control beyond ownership
- Mobile-specific UI

## Decisions

### 1. Authentication: Better-auth with email/password

**Choice**: Better-auth library with Drizzle adapter

**Alternatives considered**:
- NextAuth.js: More popular but heavier, requires more configuration for custom flows
- Lucia: Lighter but less maintained, Better-auth is the spiritual successor
- Custom JWT: More control but significant security responsibility

**Rationale**: Better-auth provides type-safe session handling, built-in Drizzle adapter, and handles security best practices (CSRF, secure cookies). Integrates cleanly with Next.js App Router.

**Implementation**:
- Auth handler at `packages/ui/src/app/api/auth/[...all]/route.ts`
- Server-side auth client in `packages/server/src/auth/`
- Client-side hooks via `better-auth/react`
- Session stored in database (not JWT) for revocability

### 2. Database: PostgreSQL with Drizzle ORM

**Choice**: Drizzle ORM with `postgres` driver (not `pg`)

**Alternatives considered**:
- Prisma: More features but slower cold starts, larger bundle
- Kysely: Type-safe but lower-level, more boilerplate
- Raw SQL: Maximum control but no type safety

**Rationale**: Drizzle offers excellent TypeScript inference, minimal overhead, and `drizzle-zod` for automatic Zod schema generation. The `postgres` driver is faster and has better types than `pg`.

**Schema location**: `packages/server/src/db/schema/`
```
schema/
├── index.ts          # Re-exports all tables
├── users.ts          # users, sessions, accounts (Better-auth)
├── projects.ts       # projects table
├── tasks.ts          # tasks table (wraps sandbox concept)
├── messages.ts       # messages table (conversation turns)
└── servers.ts        # Updated with userId
```

**Note**: Sandboxes are absorbed into tasks. A task IS the sandbox with metadata.

### 3. Zod Integration Strategy

**Choice**: Drizzle-zod for table schemas, manual Zod for API validation

**Implementation layers**:
1. **Table schemas**: `createInsertSchema()` / `createSelectSchema()` from drizzle-zod
2. **API requests**: Manual Zod schemas extending table schemas with refinements
3. **API responses**: Inferred from select schemas, stripped of sensitive fields
4. **Shared types**: Export `z.infer<>` types from `packages/shared`

```typescript
// packages/server/src/db/schema/projects.ts
export const projects = pgTable('projects', { ... });
export const insertProjectSchema = createInsertSchema(projects);
export const selectProjectSchema = createSelectSchema(projects);

// packages/shared/src/types/project.ts
export type Project = z.infer<typeof selectProjectSchema>;
export type CreateProjectInput = z.infer<typeof insertProjectSchema>;
```

### 4. Environment Configuration: t3-env

**Choice**: `@t3-oss/env-nextjs` with separate server/client schemas

**File structure**:
```
packages/ui/src/env.ts        # Next.js env (client + server)
packages/server/src/env.ts    # Server-only env
```

**Implementation**:
```typescript
// packages/ui/src/env.ts
import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
});
```

### 5. Data Model Hierarchy

**Choice**: User → Projects → Tasks (where Task = Sandbox + Conversation)

```
User (1) ──→ (N) Project
              │
              └──→ (N) Task ──→ (1) Sandbox
                        │
                        └──→ (N) Message (conversation is inline)
```

**Key insight**: A task IS a sandbox execution with its conversation. They're the same thing, not separate entities.

**Key relations**:
- Projects belong to a user (required)
- Tasks belong to a project (required)
- Each task has exactly one sandbox (1:1, task essentially wraps sandbox)
- Messages belong directly to a task (no separate conversation entity needed)

**Future consideration**: If we need multiple conversations per task later, we can add a `conversationId` to messages and group them. For now, all messages for a task are one conversation.

**Existing data migration**: Sandboxes gain `userId` and `projectId`. Existing sandboxes become tasks in a "Default Project" for the admin user.

### 6. UI Architecture: Collapsible Sidebar with Projects

**Choice**: Expand existing sidebar with nested project/task navigation

**Component structure**:
```
Sidebar
├── Static nav items (Dashboard, Settings)
├── Projects section (collapsible)
│   └── ProjectItem (per project, collapsible)
│       └── TaskItem (per task, links to detail)
└── User menu (profile, logout)
```

**State management**: URL-based routing with TanStack Query for data. No additional global state needed.

**Routes**:
- `/projects` - Project list view
- `/projects/[id]` - Project detail with task list
- `/projects/[id]/tasks/[taskId]` - Task detail with file tree + conversations

### 7. Conversation Storage

**Choice**: Messages stored directly on task (no separate conversation entity)

**Schema design**:
```typescript
messages: {
  id, taskId, role, content, toolCalls, timestamp
}
```

**Rationale**: Since task = sandbox + conversation, messages belong directly to the task. No need for an intermediate `conversations` table. If we need multiple conversations per task later, we add a `conversationId` column and backfill existing messages.

The `toolCalls` JSON field preserves Claude/OpenCode tool usage for display.

### 8. File Tree Component

**Choice**: Client-side tree with lazy loading per directory

**Purpose**: Each task's sandbox has a Docker volume containing all project files. The file tree lets users browse the volume to see the current state of the codebase - what the agent created, modified, or is working on. This provides visibility into "how everything is going" without needing to SSH into the container.

**Implementation**:
- Reuse existing `/api/sandboxes/[id]/files` endpoint (returns volume contents)
- Tree component with expand/collapse state
- Lazy load children when expanding directories
- Click file to view contents (read-only)
- Optional: show last modified time to see recent changes

## Risks / Trade-offs

**[Risk] PostgreSQL dependency** → Provide docker-compose.yml for local development. Document connection string format. Consider Neon/Supabase for easy cloud setup.

**[Risk] Breaking changes to existing data** → Create migration script from SQLite. Document backup procedure. Make migration reversible.

**[Risk] Auth complexity** → Better-auth handles most edge cases. Add comprehensive error handling on auth pages. Include "forgot password" flow.

**[Risk] Performance with deep nesting** → Limit sidebar to recent/active projects. Use pagination for task lists. Index foreign keys properly.

**[Risk] Message storage size** → Implement message pagination. Consider archiving old tasks. Add size limits per task.

## Migration Plan

1. **Phase 1: Infrastructure**
   - Add PostgreSQL with Drizzle schema
   - Set up t3-env configuration
   - Create migration scripts

2. **Phase 2: Authentication**
   - Integrate Better-auth
   - Add login/register pages
   - Protect existing routes

3. **Phase 3: Data Model**
   - Add projects, tasks, conversations tables
   - Migrate sandboxes/servers to include userId
   - Update repositories

4. **Phase 4: UI**
   - Expand sidebar with projects
   - Build task detail view
   - Add file tree component
   - Add conversation display

**Rollback**: Keep SQLite code path behind feature flag during transition. Can revert by disabling flag and restoring SQLite database.

## Open Questions

1. Should messages be streamed in real-time during task execution, or only displayed after completion?
2. What's the retention policy for old tasks?
3. Should projects support GitHub repo linking for automatic context?
