## ADDED Requirements

### Requirement: User registration
The system SHALL allow new users to create accounts with email and password.

#### Scenario: Successful registration
- **WHEN** user provides valid email and password (min 8 characters)
- **THEN** system creates user account and redirects to dashboard

#### Scenario: Duplicate email
- **WHEN** user registers with email that already exists
- **THEN** system displays error "Email already registered"

#### Scenario: Invalid password
- **WHEN** user provides password shorter than 8 characters
- **THEN** system displays error "Password must be at least 8 characters"

### Requirement: User login
The system SHALL authenticate users with email and password.

#### Scenario: Successful login
- **WHEN** user provides valid email and password
- **THEN** system creates session and redirects to dashboard

#### Scenario: Invalid credentials
- **WHEN** user provides incorrect email or password
- **THEN** system displays error "Invalid email or password"

#### Scenario: Session persistence
- **WHEN** user logs in successfully
- **THEN** session persists across browser refreshes until logout or expiration

### Requirement: User logout
The system SHALL allow users to terminate their session.

#### Scenario: Logout from current session
- **WHEN** user clicks logout
- **THEN** system invalidates session and redirects to login page

### Requirement: Protected routes
The system SHALL restrict access to authenticated users only and SHALL NOT render protected application UI until session state is resolved.

#### Scenario: Session state unknown
- **WHEN** user accesses any protected route and session state is not yet known
- **THEN** system displays a loading state and does not render protected UI

#### Scenario: Unauthenticated access to protected route
- **WHEN** unauthenticated user accesses any route except /login and /register
- **THEN** system redirects to login page without rendering protected UI

#### Scenario: Authenticated access
- **WHEN** authenticated user accesses protected route
- **THEN** system renders the requested page

### Requirement: Session management
The system SHALL store sessions in the database for revocability.

#### Scenario: Session stored in database
- **WHEN** user logs in
- **THEN** system creates session record in database with expiration time

#### Scenario: Session expiration
- **WHEN** session expiration time passes
- **THEN** system invalidates session and requires re-authentication

### Requirement: Auth API routes
The system SHALL expose Better-auth endpoints at /api/auth/*.

#### Scenario: Auth handler routing
- **WHEN** request is made to /api/auth/*
- **THEN** Better-auth handles the request (login, register, logout, session)

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
