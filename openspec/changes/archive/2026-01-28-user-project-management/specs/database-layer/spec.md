## ADDED Requirements

### Requirement: PostgreSQL connection
The system SHALL connect to PostgreSQL using the postgres driver.

#### Scenario: Successful connection
- **WHEN** application starts with valid DATABASE_URL
- **THEN** system establishes connection pool to PostgreSQL

#### Scenario: Connection failure
- **WHEN** DATABASE_URL is invalid or database unreachable
- **THEN** system fails startup with descriptive error message

### Requirement: Drizzle ORM schema
The system SHALL define database schema using Drizzle ORM.

#### Scenario: Schema definition
- **WHEN** schema files are loaded
- **THEN** system registers tables: users, sessions, projects, tasks, messages, servers

#### Scenario: Type inference
- **WHEN** schema is defined
- **THEN** TypeScript types are inferred from table definitions

### Requirement: Zod schema generation
The system SHALL generate Zod schemas from Drizzle tables using drizzle-zod.

#### Scenario: Insert schema generation
- **WHEN** createInsertSchema is called on a table
- **THEN** system returns Zod schema for insert validation

#### Scenario: Select schema generation
- **WHEN** createSelectSchema is called on a table
- **THEN** system returns Zod schema matching select result type

### Requirement: Database migrations
The system SHALL support schema migrations using drizzle-kit.

#### Scenario: Generate migration
- **WHEN** developer runs drizzle-kit generate
- **THEN** system creates SQL migration file from schema diff

#### Scenario: Apply migration
- **WHEN** developer runs drizzle-kit migrate
- **THEN** system applies pending migrations to database

#### Scenario: Migration tracking
- **WHEN** migrations are applied
- **THEN** system records applied migrations to prevent re-application

### Requirement: Repository pattern
The system SHALL implement data access through repository classes.

#### Scenario: Repository CRUD operations
- **WHEN** repository method is called (create, findById, findAll, update, delete)
- **THEN** system executes corresponding Drizzle query

#### Scenario: Repository type safety
- **WHEN** repository returns data
- **THEN** return type matches Zod-inferred schema type

### Requirement: Transaction support
The system SHALL support database transactions for atomic operations.

#### Scenario: Successful transaction
- **WHEN** multiple operations are wrapped in transaction
- **THEN** all operations succeed or all are rolled back

#### Scenario: Transaction rollback
- **WHEN** any operation in transaction fails
- **THEN** system rolls back all changes in that transaction
