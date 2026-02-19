## ADDED Requirements

### Requirement: List available skills
The system SHALL display available skills and their installation status for the selected agent/sandbox.

#### Scenario: View skills list
- **WHEN** user opens the Skills page
- **THEN** system displays a list of skills with name and enabled/disabled state

### Requirement: Select skills for an agent
The system SHALL allow an authenticated user to select which skills are enabled for a given agent profile.

#### Scenario: Enable a skill
- **WHEN** user enables a skill for an agent profile
- **THEN** system saves the selection and marks the skill as enabled

#### Scenario: Disable a skill
- **WHEN** user disables a skill for an agent profile
- **THEN** system saves the selection and marks the skill as disabled

### Requirement: Manage MCP configuration
The system SHALL allow an authenticated user to view and update MCP configuration for an agent profile.

#### Scenario: View MCP configuration
- **WHEN** user opens the MCPs page
- **THEN** system displays the current MCP configuration associated with the agent profile

#### Scenario: Update MCP configuration
- **WHEN** user saves MCP configuration changes
- **THEN** system validates the configuration and persists it on success

#### Scenario: Invalid MCP configuration
- **WHEN** user attempts to save an invalid MCP configuration
- **THEN** system displays validation errors and does not apply changes
