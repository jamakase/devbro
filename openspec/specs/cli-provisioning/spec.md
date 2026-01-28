## ADDED Requirements

### Requirement: Install AI CLI tool
The system SHALL install the selected AI coding CLI tool inside the sandbox container.

#### Scenario: Install Claude Code
- **WHEN** user selects "claude-code" as the CLI tool
- **THEN** system runs `npx claude-code@latest` to install and verify installation

#### Scenario: Install OpenCode
- **WHEN** user selects "opencode" as the CLI tool
- **THEN** system runs `npx opencode@latest` to install and verify installation

#### Scenario: Installation failure with fallback
- **WHEN** latest version installation fails
- **THEN** system attempts installation of last known stable version and reports status

### Requirement: Configure CLI environment
The system SHALL set up required environment variables for the CLI tool to function.

#### Scenario: Set API keys
- **WHEN** user provides API key for the selected CLI tool
- **THEN** system sets appropriate environment variable (ANTHROPIC_API_KEY or equivalent)

#### Scenario: Configure working directory
- **WHEN** sandbox starts with cloned repository
- **THEN** system sets CLI working directory to /workspace

### Requirement: Select CLI tool per sandbox
The system SHALL allow users to choose which CLI tool to use for each sandbox.

#### Scenario: Choose CLI during sandbox creation
- **WHEN** user creates new sandbox
- **THEN** system presents choice between Claude Code and OpenCode

#### Scenario: Change CLI tool on existing sandbox
- **WHEN** user requests CLI change on stopped sandbox
- **THEN** system installs new CLI tool on next start, preserving workspace

### Requirement: Verify CLI installation
The system SHALL confirm successful CLI installation before marking sandbox as ready.

#### Scenario: Successful verification
- **WHEN** CLI tool installs successfully
- **THEN** system runs version check and confirms tool is operational

#### Scenario: Failed verification
- **WHEN** CLI tool fails verification
- **THEN** system marks sandbox as "setup_failed" with error details

### Requirement: Run CLI task
The system SHALL execute a user-specified task using the installed CLI tool.

#### Scenario: Start task with prompt
- **WHEN** user provides task description for sandbox
- **THEN** system invokes CLI tool with the task prompt and streams output

#### Scenario: Run task in background
- **WHEN** user starts task with background=true flag
- **THEN** system runs task detached and provides log streaming endpoint
