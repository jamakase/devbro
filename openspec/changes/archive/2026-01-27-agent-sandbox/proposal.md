## Why

Developers using AI coding assistants (Claude Code, OpenCode) need isolated environments where the AI can freely execute commands, install dependencies, and make changes without risking their local development setup. Currently, the alternative is git worktrees which still share the local machine's state and don't provide true isolation.

## What Changes

- Create a new monorepo project with Turborepo for managing multiple packages
- Build a web UI (shadcn/React) for managing sandbox environments
- Implement Docker container orchestration for creating isolated coding environments
- Support both local Docker and remote server deployments
- Enable GitHub repository cloning into sandboxed containers
- Allow selection of AI CLI tool (Claude Code or OpenCode) installed via npx
- Attach persistent volumes to preserve work across container restarts
- (Future) Telegram bot integration for remote interaction

## Capabilities

### New Capabilities

- `container-orchestration`: Manage Docker container lifecycle (create, start, stop, destroy) for isolated environments. Handle both local Docker daemon and remote server connections.
- `github-integration`: Clone repositories from GitHub into sandbox containers. Handle authentication and branch selection.
- `cli-provisioning`: Install and configure AI coding CLI tools (Claude Code, OpenCode) inside containers using npx or equivalent.
- `volume-management`: Attach and manage persistent volumes to containers ensuring work is preserved across sessions.
- `sandbox-ui`: Web interface for creating, managing, and monitoring sandbox environments. Built with shadcn components.
- `server-connection`: Connect to and manage remote servers for running sandboxed containers outside the local machine.

### Modified Capabilities

None - this is a new project.

## Impact

- **New codebase**: Turborepo monorepo with packages for core logic, UI, and integrations
- **Dependencies**: Docker SDK, GitHub API client, shadcn/ui, React, Turborepo
- **Infrastructure**: Requires Docker (local) or SSH access (remote servers)
- **APIs**: Internal APIs between UI and container management services
