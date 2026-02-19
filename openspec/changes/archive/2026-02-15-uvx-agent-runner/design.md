## Context

The platform currently provisions sandbox containers using a base Node image and installs third-party agent CLIs directly inside the container using tool-specific install commands. This couples platform behavior to individual tools and makes it difficult to add new “agents” or execution approaches (e.g., SDK-based execution, non-Node tooling invoked via a runner).

We want to introduce a first-party runner npm package that provides a stable invocation interface inside the sandbox container while allowing multiple backends/adapters (CLI wrapper, SDK wrapper, uvx-style execution for non-Node tools). This keeps the platform contract stable and moves tool-specific integration into a focused module boundary.

## Goals / Non-Goals

**Goals:**
- Provide a single, stable “agent runner” entry point for task execution inside sandbox containers.
- Support multiple backends via adapters, including:
  - CLI-based execution (wrapping existing CLIs)
  - SDK-based execution (e.g., an approach similar to Vercel AI SDK providers)
  - uvx-style execution path for running non-Node tooling when needed
- Centralize environment setup (API keys, working directory, repo context) in one place.
- Preserve current task lifecycle semantics (create container, setup workspace, stream logs/output, stop container).

**Non-Goals:**
- Replacing the container runtime abstraction (Docker vs Kubernetes) in this change.
- Building a complete marketplace/distribution system for third-party agents.
- Implementing every possible agent backend; the initial goal is a robust interface with one or two concrete adapters.

## Decisions

- Adopt a runner-first contract in core provisioning
  - Core installs and invokes one runner package rather than installing a specific agent tool.
  - Rationale: reduces platform coupling and allows independent evolution of agent integrations.
  - Alternative: keep per-tool install commands in `CLI_TOOLS` and add more entries. Rejected due to ongoing maintenance and fragmentation.

- Define an adapter interface with explicit inputs/outputs
  - Runner receives a normalized task execution request (prompt, workspace path, environment variables, optional repo metadata, desired backend).
  - Runner returns a normalized result (exit status, structured output, optional tool-call/prompt events).
  - Rationale: enables consistent UX and storage irrespective of backend.
  - Alternative: treat each backend as a black-box command. Rejected because the platform needs consistent events (streaming, prompts, error reporting).

- Keep install strategy flexible: global install vs `npx` vs prebundled
  - The runner itself is installed via npm and can choose backend installation strategies.
  - Rationale: lets us prefer faster/safer approaches per backend (e.g., prebundled dependencies, or on-demand).

- Use an AI-SDK-inspired adapter surface for SDK-backed agents
  - Where an SDK backend exists, expose a “model/provider” mapping similar to AI SDK providers (streamed text + structured events).
  - Rationale: a proven pattern to abstract multiple model backends while keeping a consistent call interface.

## Risks / Trade-offs

- [Risk] Runner introduces another moving part inside sandboxes → Mitigation: pin runner version, provide fallback to legacy CLI execution during migration.
- [Risk] Divergent behavior between CLI and SDK backends → Mitigation: define canonical scenarios and conformance tests for adapters.
- [Risk] Increased complexity in event streaming/prompt routing → Mitigation: normalize events in runner and keep server storage schema stable.
- [Risk] Installing runner on every task start may add latency → Mitigation: evaluate caching layers (image bake, volume cache, or npx/pnpm store strategies).

