## 1. Project Setup

- [x] 1.1 Initialize Turborepo monorepo with TypeScript configuration
- [x] 1.2 Create package structure: packages/core, packages/ui, packages/server, packages/shared
- [x] 1.3 Configure shared TypeScript settings and path aliases
- [x] 1.4 Set up ESLint and Prettier with shared configs
- [x] 1.5 Add base dependencies to root package.json (turbo, typescript)

## 2. Shared Package

- [x] 2.1 Define TypeScript types for Sandbox entity (id, name, status, cliTool, serverId, config)
- [x] 2.2 Define TypeScript types for Server entity (id, name, host, port, authType, status)
- [x] 2.3 Define TypeScript types for API request/response schemas
- [x] 2.4 Create shared constants (container image, volume mount path, default limits)

## 3. Core Package - Docker Integration

- [x] 3.1 Add dockerode dependency and types
- [x] 3.2 Create DockerClient class wrapping dockerode for local connections
- [x] 3.3 Implement container create method with volume mount and resource limits
- [x] 3.4 Implement container start/stop/destroy methods
- [x] 3.5 Implement container status and list methods
- [x] 3.6 Implement log streaming via dockerode's getStream()
- [x] 3.7 Add health check method for Docker daemon connectivity

## 4. Core Package - Volume Management

- [x] 4.1 Implement volume creation with naming convention (agent-sandbox-{id})
- [x] 4.2 Implement volume list with size calculation
- [x] 4.3 Implement volume deletion with safety checks
- [x] 4.4 Add orphaned volume detection logic
- [x] 4.5 Implement bulk orphan cleanup

## 5. Core Package - SSH Tunnel

- [x] 5.1 Add ssh2 dependency for SSH connections
- [x] 5.2 Create SSHTunnel class for establishing tunnels
- [x] 5.3 Implement tunnel creation to forward Docker socket
- [x] 5.4 Add keepalive mechanism (60s interval)
- [x] 5.5 Implement reconnection with exponential backoff
- [x] 5.6 Create RemoteDockerClient extending DockerClient for tunnel connections

## 6. Core Package - GitHub Integration

- [x] 6.1 Create GitHubService class for repository operations
- [x] 6.2 Implement repository validation (check accessibility)
- [x] 6.3 Implement repository metadata fetching (name, description, branches)
- [x] 6.4 Implement clone command generation (public and authenticated)
- [x] 6.5 Add GitHub token storage and retrieval

## 7. Core Package - CLI Provisioning

- [x] 7.1 Create CLIProvisioner class for installing AI tools
- [x] 7.2 Implement npx-based installation for claude-code
- [x] 7.3 Implement npx-based installation for opencode
- [x] 7.4 Add version fallback logic for failed installations
- [x] 7.5 Implement installation verification (version check)
- [x] 7.6 Create task execution method using installed CLI

## 8. Server Package - Database Setup

- [x] 8.1 Add better-sqlite3 dependency for SQLite
- [x] 8.2 Create database schema for sandboxes table
- [x] 8.3 Create database schema for servers table
- [x] 8.4 Create database schema for settings table
- [x] 8.5 Implement repository pattern for sandbox CRUD
- [x] 8.6 Implement repository pattern for server CRUD

## 9. Server Package - REST API

- [x] 9.1 Set up Next.js API routes structure
- [x] 9.2 Implement POST /api/sandboxes (create sandbox)
- [x] 9.3 Implement GET /api/sandboxes (list sandboxes)
- [x] 9.4 Implement GET /api/sandboxes/:id (get sandbox details)
- [x] 9.5 Implement POST /api/sandboxes/:id/start (start container)
- [x] 9.6 Implement POST /api/sandboxes/:id/stop (stop container)
- [x] 9.7 Implement DELETE /api/sandboxes/:id (destroy sandbox)
- [x] 9.8 Implement GET /api/sandboxes/:id/logs (SSE log stream)
- [x] 9.9 Implement POST /api/servers (add server)
- [x] 9.10 Implement GET /api/servers (list servers)
- [x] 9.11 Implement POST /api/servers/:id/test (test connection)
- [x] 9.12 Implement DELETE /api/servers/:id (remove server)
- [x] 9.13 Implement GET /api/health (Docker health check)

## 10. UI Package - Setup

- [x] 10.1 Initialize Next.js 14 with App Router
- [x] 10.2 Install and configure shadcn/ui
- [x] 10.3 Set up Tailwind CSS with custom theme
- [x] 10.4 Install React Query for data fetching
- [x] 10.5 Create base layout with navigation sidebar

## 11. UI Package - Dashboard

- [x] 11.1 Create sandbox list component with status indicators
- [x] 11.2 Implement empty state with create CTA
- [x] 11.3 Add real-time status polling with React Query
- [x] 11.4 Create sandbox card component with quick actions

## 12. UI Package - Sandbox Management

- [x] 12.1 Create sandbox creation form (name, CLI tool, server)
- [x] 12.2 Add advanced options section (GitHub repo, branch, limits)
- [x] 12.3 Implement form validation with error display
- [x] 12.4 Create sandbox detail view page
- [x] 12.5 Implement log viewer component with SSE connection
- [x] 12.6 Add action buttons (start, stop, destroy) with confirmation dialogs

## 13. UI Package - Server Management

- [x] 13.1 Create servers list page
- [x] 13.2 Implement add server form (host, port, SSH key/agent)
- [x] 13.3 Add test connection button with status feedback
- [x] 13.4 Create server detail view with resource stats
- [x] 13.5 Implement server deletion with sandbox warning

## 14. UI Package - Settings

- [x] 14.1 Create settings page layout
- [x] 14.2 Add API key configuration fields (Anthropic, GitHub)
- [x] 14.3 Add default resource limits configuration
- [x] 14.4 Implement settings persistence

## 15. UI Package - Error Handling

- [x] 15.1 Create toast notification system for API errors
- [x] 15.2 Add connection status indicator in header
- [x] 15.3 Implement reconnection UI for dropped connections
- [x] 15.4 Add global error boundary

## 16. Integration & Testing

- [x] 16.1 Test local Docker sandbox creation end-to-end
- [x] 16.2 Test GitHub repo cloning into sandbox
- [x] 16.3 Test CLI tool installation and verification
- [x] 16.4 Test remote server connection via SSH tunnel
- [x] 16.5 Test log streaming from container
- [x] 16.6 Test sandbox lifecycle (create → start → stop → destroy)

## 17. Documentation & Polish

- [x] 17.1 Add Docker Desktop installation instructions to README
- [x] 17.2 Document environment variables and configuration
- [x] 17.3 Add development setup instructions
- [x] 17.4 Create .env.example with required variables
