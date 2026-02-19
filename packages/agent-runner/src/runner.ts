import { AgentRunnerRequest, AgentRunnerEmit, AgentRunnerResult, AgentRunnerEvent, PromptOption } from "./types.js";
import { getBuiltinBackends, resolveBackend } from "./registry.js";

function normalizePromptOptions(options: PromptOption[] | string[] | undefined): PromptOption[] {
  if (!options) return [];
  if (typeof options[0] === "string") {
    return (options as string[]).map((option) => {
      const id = option.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      return { id, label: option, value: option };
    });
  }
  return options as PromptOption[];
}

function normalizeEvent(event: AgentRunnerEvent): AgentRunnerEvent {
  if (event.type === "prompt") {
    const normalized = normalizePromptOptions((event as { options?: PromptOption[] | string[] }).options);
    return { ...event, options: normalized };
  }
  return event;
}

export async function runAgent(request: AgentRunnerRequest, emit: AgentRunnerEmit): Promise<AgentRunnerResult> {
  const backends = getBuiltinBackends();
  const backend = resolveBackend(backends, request.backend);
  const normalizedEmit: AgentRunnerEmit = (event) => emit(normalizeEvent(event));
  return backend.run(request, normalizedEmit);
}
