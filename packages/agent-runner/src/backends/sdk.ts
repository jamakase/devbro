import { randomUUID } from "crypto";
import type { AgentRunnerBackend, AgentRunnerRequest, AgentRunnerEmit, AgentRunnerResult, PromptOption } from "../types.js";

type SdkStreamEvent =
  | { type: "text-delta"; textDelta: string }
  | { type: "tool-call"; name: string; args: Record<string, unknown> }
  | { type: "finish" }
  | { type: "error"; message: string };

interface SdkProvider {
  id: string;
  generateText(request: { prompt: string; env: Record<string, string> }): AsyncIterable<SdkStreamEvent>;
}

function parseOptions(raw: string | undefined): PromptOption[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const options: PromptOption[] = [];
    for (const item of parsed) {
      if (typeof item === "string") {
        const id = item.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        options.push({ id, label: item, value: item });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const obj = item as Record<string, unknown>;
      if (typeof obj.id !== "string") continue;
      if (typeof obj.label !== "string") continue;
      if (typeof obj.value !== "string") continue;
      options.push({ id: obj.id, label: obj.label, value: obj.value });
    }
    return options.length ? options : null;
  } catch {
    return null;
  }
}

function buildPromptOptions(env: Record<string, string>): PromptOption[] {
  const parsed = parseOptions(env.AGENT_RUNNER_PROMPT_OPTIONS);
  if (parsed) return parsed;
  return [
    { id: "approve", label: "Approve", value: "approve" },
    { id: "revise", label: "Revise", value: "revise" },
  ];
}

function resolveEnv(request: AgentRunnerRequest): Record<string, string> {
  return { ...process.env, ...(request.env ?? {}) } as Record<string, string>;
}

function emitPromptIfRequested(request: AgentRunnerRequest, emit: AgentRunnerEmit) {
  const env = resolveEnv(request);
  if (env.AGENT_RUNNER_PROMPT !== "1") return;
  const promptId = env.AGENT_RUNNER_PROMPT_ID ?? randomUUID();
  const question = env.AGENT_RUNNER_PROMPT_QUESTION ?? "Select an option";
  const options = buildPromptOptions(env);
  const expiresMs = Number.parseInt(env.AGENT_RUNNER_PROMPT_EXPIRES_MS ?? "", 10);
  const expiresAt = Number.isFinite(expiresMs) ? new Date(Date.now() + expiresMs).toISOString() : undefined;
  emit({ type: "prompt", promptId, question, options, expiresAt });
}

async function* mockGenerateText(prompt: string, env: Record<string, string>): AsyncIterable<SdkStreamEvent> {
  const provider = env.AGENT_RUNNER_SDK_PROVIDER ?? "mock";
  yield { type: "tool-call", name: "sdk.generateText", args: { prompt, provider } };
  const response = `SDK response: ${prompt}`;
  const parts = response.split(" ");
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] + (i === parts.length - 1 ? "\n" : " ");
    yield { type: "text-delta", textDelta: chunk };
  }
  yield { type: "finish" };
}

function getSdkProviders(): SdkProvider[] {
  return [
    {
      id: "mock",
      generateText: async function* (request) {
        yield* mockGenerateText(request.prompt, request.env);
      },
    },
  ];
}

function resolveSdkProvider(request: AgentRunnerRequest): SdkProvider {
  const selected = request.backend ?? "sdk:mock";
  const providerId = selected.startsWith("sdk:") ? selected.slice(4) : selected;
  const providers = getSdkProviders();
  const fallback = providers[0] ?? {
    id: "mock",
    generateText: async function* (request) {
      yield* mockGenerateText(request.prompt, request.env);
    },
  };
  return providers.find((provider) => provider.id === providerId) ?? fallback;
}

export function createSdkBackend(): AgentRunnerBackend {
  return {
    id: "sdk",
    async run(request, emit) {
      const env = resolveEnv(request);
      const provider = resolveSdkProvider(request);
      emit({ type: "status", status: "starting" });
      emit({ type: "status", status: "running", message: `Streaming SDK response (${provider.id})` });
      emitPromptIfRequested(request, emit);

      for await (const event of provider.generateText({ prompt: request.prompt, env })) {
        if (event.type === "text-delta") {
          emit({ type: "stdout", message: event.textDelta });
          continue;
        }
        if (event.type === "tool-call") {
          emit({ type: "tool_call", name: event.name, input: event.args });
          continue;
        }
        if (event.type === "error") {
          emit({ type: "stderr", message: event.message + "\n" });
          return { success: false, exitCode: 1 };
        }
      }

      return { success: true, exitCode: 0 };
    },
  };
}
