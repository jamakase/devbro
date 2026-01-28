## ADDED Requirements

### Requirement: Create project
The system SHALL allow users to create projects.

#### Scenario: Successful project creation
- **WHEN** user provides project name
- **THEN** system creates project owned by current user and returns project data

#### Scenario: Duplicate project name
- **WHEN** user creates project with name that already exists for that user
- **THEN** system rejects with error "Project name already exists"

#### Scenario: Empty project name
- **WHEN** user provides empty project name
- **THEN** system rejects with validation error

### Requirement: List user projects
The system SHALL return projects owned by the authenticated user.

#### Scenario: List projects
- **WHEN** user requests project list
- **THEN** system returns only projects owned by current user

#### Scenario: Empty project list
- **WHEN** user has no projects
- **THEN** system returns empty array

#### Scenario: Project list ordering
- **WHEN** projects are listed
- **THEN** system orders by most recently updated first

### Requirement: View project details
The system SHALL return project details with task summary.

#### Scenario: Get project by ID
- **WHEN** user requests project they own
- **THEN** system returns project with name, task count, and timestamps

#### Scenario: Access denied
- **WHEN** user requests project they do not own
- **THEN** system returns 404 Not Found

### Requirement: Update project
The system SHALL allow users to update their projects.

#### Scenario: Rename project
- **WHEN** user updates project name
- **THEN** system saves new name and updates updatedAt timestamp

### Requirement: Delete project
The system SHALL allow users to delete their projects.

#### Scenario: Delete empty project
- **WHEN** user deletes project with no tasks
- **THEN** system removes project

#### Scenario: Delete project with tasks
- **WHEN** user deletes project that has tasks
- **THEN** system warns and requires confirmation, then deletes project and all tasks

### Requirement: Project sidebar display
The system SHALL display user projects in the sidebar.

#### Scenario: Sidebar projects section
- **WHEN** authenticated user views any page
- **THEN** sidebar shows collapsible "Projects" section with user's projects

#### Scenario: Project expansion
- **WHEN** user clicks project in sidebar
- **THEN** project expands to show its tasks

#### Scenario: Active project highlight
- **WHEN** user is viewing a project or its tasks
- **THEN** sidebar highlights that project

### Requirement: Project API endpoints
The system SHALL expose REST endpoints for project operations.

#### Scenario: GET /api/projects
- **WHEN** authenticated request to GET /api/projects
- **THEN** system returns array of user's projects

#### Scenario: POST /api/projects
- **WHEN** authenticated request to POST /api/projects with name
- **THEN** system creates project and returns created project

#### Scenario: GET /api/projects/[id]
- **WHEN** authenticated request to GET /api/projects/[id]
- **THEN** system returns project if owned by user

#### Scenario: DELETE /api/projects/[id]
- **WHEN** authenticated request to DELETE /api/projects/[id]
- **THEN** system deletes project if owned by user
