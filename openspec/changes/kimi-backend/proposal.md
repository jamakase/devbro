## Why

Kimi supports the Agent Client Protocol (ACP), and we need a first-class way to run ACP agents through the runner so users can select Kimi alongside existing backends. Adding an ACP backend now keeps backend selection consistent as we expand beyond CLI-only agents.

## What Changes

- Add an ACP-based runner backend that spawns ACP-compatible agents via the ACP provider and streams output/events through the existing runner event model.
- Introduce backend identifiers for ACP agents (starting with Kimi) and configuration wiring for ACP command, args, environment, and session working directory.
- Update backend selection surfaces to include ACP backends where backend lists are surfaced.

## Capabilities

### New Capabilities

### Modified Capabilities
- `agent-runner`: extend runner backend support to include ACP-based agents and configuration.

## Impact

- Agent runner package: new ACP backend implementation and dependency on the ACP provider.
- Core provisioning and task execution: pass ACP backend selection and environment into the runner invocation.
- UI/API: backend selection lists and task metadata to recognize ACP backends.
