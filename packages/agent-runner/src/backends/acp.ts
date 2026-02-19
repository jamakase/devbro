import { createACPProvider } from "@mcpc-tech/acp-ai-provider";
import { streamText } from "ai";
import type { EnvVariable, HttpHeader, McpServer } from "@agentclientprotocol/sdk";
import type { AgentRunnerBackend, AgentRunnerRequest, AgentRunnerEmit, AgentRunnerResult } from "../types.js";

function resolveEnv(request: AgentRunnerRequest): Record<string, string> {
  return { ...process.env, ...(request.env ?? {}) } as Record<string, string>;
}

function parseJsonArray<T>(raw: string | undefined): T[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as T[];
  } catch {
    return null;
  }
}

function parseArgs(raw: string | undefined): string[] | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = parseJsonArray<unknown>(trimmed);
  if (parsed) {
    const args = parsed.filter((item) => typeof item === "string") as string[];
    return args.length ? args : null;
  }
  const parts = trimmed.split(/\s+/).filter((item) => item.length > 0);
  return parts.length ? parts : null;
}

function normalizeHeaders(raw: unknown): HttpHeader[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        if (typeof record.name !== "string" || typeof record.value !== "string") return null;
        return { name: record.name, value: record.value };
      })
      .filter((item): item is HttpHeader => Boolean(item));
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string")
      .map(([name, value]) => ({ name, value }));
  }
  return [];
}

function normalizeEnvVariables(raw: unknown): EnvVariable[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        if (typeof record.name !== "string" || typeof record.value !== "string") return null;
        return { name: record.name, value: record.value };
      })
      .filter((item): item is EnvVariable => Boolean(item));
  }
  if (typeof raw === "object") {
    return Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string")
      .map(([name, value]) => ({ name, value }));
  }
  return [];
}

function normalizeMcpServers(raw: unknown): McpServer[] {
  if (!Array.isArray(raw)) return [];
  const servers: McpServer[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === "string" ? record.name : "";
    if (!name) continue;
    const type = typeof record.type === "string" ? record.type : undefined;
    if (type === "http" || type === "sse") {
      const url = typeof record.url === "string" ? record.url : "";
      if (!url) continue;
      servers.push({
        type,
        name,
        url,
        headers: normalizeHeaders(record.headers),
      });
      continue;
    }
    const command = typeof record.command === "string" ? record.command : "";
    if (!command) continue;
    const args = Array.isArray(record.args)
      ? record.args.filter((entry): entry is string => typeof entry === "string")
      : [];
    servers.push({
      name,
      command,
      args,
      env: normalizeEnvVariables(record.env),
    });
  }
  return servers;
}

function resolveCommand(request: AgentRunnerRequest, env: Record<string, string>): string | null {
  const override = env.AGENT_RUNNER_ACP_COMMAND?.trim();
  if (override) return override;
  const backend = request.backend ?? "acp";
  if (backend.startsWith("acp:")) {
    const suffix = backend.slice(4).trim();
    return suffix.length ? suffix : null;
  }
  if (backend === "acp") return null;
  return backend.trim().length ? backend.trim() : null;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
  if (!value || typeof value !== "object") return false;
  return typeof (value as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === "function";
}

function emitToolCall(raw: unknown, emit: AgentRunnerEmit) {
  if (!raw || typeof raw !== "object") return;
  const call = raw as Record<string, unknown>;
  const name =
    typeof call.toolName === "string"
      ? call.toolName
      : typeof call.name === "string"
        ? call.name
        : "tool";
  const input = call.args ?? call.input ?? {};
  emit({ type: "tool_call", name, input });
}

async function emitMockResponse(request: AgentRunnerRequest, emit: AgentRunnerEmit, command: string) {
  emit({ type: "status", status: "starting" });
  emit({ type: "status", status: "running", message: `Streaming ACP response (${command})` });
  emit({ type: "tool_call", name: "acp.mockTool", input: { prompt: request.prompt } });
  const response = `ACP mock response: ${request.prompt}`;
  const parts = response.split(" ");
  for (let i = 0; i < parts.length; i++) {
    const chunk = parts[i] + (i === parts.length - 1 ? "\n" : " ");
    emit({ type: "stdout", message: chunk });
  }
}

export function createAcpBackend(): AgentRunnerBackend {
  return {
    id: "acp",
    async run(request, emit): Promise<AgentRunnerResult> {
      const env = resolveEnv(request);
      const command = resolveCommand(request, env);
      if (!command) {
        emit({ type: "stderr", message: "ACP backend requires a command\n" });
        return { success: false, exitCode: 2 };
      }

      if (env.AGENT_RUNNER_ACP_MOCK === "1") {
        await emitMockResponse(request, emit, command);
        return { success: true, exitCode: 0 };
      }

      const args = parseArgs(env.AGENT_RUNNER_ACP_ARGS) ?? [];
      const mcpServers = normalizeMcpServers(parseJsonArray<unknown>(env.AGENT_RUNNER_ACP_MCP_SERVERS) ?? []);
      const authMethodId = env.AGENT_RUNNER_ACP_AUTH_METHOD?.trim();

      emit({ type: "status", status: "starting" });
      emit({ type: "status", status: "running", message: `Streaming ACP response (${command})` });

      try {
        const provider = createACPProvider({
          command,
          args,
          env,
          authMethodId,
          session: {
            cwd: request.workspacePath,
            mcpServers,
          },
        });

        const result = await streamText({
          model: provider.languageModel(),
          prompt: request.prompt,
          tools: provider.tools,
        });

        const consumeText = async () => {
          if (isAsyncIterable(result.textStream)) {
            for await (const chunk of result.textStream) {
              emit({ type: "stdout", message: String(chunk) });
            }
          } else if (typeof result.text === "string") {
            emit({ type: "stdout", message: result.text });
          }
        };

        const consumeTools = async () => {
          const toolCalls = (result as { toolCalls?: unknown }).toolCalls;
          if (isAsyncIterable(toolCalls)) {
            for await (const toolCall of toolCalls) {
              emitToolCall(toolCall, emit);
            }
            return;
          }
          if (Array.isArray(toolCalls)) {
            for (const toolCall of toolCalls) {
              emitToolCall(toolCall, emit);
            }
          }
        };

        await Promise.all([consumeText(), consumeTools()]);
        return { success: true, exitCode: 0 };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        emit({ type: "stderr", message: message + "\n" });
        return { success: false, exitCode: 1 };
      }
    },
  };
}
