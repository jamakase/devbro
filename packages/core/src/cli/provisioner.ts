import type { CLITool, ToolCall } from "@agent-sandbox/shared";
import { CLI_TOOLS, WORKSPACE_MOUNT_PATH } from "@agent-sandbox/shared";
import type { ContainerProvider } from "../types/provider.js";
import { randomUUID } from "crypto";

export interface InstallResult {
  success: boolean;
  version?: string;
  message: string;
  usedFallback: boolean;
}

export interface TaskExecutionResult {
  success: boolean;
  exitCode: number;
  output: string;
  toolCalls?: ToolCall[];
}

const AGENT_RUNNER_PACKAGE = "@agent-sandbox/agent-runner@latest";
const AGENT_RUNNER_BIN = "agent-runner";

export class CLIProvisioner {
  private provider: ContainerProvider;

  constructor(provider: ContainerProvider) {
    this.provider = provider;
  }

  private shouldUseRunner(): boolean {
    return process.env.AGENT_SANDBOX_RUNNER_ENABLED === "1";
  }

  private resolveAcpCommand(): string | null {
    const override = process.env.AGENT_RUNNER_ACP_COMMAND?.trim();
    if (override) return override;
    const backend = process.env.AGENT_SANDBOX_RUNNER_BACKEND?.trim();
    if (!backend) return null;
    if (backend.startsWith("acp:")) {
      const suffix = backend.slice(4).trim();
      return suffix.length ? suffix : null;
    }
    if (backend === "acp") return null;
    return backend.length ? backend : null;
  }

  private buildKimiConfig(): string | null {
    const override = process.env.AGENT_SANDBOX_KIMI_CONFIG_TOML?.trim();
    if (override) return override;
    const apiKey = process.env.AGENT_SANDBOX_KIMI_API_KEY?.trim();
    if (!apiKey) return null;
    const baseUrl = process.env.AGENT_SANDBOX_KIMI_BASE_URL?.trim() || "https://api.kimi.com/coding/v1";
    return [
      'default_model = "kimi-for-coding"',
      "default_thinking = false",
      "default_yolo = false",
      "",
      "[providers.kimi-for-coding]",
      'type = "kimi"',
      `base_url = "${baseUrl}"`,
      `api_key = "${apiKey}"`,
      "",
      "[models.kimi-for-coding]",
      'provider = "kimi-for-coding"',
      'model = "kimi-for-coding"',
      "max_context_size = 262144",
      "",
    ].join("\n");
  }

  private async ensureAcpCommand(containerId: string, command: string): Promise<InstallResult> {
    const installOverride = process.env.AGENT_SANDBOX_ACP_INSTALL_COMMAND?.trim();
    const cmd = this.shellEscape(command);
    const kimiConfig = command === "kimi" ? this.buildKimiConfig() : null;
    const kimiConfigEncoded = kimiConfig ? Buffer.from(kimiConfig, "utf8").toString("base64") : null;
    const script = installOverride
      ? [
          "set -e",
          `if command -v ${cmd} >/dev/null 2>&1; then exit 0; fi`,
          installOverride,
        ].join("\n")
      : command === "kimi"
        ? [
            "set -e",
            `if ! command -v ${cmd} >/dev/null 2>&1; then`,
            "  if ! command -v curl >/dev/null 2>&1; then apt-get update && apt-get install -y curl; fi",
            "  export UV_NO_MODIFY_PATH=1",
            "  curl -LsSf https://astral.sh/uv/install.sh | sh",
            "  export PATH=\"/root/.local/bin:$PATH\"",
            "  uv tool install kimi-cli",
            "  ln -sf /root/.local/bin/kimi /usr/local/bin/kimi",
            "fi",
            ...(kimiConfigEncoded
              ? [
                  "mkdir -p /root/.kimi",
                  `printf '%s' ${this.shellEscape(kimiConfigEncoded)} | base64 -d > /root/.kimi/config.toml`,
                  "chmod 600 /root/.kimi/config.toml",
                ]
              : []),
          ].join("\n")
        : null;

    if (!script) {
      return { success: true, message: `No ACP installer configured for ${command}`, usedFallback: false };
    }

    const result = await this.provider.executeCommand(containerId, ["bash", "-lc", script]);
    if (result.exitCode !== 0) {
      return { success: false, message: `Failed to install ${command}: ${result.output}`, usedFallback: false };
    }

    const verify = await this.provider.executeCommand(containerId, ["bash", "-lc", `command -v ${cmd}`]);
    if (verify.exitCode !== 0) {
      return { success: false, message: `Failed to verify ${command} installation`, usedFallback: false };
    }

    return { success: true, message: `Installed ${command}`, usedFallback: false };
  }

