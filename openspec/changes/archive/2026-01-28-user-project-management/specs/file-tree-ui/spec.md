## ADDED Requirements

### Requirement: Display file tree
The system SHALL render an interactive file tree for task sandbox volume.

#### Scenario: Render root level
- **WHEN** user views task detail page
- **THEN** system displays root directory contents of sandbox volume

#### Scenario: Show file icons
- **WHEN** file tree renders
- **THEN** files show appropriate icons based on extension (folder, code file, config, etc.)

### Requirement: Expand directories
The system SHALL allow users to expand directories to see contents.

#### Scenario: Expand directory
- **WHEN** user clicks on collapsed directory
- **THEN** system fetches and displays directory contents

#### Scenario: Collapse directory
- **WHEN** user clicks on expanded directory
- **THEN** system collapses directory and hides contents

#### Scenario: Lazy loading
- **WHEN** directory is expanded for first time
- **THEN** system fetches contents from API (not pre-loaded)

### Requirement: View file contents
The system SHALL allow users to view file contents.

#### Scenario: Click file to view
- **WHEN** user clicks on a file
- **THEN** system displays file contents in a viewer panel

#### Scenario: Syntax highlighting
- **WHEN** file is code (js, ts, py, etc.)
- **THEN** system applies syntax highlighting

#### Scenario: Large file handling
- **WHEN** file exceeds 1MB
- **THEN** system shows warning and offers to load first 100KB

### Requirement: Show file metadata
The system SHALL display file metadata in the tree.

#### Scenario: File size
- **WHEN** file tree renders
- **THEN** each file shows size (e.g., "2.4 KB")

#### Scenario: Last modified
- **WHEN** file tree renders
- **THEN** each item shows relative last modified time (e.g., "2 min ago")

### Requirement: File tree API
The system SHALL use existing files endpoint for tree data.

#### Scenario: GET /api/tasks/[id]/files
- **WHEN** authenticated request to GET /api/tasks/[id]/files
- **THEN** system returns root directory listing from sandbox volume

#### Scenario: GET /api/tasks/[id]/files with path
- **WHEN** request includes path query parameter
- **THEN** system returns contents of that directory

#### Scenario: GET /api/tasks/[id]/files/content
- **WHEN** request to /api/tasks/[id]/files/content with path
- **THEN** system returns file contents as text

### Requirement: File tree location
The system SHALL display file tree in task detail view.

#### Scenario: Split view layout
- **WHEN** user views task detail
- **THEN** page shows file tree on left and conversation on right

#### Scenario: Resizable panels
- **WHEN** user drags divider between panels
- **THEN** panels resize accordingly
