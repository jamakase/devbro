#!/usr/bin/env node
console.log("CLI starting...");
import { Command } from "commander";
import inquirer from "inquirer";
import Conf from "conf";
import { startAgent } from "./agent.js";
import { spawn } from "node:child_process";

const program = new Command();
const config = new Conf({ projectName: "agent-sandbox-cli" });

program
  .name("agent-cli")
  .description("Agent Sandbox Remote CLI")
  .version("0.0.1");

program
  .command("connect")
  .description("Connect to the Agent Sandbox Server")
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "Server URL:",
        default: (config.get("url") as string) || "http://localhost:3000",
      },
      {
        type: "input",
        name: "serverId",
        message: "Server ID:",
        default: config.get("serverId") as string,
      },
      {
        type: "password",
        name: "token",
        message: "Server Token:",
        default: config.get("token") as string,
      },
    ]);

    config.set("url", answers.url);
    config.set("serverId", answers.serverId);
    config.set("token", answers.token);

    console.log("Configuration saved.");
    await startAgent();
  });

program
  .command("start")
  .description("Start the agent using saved configuration")
  .action(async () => {
    console.log("Start command invoked");
    // Load from ENV if available
    if (process.env.AGENT_SERVER_URL) {
        console.log("Setting URL from ENV");
        config.set("url", process.env.AGENT_SERVER_URL);
    }
    if (process.env.AGENT_SERVER_ID) {
        console.log("Setting Server ID from ENV");
        config.set("serverId", process.env.AGENT_SERVER_ID);
    }
    if (process.env.AGENT_TOKEN) {
        console.log("Setting Token from ENV");
        config.set("token", process.env.AGENT_TOKEN);
    }

    const url = config.get("url");
    const serverId = config.get("serverId");
    const token = config.get("token");

    console.log(`Config check: URL=${!!url}, ServerID=${!!serverId}, Token=${!!token}`);

    if (!url || !serverId || !token) {
      console.error("Configuration missing. Please run 'connect' first.");
      process.exit(1);
    }
    console.log("Calling startAgent...");
    await startAgent();
  });

async function runCommand(command: string, args: string[]): Promise<string> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    let errorOutput = "";
    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      errorOutput += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(errorOutput.trim() || `Command failed: ${command}`));
      }
    });
  });
}

async function resolveContainerId(taskId: string): Promise<string> {
  const output = await runCommand("docker", [
    "ps",
    "-a",
    "--filter",
    `label=agent-sandbox.id=${taskId}`,
    "--format",
    "{{.ID}}",
  ]);
  const match = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)[0];
  if (!match) {
    throw new Error(`No container found for task ${taskId}`);
  }
  return match;
}

async function runInteractive(command: string, args: string[]): Promise<number> {
  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

program
  .command("kimi-login")
  .description("Open an interactive Kimi login inside a sandbox container")
  .option("--task <taskId>", "Task ID to resolve the container from")
  .option("--container <containerId>", "Container ID to use directly")
  .action(async (options) => {
    let taskId = options.task as string | undefined;
    let containerId = options.container as string | undefined;

    if (!taskId && !containerId) {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "taskId",
          message: "Task ID:",
        },
      ]);
      taskId = answers.taskId?.trim();
    }

    if (!containerId) {
      if (!taskId) {
        console.error("Task ID or container ID is required.");
        process.exit(1);
      }
      containerId = await resolveContainerId(taskId);
    }

    console.log(`Opening Kimi CLI in container ${containerId}`);
    console.log("Run /login inside Kimi to complete authentication.");
    const exitCode = await runInteractive("docker", ["exec", "-it", containerId, "kimi"]);
    process.exit(exitCode);
  });

program.parse();
