## ADDED Requirements

### Requirement: Create pull request
The system SHALL create a GitHub pull request for a repository associated with a sandbox.

#### Scenario: Create PR against default branch
- **WHEN** user requests PR creation for the current branch without specifying a base branch
- **THEN** system creates the PR against the repository default branch

#### Scenario: Create PR against specified base branch
- **WHEN** user requests PR creation and specifies a base branch
- **THEN** system creates the PR against the specified base branch

#### Scenario: Insufficient permissions
- **WHEN** GitHub API returns a permission error during PR creation
- **THEN** system returns a user-visible error indicating missing permissions

### Requirement: Provide change summary for PR preview
The system SHALL provide a change summary for the PR preview including files changed and total additions and deletions.

#### Scenario: Fetch summary for current branch
- **WHEN** user opens PR creation UI
- **THEN** system returns counts for files changed, total additions, and total deletions for the current branch relative to base

### Requirement: Provide per-file unified diffs
The system SHALL provide per-file unified diffs for the PR preview with sufficient information to render added and removed lines.

#### Scenario: Fetch diff for a file
- **WHEN** user requests the diff for a specific changed file
- **THEN** system returns a unified diff containing added and removed lines for that file

#### Scenario: Diff too large
- **WHEN** a diff exceeds a configured size limit
- **THEN** system returns a truncated diff response with an explicit truncation indicator
