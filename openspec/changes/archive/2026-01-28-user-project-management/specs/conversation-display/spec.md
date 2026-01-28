## ADDED Requirements

### Requirement: Store conversation messages
The system SHALL persist AI agent messages for each task.

#### Scenario: Save user message
- **WHEN** user sends prompt to AI agent in task
- **THEN** system stores message with role "user", content, and timestamp

#### Scenario: Save assistant message
- **WHEN** AI agent responds
- **THEN** system stores message with role "assistant", content, toolCalls (if any), and timestamp

#### Scenario: Store tool calls
- **WHEN** AI agent uses tools (file edit, bash, etc.)
- **THEN** system stores tool call details in message's toolCalls JSON field

### Requirement: Retrieve conversation history
The system SHALL return all messages for a task.

#### Scenario: Get task messages
- **WHEN** user requests task details
- **THEN** system returns messages ordered by timestamp ascending

#### Scenario: Empty conversation
- **WHEN** task has no messages yet
- **THEN** system returns empty messages array

### Requirement: Display conversation UI
The system SHALL render conversation in task detail view.

#### Scenario: Render message list
- **WHEN** user views task detail page
- **THEN** system displays messages in chat-like format with role indicators

#### Scenario: Render user message
- **WHEN** message has role "user"
- **THEN** system displays message aligned right with user styling

#### Scenario: Render assistant message
- **WHEN** message has role "assistant"
- **THEN** system displays message aligned left with assistant styling

#### Scenario: Render tool calls
- **WHEN** assistant message has toolCalls
- **THEN** system displays collapsible tool call details (tool name, input, output)

### Requirement: Message pagination
The system SHALL support pagination for long conversations.

#### Scenario: Initial load
- **WHEN** task detail page loads
- **THEN** system loads most recent 50 messages

#### Scenario: Load more
- **WHEN** user scrolls to top of conversation
- **THEN** system loads next 50 older messages

### Requirement: Message API endpoint
The system SHALL expose endpoint for task messages.

#### Scenario: GET /api/tasks/[id]/messages
- **WHEN** authenticated request to GET /api/tasks/[id]/messages
- **THEN** system returns paginated messages for that task

#### Scenario: Query parameters
- **WHEN** request includes limit and before parameters
- **THEN** system returns up to limit messages before the given message ID
