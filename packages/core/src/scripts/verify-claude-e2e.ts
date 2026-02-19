import Docker from "dockerode";
import { DockerProvider } from "../docker/provider.js";
import { CLIProvisioner } from "../cli/provisioner.js";
import type { Project, Task } from "@agent-sandbox/shared";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";

async function main() {
  const dockerProvider = new DockerProvider();
  const provisioner = new CLIProvisioner(dockerProvider);
  const port = Number(process.env.AGENT_SANDBOX_PORT ?? process.env.PORT ?? "4000");
  const apiBase = process.env.AGENT_SANDBOX_API_BASE ?? `http://localhost:${port}/api`;
  const origin = apiBase.replace(/\/api\/?$/, "");
  const repoRoot = path.resolve(process.cwd(), "../..");
  const server = spawn(
    "pnpm",
    ["--filter", "@agent-sandbox/ui", "run", "dev"],
    {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(port) },
      stdio: "pipe",
      detached: true,
    }
  );
  server.stdout?.on("data", () => {});
  server.stderr?.on("data", () => {});

  try {
    const startDeadlineMs = Date.now() + 60_000;
    while (Date.now() < startDeadlineMs) {
      try {
        const res = await fetch(`${apiBase}/health`, { method: "GET" });
        if (res.ok) break;
      } catch {}
      await sleep(750);
    }

  const randomId = Math.random().toString(36).slice(2, 10);
  const email = `e2e.claude.${randomId}@example.com`;
  const password = "TestPass123!";
  const name = "E2E Claude";
  const testingKey = process.env.ANTHROPIC_API_KEY || "sk-test-invalid";
  const health = await dockerProvider.healthCheck();
  if (!health.healthy) throw new Error(health.message);
  const signUpRes = await fetch(`${apiBase}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Referer: origin },
    body: JSON.stringify({ email, password, name }),
  });
  if (!signUpRes.ok) throw new Error(`Sign-up failed: ${signUpRes.status} ${await signUpRes.text()}`);
  const setCookie = signUpRes.headers.get("set-cookie") || "";
  const cookieMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if (!cookieMatch) throw new Error("No session cookie");
  const sessionCookie = `better-auth.session_token=${cookieMatch[1]}`;
  const projRes = await fetch(`${apiBase}/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: origin, Referer: origin },
    body: JSON.stringify({ name: `E2E Project ${randomId}` }),
  });
  if (!projRes.ok) throw new Error(`Create project failed: ${projRes.status} ${await projRes.text()}`);
  const project = (await projRes.json()) as Project;
  const taskRes = await fetch(`${apiBase}/projects/${project.id}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie, Origin: origin, Referer: origin },
    body: JSON.stringify({ name: `E2E Claude Task ${randomId}`, cliTool: "claude", config: { anthropicApiKey: testingKey } }),
  });
  if (!taskRes.ok) throw new Error(`Create task failed: ${taskRes.status} ${await taskRes.text()}`);
  const task = (await taskRes.json()) as Task;
  const startRes = await fetch(`${apiBase}/tasks/${task.id}/start`, {
    method: "POST",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
  });
  if (!startRes.ok) throw new Error(`Start task failed: ${startRes.status} ${await startRes.text()}`);
  await startRes.json();
  const getRes = await fetch(`${apiBase}/tasks/${task.id}`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
  });
  if (!getRes.ok) throw new Error(`Get task failed: ${getRes.status} ${await getRes.text()}`);
  const taskDetails = (await getRes.json()) as Task;
  const containerId = taskDetails.containerId;
  if (!containerId) throw new Error("No containerId");
  const nodeVersion = await dockerProvider.executeCommand(containerId, ["bash", "-c", "node -v"]);
  const install = await provisioner.installCLI(containerId, "claude-code");
  const run = await provisioner.executeTask(containerId, "claude-code", "Hello from E2E", testingKey);
  const docker = new Docker();
  const inspect = await docker.getContainer(containerId).inspect();
  const binds = inspect.HostConfig?.Binds || [];
  const labels = inspect.Config?.Labels || {};
  const env = (inspect.Config?.Env || []).filter((e) => e.startsWith("ANTHROPIC_API_KEY="));
  const image = inspect.Config?.Image || inspect.Image;
  console.log(JSON.stringify({
    docker: health.message,
    projectId: project.id,
    taskId: task.id,
    containerId,
    image,
    labels,
    binds,
    env,
    nodeVersion: nodeVersion.output.trim(),
    cliInstalled: install.success,
    cliVersion: install.version ?? "unknown",
    cliFallback: install.usedFallback,
    cliExitCode: run.exitCode,
    cliOutput: run.output,
    status: "success",
  }, null, 2));
  } finally {
    if (server.pid) {
      try {
        process.kill(-server.pid, "SIGTERM");
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }, null, 2));
  process.exit(1);
});
