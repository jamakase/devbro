## 1. OAuth provider and auth UI

- [x] 1.1 Configure GitHub OAuth provider and scopes in auth setup
- [x] 1.2 Add "Continue with GitHub" to login and register pages
- [x] 1.3 Handle OAuth callback linking to existing accounts by email
- [x] 1.4 Show GitHub connection status in account settings

## 2. GitHub connection APIs

- [x] 2.1 Implement GET /api/github/status with connected state and username
- [x] 2.2 Implement POST /api/github/disconnect to remove GitHub account record
- [x] 2.3 Disable GitHub features when OAuth env vars are missing
- [x] 2.4 Handle revoked tokens by marking connection invalid on 401

## 3. Repo listing and search

- [x] 3.1 Implement GET /api/github/repos using stored OAuth token
- [x] 3.2 Support pagination via page and per_page parameters
- [x] 3.3 Add search filtering by repo name when search param is provided
- [x] 3.4 Return required repo metadata fields in responses

## 4. Repo picker UI

- [x] 4.1 Build repo picker component with connected vs disconnected states
- [x] 4.2 Display searchable list with private repo indicator
- [x] 4.3 Add custom URL mode with git URL validation
- [x] 4.4 Add branch selector with default branch preselected

## 5. Repo validation and clone integration

- [x] 5.1 Validate repo accessibility before cloning for GitHub source
- [x] 5.2 Validate custom URL access and block private repos without connection
- [x] 5.3 Fetch and display repo metadata before clone
- [x] 5.4 Support cloning specific branch and show helpful errors on failure
