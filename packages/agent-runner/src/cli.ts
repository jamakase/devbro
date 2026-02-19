#!/usr/bin/env node
import { runAgent } from "./runner.js";
import type { AgentRunnerEvent } from "./types.js";

function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.resume();
  });
}

function parseArgs(argv: string[]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg?.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) continue;
    i++;
    const existing = out[key];
    if (existing === undefined) out[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else out[key] = [existing, value];
  }
  return out;
}

function parseEnv(envArgs: string | string[] | undefined): Record<string, string> {
  if (!envArgs) return {};
  const items = Array.isArray(envArgs) ? envArgs : [envArgs];
  const env: Record<string, string> = {};
  for (const item of items) {
    const idx = item.indexOf("=");
    if (idx <= 0) continue;
    env[item.slice(0, idx)] = item.slice(idx + 1);
  }
  return env;
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0] ?? "run";
  if (command !== "run") {
    process.stderr.write(`Unknown command: ${command}\n`);
    process.exit(2);
  }

  const args = parseArgs(argv.slice(1));
  const backend =
    (typeof args.backend === "string" ? args.backend : undefined) ??
    process.env.AGENT_RUNNER_BACKEND ??
    undefined;
  const workspacePath = typeof args.workspace === "string" ? args.workspace : "/workspace";
  const env = parseEnv(args.env);

  let prompt = typeof args.prompt === "string" ? args.prompt : undefined;
  if (!prompt) {
    const stdin = (await readStdin()).trim();
    prompt = stdin.length ? stdin : "";
  }

  const emit = (event: AgentRunnerEvent) => {
    process.stdout.write(JSON.stringify(event) + "\n");
  };

  const result = await runAgent(
    {
      backend,
      prompt,
      workspacePath,
      env,
    },
    emit
  );

  emit({ type: "status", status: result.success ? "completed" : "failed" });
  process.exit(result.exitCode);
}

main().catch((err) => {
  process.stderr.write((err instanceof Error ? err.message : String(err)) + "\n");
  process.exit(1);
});
