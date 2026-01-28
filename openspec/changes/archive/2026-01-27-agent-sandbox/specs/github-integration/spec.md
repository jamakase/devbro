## ADDED Requirements

### Requirement: Clone repository into sandbox
The system SHALL clone a GitHub repository into the sandbox workspace directory.

#### Scenario: Clone public repository
- **WHEN** user provides a public GitHub repository URL
- **THEN** system clones repository to /workspace in the sandbox container

#### Scenario: Clone private repository with token
- **WHEN** user provides private repository URL and GitHub personal access token
- **THEN** system clones repository using token authentication

#### Scenario: Clone specific branch
- **WHEN** user specifies branch name along with repository URL
- **THEN** system clones only the specified branch to /workspace

#### Scenario: Clone fails due to invalid URL
- **WHEN** user provides invalid or inaccessible repository URL
- **THEN** system returns error with message explaining the failure

### Requirement: Store GitHub credentials
The system SHALL securely store GitHub personal access tokens for authenticated operations.

#### Scenario: Save new GitHub token
- **WHEN** user provides GitHub personal access token
- **THEN** system encrypts and stores token associated with user session

#### Scenario: Use stored token for clone
- **WHEN** user clones private repo and has stored token
- **THEN** system automatically uses stored token for authentication

### Requirement: Validate repository access
The system SHALL verify repository accessibility before attempting clone operations.

#### Scenario: Validate accessible public repo
- **WHEN** user enters public repository URL
- **THEN** system confirms repository exists and is accessible

#### Scenario: Validate private repo requires auth
- **WHEN** user enters private repository URL without token
- **THEN** system prompts for GitHub personal access token

### Requirement: Display repository metadata
The system SHALL fetch and display repository information before cloning.

#### Scenario: Show repo details
- **WHEN** user enters valid repository URL
- **THEN** system displays repo name, description, default branch, and size estimate

#### Scenario: List available branches
- **WHEN** user requests branch list for repository
- **THEN** system returns list of branches with last commit info
