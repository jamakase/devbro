## ADDED Requirements

### Requirement: Install AI CLI tool
The system SHALL install and invoke a first-party agent runner inside the sandbox container to execute the selected agent backend.

#### Scenario: Install runner
- **WHEN** a task container is created for execution
- **THEN** system installs the runner package in the container before task execution begins

#### Scenario: Execute selected backend
- **WHEN** user selects an agent backend for a task
- **THEN** system invokes the runner with that backend selection and the task prompt

#### Scenario: Runner installation failure
- **WHEN** runner installation fails
- **THEN** system reports a user-visible error and does not attempt task execution

### Requirement: Configure CLI environment
The system SHALL configure the runner execution environment with required credentials and workspace context.

#### Scenario: Set API keys
- **WHEN** user provides an API key required by the selected backend
- **THEN** system sets the appropriate environment variable for the runner execution

#### Scenario: Configure working directory
- **WHEN** sandbox starts with cloned repository
- **THEN** system configures runner working directory to /workspace

### Requirement: Select CLI tool per sandbox
The system SHALL allow users to choose which agent backend to use for each sandbox task.

#### Scenario: Choose backend during sandbox creation
- **WHEN** user creates new sandbox task
- **THEN** system presents a choice of available agent backends

#### Scenario: Change backend on existing sandbox
- **WHEN** user updates a sandbox task backend selection
- **THEN** system uses the updated backend for subsequent task executions
