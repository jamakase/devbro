## ADDED Requirements

### Requirement: Server environment validation
The system SHALL validate server-side environment variables at startup using t3-env.

#### Scenario: Valid server environment
- **WHEN** all required server env vars are present and valid
- **THEN** application starts successfully

#### Scenario: Missing required variable
- **WHEN** DATABASE_URL is not set
- **THEN** application fails startup with error listing missing variables

#### Scenario: Invalid variable format
- **WHEN** DATABASE_URL is not a valid URL
- **THEN** application fails startup with Zod validation error

### Requirement: Client environment validation
The system SHALL validate client-side environment variables (NEXT_PUBLIC_*) at build time.

#### Scenario: Valid client environment
- **WHEN** all required NEXT_PUBLIC_* vars are present
- **THEN** build succeeds and vars are bundled

#### Scenario: Missing client variable
- **WHEN** required NEXT_PUBLIC_* var is missing at build
- **THEN** build fails with descriptive error

### Requirement: Type-safe environment access
The system SHALL provide typed access to environment variables.

#### Scenario: Access server variable
- **WHEN** code imports env and accesses env.DATABASE_URL
- **THEN** TypeScript provides autocomplete and type checking

#### Scenario: Prevent client access to server vars
- **WHEN** client code attempts to access server-only env var
- **THEN** TypeScript reports type error

### Requirement: Required environment variables
The system SHALL require the following environment variables.

#### Scenario: Database configuration
- **WHEN** application starts
- **THEN** DATABASE_URL must be valid PostgreSQL connection string

#### Scenario: Auth configuration
- **WHEN** application starts
- **THEN** BETTER_AUTH_SECRET must be string of at least 32 characters

#### Scenario: App URL configuration
- **WHEN** application builds
- **THEN** NEXT_PUBLIC_APP_URL must be valid URL

### Requirement: Environment schema location
The system SHALL define env schemas in packages/ui/src/env.ts.

#### Scenario: Single source of truth
- **WHEN** env configuration is needed
- **THEN** import from packages/ui/src/env.ts provides all validated vars
