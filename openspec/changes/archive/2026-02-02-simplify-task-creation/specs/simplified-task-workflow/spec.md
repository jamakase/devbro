## ADDED Requirements

### Requirement: Simplified task creation UI
The system SHALL provide a simplified UI for creating tasks directly from the sidebar.

#### Scenario: Open new task view
- **WHEN** user clicks "New Task" button in sidebar
- **THEN** system displays the simplified task creation view

#### Scenario: View components
- **WHEN** user views the task creation screen
- **THEN** system displays textarea for description, repository selector, branch selector, and server selector

### Requirement: Create task with repository
The system SHALL allow creating a task associated with a repository and branch.

#### Scenario: Create task
- **WHEN** user submits the new task form with repo, branch, and description
- **THEN** system creates a new task associated with that repo/branch and starts the sandbox

#### Scenario: Server selection
- **WHEN** user selects a server (local or remote)
- **THEN** task is started on the selected server

### Requirement: Repository-based task grouping
The system SHALL group and display tasks by their repository in the sidebar.

#### Scenario: Sidebar display
- **WHEN** user views the sidebar
- **THEN** tasks are grouped under their respective repositories

#### Scenario: Empty repository
- **WHEN** a repository has no active tasks
- **THEN** it is not shown in the sidebar
