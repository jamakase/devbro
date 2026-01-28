## 1. Dependencies & Environment Setup

- [x] 1.1 Add dependencies to packages/server: `drizzle-orm`, `drizzle-kit`, `drizzle-zod`, `postgres`, `zod`
- [x] 1.2 Add dependencies to packages/ui: `better-auth`, `@t3-oss/env-nextjs`, `zod`
- [x] 1.3 Create `packages/ui/src/env.ts` with t3-env schema (DATABASE_URL, BETTER_AUTH_SECRET, NEXT_PUBLIC_APP_URL)
- [x] 1.4 Update `.env.example` with new required variables
- [x] 1.5 Add `docker-compose.yml` with PostgreSQL service for local development

## 2. Database Schema (Drizzle)

- [x] 2.1 Create `packages/server/src/db/schema/index.ts` to re-export all tables
- [x] 2.2 Create `packages/server/src/db/schema/users.ts` with users, sessions, accounts tables (Better-auth compatible)
- [x] 2.3 Create `packages/server/src/db/schema/projects.ts` with projects table (id, userId, name, createdAt, updatedAt)
- [x] 2.4 Create `packages/server/src/db/schema/tasks.ts` with tasks table (id, projectId, name, status, cliTool, containerId, volumeId, serverId, config, createdAt, updatedAt)
- [x] 2.5 Create `packages/server/src/db/schema/messages.ts` with messages table (id, taskId, role, content, toolCalls, timestamp)
- [x] 2.6 Create `packages/server/src/db/schema/servers.ts` with userId foreign key
- [x] 2.7 Create Drizzle connection in `packages/server/src/db/client.ts` using postgres driver
- [x] 2.8 Configure `drizzle.config.ts` for migrations
- [x] 2.9 Generate initial migration with `drizzle-kit generate`

## 3. Zod Schemas & Types

- [x] 3.1 Generate Zod schemas from Drizzle tables using drizzle-zod (insert/select schemas per table)
- [x] 3.2 Create `packages/shared/src/types/user.ts` with User type
- [x] 3.3 Create `packages/shared/src/types/project.ts` with Project, CreateProjectInput types
- [x] 3.4 Create `packages/shared/src/types/task.ts` with Task, CreateTaskInput types
- [x] 3.5 Create `packages/shared/src/types/message.ts` with Message type
- [x] 3.6 Update `packages/shared/src/types/server.ts` to include userId
- [x] 3.7 Export all types from `packages/shared/src/index.ts`

## 4. Repositories

- [x] 4.1 Create `packages/server/src/repositories/user.ts` with UserRepository
- [x] 4.2 Create `packages/server/src/repositories/project.ts` with ProjectRepository (create, findById, findByUserId, update, delete)
- [x] 4.3 Create `packages/server/src/repositories/task.ts` with TaskRepository (create, findById, findByProjectId, update, delete)
- [x] 4.4 Create `packages/server/src/repositories/message.ts` with MessageRepository (create, findByTaskId with pagination)
- [x] 4.5 Update `packages/server/src/repositories/server.ts` to filter by userId
- [x] 4.6 Remove old SQLite-based sandbox repository (replaced by task repository)

## 5. Authentication (Better-auth)

- [x] 5.1 Create `packages/server/src/auth/index.ts` with Better-auth server configuration and Drizzle adapter
- [x] 5.2 Create `packages/ui/src/app/api/auth/[...all]/route.ts` as Better-auth handler
- [x] 5.3 Create `packages/ui/src/lib/auth-client.ts` with Better-auth React client
- [x] 5.4 Create `packages/ui/src/app/(auth)/login/page.tsx` with login form
- [x] 5.5 Create `packages/ui/src/app/(auth)/register/page.tsx` with registration form
- [x] 5.6 Create `packages/ui/src/components/auth-provider.tsx` wrapping the app with auth context
- [x] 5.7 Create middleware or layout wrapper to protect routes (redirect unauthenticated to /login)
- [x] 5.8 Add user menu to sidebar with profile and logout

