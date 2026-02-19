## Why

We need a stable, extensible way to run “an agent” inside sandbox containers without baking tool-specific logic (Claude Code, OpenCode, future CLIs) into core provisioning. Moving to a single first-party runner package lets us swap backends (CLI, SDK, uvx, etc.) while keeping the platform contract consistent.

## What Changes

- Add a first-party “agent runner” that is installed as a single npm package and invoked to execute tasks inside the sandbox container.
- Replace direct installation/invocation of third-party CLIs with a pluggable adapter layer (CLI-based and SDK-based backends).
- Support a uvx-style execution path (or equivalent) for non-Node backends while keeping the same runner interface.
- Centralize environment wiring (API keys, working directory, repo context) in the runner instead of spreading it across provisioners.
- **BREAKING**: Deprecate the current assumption that each CLI tool is installed directly via hardcoded install commands inside the sandbox.

## Capabilities

### New Capabilities
- `agent-runner`: Define a unified runner interface and adapter model for executing agent tasks (CLI, SDK, uvx).

### Modified Capabilities
- `cli-provisioning`: Install the first-party runner and delegate execution to it instead of installing each external CLI directly.

## Impact

- Core container execution/provisioning flow in `packages/core` will shift from “install tool + run tool” to “install runner + run runner”.
- Shared configuration/types will expand to include runner selection and backend-specific options while preserving existing task/sandbox UX.
- Dependencies: new first-party npm package (internal or published) and optional adapters that may wrap libraries like Vercel AI SDK and/or Claude SDKs.
