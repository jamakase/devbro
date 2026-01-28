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
The system SHALL restrict access to authenticated users only.

#### Scenario: Unauthenticated access to protected route
- **WHEN** unauthenticated user accesses any route except /login and /register
- **THEN** system redirects to login page

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
