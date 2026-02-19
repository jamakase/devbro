## 1. Core Abstraction & Refactoring
- [x] 1.1 Create `ContainerProvider` interface in `packages/core` with methods `create`, `start`, `stop`, `inspect`, `logs`, `execute`
- [x] 1.2 Rename existing `DockerClient` to `DockerProvider` and implement `ContainerProvider`
- [x] 1.3 Update `CLIProvisioner` and `VolumeManager` to use `ContainerProvider` interface instead of `DockerClient` directly
- [x] 1.4 Refactor `ServerRepository` to include server type (SSH vs Registered) and metadata

## 2. Kubernetes Provider Implementation

- [x] 2.1 Add `@kubernetes/client-node` dependency to `packages/core`
- [x] 2.2 Implement `KubernetesProvider` class implementing `ContainerProvider`
- [x] 2.3 Implement Pod creation logic with PVC mounting in `KubernetesProvider`
- [x] 2.4 Implement log streaming logic adapting K8s logs to Node.js Readable stream
- [x] 2.5 Implement `stop` and `destroy` logic for Pods and PVCs

## 3. Server Registration CLI (New App)

- [x] 3.1 Initialize `apps/cli` package with TypeScript configuration
- [x] 3.2 Implement `register` command to authenticate with main server and save token
- [x] 3.3 Implement `connect` command to poll for tasks or maintain long-polling connection
- [x] 3.4 Implement local Docker execution logic within the CLI (reusing `DockerProvider` from core if possible, or lightweight wrapper)

## 4. Backend Updates

- [x] 4.1 Add API route `POST /api/servers/register` for CLI registration
- [x] 4.2 Add API route `GET /api/servers/:id/tasks` for CLI polling
- [x] 4.3 Add API route `POST /api/servers/:id/heartbeat` for status updates
- [x] 4.4 Update `TaskRepository` and task creation flow to support dispatching to registered servers (via polling queue)

## 5. UI Updates

- [x] 5.1 Update Server list to show "Registered" servers and their status
- [x] 5.2 Add "Kubernetes" as a target option in "Add Server" (or "Add Target") dialog
- [x] 5.3 Ensure logs and terminal output work seamlessly for both K8s and Docker targets
