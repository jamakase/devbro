## ADDED Requirements

### Requirement: Dashboard view
The system SHALL display a dashboard showing all sandboxes with their current status.

#### Scenario: View sandbox list
- **WHEN** user opens dashboard
- **THEN** system displays list of sandboxes with name, status, CLI tool, server, and last activity

#### Scenario: Empty state
- **WHEN** user has no sandboxes
- **THEN** system displays welcome message with "Create Sandbox" call-to-action

#### Scenario: Real-time status updates
- **WHEN** sandbox status changes
- **THEN** dashboard updates status indicator without full page refresh

### Requirement: Create sandbox form
The system SHALL provide a form to create new sandboxes with required configuration.

#### Scenario: Minimal sandbox creation
- **WHEN** user fills name and selects CLI tool
- **THEN** system creates sandbox with default settings on local Docker

#### Scenario: Full configuration form
- **WHEN** user expands advanced options
- **THEN** system shows fields for GitHub repo, branch, server selection, and resource limits

#### Scenario: Validation errors
- **WHEN** user submits form with invalid data
- **THEN** system displays inline validation errors without clearing form

### Requirement: Sandbox detail view
The system SHALL display detailed information and controls for a single sandbox.

#### Scenario: View sandbox details
- **WHEN** user clicks on sandbox in list
- **THEN** system shows sandbox config, status, resource usage, and action buttons

#### Scenario: Show live logs
- **WHEN** user opens sandbox detail view
- **THEN** system streams container logs in scrollable panel

### Requirement: Sandbox action buttons
The system SHALL provide buttons to control sandbox lifecycle.

#### Scenario: Start button
- **WHEN** user clicks Start on stopped sandbox
- **THEN** system starts container and updates status to "running"

#### Scenario: Stop button
- **WHEN** user clicks Stop on running sandbox
- **THEN** system stops container and updates status to "stopped"

#### Scenario: Destroy button with confirmation
- **WHEN** user clicks Destroy
- **THEN** system shows confirmation dialog with option to preserve volume

### Requirement: Server management page
The system SHALL provide interface to manage remote server connections.

#### Scenario: Add server form
- **WHEN** user navigates to servers page
- **THEN** system displays form to add new server with host, port, and SSH key fields

#### Scenario: Test server connection
- **WHEN** user clicks "Test Connection"
- **THEN** system attempts SSH connection and reports success or failure

#### Scenario: List configured servers
- **WHEN** user views servers page
- **THEN** system displays list of servers with connection status

### Requirement: Settings page
The system SHALL provide interface for global application settings.

#### Scenario: Configure API keys
- **WHEN** user opens settings
- **THEN** system shows fields for Anthropic API key and GitHub token

#### Scenario: Default resource limits
- **WHEN** user sets default memory limit
- **THEN** new sandboxes use specified limit unless overridden

### Requirement: Responsive layout
The system SHALL work on desktop and tablet screen sizes.

#### Scenario: Desktop layout
- **WHEN** viewport width is 1024px or greater
- **THEN** system displays sidebar navigation with main content area

#### Scenario: Tablet layout
- **WHEN** viewport width is between 768px and 1023px
- **THEN** system displays collapsible navigation with full-width content

### Requirement: Error handling
The system SHALL display user-friendly error messages for all failure scenarios.

#### Scenario: API error display
- **WHEN** API request fails
- **THEN** system displays toast notification with error message and retry option

#### Scenario: Connection lost
- **WHEN** WebSocket/SSE connection drops
- **THEN** system displays reconnecting indicator and auto-retries
