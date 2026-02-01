## ADDED Requirements

### Requirement: Connect GitHub account
The system SHALL allow users to connect their GitHub account via OAuth.

#### Scenario: Initiate GitHub connection
- **WHEN** user clicks "Connect GitHub" button
- **THEN** system redirects to GitHub OAuth authorization page with correct client_id and scopes

#### Scenario: Successful OAuth callback
- **WHEN** GitHub redirects back with authorization code
- **THEN** system exchanges code for access token and stores it in accounts table

#### Scenario: OAuth cancelled by user
- **WHEN** user denies authorization on GitHub
- **THEN** system redirects to settings page with message "GitHub connection cancelled"

#### Scenario: OAuth error
- **WHEN** GitHub returns an error during OAuth flow
- **THEN** system displays error message and allows retry

### Requirement: Check GitHub connection status
The system SHALL provide an API to check if user has connected GitHub.

#### Scenario: User has connected GitHub
- **WHEN** authenticated user calls GET /api/github/status
- **AND** user has a GitHub account record
- **THEN** system returns { connected: true, username: "<github_username>" }

#### Scenario: User has not connected GitHub
- **WHEN** authenticated user calls GET /api/github/status
- **AND** user has no GitHub account record
- **THEN** system returns { connected: false }

### Requirement: Disconnect GitHub account
The system SHALL allow users to disconnect their GitHub account.

#### Scenario: Successful disconnect
- **WHEN** user clicks "Disconnect GitHub" button
- **THEN** system removes GitHub account record and tokens

#### Scenario: Disconnect via API
- **WHEN** authenticated user calls POST /api/github/disconnect
- **THEN** system removes GitHub account record and returns { success: true }

### Requirement: Handle invalid GitHub token
The system SHALL detect and handle invalid or revoked GitHub tokens.

#### Scenario: Token revoked on GitHub
- **WHEN** system attempts GitHub API call with stored token
- **AND** GitHub returns 401 Unauthorized
- **THEN** system marks connection as invalid and prompts user to reconnect

#### Scenario: Display reconnect prompt
- **WHEN** GitHub connection is marked as invalid
- **THEN** UI displays "GitHub connection expired. Please reconnect." with reconnect button

### Requirement: GitHub OAuth configuration
The system SHALL require GitHub OAuth credentials in environment.

#### Scenario: Missing credentials on startup
- **WHEN** server starts without GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET
- **THEN** GitHub OAuth features are disabled with warning logged

#### Scenario: Valid credentials configured
- **WHEN** server starts with valid GitHub OAuth credentials
- **THEN** GitHub OAuth endpoints are enabled
