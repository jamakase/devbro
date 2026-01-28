## Context

This is a greenfield project creating isolated sandbox environments for AI coding assistants. The system needs to support both local development (Docker on developer machine) and remote execution (containers on cloud servers). The primary users are developers who want to run Claude Code or OpenCode safely without risking their local environment.

Current state: No existing codebase. Starting fresh with modern TypeScript tooling.

Constraints:
- Must work with existing Docker installations (no custom runtime)
- Must support macOS, Linux, and Windows (via Docker Desktop)
- Remote servers accessed via SSH with Docker installed
- AI CLI tools installed via npm/npx at runtime

## Goals / Non-Goals

**Goals:**
- Create a working MVP for local Docker sandbox management
- Provide a clean web UI for sandbox lifecycle management
- Support cloning GitHub repos into sandboxes
- Enable selection between Claude Code and OpenCode CLI tools
- Persist work across container restarts via volumes

**Non-Goals:**
- Kubernetes orchestration (Docker only for MVP)
- Multi-tenant cloud hosting (self-hosted only)
- Real-time collaboration between multiple users
- Telegram integration (deferred to future iteration)
- Custom MCP/skills installation (future scope)

## Decisions

### 1. Monorepo Structure with Turborepo

**Decision:** Use Turborepo with the following package structure:
```
packages/
  core/          # Container orchestration, Docker SDK wrapper
  ui/            # Next.js app with shadcn components
  server/        # API server (can be embedded in Next.js or separate)
  shared/        # Shared types and utilities
```

**Rationale:** Turborepo provides efficient caching, parallel builds, and clear separation of concerns. Monorepo allows sharing types between packages without publishing to npm.

**Alternatives considered:**
- Nx: More features but heavier; Turborepo is simpler for this scope
- Separate repos: Would complicate type sharing and versioning

### 2. Docker SDK via Dockerode

**Decision:** Use `dockerode` npm package for Docker API communication.

**Rationale:** Mature, well-maintained library with TypeScript types. Supports both local Unix sockets and remote TCP connections (for remote servers).

**Alternatives considered:**
- Direct Docker CLI via child_process: Less reliable, harder to parse output
- Docker Compose: Adds complexity; direct API gives more control

### 3. Remote Server Connection via SSH Tunneling

**Decision:** Connect to remote Docker daemons by establishing SSH tunnel to forward Docker socket.

**Rationale:** Avoids exposing Docker API over network. Uses existing SSH keys for authentication. Dockerode supports TCP connections once tunnel is established.

**Alternatives considered:**
- Docker TLS certificates: More complex setup for users
- Docker context switching: Requires Docker CLI installed locally

### 4. Container Image Strategy

**Decision:** Use a base image with Node.js pre-installed. Install AI CLI tools at container startup via npx.

Base image: `node:20-bookworm` (Debian-based for broader tool compatibility)

Startup sequence:
1. Create container with mounted volume
2. Clone GitHub repo (if specified)
3. Install selected CLI tool: `npx claude-code@latest` or `npx opencode@latest`
4. Start interactive session or run specified task

**Rationale:** Using npx ensures latest CLI versions without maintaining custom images. Node.js base provides npm ecosystem access.

**Alternatives considered:**
- Custom Dockerfile per CLI tool: Higher maintenance burden
- Bun instead of Node: Less ecosystem compatibility

### 5. Volume Management

**Decision:** Create named Docker volumes per sandbox. Mount at `/workspace` inside container.

Volume naming: `agent-sandbox-{sandbox-id}`

**Rationale:** Named volumes persist across container recreation. Separate volume per sandbox prevents cross-contamination.

**Alternatives considered:**
- Bind mounts to host: Security concerns with AI having access to host filesystem
- Anonymous volumes: Harder to manage and clean up

### 6. UI Framework

**Decision:** Next.js 14+ with App Router, shadcn/ui components, Tailwind CSS.

**Rationale:** shadcn provides high-quality, customizable components without external dependencies. Next.js App Router allows server components for initial data loading.

### 7. State Management

**Decision:** Server-side state with database (SQLite for MVP, PostgreSQL option for production). UI fetches via React Query.

**Rationale:** Sandboxes are long-lived server resources. Server is source of truth. SQLite is zero-config for local development.

**Alternatives considered:**
- Client-side only: Would lose state on refresh
- Redis: Overkill for MVP

### 8. API Design

**Decision:** REST API with the following endpoints:
- `POST /api/sandboxes` - Create sandbox
- `GET /api/sandboxes` - List sandboxes
- `GET /api/sandboxes/:id` - Get sandbox details
- `POST /api/sandboxes/:id/start` - Start container
- `POST /api/sandboxes/:id/stop` - Stop container
- `DELETE /api/sandboxes/:id` - Remove sandbox and volume
- `GET /api/sandboxes/:id/logs` - Stream container logs (SSE)
- `POST /api/servers` - Add remote server
- `GET /api/servers` - List configured servers

**Rationale:** REST is simple and well-understood. SSE for logs avoids WebSocket complexity.

## Risks / Trade-offs

**[Risk] Docker not installed or misconfigured** → Provide clear error messages and link to Docker Desktop installation guide. Add health check endpoint.

**[Risk] SSH tunnel drops on remote servers** → Implement reconnection logic with exponential backoff. Show connection status in UI.

**[Risk] Container resource exhaustion** → Set default memory/CPU limits on containers. Allow configuration per sandbox.

**[Risk] GitHub rate limiting** → Support GitHub personal access tokens for authenticated requests. Cache repo metadata.

**[Risk] CLI tool installation failures** → Fallback to specific versions if latest fails. Show installation logs in UI.

**[Trade-off] SQLite vs PostgreSQL** → SQLite limits concurrent writes and isn't suitable for multi-instance deployment. Acceptable for MVP; design abstractions to swap later.

**[Trade-off] No real-time terminal** → MVP uses log streaming, not interactive terminal. Full PTY support adds significant complexity (xterm.js, WebSocket). Defer to future iteration.
