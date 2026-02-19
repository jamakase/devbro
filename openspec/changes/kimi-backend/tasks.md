## 1. ACP Backend Implementation

- [x] 1.1 Add ACP provider dependency to agent-runner package
- [x] 1.2 Implement ACP backend adapter with streaming text and tool-call normalization
- [x] 1.3 Add backend registry wiring and default ACP backend identifiers

## 2. Configuration and Provisioning

- [x] 2.1 Define ACP configuration inputs (command, args, env, session cwd) for runner requests
- [x] 2.2 Wire ACP backend selection through CLI provisioner and task execution path

## 3. Tests and Verification

- [x] 3.1 Add ACP backend unit coverage for stream normalization
- [x] 3.2 Add integration test for ACP backend selection in runner CLI
- [x] 3.3 Run lint, typecheck, and relevant test suites
