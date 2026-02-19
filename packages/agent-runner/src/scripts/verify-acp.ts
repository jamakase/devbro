import { spawn } from "node:child_process";
import { join } from "node:path";
import { runAgent } from "../runner.js";

async function main() {
  const events: Array<{ type: string; message?: string; name?: string }> = [];
  const result = await runAgent(
    {
      backend: "acp:mock-agent",
      prompt: "verify acp backend",
      workspacePath: process.cwd(),
      env: {
        AGENT_RUNNER_ACP_MOCK: "1",
      },
    },
    (event) => {
      events.push({
        type: event.type,
        message: "message" in event ? event.message : undefined,
        name: "name" in event ? event.name : undefined,
      });
    }
  );

  if (!result.success) {
    throw new Error(`ACP verification failed: exit ${result.exitCode}`);
  }

  const hasStdout = events.some((event) => event.type === "stdout");
  if (!hasStdout) {
    throw new Error("ACP verification failed: missing stdout events");
  }

  const hasToolCall = events.some((event) => event.type === "tool_call");
  if (!hasToolCall) {
    throw new Error("ACP verification failed: missing tool_call events");
  }

  const cliEvents = await runCli();
  const hasCliStdout = cliEvents.some((event) => event.type === "stdout");
  if (!hasCliStdout) {
    throw new Error("ACP CLI verification failed: missing stdout events");
  }
  const hasCliToolCall = cliEvents.some((event) => event.type === "tool_call");
  if (!hasCliToolCall) {
    throw new Error("ACP CLI verification failed: missing tool_call events");
  }
}

async function runCli(): Promise<Array<{ type: string; message?: string; name?: string }>> {
  const cliPath = join(process.cwd(), "dist", "cli.js");
  const args = [
    cliPath,
    "run",
    "--backend",
    "acp:mock-agent",
    "--workspace",
    process.cwd(),
    "--prompt",
    "verify acp cli",
    "--env",
    "AGENT_RUNNER_ACP_MOCK=1",
  ];
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(process.execPath, args, { env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `ACP CLI verification failed: exit ${code ?? 1}`));
        return;
      }
      resolve(stdout);
    });
  });

  const parsed: Array<{ type: string; message?: string; name?: string }> = [];
  const lines = output.split("\n").filter((line) => line.trim().length > 0);
  for (const line of lines) {
    try {
      const event = JSON.parse(line) as { type?: string; message?: string; name?: string };
      if (event.type) {
        parsed.push({ type: event.type, message: event.message, name: event.name });
      }
    } catch {}
  }
  return parsed;
}

main().catch((error) => {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
  process.exit(1);
});
