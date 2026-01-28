## ADDED Requirements

### Requirement: Add remote server
The system SHALL allow users to configure remote servers for running sandboxes.

#### Scenario: Add server with SSH key
- **WHEN** user provides hostname, port, username, and SSH private key
- **THEN** system stores server configuration and tests connectivity

#### Scenario: Add server with SSH agent
- **WHEN** user provides hostname and selects "Use SSH Agent"
- **THEN** system uses local SSH agent for authentication

#### Scenario: Duplicate server prevention
- **WHEN** user adds server with same host:port as existing
- **THEN** system rejects with error "Server already configured"

### Requirement: Test server connection
The system SHALL verify SSH and Docker connectivity to remote servers.

#### Scenario: Successful connection test
- **WHEN** system can SSH to server and reach Docker daemon
- **THEN** system returns success with Docker version info

#### Scenario: SSH authentication failure
- **WHEN** SSH authentication fails
- **THEN** system returns error "SSH authentication failed" with details

#### Scenario: Docker not available
- **WHEN** SSH succeeds but Docker daemon is not reachable
- **THEN** system returns error "Docker not available on server"

### Requirement: Establish SSH tunnel
The system SHALL create SSH tunnel to forward Docker socket for remote operations.

#### Scenario: Create tunnel on demand
- **WHEN** user selects remote server for sandbox operation
- **THEN** system establishes SSH tunnel forwarding Docker socket to local port

#### Scenario: Tunnel keepalive
- **WHEN** tunnel is established
- **THEN** system sends keepalive packets every 60 seconds to maintain connection

#### Scenario: Tunnel reconnection
- **WHEN** tunnel connection drops
- **THEN** system attempts reconnection with exponential backoff (1s, 2s, 4s, 8s, max 30s)

### Requirement: List configured servers
The system SHALL return list of all configured remote servers with status.

#### Scenario: List servers
- **WHEN** user requests server list
- **THEN** system returns servers with name, host, status, and sandbox count

#### Scenario: Show server health
- **WHEN** server list is displayed
- **THEN** each server shows connection status (connected, disconnected, error)

### Requirement: Remove server
The system SHALL allow removal of server configurations.

#### Scenario: Remove server without sandboxes
- **WHEN** user removes server with no associated sandboxes
- **THEN** system deletes server configuration

#### Scenario: Remove server with sandboxes
- **WHEN** user removes server that has sandboxes
- **THEN** system warns user and requires confirmation to delete server and sandboxes

### Requirement: Default server selection
The system SHALL support designating a default server for new sandboxes.

#### Scenario: Set default server
- **WHEN** user marks server as default
- **THEN** new sandbox form pre-selects this server

#### Scenario: Local as implicit default
- **WHEN** no remote server is marked default
- **THEN** "Local Docker" is used as default for new sandboxes

### Requirement: Server resource monitoring
The system SHALL display resource availability on remote servers.

#### Scenario: Show available resources
- **WHEN** user views server details
- **THEN** system displays CPU, memory, and disk usage of remote server

#### Scenario: Resource warning
- **WHEN** server has less than 10% available memory or disk
- **THEN** system displays warning indicator on server status
