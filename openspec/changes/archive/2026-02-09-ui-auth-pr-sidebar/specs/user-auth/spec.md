## MODIFIED Requirements

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
