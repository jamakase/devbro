## ADDED Requirements

### Requirement: Auth-gated application layout
The system SHALL NOT render authenticated application UI until the user session is resolved and the user is authenticated.

#### Scenario: Session is loading
- **WHEN** user opens the application and session state is not yet known
- **THEN** system displays only a loading screen and does not render sidebar or protected content

#### Scenario: Unauthenticated user
- **WHEN** user opens the application without an authenticated session
- **THEN** system renders only authentication routes and does not render application navigation

#### Scenario: Authenticated user
- **WHEN** user opens the application with an authenticated session
- **THEN** system renders the application layout and requested protected route

### Requirement: Sidebar groups include specs, knowledge bases, skills, and MCPs
The system SHALL include sidebar navigation groups for Specs, Knowledge Bases, Skills, and MCPs.

#### Scenario: View sidebar groups
- **WHEN** an authenticated user views the application sidebar
- **THEN** system displays groups including Specs, Knowledge Bases, Skills, and MCPs

#### Scenario: Navigate to new group pages
- **WHEN** user selects Specs, Knowledge Bases, Skills, or MCPs in the sidebar
- **THEN** system navigates to the corresponding page

### Requirement: Consistent UI states
The system SHALL provide consistent loading, empty, and error states across dashboard pages.

#### Scenario: Loading state
- **WHEN** a page is fetching required data
- **THEN** system displays a loading state without rendering stale data

#### Scenario: Empty state
- **WHEN** a page has no items to display
- **THEN** system displays an empty state with a primary call-to-action when applicable

#### Scenario: Error state
- **WHEN** a page data request fails
- **THEN** system displays a user-friendly error and a retry action
