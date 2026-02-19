## ADDED Requirements

### Requirement: Runner executes tasks via selectable backend
The system SHALL execute a task inside a sandbox using a first-party runner with a selectable backend adapter.

#### Scenario: Execute task with default backend
- **WHEN** a task is started without explicitly selecting a runner backend
- **THEN** the runner selects the configured default backend and begins execution

#### Scenario: Execute task with selected backend
- **WHEN** a task is started with a selected runner backend
- **THEN** the runner uses that backend adapter to execute the task

### Requirement: Runner normalizes execution environment
The system SHALL configure a consistent execution environment for runner backends including workspace path and required credentials.

#### Scenario: Workspace and environment variables
- **WHEN** the runner starts execution for a task
- **THEN** the runner sets the working directory to the sandbox workspace path and applies required environment variables

#### Scenario: Missing required credential
- **WHEN** the selected backend requires a credential that is not provided
- **THEN** the runner fails execution with a user-visible error describing the missing credential

### Requirement: Runner emits normalized streaming output and events
The system SHALL expose a normalized event stream for task output that can be rendered consistently in the UI.

#### Scenario: Stream text output
- **WHEN** a backend produces streaming output
- **THEN** the runner emits a normalized stream of text chunks in order

#### Scenario: Stream tool events
- **WHEN** a backend produces tool-call or structured events
- **THEN** the runner emits normalized events suitable for storage and UI rendering

### Requirement: Runner supports interactive prompt events
The system SHALL support interactive prompts by emitting prompt events and accepting prompt answers for the running execution.

#### Scenario: Backend requests an interactive prompt
- **WHEN** a backend requires a user selection from a set of options
- **THEN** the runner emits a prompt event containing the question and options

#### Scenario: User answers prompt
- **WHEN** the system submits a prompt answer for an active prompt
- **THEN** the runner forwards the selected option to the backend and continues execution
