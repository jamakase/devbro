## Context

Currently, the system uses a `DockerClient` in `packages/core` to interact directly with the Docker daemon (either local or remote via SSH). It creates containers, manages volumes, and streams logs.

We want to expand this to support:
1.  **Remote Server Registration**: A CLI tool that runs on a remote server and registers it with the platform (Pull model), avoiding manual SSH configuration (Push model).
2.  **Kubernetes Support**: The ability to run agent sandboxes as Kubernetes Pods instead of Docker containers.

## Goals / Non-Goals

**Goals:**
- **Server CLI**:
    - Authenticate with the main server via token.
    - Register the machine's capabilities (e.g., "I have Docker").
    - Poll for tasks or maintain a connection to receive commands.
- **Kubernetes Integration**:
    - Implement a "Kubernetes Provider" that spawns Pods for agent tasks.
    - This is *not* a full Operator with CRDs/Controllers watching for state. It is a direct API client (imperative), similar to how we currently use the Docker API.
    - Support PersistentVolumeClaims (PVCs) for workspace persistence.
- **Abstraction**:
    - Refactor `core` to support pluggable container backends (Docker vs K8s).

**Non-Goals:**
- **Full K8s Operator Pattern**: We are NOT creating Custom Resource Definitions (CRDs) or a Controller that watches them. The application logic remains the source of truth and "drives" the K8s API directly.
- **Complex Scheduling**: We rely on K8s default scheduling.

## Decisions

### 1. Server CLI: Polling vs. Long-polling vs. WebSocket

**Decision**: **Long-polling** (or simple polling initially).

**Rationale**:
- Simplest to implement and debug.
- Works well through firewalls (outbound HTTPS).
- We don't need sub-millisecond latency for starting sandboxes.
- CLI asks: "Do you have a job for me?" -> Server says: "Yes, start container X with config Y".

### 2. Kubernetes Integration: Direct API Client

**Decision**: The `server` package will use a `KubernetesClient` (wrapping `client-node` or similar) to create Pods directly.

**Rationale**:
- **Simplicity**: Matches our existing imperative logic for Docker.
- **Control**: We keep the business logic (who can start what, when) in our application, rather than splitting it between app logic and K8s controller logic.
- **Migration**: Easier to refactor the existing `DockerClient` into a generic `ContainerProvider` interface.

**Flow**:
1.  User starts task.
2.  App checks Server Type (Docker vs K8s).
3.  If K8s:
    *   `K8sProvider.createSandbox()` -> Calls K8s API `POST /api/v1/namespaces/default/pods`.
    *   `K8sProvider.streamLogs()` -> Calls K8s API `GET /api/v1/.../log`.

### 3. Container Abstraction Layer

**Decision**: Refactor `packages/core` to introduce a `ContainerProvider` interface.

```typescript
interface ContainerProvider {
  createContainer(config: SandboxConfig): Promise<string>; // returns ID
  startContainer(id: string): Promise<void>;
  stopContainer(id: string): Promise<void>;
  getLogs(id: string): ReadableStream;
  // ...
}
```

Implementations:
- `DockerProvider` (wraps `dockerode`, supports Local + SSH)
- `KubernetesProvider` (wraps K8s client, supports In-Cluster + Kubeconfig)

## Risks / Trade-offs

**[Risk] Log Streaming Differences**
- Docker and K8s handle log streaming differently. We need a unified stream format for the frontend.
- *Mitigation*: The `ContainerProvider` must return a standardized Node.js `Readable` stream.

**[Risk] Persistence in K8s**
- Docker uses simple bind mounts or named volumes. K8s uses PVCs.
- *Mitigation*: K8s Provider will need to auto-provision PVCs per sandbox or per project. We'll start with one PVC per Project (RWX if possible, or RWO with affinity).

## Migration Plan

1.  **Refactor Core**: Extract `ContainerProvider` interface from current `DockerClient`.
2.  **Implement K8s Provider**: Add the K8s client logic.
3.  **Build Server CLI**: Create the new `apps/cli` package.
4.  **Update UI**: Add UI to register servers via token and select K8s as a target.
