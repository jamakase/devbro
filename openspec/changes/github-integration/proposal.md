## Why

The current GitHub integration requires users to manually provide personal access tokens (PATs), which is a poor UX and security practice. Users expect a "Connect to GitHub" flow like Vercel/Netlify where they authorize once and can then select from their repositories. This also enables better permission scoping and token management.

## What Changes

- **BREAKING**: Remove PAT-based authentication flow in favor of GitHub OAuth
- Add GitHub OAuth provider to existing Better-auth setup
- Store GitHub connection (OAuth tokens) per user account
- New UI for connecting GitHub account and browsing/selecting repos
- Repo selector shows user's accessible repos after GitHub connection
- Custom git URL option remains as alternative for non-connected repos
- Clone operations use OAuth token for connected repos, or public access for custom URLs

## Capabilities

### New Capabilities
- `github-oauth`: GitHub OAuth connection flow - connecting account, storing tokens, refreshing tokens, disconnecting
- `github-repo-picker`: UI and API for listing user's GitHub repos and selecting one for a task/project

### Modified Capabilities
- `github-integration`: **BREAKING** - Remove PAT-based auth, use OAuth tokens from connected account instead. Custom URL flow remains but only for public repos or already-connected account repos.
- `user-auth`: Add GitHub as OAuth provider option (social login), link GitHub account to existing user

## Impact

- **Database**: New tables for GitHub connections (oauth tokens per user), possibly GitHub app installations
- **Auth**: Better-auth GitHub provider configuration, OAuth callback handling
- **API**: New endpoints for GitHub connection status, repo listing, OAuth callback
- **UI**: Connect GitHub button in settings/onboarding, repo picker component, connection status display
- **Server**: GitHub API client for fetching user repos, handling token refresh
- **Environment**: GitHub OAuth App credentials (client ID, secret) required
