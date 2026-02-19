## ADDED Requirements

### Requirement: Configure knowledge base for a project
The system SHALL allow an authenticated user to configure a knowledge base for a selected sandbox workspace.

#### Scenario: Enable knowledge base
- **WHEN** user enables knowledge base for a sandbox
- **THEN** system stores configuration for the sandbox and displays knowledge base status as "enabled"

#### Scenario: Disable knowledge base
- **WHEN** user disables knowledge base for a sandbox
- **THEN** system stops indexing and displays knowledge base status as "disabled"

### Requirement: Index code into knowledge base
The system SHALL provide an action to build or refresh a knowledge base index for the sandbox workspace.

#### Scenario: Start indexing
- **WHEN** user clicks "Build Index"
- **THEN** system starts indexing and displays progress state

#### Scenario: Indexing completes
- **WHEN** indexing finishes successfully
- **THEN** system displays status "ready" with timestamp of last successful index

#### Scenario: Indexing fails
- **WHEN** indexing fails
- **THEN** system displays error status with a user-visible failure reason

### Requirement: Show knowledge base status
The system SHALL display current knowledge base state for the sandbox including enabled/disabled and indexing state.

#### Scenario: View status
- **WHEN** user opens the knowledge base page for a sandbox
- **THEN** system displays current status and last index time when available
