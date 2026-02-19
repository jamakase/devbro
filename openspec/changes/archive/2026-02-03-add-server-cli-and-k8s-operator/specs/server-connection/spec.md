## MODIFIED Requirements

### Requirement: Add remote server
The system SHALL allow users to configure remote servers for running sandboxes, supporting both SSH (push) and API registration (pull).

#### Scenario: Add server with SSH key
- **WHEN** user provides hostname, port, username, and SSH private key
- **THEN** system stores server configuration for current user and tests connectivity

#### Scenario: Add server with SSH agent
- **WHEN** user provides hostname and selects "Use SSH Agent"
- **THEN** system uses local SSH agent for authentication

#### Scenario: API Registration (Pull Model)
- **WHEN** a server registers itself via the CLI API with a valid token
- **THEN** system stores the server record with type "registered" and connection status "connected"

#### Scenario: Duplicate server prevention
- **WHEN** user adds server with same host:port as existing server they own
- **THEN** system rejects with error "Server already configured"

#### Scenario: User isolation
- **WHEN** user A adds server
- **THEN** user B cannot see or use that server

### Requirement: List configured servers
The system SHALL return list of servers owned by the authenticated user, including registered servers.

#### Scenario: List servers
- **WHEN** user requests server list
- **THEN** system returns servers owned by current user (SSH-based and CLI-registered) with status

#### Scenario: Show server health
- **WHEN** server list is displayed
- **THEN** each server shows connection status (connected, disconnected, error) based on last heartbeat or SSH check

### Requirement: Remove server
The system SHALL allow removal of server configurations owned by the user.

#### Scenario: Remove server without tasks
- **WHEN** user removes server with no associated tasks
- **THEN** system deletes server configuration

#### Scenario: Remove server with tasks
- **WHEN** user removes server that has tasks
- **THEN** system warns user and requires confirmation to delete server and associated tasks

### Requirement: Default server selection
The system SHALL support designating a default server per user.

#### Scenario: Set default server
- **WHEN** user marks server as default
- **THEN** new task form pre-selects this server for that user

#### Scenario: Local as implicit default
- **WHEN** user has no remote server marked default
- **THEN** "Local Docker" is used as default for new tasks
