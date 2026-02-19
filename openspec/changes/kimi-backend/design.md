## Context

We need to add an ACP-based backend to the agent runner so ACP-compatible agents (starting with Kimi) can be invoked through the same runner interface as existing CLI and SDK backends. The ACP provider exposes a LanguageModel-style interface and streams text/tool events, which must be normalized into runner events.

## Goals / Non-Goals

**Goals:**
- Add a new runner backend family for ACP agents (e.g., `acp:kimi`) using the ACP provider.
- Configure ACP session settings (command, args, env, and working directory) from runner request inputs.
- Stream ACP text/tool events into the runner’s normalized event stream.
- Keep existing CLI and SDK backend behavior unchanged.

**Non-Goals:**
- Full MCP server configuration UI. This change will support ACP session configuration via environment and request metadata only.
- Multi-agent orchestration or routing beyond a single ACP agent process per task.

## Decisions

### 1. ACP backend integration lives in agent-runner
**Decision:** Implement an ACP backend in `@agent-sandbox/agent-runner` alongside existing CLI and SDK backends.

**Rationale:** Centralizes backend selection and normalization in one package so provisioning and UI remain unchanged.

### 2. Backend identifiers and configuration
**Decision:** Use backend identifiers prefixed with `acp:` and route them to the ACP backend. Configuration for ACP command, args, env, and session settings will be derived from the runner request and environment variables.

**Rationale:** Keeps selection consistent with existing `cli:` and `sdk:` identifiers while allowing environment-based customization in containers.

### 3. Event normalization strategy
**Decision:** Map ACP streaming text to stdout events and ACP tool calls to tool_call events using the same output format as other backends.

**Rationale:** Reuses existing storage/UI rendering and avoids new event types.

## Implementation Notes

- Add ACP backend implementation that:
  - Creates ACP provider instance with command/args/env and session config (cwd, mcpServers).
  - Calls stream/generate text and forwards text deltas to stdout events.
  - For tool calls, emit tool_call events with name and args.
- Update backend registry to include ACP backend and selection logic.
- Support backend ID for Kimi (e.g., `acp:kimi`) with configurable command/args via environment.

## Risks / Trade-offs

- ACP dependency footprint: adds a new dependency to the runner package.
- Environment-driven configuration requires careful validation to avoid missing command/args at runtime.
