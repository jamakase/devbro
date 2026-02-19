import { spawn } from "node:child_process";
import { AgentRunnerBackend, AgentRunnerRequest, AgentRunnerEmit, AgentRunnerResult } from "../types.js";

function runShell(
  request: AgentRunnerRequest,
  emit: AgentRunnerEmit,
  command: string
): Promise<AgentRunnerResult> {
  return new Promise((resolve) => {
    const child = spawn("bash", ["-lc", command], {
      cwd: request.workspacePath,
      env: { ...process.env, ...(request.env ?? {}) },
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout?.on("data", (chunk) => emit({ type: "stdout", message: String(chunk) }));
    child.stderr?.on("data", (chunk) => emit({ type: "stderr", message: String(chunk) }));

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      resolve({ success: exitCode === 0, exitCode });
    });

    child.on("error", () => {
      resolve({ success: false, exitCode: 1 });
    });
  });
}

export function createCliBackend(): AgentRunnerBackend {
  return {
    id: "cli",
    async run(request, emit) {
      const backend = request.backend ?? "cli:claude-code";
      emit({ type: "status", status: "starting" });

      if (backend === "cli:claude-code") {
        emit({ type: "status", status: "running", message: "Running Claude Code CLI" });
        const escaped = request.prompt.replace(/"/g, '\\"');
        return runShell(
          request,
          emit,
          `command -v claude >/dev/null 2>&1 && claude "${escaped}" || npx -y @anthropic-ai/claude-code@latest "${escaped}"`
        );
      }

      if (backend === "cli:opencode") {
        emit({ type: "status", status: "running", message: "Running OpenCode CLI" });
        const escaped = request.prompt.replace(/"/g, '\\"');
        return runShell(
          request,
          emit,
          `command -v opencode >/dev/null 2>&1 && opencode run -- "${escaped}" || npx -y opencode-ai@latest run -- "${escaped}"`
        );
      }

      if (backend === "cli:echo") {
        emit({ type: "stdout", message: request.prompt + "\n" });
        return { success: true, exitCode: 0 };
      }

      emit({ type: "stderr", message: `Unknown CLI backend: ${backend}\n` });
      return { success: false, exitCode: 2 };
    },
  };
}
