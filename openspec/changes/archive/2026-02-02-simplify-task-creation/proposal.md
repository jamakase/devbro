## Why

The current workflow forces users to manually create projects and then create tasks within those projects. This introduces unnecessary friction and mental overhead. Users simply want to start a task on a specific repository or codebase as quickly as possible. A simplified, repository-centric workflow will reduce the time-to-task and better align with how developers think about their work (in terms of codebases/repos, not abstract projects).

## What Changes

- **New Task Creation Flow**:
  - Add a "New Task" button to the sidebar.
  - Create a simplified "New Task" screen.
  - Remove the requirement to name a task (optional or auto-generated).
  - Require selection of GitHub repository and branch.
  - Allow selection of execution server (registered servers or localhost).
- **Sidebar Organization**:
  - Remove "Project" based grouping in the sidebar.
  - Group tasks by Repository in the sidebar.
  - Display tasks under their respective repositories.

## Capabilities

### New Capabilities
- `simplified-task-workflow`: Defines the new "New Task" UI, the simplified creation logic (repo+branch+server), and the repository-based sidebar organization.

### Modified Capabilities
- `task-tracking`: Update task creation requirements to support repo/branch inputs and remove strict project dependencies in the UI. Update listing requirements to support grouping by repository.
- `project-management`: Update requirements to hide or deprecate explicit project creation/management in the UI, as the primary organizational unit becomes the repository.

## Impact

- **UI**: Sidebar, Task Creation Page, Task List.
- **API**: Task creation endpoints might need to accept repo/branch directly and handle project association automatically (e.g., auto-create project per repo or use a default project).
- **Data Model**: Tasks need strong association with Repositories.
