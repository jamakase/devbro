## Why

The current UI can render before authentication is established, causing confusing UX and exposing actions before the user is authorized. We also need a more complete GitHub workflow (create PR, view line changes, handle interactive prompts) and clearer navigation for upcoming features like specs, knowledge bases, skills, and MCPs.

## What Changes

- Gate all authenticated UI so nothing “app-like” renders until the session is resolved and the user is logged in.
- Improve frontend layout and interaction design to follow common dashboard best practices (navigation clarity, consistent spacing/typography, empty/loading states, error handling).
- Add a “Create PR” action in the UI for the current repo context, including displaying line-change summary/details.
- Support interactive agent prompts from the UI: when the CLI/agent asks a question with selectable options, the UI can send the chosen answer back to the running process.
- Expand sidebar navigation with a new group covering: Specs (OpenSpec initially), Knowledge Bases (code indexing), Skills, and MCPs.
- On new sandbox/container start, optionally bootstrap agent assets: pull specs, set up knowledge-base tooling/index, copy selected agent skills, and generate an agent-specific mcp.json.

## Capabilities

### New Capabilities

- `pr-creation`: Create PRs from the UI, show line changes, and handle interactive prompt answers for PR-related flows.
- `knowledge-bases`: Manage knowledge-base indexing for code (configure, build, update, and show status).
- `skills-and-mcps`: Manage agent skills and MCP configuration (select/copy skills, generate and validate mcp.json per agent).
- `agent-bootstrap`: Bootstrap specs/knowledge/skills/MCPs when creating a new sandbox/container.

### Modified Capabilities

- `sandbox-ui`: Auth gating without pre-login UI, improved design system/layout, and new sidebar groups and pages.
- `user-auth`: Clarify session-resolution behavior for protected routes to avoid rendering protected UI before auth is known.
- `github-integration`: Extend beyond clone/metadata to support PR creation and diff/line-change data retrieval.

## Impact

- Frontend: routing/guards, navigation structure, PR creation UI, diff rendering, prompt/response UI, and improved UX patterns.
- Backend/API: endpoints/events to create PRs, compute/return change summaries, and relay interactive prompts/responses between UI and running agent/CLI process.
- CLI/agent runtime: mechanism for UI-to-process responses for interactive prompts (stdin or an equivalent control channel).
- Container/sandbox bootstrap: pulling specs, provisioning KB tooling/index, copying skills, generating MCP config during container start.
- Security: ensure no GitHub credentials or prompt content leaks across users; enforce auth checks for all new actions.
