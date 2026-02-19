## ADDED Requirements

### Requirement: Unified Container Interface
The system SHALL define a common interface for all container operations, abstracting the underlying runtime (Docker vs Kubernetes).

#### Scenario: Interface Definition
- **WHEN** a new provider is implemented
- **THEN** it MUST implement methods: `create`, `start`, `stop`, `inspect`, `logs`, `execute`

#### Scenario: Provider Selection
- **WHEN** performing an operation on a sandbox
- **THEN** system selects the correct provider based on the Server configuration
