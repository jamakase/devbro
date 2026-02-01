import { DockerClient } from "../docker/client.js";
import { CLIProvisioner } from "../cli/provisioner.js";
import type { Project, Task } from "@agent-sandbox/shared";

async function main() {
  const dockerClient = new DockerClient();
  const provisioner = new CLIProvisioner(dockerClient);

  const apiBase = "http://localhost:3000/api";
  const randomId = Math.random().toString(36).slice(2, 10);
  const email = `e2e.cli.${randomId}@example.com`;
  const password = "TestPass123!";
  const name = "E2E CLI";

  // 1) Docker health check
  const health = await dockerClient.healthCheck();
  if (!health.healthy) {
    throw new Error(`Docker not healthy: ${health.message}`);
  }

  // 2) Sign up and capture session cookie
  const signUpRes = await fetch(`${apiBase}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", Referer: "http://localhost:3000" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!signUpRes.ok) {
    const text = await signUpRes.text();
    throw new Error(`Sign-up failed: ${signUpRes.status} ${text}`);
  }
  const setCookie = signUpRes.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("No session cookie received from sign-up");
  }
  const cookieMatch = setCookie.match(/better-auth\.session_token=([^;]+)/);
  if (!cookieMatch) {
    throw new Error("Session token not found in set-cookie header");
  }
  const sessionCookie = `better-auth.session_token=${cookieMatch[1]}`;

  // 3) Create Project
  const projRes = await fetch(`${apiBase}/projects`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
      Origin: "http://localhost:3000",
      Referer: "http://localhost:3000",
    },
    body: JSON.stringify({ name: `E2E Project ${randomId}`, description: "CLI E2E Test" }),
  });
  if (!projRes.ok) {
    const text = await projRes.text();
    throw new Error(`Create project failed: ${projRes.status} ${text}`);
  }
  const project = (await projRes.json()) as Project;

  // 4) Create Task (use opencode for version check without API key)
  const taskRes = await fetch(`${apiBase}/projects/${project.id}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
      Origin: "http://localhost:3000",
      Referer: "http://localhost:3000",
    },
    body: JSON.stringify({ name: `E2E CLI Task ${randomId}`, cliTool: "opencode" }),
  });
  if (!taskRes.ok) {
    const text = await taskRes.text();
    throw new Error(`Create task failed: ${taskRes.status} ${text}`);
  }
  const task = (await taskRes.json()) as Task;

  // 5) Start Task
  const startRes = await fetch(`${apiBase}/tasks/${task.id}/start`, {
    method: "POST",
    headers: { Cookie: sessionCookie, Origin: "http://localhost:3000", Referer: "http://localhost:3000" },
  });
  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Start task failed: ${startRes.status} ${text}`);
  }
  await startRes.json();

  // 6) Get Task details to retrieve containerId
  const getRes = await fetch(`${apiBase}/tasks/${task.id}`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: "http://localhost:3000", Referer: "http://localhost:3000" },
  });
  if (!getRes.ok) {
    const text = await getRes.text();
    throw new Error(`Get task failed: ${getRes.status} ${text}`);
  }
  const taskDetails = (await getRes.json()) as Task;
  const containerId: string | null = taskDetails.containerId;
  if (!containerId) {
    throw new Error("No containerId found on task after start");
  }

  // 7) Basic exec check inside container (Node should be available)
  const nodeVersion = await dockerClient.execInContainer(containerId, ["bash", "-c", "node -v"]);
  if (nodeVersion.exitCode !== 0) {
    throw new Error(`Node not available in container: ${nodeVersion.output}`);
  }

  // 8) Install CLI tool and verify version
  const install = await provisioner.installCLI(containerId, "opencode");
  if (!install.success) {
    throw new Error(`CLI install failed: ${install.message}`);
  }

  // 9) Execute a prompt via /run and collect outputs
  const runRes = await fetch(`${apiBase}/tasks/${task.id}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
      Origin: "http://localhost:3000",
      Referer: "http://localhost:3000",
    },
    body: JSON.stringify({ prompt: "List two files then say hello" }),
  });
  if (!runRes.ok) {
    const text = await runRes.text();
    throw new Error(`Run task failed: ${runRes.status} ${text}`);
  }
  const runJson = (await runRes.json()) as {
    success: boolean;
    exitCode: number;
    output: string;
    installed?: boolean;
    version?: string;
    fallback?: boolean;
  };

  // 10) Fetch messages, inspect, and logs for later inspection
  const msgsRes = await fetch(`${apiBase}/tasks/${task.id}/messages`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: "http://localhost:3000", Referer: "http://localhost:3000" },
  });
  const messages = msgsRes.ok ? await msgsRes.json() : [];

  const inspectRes = await fetch(`${apiBase}/tasks/${task.id}/inspect`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: "http://localhost:3000", Referer: "http://localhost:3000" },
  });
  const inspect = inspectRes.ok ? await inspectRes.json() : {};

  const logsRes = await fetch(`${apiBase}/tasks/${task.id}/logs?tail=50`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: "http://localhost:3000", Referer: "http://localhost:3000" },
  });
  const logs = logsRes.ok ? await logsRes.text() : "";

  console.log(
    JSON.stringify(
      {
        docker: health.message,
        projectId: project.id,
        taskId: task.id,
        containerId,
        nodeVersion: nodeVersion.output.trim(),
        cliInstalled: install.success,
        cliVersion: install.version ?? "unknown",
        cliFallback: install.usedFallback,
        run: {
          success: runJson.success,
          exitCode: runJson.exitCode,
          output: runJson.output,
        },
        messagesCount: Array.isArray(messages) ? messages.length : 0,
        lastMessage: Array.isArray(messages) && messages.length ? messages[messages.length - 1] : null,
        inspect,
        logsTail: logs,
        status: "success",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }, null, 2));
  process.exit(1);
});