## 6. Project Management API

- [x] 6.1 Create `packages/ui/src/app/api/projects/route.ts` (GET list, POST create)
- [x] 6.2 Create `packages/ui/src/app/api/projects/[id]/route.ts` (GET, PATCH, DELETE)
- [x] 6.3 Add Zod validation to project API routes using shared schemas
- [x] 6.4 Add auth check to all project routes (get userId from session)

## 7. Task Management API

- [x] 7.1 Create `packages/ui/src/app/api/projects/[id]/tasks/route.ts` (GET list, POST create)
- [x] 7.2 Create `packages/ui/src/app/api/tasks/[id]/route.ts` (GET, DELETE)
- [x] 7.3 Create `packages/ui/src/app/api/tasks/[id]/start/route.ts` (POST)
- [x] 7.4 Create `packages/ui/src/app/api/tasks/[id]/stop/route.ts` (POST)
- [x] 7.5 Create `packages/ui/src/app/api/tasks/[id]/messages/route.ts` (GET with pagination)
- [x] 7.6 Create `packages/ui/src/app/api/tasks/[id]/files/route.ts` (GET directory listing)
- [x] 7.7 Create `packages/ui/src/app/api/tasks/[id]/files/content/route.ts` (GET file content)
- [x] 7.8 Integrate task creation with Docker container/volume creation from core package (TODO in routes)
- [x] 7.9 Add auth check to all task routes (verify project ownership)

## 8. Sidebar Enhancement

- [x] 8.1 Create `packages/ui/src/components/sidebar/projects-section.tsx` with collapsible projects list
- [x] 8.2 Create `packages/ui/src/components/sidebar/project-item.tsx` with expandable task list
- [x] 8.3 Create `packages/ui/src/components/sidebar/task-item.tsx` with status indicator
- [x] 8.4 Update `packages/ui/src/components/sidebar.tsx` to include ProjectsSection and UserMenu
- [x] 8.5 Add TanStack Query hooks for fetching projects and tasks in sidebar

## 9. Project Pages

- [x] 9.1 Create `packages/ui/src/app/projects/page.tsx` (project list view)
- [x] 9.2 Create `packages/ui/src/app/projects/[id]/page.tsx` (project detail with task list)
- [x] 9.3 Create `packages/ui/src/components/project-card.tsx` for project list
- [x] 9.4 Create `packages/ui/src/components/create-project-dialog.tsx` for new project form
- [x] 9.5 Add TanStack Query hooks for project data fetching

## 10. Task Detail Page

- [x] 10.1 Create `packages/ui/src/app/projects/[id]/tasks/[taskId]/page.tsx` with split layout
- [x] 10.2 Create `packages/ui/src/components/file-tree/index.tsx` with tree rendering
- [x] 10.3 Create `packages/ui/src/components/file-tree/tree-node.tsx` with expand/collapse
- [x] 10.4 Create `packages/ui/src/components/file-tree/file-viewer.tsx` for file content display
- [x] 10.5 Create `packages/ui/src/components/conversation/index.tsx` message list
- [x] 10.6 Create `packages/ui/src/components/conversation/message.tsx` with role styling
- [x] 10.7 Create `packages/ui/src/components/conversation/tool-call.tsx` for collapsible tool details
- [x] 10.8 Add resizable split panel between file tree and conversation (fixed width for now)

## 11. Server Management Updates

- [x] 11.1 Update server API routes to filter by authenticated user
- [x] 11.2 Update server list page to show only user's servers
- [x] 11.3 Update server creation to associate with current user

## 12. Migration & Cleanup

- [x] 12.1 Create migration script to move data from SQLite to PostgreSQL
- [x] 12.2 Create default "Admin" user and "Default Project" for existing sandboxes
- [x] 12.3 Remove old SQLite database code and better-sqlite3 dependency
- [x] 12.4 Remove old sandbox routes (replaced by task routes)
- [x] 12.5 Update README with new setup instructions (PostgreSQL, env vars)
