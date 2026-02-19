## REMOVED Requirements

### Requirement: Store GitHub credentials
**Reason**: Replaced by OAuth-based authentication via github-oauth capability. Tokens are now managed by Better-auth in the accounts table.
**Migration**: Users must connect GitHub via OAuth. Existing stored PATs will be ignored.

## MODIFIED Requirements

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
