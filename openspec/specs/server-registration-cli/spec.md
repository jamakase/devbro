# Server Registration CLI Specification

## Purpose
To provide a standalone CLI tool that runs on remote servers to register them with the platform, enabling a "Call Home" model that avoids manual SSH configuration.

## Requirements

### Requirement: Register server via CLI
The system SHALL accept registration requests from the server CLI.

#### Scenario: Register new server with token
- **WHEN** CLI sends a POST request to `/api/servers/register` with a valid user token and server metadata (hostname, specs, etc.)
- **THEN** system creates a new server record for that user
- **AND** returns a unique Server ID and authentication key for the CLI to use

#### Scenario: Invalid token
- **WHEN** CLI sends registration request with invalid/expired token
- **THEN** system returns 401 Unauthorized

### Requirement: CLI Polling for Tasks
The system SHALL provide an endpoint for registered servers to poll for pending tasks.

#### Scenario: No pending tasks
- **WHEN** registered server polls `/api/servers/:id/tasks`
- **THEN** system returns empty list or 204 No Content

#### Scenario: Pending task exists
- **WHEN** registered server polls and a task is assigned to it
- **THEN** system returns task details (container config, environment vars)

### Requirement: Report Server Status
The system SHALL accept status updates from the CLI.

#### Scenario: Heartbeat
- **WHEN** CLI sends heartbeat ping
- **THEN** system updates the `last_seen` timestamp for that server

#### Scenario: Resource Usage
- **WHEN** CLI reports current CPU/Memory usage
- **THEN** system updates server stats
