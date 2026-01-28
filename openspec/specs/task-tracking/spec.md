## ADDED Requirements

### Requirement: Create task
The system SHALL allow users to create tasks within a project.

#### Scenario: Successful task creation
- **WHEN** user provides task name, project ID, CLI tool (claude/opencode), and server
- **THEN** system creates task with associated sandbox container

#### Scenario: Task with GitHub repo
- **WHEN** user provides GitHub repo URL during task creation
- **THEN** system clones repo into sandbox volume before starting

#### Scenario: Invalid project
- **WHEN** user creates task for project they don't own
- **THEN** system returns 404 Not Found

### Requirement: Task equals sandbox
The system SHALL treat task as the unit combining sandbox and conversation.

#### Scenario: Task contains sandbox reference
- **WHEN** task is created
- **THEN** task record includes container_id, volume_id, and server_id

#### Scenario: Task status reflects sandbox
- **WHEN** sandbox container status changes (running, stopped, error)
- **THEN** task status updates accordingly

### Requirement: List project tasks
The system SHALL return tasks for a given project.

#### Scenario: List tasks
- **WHEN** user requests tasks for their project
- **THEN** system returns tasks with name, status, CLI tool, and timestamps

#### Scenario: Task ordering
- **WHEN** tasks are listed
- **THEN** system orders by most recently active first

### Requirement: View task details
The system SHALL return full task details including sandbox info.

#### Scenario: Get task by ID
- **WHEN** user requests task they own (via project ownership)
- **THEN** system returns task with name, status, config, messages, and file tree access

### Requirement: Start task
The system SHALL start the sandbox container for a task.

#### Scenario: Start stopped task
- **WHEN** user starts a stopped task
- **THEN** system starts the sandbox container and updates task status to running

#### Scenario: Start already running task
- **WHEN** user starts a task that is already running
- **THEN** system returns current status without error

### Requirement: Stop task
The system SHALL stop the sandbox container for a task.

#### Scenario: Stop running task
- **WHEN** user stops a running task
- **THEN** system stops the sandbox container and updates task status to stopped

### Requirement: Delete task
The system SHALL allow users to delete tasks.

#### Scenario: Delete task
- **WHEN** user deletes a task
- **THEN** system stops container if running, removes container, removes volume, and deletes task record

### Requirement: Task sidebar display
The system SHALL display tasks under their project in the sidebar.

#### Scenario: Collapsed project shows task count
- **WHEN** project is collapsed in sidebar
- **THEN** project shows task count badge

#### Scenario: Expanded project shows tasks
- **WHEN** user expands project in sidebar
- **THEN** sidebar shows list of tasks with status indicators

#### Scenario: Click task navigates to detail
- **WHEN** user clicks task in sidebar
- **THEN** system navigates to task detail page

### Requirement: Task API endpoints
The system SHALL expose REST endpoints for task operations.

#### Scenario: GET /api/projects/[id]/tasks
- **WHEN** authenticated request to GET /api/projects/[id]/tasks
- **THEN** system returns array of tasks for that project

#### Scenario: POST /api/projects/[id]/tasks
- **WHEN** authenticated request to POST /api/projects/[id]/tasks with task config
- **THEN** system creates task with sandbox and returns created task

#### Scenario: GET /api/tasks/[id]
- **WHEN** authenticated request to GET /api/tasks/[id]
- **THEN** system returns task details if user owns parent project

#### Scenario: POST /api/tasks/[id]/start
- **WHEN** authenticated request to POST /api/tasks/[id]/start
- **THEN** system starts the task's sandbox

#### Scenario: POST /api/tasks/[id]/stop
- **WHEN** authenticated request to POST /api/tasks/[id]/stop
- **THEN** system stops the task's sandbox

#### Scenario: DELETE /api/tasks/[id]
- **WHEN** authenticated request to DELETE /api/tasks/[id]
- **THEN** system deletes task and its sandbox