  async installAgent(containerId: string, cliTool: CLITool): Promise<InstallResult> {
    if (this.shouldUseRunner()) {
      const runnerInstall = await this.installRunner(containerId);
      if (!runnerInstall.success) {
        return runnerInstall;
      }
      const acpCommand = this.resolveAcpCommand();
      if (acpCommand) {
        const acpInstall = await this.ensureAcpCommand(containerId, acpCommand);
        if (!acpInstall.success) {
          return acpInstall;
        }
      }
      return runnerInstall;
    }
    return this.installCLI(containerId, cliTool);
  }

  async executeAgentTask(
    containerId: string,
    cliTool: CLITool,
    taskPrompt: string,
    apiKey?: string
  ): Promise<TaskExecutionResult> {
    if (this.shouldUseRunner()) {
      return this.executeTaskViaRunner(containerId, cliTool, taskPrompt, apiKey);
    }
    return this.executeTask(containerId, cliTool, taskPrompt, apiKey);
  }

  async installCLI(containerId: string, cliTool: CLITool): Promise<InstallResult> {
    const toolConfig = (cliTool === "claude-code"
      ? CLI_TOOLS["claude-code"]
      : CLI_TOOLS.opencode) as {
      name: string;
      installCommand: string;
      fallbackCommand?: string;
      envVar: string;
    };

    // Try latest version first
    const latestResult = await this.tryInstall(containerId, toolConfig.installCommand);

    if (latestResult.success) {
      const version = await this.verifyInstallation(containerId, cliTool);
      return {
        success: true,
        version,
        message: `Successfully installed ${toolConfig.name}`,
        usedFallback: false,
      };
    }

    // Try fallback version
    const fallbackCommand = toolConfig.fallbackCommand ?? toolConfig.installCommand;
    const fallbackResult = await this.tryInstall(containerId, fallbackCommand);

    if (fallbackResult.success) {
      const version = await this.verifyInstallation(containerId, cliTool);
      return {
        success: true,
        version,
        message: `Installed ${toolConfig.name} using fallback version`,
        usedFallback: true,
      };
    }

    return {
      success: false,
      message: `Failed to install ${toolConfig.name}: ${latestResult.error}`,
      usedFallback: true,
    };
  }

  async installRunner(containerId: string): Promise<InstallResult> {
    const runnerPackage = process.env.AGENT_SANDBOX_RUNNER_PACKAGE?.trim() || AGENT_RUNNER_PACKAGE;
    const fallbackPackage = process.env.AGENT_SANDBOX_RUNNER_PACKAGE_FALLBACK?.trim();
    const npmToken = process.env.AGENT_SANDBOX_NPM_TOKEN?.trim() || process.env.NPM_TOKEN?.trim();
    const tokenPrefix = npmToken
      ? `npm config set //registry.npmjs.org/:_authToken=${this.shellEscape(npmToken)} && `
      : "";

    const latestResult = await this.tryInstall(
      containerId,
      `${tokenPrefix}npm install -g ${runnerPackage}`
    );

    if (!latestResult.success && fallbackPackage) {
      const fallbackResult = await this.tryInstall(
        containerId,
        `${tokenPrefix}npm install -g ${fallbackPackage}`
      );
      if (!fallbackResult.success) {
        return {
          success: false,
          message: `Failed to install agent runner: ${fallbackResult.error}`,
          usedFallback: true,
        };
      }
    } else if (!latestResult.success) {
      return {
        success: false,
        message: `Failed to install agent runner: ${latestResult.error}`,
        usedFallback: false,
      };
    }

    try {
      const result = await this.provider.executeCommand(containerId, [
        "bash",
        "-lc",
        `which ${AGENT_RUNNER_BIN} >/dev/null 2>&1 && echo "ok"`,
      ]);
      if (result.exitCode === 0) {
        return {
          success: true,
          message: "Successfully installed agent runner",
          usedFallback: Boolean(!latestResult.success && fallbackPackage),
        };
      }
    } catch {}

    return {
      success: true,
      message: "Installed agent runner (unverified)",
      usedFallback: false,
    };
  }

