## MODIFIED Requirements

### Requirement: Runner executes tasks via selectable backend
The system SHALL execute a task inside a sandbox using a first-party runner with a selectable backend adapter.

#### Scenario: Execute task with ACP backend
- **WHEN** a task is started with an ACP-backed runner backend selection
- **THEN** the runner spawns the ACP agent process using the configured command, arguments, and environment
- **AND** streams ACP output as normalized runner events

### Requirement: Runner normalizes execution environment
The system SHALL configure a consistent execution environment for runner backends including workspace path and required credentials.

#### Scenario: ACP session working directory
- **WHEN** the runner executes an ACP backend
- **THEN** the ACP session working directory is set to the sandbox workspace path

### Requirement: Runner emits normalized streaming output and events
The system SHALL expose a normalized event stream for task output that can be rendered consistently in the UI.

#### Scenario: Stream ACP text output
- **WHEN** an ACP backend streams text deltas
- **THEN** the runner emits ordered stdout events for those deltas

#### Scenario: Stream ACP tool calls
- **WHEN** an ACP backend emits tool calls
- **THEN** the runner emits normalized tool_call events with name and arguments
