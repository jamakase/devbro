# Agent Sandbox

Isolated Docker environments for AI coding assistants (Claude Code, OpenCode).

## Overview

Agent Sandbox allows developers to run AI coding assistants in fully isolated Docker containers, preventing any risk to their local development environment. Key features:

- 🐳 Docker-based isolation for safe AI code execution
- 🔐 User authentication with better-auth
- 📁 Project-based organization with task management
- 🌐 Support for both local Docker and remote servers
- 📦 GitHub repository cloning into sandboxes
- 🔄 Persistent volumes to preserve work across sessions
- 💬 Conversation history and file browsing for each task
- 🖥️ Modern web UI for project and task management

## Prerequisites

- **Node.js 20+** - [Download](https://nodejs.org/)
- **Docker Desktop** - [Download](https://www.docker.com/products/docker-desktop/)
  - macOS: Install Docker Desktop for Mac
  - Windows: Install Docker Desktop for Windows (WSL2 backend recommended)
  - Linux: Install Docker Engine and Docker Compose
- **PostgreSQL 15+** - For the main database (can use Docker)

Verify Docker is running:
```bash
docker info
```

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/agent-sandbox.git
cd agent-sandbox
```

2. Install dependencies:
```bash
npm install
```

3. Copy the environment template:
```bash
cp .env.example .env
```

4. Start PostgreSQL (using Docker):
```bash
docker compose up -d postgres
```

5. Configure environment variables in `.env`:
```env
# Required
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_sandbox
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Optional
ANTHROPIC_API_KEY=your-anthropic-api-key
GITHUB_TOKEN=your-github-token
```

6. Generate and run database migrations:
```bash
cd packages/server
npx drizzle-kit generate
npx drizzle-kit migrate
cd ../..
```

7. Start the development server:
```bash
npm run dev
```

8. Open [http://localhost:3000](http://localhost:3000) and register a new account.

## Project Structure

```
packages/
├── core/       # Docker client, SSH tunnel, GitHub integration
├── server/     # Database (Drizzle ORM), repositories, authentication
├── shared/     # TypeScript types and Zod schemas
└── ui/         # Next.js web application
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `BETTER_AUTH_SECRET` | Secret for session encryption (32+ chars) | Yes |
| `NEXT_PUBLIC_APP_URL` | Public URL of the application | Yes |
| `ANTHROPIC_API_KEY` | API key for Claude Code | For AI features |
| `GITHUB_TOKEN` | Personal access token for private repos | For private repos |

### Docker Compose

The included `docker-compose.yml` provides:
- PostgreSQL database for development
- Adminer for database management (optional)

```bash
# Start services
docker compose up -d

# Stop services
docker compose down

# View logs
docker compose logs -f postgres
```

## Usage

### Authentication

1. Navigate to `/register` to create a new account
2. Login at `/login` with your credentials
3. All data is isolated per user

### Projects

Projects organize your AI coding tasks:

1. Click "New Project" in the sidebar
2. Enter a project name and optional description
3. Projects appear in the sidebar for quick navigation

### Tasks

Tasks are individual AI coding sessions:

1. Open a project and click "New Task"
2. Select the agent backend (runner CLI or SDK)
3. Optionally select a remote server
4. Start the task to launch the container

### Task View

The task detail page shows:
- **File Tree**: Browse the sandbox volume contents
- **Conversation**: View the AI assistant's messages and tool calls
- **Controls**: Start/stop the task container

### Remote Servers

1. Navigate to "Servers" in the sidebar
2. Click "Add Server" and enter SSH connection details
3. Test the connection to verify Docker access
4. Select the server when creating new tasks

## Migration from SQLite

If upgrading from an older version using SQLite:

1. Ensure PostgreSQL is running and configured
2. Run the migration script:
```bash
cd packages/server
npx tsx scripts/migrate-sqlite-to-pg.ts
```

This will:
- Create a default admin user
- Create a default project
- Migrate existing sandboxes as tasks
- Migrate server configurations

## Development

```bash
# Start development servers with hot reload
npm run dev

# Build all packages
npm run build

# Type check
npm run check-types

# Format code
npm run format

# Generate database migrations
cd packages/server && npx drizzle-kit generate

# Apply migrations
cd packages/server && npx drizzle-kit migrate
```

## Architecture

- **Frontend**: Next.js 15, React, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend**: Next.js API routes, PostgreSQL with Drizzle ORM
- **Authentication**: better-auth with email/password
- **Docker**: dockerode library for container management
- **SSH**: ssh2 library for remote server tunneling

## License

MIT
