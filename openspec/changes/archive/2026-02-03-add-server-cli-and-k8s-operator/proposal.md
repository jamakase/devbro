## Why

Developers and organizations need to scale their agent environments beyond local Docker setups. Currently, connecting remote servers requires SSH access and manual configuration, which is brittle and hard to manage at scale. Additionally, container orchestration is limited to simple Docker commands, missing the resilience and scalability of Kubernetes.

To solve this, we need a "Call Home" model where servers register themselves, and a native Kubernetes integration for robust pod management.

## What Changes

- Create a new `server-cli` app that runs on remote Linux machines to register them with the platform.
- Create a new `k8s-operator` app that watches for agent sandbox requests and spawns pods instead of Docker containers.
- Update the `server` package to support API-based server registration (in addition to SSH).
- Update the `core` package to abstract container operations, allowing a "Kubernetes Provider" alongside the Docker Provider.
- Update the UI to show "Kubernetes" as a connection type.

## Capabilities

### New Capabilities

- `server-registration-cli`: A standalone CLI tool for Linux servers that authenticates with the platform and registers the machine as an available node.
- `k8s-operator`: A Kubernetes Operator (CRDs + Controller) that manages `AgentSandbox` resources, translating them into Pods, Services, and PVCs.
- `container-abstraction`: A unified interface for container operations, decoupling the core logic from direct Docker calls to support multiple backends (Docker, K8s).

### Modified Capabilities

- `server-connection`: Support for API-based registration and health checks (Push model) in addition to the existing SSH-based Pull model.
- `container-orchestration`: Update to use the new `container-abstraction` layer, enabling the system to switch between Docker and Kubernetes backends transparently.

## Impact

- **New Apps**: `apps/cli` (Server Registration) and `apps/operator` (K8s Controller).
- **Architecture**: Moves from a pure "Push via SSH" model to a hybrid model supporting "Pull/Call-home" and K8s-native workflows.
- **Deployment**: Users can now install the platform on a K8s cluster and have it manage agents natively.