  async verifyInstallation(containerId: string, cliTool: CLITool): Promise<string | undefined> {
    // Check if the CLI tool is accessible by running --version
    const toolConfig = (cliTool === "claude-code"
      ? CLI_TOOLS["claude-code"]
      : CLI_TOOLS.opencode) as {
      name: string;
      installCommand: string;
      fallbackCommand?: string;
      envVar: string;
    };
    const toolName = cliTool === "claude-code" ? "claude" : "opencode";

    try {
      const result = await this.provider.executeCommand(containerId, [
        "bash",
        "-c",
        `which ${toolName} && ${toolName} --version 2>/dev/null || echo "unknown"`,
      ]);

      if (result.exitCode === 0 && result.output) {
        // Extract version from output
        const versionMatch = result.output.match(/\d+\.\d+\.\d+/);
        return versionMatch?.[0];
      }
    } catch {
      // Verification failed
    }

    return undefined;
  }

  private shellEscape(value: string): string {
    return `'${value.split("'").join("'\"'\"'")}'`;
  }

  private parseRunnerOutput(raw: string): { output: string; toolCalls: ToolCall[] } {
    const lines = raw.split("\n").filter((line) => line.trim().length > 0);
    let out = "";
    const toolCalls: ToolCall[] = [];
    for (const line of lines) {
      try {
        const event = JSON.parse(line) as {
          type?: string;
          message?: string;
          name?: string;
          input?: unknown;
          output?: unknown;
          promptId?: string;
          question?: string;
          options?: Array<{ id?: string; label?: string; value?: string } | string>;
          expiresAt?: string;
        };
        if (event.type === "stdout" || event.type === "stderr") {
          out += event.message ?? "";
          continue;
        }
        if (event.type === "tool_call") {
          const input =
            event.input && typeof event.input === "object" && !Array.isArray(event.input)
              ? (event.input as Record<string, unknown>)
              : { value: event.input };
          const output =
            typeof event.output === "string"
              ? event.output
              : event.output === undefined
                ? undefined
                : JSON.stringify(event.output);
          toolCalls.push({
            id: randomUUID(),
            type: "tool",
            name: event.name ?? "tool",
            input,
            output,
          });
          continue;
        }
        if (event.type === "prompt" && event.promptId && event.question && event.options) {
          const options = event.options
            .map((option) => {
              if (typeof option === "string") {
                const id = option.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                return { id, label: option, value: option };
              }
              if (!option || typeof option !== "object") return null;
              if (!option.id || !option.label || !option.value) return null;
              return { id: option.id, label: option.label, value: option.value };
            })
            .filter((opt): opt is { id: string; label: string; value: string } => Boolean(opt));
          toolCalls.push({
            id: event.promptId,
            type: "prompt",
            name: "prompt",
            input: {
              promptId: event.promptId,
              question: event.question,
              options,
              expiresAt: event.expiresAt,
            },
          });
          continue;
        }
      } catch {
        out += line + "\n";
      }
    }
    return { output: out, toolCalls };
  }

