## ADDED Requirements

### Requirement: Bootstrap specs on sandbox start
The system SHALL support pulling specs into a new sandbox during sandbox creation or start.

#### Scenario: Bootstrap enabled
- **WHEN** user creates a sandbox with bootstrap enabled
- **THEN** system pulls the configured specs source into the sandbox before marking bootstrap complete

#### Scenario: Bootstrap disabled
- **WHEN** user creates a sandbox with bootstrap disabled
- **THEN** system creates the sandbox without pulling specs

### Requirement: Bootstrap knowledge base tooling
The system SHALL support configuring knowledge base tooling for a new sandbox during sandbox creation or start.

#### Scenario: Initialize knowledge base tooling
- **WHEN** bootstrap includes knowledge base setup
- **THEN** system configures the sandbox to support indexing and marks the knowledge base as enabled

### Requirement: Copy selected skills into sandbox
The system SHALL copy selected agent skills into the sandbox during bootstrap.

#### Scenario: Copy configured skills
- **WHEN** user creates a sandbox with an agent profile that has selected skills
- **THEN** system copies those skills into the sandbox and records the enabled set

### Requirement: Generate mcp.json for selected agent
The system SHALL generate an agent-specific mcp.json in the sandbox based on the selected agent profile.

#### Scenario: Generate configuration
- **WHEN** user creates a sandbox with an agent profile that includes MCP configuration
- **THEN** system writes mcp.json into the sandbox and marks MCP setup as complete

#### Scenario: Invalid configuration
- **WHEN** MCP configuration is invalid
- **THEN** system fails bootstrap with a user-visible validation error
