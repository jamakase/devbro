## MODIFIED Requirements

### Requirement: Create task
The system SHALL allow users to create tasks associated with a repository.

#### Scenario: Successful task creation
- **WHEN** user provides repository, branch, description, and server
- **THEN** system creates task with associated sandbox container using the repo code

#### Scenario: Optional task name
- **WHEN** user creates task without a name
- **THEN** system generates a default name or uses the description preview

#### Scenario: Task with GitHub repo
- **WHEN** user provides GitHub repo URL during task creation
- **THEN** system clones repo into sandbox volume before starting

### Requirement: List project tasks
The system SHALL return tasks for a given project or repository context.

#### Scenario: List tasks
- **WHEN** user requests tasks
- **THEN** system returns tasks with name, status, CLI tool, and timestamps, capable of being grouped by repository

#### Scenario: Task ordering
- **WHEN** tasks are listed
- **THEN** system orders by most recently active first

### Requirement: Task sidebar display
The system SHALL display tasks under their repository in the sidebar.

#### Scenario: Collapsed repo shows task count
- **WHEN** repository group is collapsed in sidebar
- **THEN** repository shows task count badge

#### Scenario: Expanded repo shows tasks
- **WHEN** user expands repository in sidebar
- **THEN** sidebar shows list of tasks for that repo with status indicators

#### Scenario: Click task navigates to detail
- **WHEN** user clicks task in sidebar
- **THEN** system navigates to task detail page