  async executeTaskViaRunner(
    containerId: string,
    cliTool: CLITool,
    taskPrompt: string,
    apiKey?: string
  ): Promise<TaskExecutionResult> {
    const toolConfig = (cliTool === "claude-code"
      ? CLI_TOOLS["claude-code"]
      : CLI_TOOLS.opencode) as {
      name: string;
      installCommand: string;
      fallbackCommand?: string;
      envVar: string;
    };

    const envPrefix = apiKey ? `${toolConfig.envVar}="${apiKey}" ` : "";
    const escapedPrompt = taskPrompt.replace(/"/g, '\\"');
    const backendOverride = process.env.AGENT_SANDBOX_RUNNER_BACKEND?.trim();
    const backend = backendOverride && backendOverride.length > 0
      ? backendOverride
      : cliTool === "claude-code"
        ? "cli:claude-code"
        : "cli:opencode";
    const envArgs = [
      process.env.AGENT_RUNNER_PROMPT ? `--env AGENT_RUNNER_PROMPT=${this.shellEscape(process.env.AGENT_RUNNER_PROMPT)}` : null,
      process.env.AGENT_RUNNER_PROMPT_ID ? `--env AGENT_RUNNER_PROMPT_ID=${this.shellEscape(process.env.AGENT_RUNNER_PROMPT_ID)}` : null,
      process.env.AGENT_RUNNER_PROMPT_QUESTION
        ? `--env AGENT_RUNNER_PROMPT_QUESTION=${this.shellEscape(process.env.AGENT_RUNNER_PROMPT_QUESTION)}`
        : null,
      process.env.AGENT_RUNNER_PROMPT_EXPIRES_MS
        ? `--env AGENT_RUNNER_PROMPT_EXPIRES_MS=${this.shellEscape(process.env.AGENT_RUNNER_PROMPT_EXPIRES_MS)}`
        : null,
      process.env.AGENT_RUNNER_PROMPT_OPTIONS
        ? `--env AGENT_RUNNER_PROMPT_OPTIONS=${this.shellEscape(process.env.AGENT_RUNNER_PROMPT_OPTIONS)}`
        : null,
      process.env.AGENT_RUNNER_ACP_COMMAND
        ? `--env AGENT_RUNNER_ACP_COMMAND=${this.shellEscape(process.env.AGENT_RUNNER_ACP_COMMAND)}`
        : null,
      process.env.AGENT_RUNNER_ACP_ARGS
        ? `--env AGENT_RUNNER_ACP_ARGS=${this.shellEscape(process.env.AGENT_RUNNER_ACP_ARGS)}`
        : null,
      process.env.AGENT_RUNNER_ACP_AUTH_METHOD
        ? `--env AGENT_RUNNER_ACP_AUTH_METHOD=${this.shellEscape(process.env.AGENT_RUNNER_ACP_AUTH_METHOD)}`
        : null,
      process.env.AGENT_RUNNER_ACP_MCP_SERVERS
        ? `--env AGENT_RUNNER_ACP_MCP_SERVERS=${this.shellEscape(process.env.AGENT_RUNNER_ACP_MCP_SERVERS)}`
        : null,
      process.env.AGENT_RUNNER_ACP_MOCK
        ? `--env AGENT_RUNNER_ACP_MOCK=${this.shellEscape(process.env.AGENT_RUNNER_ACP_MOCK)}`
        : null,
    ]
      .filter((item): item is string => Boolean(item))
      .join(" ");
    const command = `cd ${WORKSPACE_MOUNT_PATH} && ${envPrefix}${AGENT_RUNNER_BIN} run --backend ${backend} --workspace ${WORKSPACE_MOUNT_PATH} --prompt "${escapedPrompt}" ${envArgs}`;

    try {
      const result = await this.provider.executeCommand(containerId, ["bash", "-lc", command]);
      const parsed = this.parseRunnerOutput(result.output);
      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        output: parsed.output,
        toolCalls: parsed.toolCalls,
      };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        output: error instanceof Error ? error.message : "Unknown error",
        toolCalls: [],
      };
    }
  }

  async executeTask(
    containerId: string,
    cliTool: CLITool,
    taskPrompt: string,
    apiKey?: string
  ): Promise<TaskExecutionResult> {
    const toolConfig = (cliTool === "claude-code"
      ? CLI_TOOLS["claude-code"]
      : CLI_TOOLS.opencode) as {
      name: string;
      installCommand: string;
      fallbackCommand?: string;
      envVar: string;
    };
    const toolName = cliTool === "claude-code" ? "claude" : "opencode";

    // Build the command
    const envPrefix = apiKey ? `${toolConfig.envVar}="${apiKey}" ` : "";
    const escapedPrompt = taskPrompt.replace(/"/g, '\\"');
    const command =
      cliTool === "claude-code"
        ? `${envPrefix}${toolName} "${escapedPrompt}"`
        : `cd ${WORKSPACE_MOUNT_PATH} && ${envPrefix}${toolName} run -- "${escapedPrompt}"`;

    try {
      const initial = await this.provider.executeCommand(containerId, [
        "bash",
        "-c",
        command,
      ]);

      if (initial.exitCode === 0) {
        return { success: true, exitCode: 0, output: initial.output, toolCalls: [] };
      }

      if (cliTool === "opencode" && /opencode-linux-arm64|failed to install the right version/i.test(initial.output)) {
        const arch = await this.provider.executeCommand(containerId, ["bash", "-c", "uname -m"]);
        const pkg =
          /aarch64|arm64/i.test(arch.output) ? "opencode-linux-arm64@latest" : "opencode-linux-x64@latest";
        await this.tryInstall(containerId, `npm install -g ${pkg}`);
        const retry = await this.provider.executeCommand(containerId, ["bash", "-c", command]);
        return { success: retry.exitCode === 0, exitCode: retry.exitCode, output: retry.output, toolCalls: [] };
      }

      return { success: false, exitCode: initial.exitCode, output: initial.output, toolCalls: [] };
    } catch (error) {
      return {
        success: false,
        exitCode: 1,
        output: error instanceof Error ? error.message : "Unknown error",
        toolCalls: [],
      };
    }
  }

  async setupEnvironment(
    containerId: string,
    config: {
      apiKey?: string;
      githubRepo?: string;
      githubBranch?: string;
      githubToken?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    if (config.githubRepo) {
      let cloneUrl = config.githubRepo;

      if (config.githubToken && cloneUrl.startsWith("https://github.com")) {
        cloneUrl = cloneUrl.replace(
          "https://github.com",
          `https://${config.githubToken}@github.com`
        );
      }

      const repoUrl = this.shellEscape(cloneUrl);
      const branch = config.githubBranch?.trim();
      const escapedBranch = branch ? this.shellEscape(branch) : null;
      const scriptLines = [
        "set -e",
        `cd ${WORKSPACE_MOUNT_PATH}`,
        `if [ -d ${WORKSPACE_MOUNT_PATH}/.git ]; then`,
        `  git remote set-url origin ${repoUrl} || git remote add origin ${repoUrl}`,
        ...(escapedBranch
          ? [
              `  git fetch --depth 1 origin ${escapedBranch}`,
              `  git checkout -B ${escapedBranch} FETCH_HEAD`,
            ]
          : [
              `  git fetch --depth 1 origin`,
              `  default_branch=$(git remote show origin | awk '/HEAD branch/ {print $NF}')`,
              `  if [ -z "$default_branch" ]; then`,
              `    default_branch=$(git branch -r | sed 's|origin/||' | head -n 1 | tr -d '[:space:]')`,
              `  fi`,
              `  if [ -z "$default_branch" ]; then`,
              `    echo "Failed to determine default branch" >&2`,
              `    exit 1`,
              `  fi`,
              `  git checkout -B "$default_branch" "origin/$default_branch"`,
            ]),
        `else`,
        `  git init`,
        `  git remote add origin ${repoUrl} || git remote set-url origin ${repoUrl}`,
        ...(escapedBranch
          ? [
              `  git fetch --depth 1 origin ${escapedBranch}`,
              `  git checkout -B ${escapedBranch} FETCH_HEAD`,
            ]
          : [
              `  git fetch --depth 1 origin`,
              `  default_branch=$(git remote show origin | awk '/HEAD branch/ {print $NF}')`,
              `  if [ -z "$default_branch" ]; then`,
              `    default_branch=$(git branch -r | sed 's|origin/||' | head -n 1 | tr -d '[:space:]')`,
              `  fi`,
              `  if [ -z "$default_branch" ]; then`,
              `    echo "Failed to determine default branch" >&2`,
              `    exit 1`,
              `  fi`,
              `  git checkout -B "$default_branch" "origin/$default_branch"`,
            ]),
        `fi`,
      ];

      const result = await this.provider.executeCommand(containerId, [
        "bash",
        "-lc",
        scriptLines.join("\n"),
      ]);

      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Setup failed: ${result.output}`,
        };
      }
    }

    return {
      success: true,
      message: "Environment setup complete",
    };
  }

  private async tryInstall(
    containerId: string,
    installCommand: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.provider.executeCommand(containerId, [
        "bash",
        "-c",
        installCommand,
      ]);

      if (result.exitCode === 0) {
        return { success: true };
      }

      return {
        success: false,
        error: result.output || "Installation failed",
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
