## ADDED Requirements

### Requirement: Create persistent volume
The system SHALL create a named Docker volume for each sandbox to persist workspace data.

#### Scenario: Create volume on sandbox creation
- **WHEN** user creates a new sandbox
- **THEN** system creates named volume `agent-sandbox-{sandbox-id}` mounted at /workspace

#### Scenario: Volume naming convention
- **WHEN** sandbox with ID "abc123" is created
- **THEN** system creates volume named "agent-sandbox-abc123"

### Requirement: Mount volume to container
The system SHALL mount the sandbox volume at /workspace inside the container.

#### Scenario: Mount on container start
- **WHEN** sandbox container starts
- **THEN** volume is mounted at /workspace with read-write permissions

#### Scenario: Preserve data across restarts
- **WHEN** sandbox is stopped and restarted
- **THEN** all files in /workspace persist unchanged

### Requirement: List volumes
The system SHALL provide a list of all sandbox volumes with usage information.

#### Scenario: List all volumes
- **WHEN** user requests volume list
- **THEN** system returns volumes with name, size, associated sandbox, and creation date

#### Scenario: Show orphaned volumes
- **WHEN** volume exists without associated sandbox
- **THEN** system marks volume as "orphaned" in the list

### Requirement: Delete volume
The system SHALL remove a volume when requested, with appropriate safeguards.

#### Scenario: Delete volume of destroyed sandbox
- **WHEN** user destroys sandbox with preserveVolume=false
- **THEN** system removes the associated volume

#### Scenario: Prevent deletion of in-use volume
- **WHEN** user attempts to delete volume of running sandbox
- **THEN** system rejects with error "Volume is in use by running sandbox"

### Requirement: Volume size reporting
The system SHALL report the disk usage of each volume.

#### Scenario: Show volume size
- **WHEN** user views sandbox details
- **THEN** system displays current volume size in human-readable format

#### Scenario: Warn on large volume
- **WHEN** volume exceeds 10GB
- **THEN** system displays warning about disk usage

### Requirement: Clean up orphaned volumes
The system SHALL identify and optionally remove volumes without associated sandboxes.

#### Scenario: List orphaned volumes
- **WHEN** user requests orphaned volume cleanup check
- **THEN** system lists volumes that have no associated sandbox record

#### Scenario: Bulk delete orphaned volumes
- **WHEN** user confirms orphaned volume cleanup
- **THEN** system removes all orphaned volumes and reports freed space
