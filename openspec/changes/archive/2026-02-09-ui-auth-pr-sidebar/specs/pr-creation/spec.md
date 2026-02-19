## ADDED Requirements

### Requirement: Create pull request from UI
The system SHALL allow an authenticated user to create a GitHub pull request from the UI for a selected sandbox repository context.

#### Scenario: Successful PR creation
- **WHEN** user clicks "Create PR" and provides a title and description
- **THEN** system creates a pull request on GitHub and displays the PR URL and number

#### Scenario: Missing GitHub connection
- **WHEN** user attempts to create a PR without a valid GitHub connection for the repository
- **THEN** system displays an error explaining that GitHub must be connected and provides a path to connect

#### Scenario: PR creation failure
- **WHEN** PR creation fails due to API error or permission issue
- **THEN** system displays an error message and preserves the entered title and description

### Requirement: Show line changes for PR preview
The system SHALL display a preview of changes for the current branch, including per-file additions/deletions and line-level diffs.

#### Scenario: View change summary
- **WHEN** user opens the PR creation view
- **THEN** system displays files changed count, total additions, and total deletions

#### Scenario: View per-file diff
- **WHEN** user selects a file from the change summary
- **THEN** system displays a unified diff with added and removed lines

#### Scenario: Large diff handling
- **WHEN** a diff exceeds the system size limit for inline rendering
- **THEN** system displays a truncated preview with an explicit indication that output is truncated

### Requirement: Respond to interactive prompts from UI
The system SHALL allow the UI to respond to interactive agent prompts by selecting one of the provided options.

#### Scenario: Answer a prompt with options
- **WHEN** an agent prompt is presented with a set of selectable options
- **THEN** user can select an option and the system forwards the selected answer to the running process

#### Scenario: Prompt expires or is no longer active
- **WHEN** user attempts to answer a prompt that is no longer active
- **THEN** system displays an error and does not send the answer
