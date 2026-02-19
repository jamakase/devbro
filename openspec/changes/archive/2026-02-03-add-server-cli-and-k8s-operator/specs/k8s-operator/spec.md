## ADDED Requirements

### Requirement: Kubernetes Provider
The system SHALL support a Kubernetes container provider that interacts directly with the Kubernetes API.

#### Scenario: Create Pod
- **WHEN** system requests to start a sandbox on a Kubernetes target
- **THEN** provider creates a Pod with the specified image and configuration
- **AND** mounts a PVC for the workspace

#### Scenario: Stream Logs
- **WHEN** system requests logs for a K8s sandbox
- **THEN** provider streams logs from the Pod using the K8s API

#### Scenario: Delete Pod
- **WHEN** system requests to stop a sandbox
- **THEN** provider deletes the corresponding Pod

### Requirement: K8s Target Configuration
The system SHALL allow configuring a "Kubernetes" target for agent execution.

#### Scenario: Configure In-Cluster
- **WHEN** running inside a cluster
- **THEN** provider auto-discovers configuration (ServiceAccount)

#### Scenario: Configure Kubeconfig
- **WHEN** running externally
- **THEN** provider accepts Kubeconfig for connection
