## Context

The product consists of a local CLI/agent runtime that can run inside a sandbox/container, plus a web UI for managing sandboxes and related workflows. Authentication exists but the UI can render “app” surfaces before session state is known or before the user is logged in, which creates a confusing experience and risks exposing actions prior to authorization checks.

The change also expands GitHub workflow support: from repo setup toward PR creation and change visualization, plus the ability to handle interactive agent prompts via the UI (select an answer and propagate it back to the running CLI/agent process).

Navigation is expected to grow beyond current pages, adding first-class entry points for specs (OpenSpec), knowledge bases (code indexing), skills, and MCPs. When creating a new sandbox/container, we want the ability to bootstrap assets (specs, KB setup/index, skills, MCP config) based on selected agent configuration.

Constraints:
- UI should not depend on long-lived in-browser secrets; auth tokens must remain server-managed.
- Sandbox/agent processes may outlive UI page refreshes; UI needs a stable control channel.
- GitHub operations must be scoped to the authenticated user and selected repo/sandbox context.

## Goals / Non-Goals

**Goals:**
- Ensure no authenticated UI surfaces render until session is resolved and the user is authenticated.
- Provide a clean, consistent UI structure: predictable navigation, loading/empty/error states, and scalable sidebar grouping.
- Enable PR creation from the UI and show line-change information in a human-friendly format.
- Support interactive agent questions from the UI with selectable answers routed back to the running process.
- Support “bootstrap on sandbox start” to pull specs, initialize knowledge-base tooling/index, copy skills, and generate mcp.json for the selected agent.

**Non-Goals:**
- Implementing a full code review experience (inline commenting, multi-commit history browsing, etc.).
- Defining a single universal knowledge-base technology; the first iteration can support a minimal indexer backend and evolve.
- Replacing OpenSpec format support for specs; initial implementation supports OpenSpec only.

## Decisions

- **Auth gating strategy:** Introduce a single top-level “auth boundary” that blocks rendering of all protected application layout until session state is known.
  - Rationale: Prevents flicker and accidental rendering of protected UI while keeping the rest of the app architecture unchanged.
  - Alternatives:
    - Route-level guards only: still risks layout rendering and inconsistent gating across pages.
    - Server-only redirects: can work, but does not address client-side session refresh/loading states.

- **Navigation architecture:** Add a sidebar group model (group label + items) and route definitions that can expand without ad-hoc conditionals.
  - Rationale: Keeps navigation scalable while enabling new groups (Specs, Knowledge Bases, Skills, MCPs).
  - Alternatives:
    - Hard-coded sidebar JSX for each section: becomes brittle as features expand.

- **PR creation flow:** Provide a UI action that triggers a backend operation within the sandbox/repo context and returns PR metadata plus a change summary.
  - Rationale: Keeps GitHub credentials handling server-side, and allows reuse by CLI and UI.
  - Alternatives:
    - Direct GitHub calls from UI: increases risk and complexity around tokens and CORS.

- **Line-change visualization:** Use a two-level UI: summary (files changed, additions/deletions) and per-file diff view (unified diff).
  - Rationale: Meets immediate needs (see what changed) without a full-blown review system.
  - Alternatives:
    - Only totals: insufficient for user trust/verification.
    - Full side-by-side diff with code navigation: higher complexity; defer.

- **Interactive prompt transport:** Add a structured “prompt event” stream from the running CLI/agent process to the UI, and a “response” endpoint/channel to send the selected answer back.
  - Rationale: stdin is not reliably addressable from a browser; a mediated control plane (server) supports reconnects and multiple clients.
  - Alternatives:
    - Pipe directly to stdin from UI: not feasible without a backend relay and stable process handle.
    - Polling for prompts: workable but worse UX; prefer streaming (WebSocket/SSE) where already used.

- **Bootstrap on sandbox start:** Extend sandbox creation/start pipeline to accept an “agent profile” that includes:
  - which specs repo/source to pull,
  - KB configuration and index build trigger,
  - a list of skills to copy into the sandbox,
  - MCP configuration to write as mcp.json.
  - Rationale: Makes sandboxes deterministic and aligned with selected agent capabilities.
  - Alternatives:
    - Manual post-create steps: error-prone and slow for users.

## Risks / Trade-offs

- Auth boundary introduces a global loading state → Use a minimal skeleton/loading screen and fast session check; cache session state where safe.
- PR/diff operations can be slow on large repos → Provide progress UI and timeouts; compute diffs inside sandbox with streaming updates.
- Interactive prompt bridging requires consistent process identity → Use per-sandbox process/session IDs and server-side routing; handle reconnects.
- Bootstrapping multiple assets increases sandbox startup time → Make steps optional/configurable; run KB indexing asynchronously after container becomes usable.
