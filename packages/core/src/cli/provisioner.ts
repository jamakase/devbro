import type { CLITool } from "@agent-sandbox/shared";
import { CLI_TOOLS, WORKSPACE_MOUNT_PATH } from "@agent-sandbox/shared";
import type { DockerClient } from "../docker/client.js";

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
}

export class CLIProvisioner {
  private dockerClient: DockerClient;

  constructor(dockerClient: DockerClient) {
    this.dockerClient = dockerClient;
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
      const result = await this.dockerClient.execInContainer(containerId, [
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
      const initial = await this.dockerClient.execInContainer(containerId, [
        "bash",
        "-c",
        command,
      ]);

      if (initial.exitCode === 0) {
        return { success: true, exitCode: 0, output: initial.output };
      }

      if (cliTool === "opencode" && /opencode-linux-arm64|failed to install the right version/i.test(initial.output)) {
        const arch = await this.dockerClient.execInContainer(containerId, ["bash", "-c", "uname -m"]);
        const pkg =
          /aarch64|arm64/i.test(arch.output) ? "opencode-linux-arm64@latest" : "opencode-linux-x64@latest";
        await this.tryInstall(containerId, `npm install -g ${pkg}`);
        const retry = await this.dockerClient.execInContainer(containerId, ["bash", "-c", command]);
        return { success: retry.exitCode === 0, exitCode: retry.exitCode, output: retry.output };
      }

      return { success: false, exitCode: initial.exitCode, output: initial.output };
    } catch (error) {
      return { success: false, exitCode: 1, output: error instanceof Error ? error.message : "Unknown error" };
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
    const steps: string[] = [];

    // Clone repository if specified
    if (config.githubRepo) {
      let cloneUrl = config.githubRepo;

      // Add token to URL if provided
      if (config.githubToken && cloneUrl.startsWith("https://github.com")) {
        cloneUrl = cloneUrl.replace(
          "https://github.com",
          `https://${config.githubToken}@github.com`
        );
      }

      let cloneCmd = `git clone ${cloneUrl} .`;
      if (config.githubBranch) {
        cloneCmd = `git clone --branch ${config.githubBranch} ${cloneUrl} .`;
      }

      steps.push(cloneCmd);
    }

    // Run setup steps
    for (const step of steps) {
      const result = await this.dockerClient.execInContainer(containerId, [
        "bash",
        "-c",
        step,
      ]);

      if (result.exitCode !== 0) {
        return {
          success: false,
          message: `Setup failed at: ${step}\nError: ${result.output}`,
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
      const result = await this.dockerClient.execInContainer(containerId, [
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
