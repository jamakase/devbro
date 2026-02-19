## ADDED Requirements

### Requirement: GitHub OAuth provider
The system SHALL support GitHub as an OAuth authentication provider.

#### Scenario: Sign in with GitHub
- **WHEN** user clicks "Sign in with GitHub" on login page
- **THEN** system initiates GitHub OAuth flow

#### Scenario: New user via GitHub OAuth
- **WHEN** user completes GitHub OAuth and has no existing account
- **THEN** system creates new user account with GitHub profile data (name, email, avatar)

#### Scenario: Existing user via GitHub OAuth
- **WHEN** user completes GitHub OAuth and email matches existing account
- **THEN** system links GitHub to existing account and logs user in

#### Scenario: GitHub login button on auth pages
- **WHEN** user views login or register page
- **THEN** page displays "Continue with GitHub" button

### Requirement: Link GitHub to existing account
The system SHALL allow existing users to link their GitHub account.

#### Scenario: Link from settings
- **WHEN** logged-in user clicks "Connect GitHub" in settings
- **THEN** system initiates OAuth flow and links GitHub to current account on success

#### Scenario: Already linked
- **WHEN** user attempts to link GitHub that is already linked to another account
- **THEN** system displays error "This GitHub account is already linked to another user"

### Requirement: Display linked accounts
The system SHALL show users which OAuth providers are linked to their account.

#### Scenario: Show GitHub connection in settings
- **WHEN** user views account settings
- **AND** user has linked GitHub account
- **THEN** settings display GitHub username with option to disconnect

#### Scenario: Show unlinked state
- **WHEN** user views account settings
- **AND** user has not linked GitHub account
- **THEN** settings display "Connect GitHub" button
