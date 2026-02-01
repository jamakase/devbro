## 1. OAuth provider and auth UI

- [ ] 1.1 Configure GitHub OAuth provider and scopes in auth setup
- [ ] 1.2 Add "Continue with GitHub" to login and register pages
- [ ] 1.3 Handle OAuth callback linking to existing accounts by email
- [ ] 1.4 Show GitHub connection status in account settings

## 2. GitHub connection APIs

- [ ] 2.1 Implement GET /api/github/status with connected state and username
- [ ] 2.2 Implement POST /api/github/disconnect to remove GitHub account record
- [ ] 2.3 Disable GitHub features when OAuth env vars are missing
- [ ] 2.4 Handle revoked tokens by marking connection invalid on 401

## 3. Repo listing and search

- [ ] 3.1 Implement GET /api/github/repos using stored OAuth token
- [ ] 3.2 Support pagination via page and per_page parameters
- [ ] 3.3 Add search filtering by repo name when search param is provided
- [ ] 3.4 Return required repo metadata fields in responses

## 4. Repo picker UI

- [ ] 4.1 Build repo picker component with connected vs disconnected states
- [ ] 4.2 Display searchable list with private repo indicator
- [ ] 4.3 Add custom URL mode with git URL validation
- [ ] 4.4 Add branch selector with default branch preselected

## 5. Repo validation and clone integration

- [ ] 5.1 Validate repo accessibility before cloning for GitHub source
- [ ] 5.2 Validate custom URL access and block private repos without connection
- [ ] 5.3 Fetch and display repo metadata before clone
- [ ] 5.4 Support cloning specific branch and show helpful errors on failure
