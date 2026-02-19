## ADDED Requirements

### Requirement: Clone repository into sandbox
The system SHALL clone a GitHub repository into the sandbox workspace directory.

#### Scenario: Clone public repository
- **WHEN** user provides a public GitHub repository URL
- **THEN** system clones repository to /workspace in the sandbox container

#### Scenario: Clone private repository with OAuth
- **WHEN** user selects private repository from connected GitHub account
- **THEN** system clones repository using OAuth token from accounts table

#### Scenario: Clone specific branch
- **WHEN** user specifies branch name along with repository
- **THEN** system clones only the specified branch to /workspace

#### Scenario: Clone fails due to invalid URL
- **WHEN** user provides invalid or inaccessible repository URL
- **THEN** system returns error with message explaining the failure

#### Scenario: Clone fails due to expired token
- **WHEN** clone is attempted with expired or revoked OAuth token
- **THEN** system returns error prompting user to reconnect GitHub

### Requirement: Validate repository access
The system SHALL verify repository accessibility before attempting clone operations.

#### Scenario: Validate accessible public repo
- **WHEN** user enters public repository URL
- **THEN** system confirms repository exists and is accessible

#### Scenario: Validate private repo with OAuth
- **WHEN** user selects private repository from GitHub picker
- **THEN** system confirms repository is accessible with stored OAuth token

#### Scenario: Validate custom URL without connection
- **WHEN** user enters custom URL for private repository without GitHub connection
- **THEN** system displays error "Private repositories require GitHub connection"

### Requirement: Display repository metadata
The system SHALL fetch and display repository information before cloning.

#### Scenario: Show repo details
- **WHEN** user selects repository from GitHub picker
- **THEN** system displays repo name, description, default branch, and size estimate

#### Scenario: Show repo details for custom URL
- **WHEN** user enters valid custom repository URL
- **THEN** system fetches and displays repo name, description, default branch if accessible

#### Scenario: List available branches
- **WHEN** user requests branch list for repository
- **THEN** system returns list of branches with last commit info

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
