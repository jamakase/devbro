## 1. Runner Package

- [x] 1.1 Create new workspace package for agent runner
- [x] 1.2 Define runner request/result types and event model
- [x] 1.3 Implement runner CLI entrypoint for executing a task

## 2. Backend Adapters

- [x] 2.1 Implement CLI adapter interface and a minimal local CLI backend
- [x] 2.2 Implement SDK adapter interface aligned with AI-SDK-style streaming
- [x] 2.3 Add adapter selection and default backend configuration

## 3. Provisioning Integration

- [x] 3.1 Update core provisioner to install runner in sandbox container
- [x] 3.2 Replace direct CLI installs with runner invocation for task execution
- [x] 3.3 Wire credentials and workspace context into runner invocation

## 4. Prompt and Event Plumbing

- [x] 4.1 Normalize tool-call and prompt events in runner output stream
- [x] 4.2 Connect runner prompt events to existing prompt stream endpoints
- [x] 4.3 Add conformance tests for prompt lifecycle and expiration handling

## 5. Migration and Cleanup

- [x] 5.1 Keep legacy CLI provisioning behind a fallback flag during transition
- [x] 5.2 Remove Dockerfile.cli build path and any references
- [x] 5.3 Update documentation for runner-based agent installation
