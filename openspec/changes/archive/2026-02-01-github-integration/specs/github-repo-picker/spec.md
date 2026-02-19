## ADDED Requirements

### Requirement: List user GitHub repositories
The system SHALL fetch and display the user's accessible GitHub repositories.

#### Scenario: List repos for connected user
- **WHEN** authenticated user calls GET /api/github/repos
- **AND** user has connected GitHub account
- **THEN** system returns list of repositories user has access to

#### Scenario: Repo list includes metadata
- **WHEN** system returns repository list
- **THEN** each repo includes: id, full_name, private, default_branch, description, updated_at

#### Scenario: User not connected to GitHub
- **WHEN** authenticated user calls GET /api/github/repos
- **AND** user has not connected GitHub account
- **THEN** system returns 400 error "GitHub account not connected"

#### Scenario: Pagination support
- **WHEN** user has more than 100 repositories
- **THEN** system supports pagination via page and per_page query parameters

### Requirement: Search user repositories
The system SHALL allow users to search within their accessible repositories.

#### Scenario: Search by name
- **WHEN** user calls GET /api/github/repos?search=<query>
- **THEN** system returns repos where name contains search query

#### Scenario: Empty search results
- **WHEN** search query matches no repositories
- **THEN** system returns empty array

### Requirement: Repository picker UI component
The system SHALL provide a UI component for selecting a repository.

#### Scenario: Show repo picker when connected
- **WHEN** user has connected GitHub and opens repo selection
- **THEN** system displays searchable list of their repositories

#### Scenario: Show connect prompt when not connected
- **WHEN** user has not connected GitHub and opens repo selection
- **THEN** system displays "Connect GitHub" button instead of repo list

#### Scenario: Select repository from list
- **WHEN** user clicks on a repository in the picker
- **THEN** system sets the selected repo and displays repo name with branch selector

#### Scenario: Show private repo indicator
- **WHEN** repository list includes private repos
- **THEN** private repos display a lock icon

### Requirement: Custom URL fallback
The system SHALL allow users to enter a custom git URL instead of selecting from GitHub.

#### Scenario: Switch to custom URL mode
- **WHEN** user clicks "Use custom URL" in repo picker
- **THEN** system shows text input for entering git URL

#### Scenario: Validate custom URL format
- **WHEN** user enters custom URL
- **THEN** system validates it matches git URL pattern (https:// or git@)

#### Scenario: Custom URL for public repo
- **WHEN** user enters URL for public repository
- **THEN** system accepts URL without requiring GitHub connection

### Requirement: Branch selection
The system SHALL allow users to select which branch to clone.

#### Scenario: List branches for selected repo
- **WHEN** user selects a repository
- **THEN** system fetches and displays available branches with default branch pre-selected

#### Scenario: Select non-default branch
- **WHEN** user selects a branch from the dropdown
- **THEN** system updates selected branch for clone operation

#### Scenario: Branch list for custom URL
- **WHEN** user enters custom URL for accessible repository
- **THEN** system attempts to fetch branches, falls back to text input if unavailable
