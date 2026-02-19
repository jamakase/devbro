## Context

The current system enforces a Project -> Task hierarchy. Users must create a project first, then add tasks. This is too rigid for users who think in terms of codebases (repositories). We are simplifying the workflow to allow direct task creation associated with a repository and branch, removing the friction of explicit project management.

## Goals / Non-Goals

**Goals:**
- Implement a "New Task" button in the sidebar.
- Create a streamlined "New Task" page with Repository, Branch, Description, and Server selection.
- Refactor the sidebar to group tasks by Repository instead of Project.
- Maintain compatibility with the existing backend data model where possible.

**Non-Goals:**
- rewriting the entire backend data model to remove "Projects". We will likely adapt the usage of Projects to map to Repositories.

## Decisions

### Implicit Project Management
**Context**: The backend likely requires a `project_id` to create a task.
**Decision**: We will implement a "Repository as Project" pattern. When creating a task for a repository:
1. Check if a project already exists for this repository (by name or metadata).
2. If yes, add the task to that project.
3. If no, create a new project named after the repository and add the task there.
**Rationale**: This avoids breaking backend constraints while providing the desired frontend experience. It also keeps tasks organized logically in the database.

### Sidebar Grouping Logic
**Context**: The sidebar currently iterates over Projects.
**Decision**: The sidebar will now iterate over unique Repositories derived from the user's tasks (or projects if we map 1:1).
**Rationale**: This aligns with the user's mental model. We will handle "tasks without a repository" by grouping them under a "Miscellaneous" or "Other" section if necessary, though the new flow enforces repo selection.

### Server Selection
**Context**: Users need to choose where the task runs.
**Decision**: The UI will fetch a list of available/registered servers. "Localhost" will be included as a standard option if the agent is running locally or if we detect a local server.
**Rationale**: Provides flexibility for users to run tasks in the cloud or locally.

## Risks / Trade-offs

### Risk: Existing Tasks without Repos
**Risk**: If current tasks don't have a repository associated, they might disappear from the repo-grouped sidebar.
**Mitigation**: Ensure the grouping logic includes a fallback for "No Repository" or uses the legacy Project name as the group name for such cases.

### Risk: Backend Project Name Collisions
**Risk**: If we auto-create projects based on Repo names, we might collide with existing manual project names.
**Mitigation**: Use a naming convention or check for existence before creating.
