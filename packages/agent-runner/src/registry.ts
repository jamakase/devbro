import { AgentRunnerBackend, AgentRunnerBackendId } from "./types.js";
import { createCliBackend } from "./backends/cli.js";
import { createSdkBackend } from "./backends/sdk.js";
import { createAcpBackend } from "./backends/acp.js";

export const DEFAULT_AGENT_RUNNER_BACKEND: AgentRunnerBackendId = "cli:claude-code";
export const DEFAULT_ACP_BACKENDS: AgentRunnerBackendId[] = ["acp:kimi"];

export function getBuiltinBackends(): AgentRunnerBackend[] {
  return [createCliBackend(), createSdkBackend(), createAcpBackend()];
}

export function resolveBackend(backends: AgentRunnerBackend[], backendId?: string): AgentRunnerBackend {
  const selected = backendId ?? DEFAULT_AGENT_RUNNER_BACKEND;
  const primaryId = selected.split(":")[0] ?? selected;
  for (const backend of backends) {
    if (backend.id === primaryId) return backend;
  }
  return backends[0] ?? createCliBackend();
}
