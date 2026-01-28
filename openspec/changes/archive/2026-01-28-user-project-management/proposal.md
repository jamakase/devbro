## Why

The platform currently lacks user authentication and multi-tenancy, making it unsuitable for shared deployments. All data is stored locally without user context, and the current SQLite database limits scalability. To evolve into a proper code management platform where users can track AI-assisted coding sessions, projects, and tasks, we need user accounts, a production-ready database, and a hierarchical project structure with visibility into AI conversations and file changes.

## What Changes

- **BREAKING**: Replace SQLite with PostgreSQL using Drizzle ORM - requires database migration
- **BREAKING**: Add Better-auth for user authentication - all API routes become protected
- Add user accounts with registration, login, and session management
- Add projects/repos entity owned by users, displayed in sidebar
- Add per-project tasks list with collapsible sidebar navigation
- Add file tree view when viewing a task
- Add AI conversation/thoughts display for each task
- Restructure data models to be user-scoped (sandboxes, servers, settings)
- Add t3-env for type-safe environment variable management with Zod validation
- Use Zod throughout backend for schema validation, API request/response typing, and Drizzle type inference

## Capabilities

### New Capabilities

- `user-auth`: User authentication with Better-auth, including registration, login, session management, and protected routes
- `database-layer`: Drizzle ORM integration with PostgreSQL, schema definitions with Zod inference, migrations, and repository pattern
- `env-config`: Type-safe environment variables using t3-env with Zod validation for both server and client
- `project-management`: Projects/repos entity with CRUD operations, user ownership, and sidebar navigation
- `task-tracking`: Per-project task list where task = sandbox + conversation (1:1 relationship)
- `conversation-display`: Storage and display of AI agent messages per task (one conversation per task)
- `file-tree-ui`: Interactive file tree component to browse sandbox volume contents and see what the agent has done

### Modified Capabilities

- `server-connection`: Server configurations become user-scoped

Note: `sandbox-ui` is replaced by `task-tracking` - tasks absorb the sandbox concept.

## Impact

**Packages affected:**
- `packages/server`: New Drizzle ORM setup, PostgreSQL connection, migration system, new repositories (users, projects, tasks, messages)
- `packages/ui`: Auth pages (login/register), protected route wrapper, expanded sidebar with projects, task detail view with file tree and messages
- `packages/shared`: New types for users, projects, tasks, messages; updated server types with user relations
- `packages/core`: No changes expected

**Dependencies added:**
- `better-auth` - authentication framework
- `drizzle-orm` + `drizzle-kit` - ORM and migration tooling
- `drizzle-zod` - Zod schema inference from Drizzle tables
- `pg` / `postgres` - PostgreSQL driver
- `@t3-oss/env-nextjs` - type-safe environment variables
- `zod` - schema validation and type inference throughout backend

**Database:**
- New PostgreSQL database required
- Migration from SQLite schema to PostgreSQL
- New tables: users, sessions, projects, tasks (absorbs sandbox concept), messages

**API changes:**
- All existing routes require authentication
- New auth routes: `/api/auth/*` (handled by Better-auth)
- New routes: `/api/projects`, `/api/projects/[id]/tasks`, `/api/tasks/[id]` (includes messages)

**Environment:**
- New env vars: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
- All env vars validated at build/runtime via t3-env with Zod schemas
- Separate server/client env schemas with proper typing
