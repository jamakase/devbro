## 1. Auth Gating

- [x] 1.1 Add top-level auth boundary for protected app layout
- [x] 1.2 Ensure protected UI never renders while session is unknown
- [x] 1.3 Add loading screen for session resolution state
- [x] 1.4 Verify redirects for unauthenticated access to protected routes

## 2. Sidebar Navigation Groups

- [x] 2.1 Add sidebar group model supporting grouped navigation sections
- [x] 2.2 Add routes and pages for Specs, Knowledge Bases, Skills, and MCPs
- [x] 2.3 Implement consistent empty/loading/error states for new pages

## 3. Frontend Design Improvements

- [x] 3.1 Normalize typography, spacing, and layout across dashboard pages
- [x] 3.2 Improve navigation clarity and active state styling
- [x] 3.3 Add consistent toasts/errors and retry affordances for failures
- [x] 3.4 Validate responsiveness for sidebar and new pages

## 4. PR Creation UI

- [x] 4.1 Add "Create PR" UI entry point in relevant repo/sandbox context
- [x] 4.2 Add PR form fields and client-side validation for title/description
- [x] 4.3 Implement success UX showing PR number and URL
- [x] 4.4 Implement error UX that preserves user input on failure

## 5. Line Change Display

- [x] 5.1 Implement backend operation to compute change summary vs base branch
- [x] 5.2 Add UI change summary view with files changed and add/delete totals
- [x] 5.3 Add per-file unified diff view with truncation indication
- [x] 5.4 Add performance safeguards for large diffs (paging/truncation/limits)

## 6. Interactive Prompt Bridging

- [x] 6.1 Define prompt event model for questions with selectable options
- [x] 6.2 Add server channel to stream prompts to UI (WebSocket or SSE)
- [x] 6.3 Add server endpoint/channel to accept selected prompt answers
- [x] 6.4 Wire UI prompt selection to send response and update prompt state
- [x] 6.5 Handle prompt expiration and show user-visible error on late answers

## 7. Knowledge Bases

- [x] 7.1 Add knowledge base configuration storage per sandbox
- [x] 7.2 Implement index build/refresh operation with progress and status
- [x] 7.3 Add UI page for KB enable/disable, build index, and status display

## 8. Skills and MCPs

- [x] 8.1 Implement skills listing and enabled/disabled state per agent profile
- [x] 8.2 Add UI for selecting skills for an agent profile
- [x] 8.3 Implement MCP configuration view/edit with validation

## 9. Sandbox Bootstrap

- [x] 9.1 Extend sandbox create/start flow to accept an agent profile bootstrap plan
- [x] 9.2 Implement optional specs pull step during bootstrap
- [x] 9.3 Implement optional KB tooling setup and async indexing kickoff
- [x] 9.4 Implement optional skill copying into sandbox
- [x] 9.5 Implement optional mcp.json generation and validation in sandbox

## 10. Verification

- [x] 10.1 Add tests for auth gating and protected route behavior
- [x] 10.2 Add tests for PR creation API and diff/summary outputs
- [x] 10.3 Add tests for prompt event delivery and response routing
- [x] 10.4 Run lint, typecheck, and test suite for all touched packages
