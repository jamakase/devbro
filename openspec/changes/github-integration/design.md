## Context

The system currently uses Better-auth for authentication with email/password. The existing `accounts` table already supports OAuth providers with access tokens, refresh tokens, and scopes. Tasks are created within projects but have no direct repository association - repos are cloned at task creation time using a URL.

The current GitHub integration spec assumes PAT-based auth, but users expect a "Connect to GitHub" experience like Vercel/Netlify.

## Goals / Non-Goals

**Goals:**
- Users can connect their GitHub account via OAuth and select from their repos
- Connected GitHub tokens are managed automatically (stored, refreshed)
- Users can still specify custom git URLs for public repos
- Clone operations use the appropriate credentials based on repo source

**Non-Goals:**
- GitHub App installations (org-level permissions) - OAuth is sufficient for personal repo access
- Fine-grained repository permissions (we use user-level OAuth, not per-repo tokens)
- GitHub webhooks for push events or CI/CD triggers
- Support for GitLab, Bitbucket, or other git providers (future scope)

## Decisions

### 1. GitHub OAuth App (not GitHub App)

**Decision**: Use GitHub OAuth App for user authentication.

**Rationale**:
- OAuth Apps are designed for "act as the user" scenarios - exactly what we need
- GitHub Apps are for installations on orgs/repos with granular permissions - overkill
- Better-auth has built-in support for GitHub OAuth
- User authorizes once, we can access all repos they have access to

**Alternatives considered**:
- GitHub App: More complex, requires installation flow, better for org-wide access. Not needed for personal repo access.
- PAT: Poor UX, security concerns, no automatic refresh.

### 2. Leverage Better-auth's accounts table

**Decision**: Use the existing `accounts` table for GitHub OAuth tokens.

**Rationale**:
- Better-auth already stores `accessToken`, `refreshToken`, `scope` per provider
- No new tables needed for token storage
- When user connects GitHub, it creates/updates an account record with `providerId: "github"`
- Querying GitHub connection = checking for account with providerId github

**Schema usage**:
```
accounts.providerId = "github"
accounts.accountId = GitHub user ID
accounts.accessToken = OAuth access token
accounts.refreshToken = OAuth refresh token (if available)
accounts.scope = "repo,read:user" (requested scopes)
```

### 3. Dual repo source model

**Decision**: Support two repo source types: "github" (connected) and "custom" (URL).

**Rationale**:
- Connected repos use stored OAuth token for clone (including private repos)
- Custom URLs work for public repos without authentication
- Clear UI separation: "Select from GitHub" vs "Enter custom URL"

**Data model**: Add `repoSource` field to tasks config:
```typescript
config: {
  repoSource: "github" | "custom",
  // For github source:
  githubRepoId?: number,
  githubRepoFullName?: string, // "owner/repo"
  // For both:
  repoUrl: string,
  branch?: string,
}
```

### 4. API structure for GitHub operations

**Decision**: New API routes under `/api/github/`.

**Endpoints**:
- `GET /api/github/status` - Check if user has connected GitHub
- `GET /api/github/repos` - List user's accessible repos (requires connection)
- `POST /api/github/disconnect` - Remove GitHub connection

**Rationale**:
- Separate namespace keeps GitHub-specific logic isolated
- Auth routes (`/api/auth/*`) handle OAuth flow via Better-auth
- These routes handle post-connection operations

### 5. OAuth scopes

**Decision**: Request `repo` and `read:user` scopes.

**Rationale**:
- `repo`: Full access to private and public repos (needed for cloning private repos)
- `read:user`: Read user profile info (for display)
- Could use `public_repo` for less permissions, but then can't clone private repos

**Trade-off**: Broad access vs functionality. Users expect to access their private repos.

### 6. Token refresh handling

**Decision**: Rely on Better-auth's automatic token refresh when available.

**Rationale**:
- GitHub OAuth tokens don't expire by default (unless user revokes)
- Better-auth handles refresh tokens if they exist
- If token becomes invalid, user re-connects (clear error message)

**Fallback**: If API call fails with 401, prompt user to reconnect GitHub.

## Risks / Trade-offs

**[Risk] Token revocation** → User revokes token on GitHub, our stored token becomes invalid.
*Mitigation*: Catch 401 errors on GitHub API calls, show "Reconnect GitHub" prompt.

**[Risk] Scope creep** → `repo` scope grants write access, not just read.
*Mitigation*: We only use it for read operations (clone, list). Document this clearly.

**[Risk] Rate limiting** → GitHub API has rate limits (5000 req/hour for authenticated).
*Mitigation*: Cache repo lists briefly, don't poll. 5000/hour is generous for our use case.

**[Trade-off] No org installation support** → Users can't grant access to org repos they don't personally own.
*Accept*: OAuth still works for repos they have access to. GitHub App can be added later if needed.

**[Trade-off] All-or-nothing repo access** → Can't select specific repos to share.
*Accept*: Standard OAuth pattern. Users control access by what repos they have on GitHub.
