## ADDED Requirements

### Requirement: Create sandbox container
The system SHALL create a new Docker container for a sandbox with configurable parameters including name, base image, and resource limits.

#### Scenario: Create sandbox with default settings
- **WHEN** user requests sandbox creation with only a name
- **THEN** system creates container using node:20-bookworm image with default resource limits

#### Scenario: Create sandbox with custom resource limits
- **WHEN** user specifies memory limit of 2GB and CPU limit of 2 cores
- **THEN** system creates container with specified resource constraints

### Requirement: Start sandbox container
The system SHALL start a stopped sandbox container and return its running state.

#### Scenario: Start stopped sandbox
- **WHEN** user requests to start a sandbox that is in stopped state
- **THEN** system starts the container and returns status "running"

#### Scenario: Start already running sandbox
- **WHEN** user requests to start a sandbox that is already running
- **THEN** system returns current status "running" without error

### Requirement: Stop sandbox container
The system SHALL gracefully stop a running sandbox container.

#### Scenario: Stop running sandbox
- **WHEN** user requests to stop a sandbox that is running
- **THEN** system sends SIGTERM, waits for graceful shutdown, and returns status "stopped"

#### Scenario: Force stop unresponsive sandbox
- **WHEN** sandbox does not stop within 30 seconds of SIGTERM
- **THEN** system sends SIGKILL and returns status "stopped"

### Requirement: Destroy sandbox container
The system SHALL remove a sandbox container and optionally its associated volume.

#### Scenario: Destroy sandbox keeping volume
- **WHEN** user requests sandbox destruction with preserveVolume=true
- **THEN** system removes container but retains the volume for future use

#### Scenario: Destroy sandbox with volume
- **WHEN** user requests sandbox destruction with preserveVolume=false
- **THEN** system removes both container and associated volume

### Requirement: List sandbox containers
The system SHALL return a list of all sandbox containers with their current status.

#### Scenario: List all sandboxes
- **WHEN** user requests sandbox list
- **THEN** system returns array of sandboxes with id, name, status, createdAt, and server location

#### Scenario: Filter sandboxes by status
- **WHEN** user requests sandbox list with status filter "running"
- **THEN** system returns only sandboxes with status "running"

### Requirement: Get sandbox container status
The system SHALL return detailed status information for a specific sandbox.

#### Scenario: Get status of existing sandbox
- **WHEN** user requests status for valid sandbox ID
- **THEN** system returns status including state, uptime, resource usage, and logs endpoint

#### Scenario: Get status of non-existent sandbox
- **WHEN** user requests status for invalid sandbox ID
- **THEN** system returns 404 error with message "Sandbox not found"

### Requirement: Stream sandbox logs
The system SHALL stream container logs in real-time using Server-Sent Events.

#### Scenario: Stream logs from running sandbox
- **WHEN** user connects to logs endpoint for running sandbox
- **THEN** system streams stdout and stderr as SSE events

#### Scenario: Stream logs with history
- **WHEN** user connects to logs endpoint with tail=100 parameter
- **THEN** system returns last 100 lines then continues streaming new logs

### Requirement: Health check Docker connection
The system SHALL verify Docker daemon connectivity and report health status.

#### Scenario: Docker daemon available
- **WHEN** system performs health check and Docker responds
- **THEN** system returns healthy status with Docker version info

#### Scenario: Docker daemon unavailable
- **WHEN** system performs health check and Docker does not respond
- **THEN** system returns unhealthy status with troubleshooting guidance
