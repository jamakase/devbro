import { DockerProvider } from "../docker/provider.js";
import { CLIProvisioner } from "../cli/provisioner.js";
import { WORKSPACE_MOUNT_PATH, type Project, type Task } from "@agent-sandbox/shared";
import { ContainerProvider } from "../types/provider.js";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import net from "node:net";

async function main() {
  const dockerProvider: ContainerProvider = new DockerProvider();
  const provisioner = new CLIProvisioner(dockerProvider);

  const providedApiBase = process.env.AGENT_SANDBOX_API_BASE;
  const repoRoot = path.resolve(process.cwd(), "../..");
  const configuredPort = process.env.AGENT_SANDBOX_PORT ?? process.env.PORT;
  const testRepoUrl = process.env.E2E_TEST_REPO_URL?.trim() || null;
  const testRepoBranch = process.env.E2E_TEST_REPO_BRANCH?.trim() || null;
  const runnerBackend = process.env.E2E_RUNNER_BACKEND?.trim() || "sdk:mock";
  const runnerAuthMethod = process.env.E2E_RUNNER_ACP_AUTH_METHOD?.trim();

  async function getFreePort(): Promise<number> {
    return await new Promise((resolve, reject) => {
      const server = net.createServer();
      server.unref();
      server.on("error", reject);
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          server.close(() => reject(new Error("Failed to determine a free port")));
          return;
        }
        const port = address.port;
        server.close(() => resolve(port));
      });
    });
  }

  const port = configuredPort ? Number(configuredPort) : await getFreePort();
  const apiBase = providedApiBase ?? `http://localhost:${port}/api`;
  const origin = apiBase.replace(/\/api\/?$/, "");

  const server =
    providedApiBase
      ? null
      : spawn("pnpm", ["--filter", "@agent-sandbox/ui", "run", "dev"], {
          cwd: repoRoot,
          env: {
            ...process.env,
            PORT: String(port),
            AGENT_SANDBOX_RUNNER_ENABLED: "1",
            AGENT_SANDBOX_RUNNER_BACKEND: runnerBackend,
            ...(runnerAuthMethod ? { AGENT_RUNNER_ACP_AUTH_METHOD: runnerAuthMethod } : {}),
            AGENT_RUNNER_PROMPT: "1",
            AGENT_RUNNER_PROMPT_EXPIRES_MS: "2000",
            AGENT_RUNNER_PROMPT_OPTIONS: JSON.stringify(["approve", "revise"]),
          },
          stdio: "pipe",
        });

  let serverExit: { code: number | null; signal: NodeJS.Signals | null } | undefined;
  let serverStdoutTail = "";
  let serverStderrTail = "";
  if (server) {
    server.once("exit", (code, signal) => {
      serverExit = { code, signal };
    });
    server.stdout?.on("data", (chunk) => {
      serverStdoutTail = (serverStdoutTail + chunk.toString()).slice(-8000);
    });
    server.stderr?.on("data", (chunk) => {
      serverStderrTail = (serverStderrTail + chunk.toString()).slice(-8000);
    });
  }

  try {
    const startDeadlineMs = Date.now() + 90_000;
    let ready = false;
    while (Date.now() < startDeadlineMs) {
      if (serverExit) {
        throw new Error(`UI dev server exited early (code=${serverExit.code}, signal=${serverExit.signal ?? "null"})`);
      }
      try {
        const res = await fetch(`${apiBase}/health`, { method: "GET" });
        if (res.ok) {
          ready = true;
          break;
        }
      } catch {}
      await sleep(750);
    }
    if (!ready) {
      throw new Error(`UI API did not become ready at ${apiBase}`);
    }

    const randomId = Math.random().toString(36).slice(2, 10);
    const email = `e2e.cli.${randomId}@example.com`;
    const password = "TestPass123!";
    const name = "E2E CLI";

    const assertUnauthenticated = async (res: Response, label: string) => {
      if (res.status === 401) {
        const json = (await res.json()) as { success?: boolean; error?: { code?: string } };
        if (json.success !== false || json.error?.code !== "UNAUTHORIZED") {
          throw new Error(`Unexpected unauthenticated ${label} response: ${JSON.stringify(json)}`);
        }
        return;
      }

      if (![302, 303, 307, 308].includes(res.status)) {
        const text = await res.text();
        throw new Error(`Unauthenticated ${label} request should be 401 or redirect: ${res.status} ${text.slice(0, 400)}`);
      }

      const location = res.headers.get("location") ?? "";
      if (!location.includes("/login")) {
        throw new Error(`Unauthenticated ${label} request redirected unexpectedly: ${res.status} location=${location}`);
      }
    };

    const unauthServersRes = await fetch(`${apiBase}/servers`, { method: "GET", redirect: "manual" });
    await assertUnauthenticated(unauthServersRes, "servers");

  // 1) Docker health check
  const health = await dockerProvider.healthCheck();
  if (!health.healthy) {
    throw new Error(`Docker not healthy: ${health.message}`);
  }

  // 2) Sign up and capture session cookie
  const signUpRes = await fetch(`${apiBase}/auth/sign-up/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, Referer: origin },
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
      Origin: origin,
      Referer: origin,
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
      Origin: origin,
      Referer: origin,
    },
    body: JSON.stringify({
      name: `E2E CLI Task ${randomId}`,
      cliTool: "opencode",
      config: {
        ...(testRepoUrl
          ? {
              githubRepo: testRepoUrl,
              githubBranch: testRepoBranch ?? undefined,
              bootstrap: {
                enableKnowledgeBase: true,
                buildKnowledgeBaseIndex: true,
              },
            }
          : {
              bootstrap: {
                pullSpecs: true,
                specsRepoUrl: "https://github.com/github/gitignore",
                specsBranch: "main",
                enableKnowledgeBase: true,
                buildKnowledgeBaseIndex: true,
              },
            }),
      },
    }),
  });
  if (!taskRes.ok) {
    const text = await taskRes.text();
    throw new Error(`Create task failed: ${taskRes.status} ${text}`);
  }
  const task = (await taskRes.json()) as Task;

  if (!testRepoUrl) {
    const unauthPrPreviewRes = await fetch(`${apiBase}/tasks/${task.id}/pr-preview`, {
      method: "GET",
      redirect: "manual",
    });
    await assertUnauthenticated(unauthPrPreviewRes, "pr-preview");

    const unauthPrCreateRes = await fetch(`${apiBase}/tasks/${task.id}/pull-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: origin,
        Referer: origin,
      },
      body: JSON.stringify({ title: "E2E PR" }),
      redirect: "manual",
    });
    await assertUnauthenticated(unauthPrCreateRes, "pull-request");
  }

  const unauthRunRes = await fetch(`${apiBase}/tasks/${task.id}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Referer: origin,
    },
    body: JSON.stringify({ prompt: "Hello" }),
    redirect: "manual",
  });
  await assertUnauthenticated(unauthRunRes, "run");

  const unauthPromptStreamRes = await fetch(`${apiBase}/tasks/${task.id}/prompts/stream`, {
    method: "GET",
    redirect: "manual",
  });
  await assertUnauthenticated(unauthPromptStreamRes, "prompts/stream");

  const unauthPromptAnswerRes = await fetch(`${apiBase}/tasks/${task.id}/prompts/e2e/answer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      Referer: origin,
    },
    body: JSON.stringify({ toolCallId: "e2e", answer: "e2e" }),
    redirect: "manual",
  });
  await assertUnauthenticated(unauthPromptAnswerRes, "prompts/answer");

  const unauthMessagesRes = await fetch(`${apiBase}/tasks/${task.id}/messages`, {
    method: "GET",
    redirect: "manual",
  });
  await assertUnauthenticated(unauthMessagesRes, "messages");

  if (!testRepoUrl) {
    const prPreviewRes = await fetch(`${apiBase}/tasks/${task.id}/pr-preview`, {
      method: "GET",
      headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
    });
    if (prPreviewRes.status !== 400) {
      const text = await prPreviewRes.text();
      throw new Error(`PR preview should fail for unconfigured repo: ${prPreviewRes.status} ${text}`);
    }
    const prPreviewJson = (await prPreviewRes.json()) as { success?: boolean; error?: { code?: string } };
    if (prPreviewJson.success !== false || prPreviewJson.error?.code !== "REPO_NOT_CONFIGURED") {
      throw new Error(`Unexpected PR preview error response: ${JSON.stringify(prPreviewJson)}`);
    }

    const prCreateRes = await fetch(`${apiBase}/tasks/${task.id}/pull-request`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
        Origin: origin,
        Referer: origin,
      },
      body: JSON.stringify({ title: "E2E PR" }),
    });
    if (prCreateRes.status !== 400) {
      const text = await prCreateRes.text();
      throw new Error(`PR create should fail for unconfigured repo: ${prCreateRes.status} ${text}`);
    }
    const prCreateJson = (await prCreateRes.json()) as { success?: boolean; error?: { code?: string } };
    if (prCreateJson.success !== false || prCreateJson.error?.code !== "REPO_NOT_CONFIGURED") {
      throw new Error(`Unexpected PR create error response: ${JSON.stringify(prCreateJson)}`);
    }
  }

  // 5) Start Task
  const startRes = await fetch(`${apiBase}/tasks/${task.id}/start`, {
    method: "POST",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
  });
  if (!startRes.ok) {
    const text = await startRes.text();
    throw new Error(`Start task failed: ${startRes.status} ${text}`);
  }
  await startRes.json();

  // 6) Get Task details to retrieve containerId
  const getRes = await fetch(`${apiBase}/tasks/${task.id}`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
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

  if (!testRepoUrl) {
    if (!taskDetails.config.bootstrap?.pullSpecs) {
      throw new Error(`Expected bootstrap.pullSpecs to be true: ${JSON.stringify(taskDetails.config.bootstrap)}`);
    }
    if (!taskDetails.config.bootstrap.specsRepoUrl) {
      throw new Error(`Expected bootstrap.specsRepoUrl to be set: ${JSON.stringify(taskDetails.config.bootstrap)}`);
    }

    if (!taskDetails.config.knowledgeBase?.enabled) {
      throw new Error(`Expected knowledgeBase.enabled to be true: ${JSON.stringify(taskDetails.config.knowledgeBase)}`);
    }

    const specsCheck = await dockerProvider.executeCommand(containerId, [
      "bash",
      "-lc",
      `ls -la ${WORKSPACE_MOUNT_PATH} 2>&1; echo "---"; ls -la ${WORKSPACE_MOUNT_PATH}/specs 2>&1; echo "---"; test -d ${WORKSPACE_MOUNT_PATH}/specs/.git && echo "ok"`,
    ]);
    if (specsCheck.exitCode !== 0 || !specsCheck.output.trimEnd().endsWith("ok")) {
      throw new Error(`Expected specs repo to be cloned: ${specsCheck.output}`);
    }
  }

  // 7) Basic exec check inside container (Node should be available)
  const nodeVersion = await dockerProvider.executeCommand(containerId, ["bash", "-c", "node -v"]);
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
      Origin: origin,
      Referer: origin,
    },
    body: JSON.stringify({
      prompt: testRepoUrl
        ? "Count how many files exist in this repository (excluding .git). Reply with the number only."
        : "List two files then say hello",
    }),
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

  if (testRepoUrl) {
    const repoCheck = await dockerProvider.executeCommand(containerId, [
      "bash",
      "-lc",
      `cd ${WORKSPACE_MOUNT_PATH} && test -d .git && git rev-parse --is-inside-work-tree >/dev/null 2>&1 && echo "ok"`,
    ]);
    if (repoCheck.exitCode !== 0 || !repoCheck.output.trimEnd().endsWith("ok")) {
      throw new Error(`Expected test repo to be cloned into workspace: ${repoCheck.output}`);
    }
  }

  const waitForFileCount = async () => {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
      const res = await fetch(`${apiBase}/tasks/${task.id}`, {
        method: "GET",
        headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Get task failed: ${res.status} ${text}`);
      }
      const json = (await res.json()) as Task;
      const indexing = json.config.knowledgeBase?.indexing as any;
      if (indexing?.status === "ready" && typeof indexing.fileCount === "number") {
        return indexing.fileCount as number;
      }
      if (indexing?.status === "error") {
        throw new Error(`Knowledge base indexing failed: ${indexing.errorMessage ?? "unknown"}`);
      }
      await sleep(500);
    }
    return null;
  };

  const repoFileCount = testRepoUrl ? await waitForFileCount() : null;

  if (!testRepoUrl) {
    const promptStreamAbort = new AbortController();
    const promptStreamRes = await fetch(`${apiBase}/tasks/${task.id}/prompts/stream`, {
      method: "GET",
      headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
      signal: promptStreamAbort.signal,
    });
    if (!promptStreamRes.ok) {
      const text = await promptStreamRes.text();
      throw new Error(`Prompt stream failed: ${promptStreamRes.status} ${text}`);
    }
    const reader = promptStreamRes.body?.getReader();
    if (!reader) {
      throw new Error("Prompt stream response body not readable");
    }
    const firstChunk = await Promise.race([reader.read(), sleep(2000).then(() => null)]);
    if (!firstChunk || firstChunk.done || !firstChunk.value) {
      throw new Error("Prompt stream did not emit initial data");
    }
    const streamText = new TextDecoder().decode(firstChunk.value);
    if (!streamText.includes("event: ready")) {
      throw new Error(`Prompt stream did not send ready event: ${streamText}`);
    }
    promptStreamAbort.abort();
    try {
      await reader.cancel();
    } catch {}

    const findPromptToolCall = async (excludeIds: Set<string>) => {
      for (let i = 0; i < 6; i++) {
        const promptMsgsRes = await fetch(`${apiBase}/tasks/${task.id}/messages`, {
          method: "GET",
          headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
        });
        const promptMsgs = promptMsgsRes.ok
          ? ((await promptMsgsRes.json()) as Array<{ toolCalls?: Array<{ id: string; type: string; input?: unknown }> }>)
          : [];
        for (const message of promptMsgs) {
          for (const toolCall of message.toolCalls ?? []) {
            if (toolCall.type !== "prompt") continue;
            if (excludeIds.has(toolCall.id)) continue;
            return toolCall as {
              id: string;
              input: { promptId: string; question: string; options: Array<{ value: string }> };
            };
          }
        }
        await sleep(500);
      }
      return null;
    };

    const seenPrompts = new Set<string>();
    const promptToolCall = await findPromptToolCall(seenPrompts);
    if (!promptToolCall) {
      throw new Error("Prompt tool call not found for prompt lifecycle test");
    }
    seenPrompts.add(promptToolCall.id);

    const promptAnswerRes = await fetch(
      `${apiBase}/tasks/${task.id}/prompts/${encodeURIComponent(promptToolCall.input.promptId)}/answer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
          Origin: origin,
          Referer: origin,
        },
        body: JSON.stringify({ toolCallId: promptToolCall.id, answer: promptToolCall.input.options[0]?.value ?? "approve" }),
      }
    );
    if (!promptAnswerRes.ok) {
      const text = await promptAnswerRes.text();
      throw new Error(`Prompt answer failed: ${promptAnswerRes.status} ${text}`);
    }

    const promptAnsweredAgain = await fetch(
      `${apiBase}/tasks/${task.id}/prompts/${encodeURIComponent(promptToolCall.input.promptId)}/answer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
          Origin: origin,
          Referer: origin,
        },
        body: JSON.stringify({ toolCallId: promptToolCall.id, answer: promptToolCall.input.options[0]?.value ?? "approve" }),
      }
    );
    if (promptAnsweredAgain.status !== 409) {
      const text = await promptAnsweredAgain.text();
      throw new Error(`Prompt should reject duplicate answers: ${promptAnsweredAgain.status} ${text}`);
    }
    const promptAnsweredAgainJson = (await promptAnsweredAgain.json()) as { success?: boolean; error?: { code?: string } };
    if (promptAnsweredAgainJson.success !== false || promptAnsweredAgainJson.error?.code !== "ALREADY_ANSWERED") {
      throw new Error(`Unexpected duplicate prompt response: ${JSON.stringify(promptAnsweredAgainJson)}`);
    }

    const runResExpired = await fetch(`${apiBase}/tasks/${task.id}/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: sessionCookie,
        Origin: origin,
        Referer: origin,
      },
      body: JSON.stringify({ prompt: "Trigger prompt expiration" }),
    });
    if (!runResExpired.ok) {
      const text = await runResExpired.text();
      throw new Error(`Run task for expiration failed: ${runResExpired.status} ${text}`);
    }

    const promptToolCallExpired = await findPromptToolCall(seenPrompts);
    if (!promptToolCallExpired) {
      throw new Error("Prompt tool call not found for expiration test");
    }
    seenPrompts.add(promptToolCallExpired.id);

    await sleep(2500);

    const promptExpiredRes = await fetch(
      `${apiBase}/tasks/${task.id}/prompts/${encodeURIComponent(promptToolCallExpired.input.promptId)}/answer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: sessionCookie,
          Origin: origin,
          Referer: origin,
        },
        body: JSON.stringify({ toolCallId: promptToolCallExpired.id, answer: promptToolCallExpired.input.options[0]?.value ?? "approve" }),
      }
    );
    if (promptExpiredRes.status !== 409) {
      const text = await promptExpiredRes.text();
      throw new Error(`Prompt should expire: ${promptExpiredRes.status} ${text}`);
    }
    const promptExpiredJson = (await promptExpiredRes.json()) as { success?: boolean; error?: { code?: string } };
    if (promptExpiredJson.success !== false || promptExpiredJson.error?.code !== "PROMPT_EXPIRED") {
      throw new Error(`Unexpected expired prompt response: ${JSON.stringify(promptExpiredJson)}`);
    }
  }

  // 10) Fetch messages, inspect, and logs for later inspection
  const msgsRes = await fetch(`${apiBase}/tasks/${task.id}/messages`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
  });
  const messages = msgsRes.ok ? await msgsRes.json() : [];

  const inspectRes = await fetch(`${apiBase}/tasks/${task.id}/inspect`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
  });
  const inspect = inspectRes.ok ? await inspectRes.json() : {};

  const logsRes = await fetch(`${apiBase}/tasks/${task.id}/logs?tail=50`, {
    method: "GET",
    headers: { Cookie: sessionCookie, Origin: origin, Referer: origin },
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
        repo: testRepoUrl
          ? {
              url: testRepoUrl,
              branch: testRepoBranch,
              runnerBackend,
              fileCount: repoFileCount,
            }
          : null,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const exitInfo = serverExit
      ? ` (uiExitCode=${serverExit.code ?? "null"}, uiExitSignal=${serverExit.signal ?? "null"})`
      : "";
    const stderrTail = serverStderrTail.trim() ? `\n${serverStderrTail.trimEnd()}` : "";
    const stdoutTail = serverStdoutTail.trim() ? `\n${serverStdoutTail.trimEnd()}` : "";
    throw new Error(`${message}${exitInfo}${stderrTail}${stdoutTail}`);
  } finally {
    if (server?.pid) {
      try {
        server.kill("SIGTERM");
      } catch {}
    }
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ status: "error", message: err?.message ?? String(err) }, null, 2));
  process.exit(1);
});
