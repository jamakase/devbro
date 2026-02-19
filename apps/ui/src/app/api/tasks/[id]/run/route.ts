import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { TaskRepository, MessageRepository, ServerRepository, ProviderFactory } from "@agent-sandbox/server";
import { CLIProvisioner } from "@agent-sandbox/core";
import { requireAuth } from "@/lib/auth-server";
import { WORKSPACE_MOUNT_PATH } from "@agent-sandbox/shared";
import type { ContainerProvider } from "@agent-sandbox/core";
import type {
  KnowledgeBaseConfig,
  McpConfig,
  SandboxBootstrapPlan,
  SkillsConfig,
  ToolCall,
} from "@agent-sandbox/shared";

const taskRepo = new TaskRepository();
const serverRepo = new ServerRepository();
const messageRepo = new MessageRepository();

function normalizeSkillsConfig(raw: SkillsConfig | undefined): Required<SkillsConfig> {
  const enabledSkillIds = (raw?.enabledSkillIds ?? []).filter(
    (id): id is string => typeof id === "string" && id.length > 0
  );
  return { enabledSkillIds: Array.from(new Set(enabledSkillIds)) };
}

function normalizeMcpConfig(raw: McpConfig | undefined): McpConfig {
  const servers = raw?.mcpServers ?? {};
  const normalized: McpConfig["mcpServers"] = {};

  for (const [key, value] of Object.entries(servers)) {
    if (!key) continue;
    if (!value || typeof value !== "object") continue;
    const v = value as { command?: unknown; args?: unknown; env?: unknown };
    if (typeof v.command !== "string" || v.command.length === 0) continue;

    normalized[key] = {
      command: v.command,
      args: Array.isArray(v.args) ? v.args.filter((a): a is string => typeof a === "string") : undefined,
      env:
        v.env && typeof v.env === "object"
          ? Object.fromEntries(
              Object.entries(v.env as Record<string, unknown>).filter(
                (e): e is [string, string] => typeof e[0] === "string" && typeof e[1] === "string"
              )
            )
          : undefined,
    };
  }

  return { mcpServers: normalized };
}

function shellEscape(value: string): string {
  return `'${value.split("'").join("'\"'\"'")}'`;
}

async function applyBootstrap(
  provider: ContainerProvider,
  containerId: string,
  input: { skills?: SkillsConfig; mcp?: McpConfig; bootstrap?: SandboxBootstrapPlan }
) {
  const skills = normalizeSkillsConfig({
    enabledSkillIds: input.bootstrap?.enabledSkillIds ?? input.skills?.enabledSkillIds,
  });
  const mcp = normalizeMcpConfig(input.bootstrap?.mcpConfig ?? input.mcp);

  const skillsJson = JSON.stringify({ enabledSkillIds: skills.enabledSkillIds }, null, 2);
  const mcpJson = JSON.stringify(mcp, null, 2);

  const specsRepoUrl = input.bootstrap?.specsRepoUrl?.trim();
  const specsBranch = input.bootstrap?.specsBranch?.trim();
  const shouldPullSpecs = Boolean(input.bootstrap?.pullSpecs && specsRepoUrl);
  const specsDir = `${WORKSPACE_MOUNT_PATH}/specs`;

  const scriptLines = [
    "set -e",
    `mkdir -p ${WORKSPACE_MOUNT_PATH}/.agent`,
    `cat > ${WORKSPACE_MOUNT_PATH}/.agent/skills.json <<'EOF'\n${skillsJson}\nEOF`,
    `cat > ${WORKSPACE_MOUNT_PATH}/mcp.json <<'EOF'\n${mcpJson}\nEOF`,
  ];

  if (shouldPullSpecs) {
    scriptLines.push(`if [ -d ${specsDir}/.git ]; then`);
    scriptLines.push(`  git -C ${specsDir} remote set-url origin ${shellEscape(specsRepoUrl!)}`);
    if (specsBranch) {
      scriptLines.push(`  git -C ${specsDir} fetch --depth 1 origin ${shellEscape(specsBranch)}`);
      scriptLines.push(`  git -C ${specsDir} checkout -B ${shellEscape(specsBranch)} FETCH_HEAD`);
    } else {
      scriptLines.push(`  git -C ${specsDir} fetch --depth 1 origin`);
      scriptLines.push(`  git -C ${specsDir} pull --ff-only`);
    }
    scriptLines.push(`else`);
    scriptLines.push(`  rm -rf ${specsDir}`);
    if (specsBranch) {
      scriptLines.push(
        `  git clone --depth 1 --branch ${shellEscape(specsBranch)} ${shellEscape(specsRepoUrl!)} ${specsDir}`
      );
    } else {
      scriptLines.push(`  git clone --depth 1 ${shellEscape(specsRepoUrl!)} ${specsDir}`);
    }
    scriptLines.push(`fi`);
  }

  const cmd = [
    "bash",
    "-lc",
    scriptLines.join("\n"),
  ];

  const result = await provider.executeCommand(containerId, cmd);
  if (result.exitCode !== 0) {
    throw new Error(result.output || "Bootstrap failed");
  }
}

function normalizeKnowledgeBaseConfig(raw: KnowledgeBaseConfig | undefined): KnowledgeBaseConfig {
  const enabled = raw?.enabled ?? false;
  const indexing = raw?.indexing;
  return {
    enabled,
    indexing: indexing ?? { status: "idle" },
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const prompt: string = body?.prompt ?? "";
    const overrideKey: string | undefined = body?.anthropicApiKey;

    const task = await taskRepo.getTaskWithOwnerCheck(id, session.user.id);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Check server type and get provider
    let server = null;
    if (task.serverId) {
        server = await serverRepo.findById(task.serverId);
    }

    if (server && server.type === 'registered') {
        // Queue the task for the agent
        await taskRepo.update(id, {
            status: "pending",
            lastActivityAt: new Date(),
        });

        return NextResponse.json({ 
            success: true,
            message: "Task queued for Registered Agent",
            queued: true 
        });
    }

    let provider;
    try {
        if (server) {
            provider = ProviderFactory.getProvider(server);
        } else {
             provider = ProviderFactory.getProvider({
                 type: 'ssh',
                 host: 'localhost',
                 id: 'local',
                 userId: session.user.id,
                 name: 'Local',
                 status: 'connected',
                 isDefault: true,
                 createdAt: new Date(),
                 updatedAt: new Date(),
                 lastConnectedAt: new Date(),
                 errorMessage: null
             });
        }
    } catch (e) {
        return NextResponse.json({ error: `Failed to get provider: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }

    const provisioner = new CLIProvisioner(provider);

    let containerId = task.containerId;
    let volumeId = task.volumeId;
    const apiKey = overrideKey ?? (task.config as any)?.anthropicApiKey;
    const bootstrap = task.config?.bootstrap;
    let nextConfig = task.config ?? {};

    if (!containerId) {
      const result = await provider.createContainer(id, {
        ...task.config,
        cpuLimit: task.config.cpuLimit ? parseInt(task.config.cpuLimit) : undefined,
        apiKey,
      } as any);
      containerId = result.containerId;
      volumeId = result.volumeId;
    }

    if (containerId) {
      await provider.startContainer(containerId);
    }

    await applyBootstrap(provider, containerId!, {
      skills: task.config?.skills,
      mcp: task.config?.mcp,
      bootstrap: task.config?.bootstrap,
    });

    // Setup environment (git clone, etc.)
    const setup = await provisioner.setupEnvironment(containerId!, task.config as any);
    if (!setup.success) {
      throw new Error(setup.message);
    }

    if (bootstrap?.enableKnowledgeBase) {
      const kb = normalizeKnowledgeBaseConfig(nextConfig.knowledgeBase);
      nextConfig = {
        ...nextConfig,
        knowledgeBase: {
          enabled: true,
          indexing: kb.indexing ?? { status: "idle" },
        },
      };
      await taskRepo.update(id, { config: nextConfig, lastActivityAt: new Date() });
    }

    if (bootstrap?.enableKnowledgeBase && bootstrap?.buildKnowledgeBaseIndex && containerId) {
      const kbIndexStartedAt = new Date().toISOString();
      nextConfig = {
        ...nextConfig,
        knowledgeBase: {
          enabled: true,
          indexing: {
            status: "indexing",
            startedAt: kbIndexStartedAt,
          },
        },
      };
      await taskRepo.update(id, { config: nextConfig, lastActivityAt: new Date() });

      void (async () => {
        const cmd = [
          "bash",
          "-lc",
          `cd ${WORKSPACE_MOUNT_PATH} && find . -type f -not -path "./.git/*" -not -path "./node_modules/*" | wc -l`,
        ];
        const result = await provider.executeCommand(containerId!, cmd);
        const finishedAt = new Date().toISOString();
        const latest = await taskRepo.findById(id);
        const currentConfig = latest?.config ?? nextConfig;

        if (result.exitCode !== 0) {
          await taskRepo.update(id, {
            config: {
              ...currentConfig,
              knowledgeBase: {
                enabled: true,
                indexing: {
                  status: "error",
                  startedAt: kbIndexStartedAt,
                  finishedAt,
                  errorMessage: result.output || "Indexing failed",
                },
              },
            },
            lastActivityAt: new Date(),
          });
          return;
        }

        const fileCount = Number.parseInt(result.output.trim(), 10);
        await taskRepo.update(id, {
          config: {
            ...currentConfig,
            knowledgeBase: {
              enabled: true,
              indexing: {
                status: "ready",
                startedAt: kbIndexStartedAt,
                finishedAt,
                lastIndexedAt: finishedAt,
                fileCount: Number.isFinite(fileCount) ? fileCount : undefined,
              },
            },
          },
          lastActivityAt: new Date(),
        });
      })();
    }

    const cliTool = task.cliTool === "claude" ? "claude-code" : "opencode";
    const install = await provisioner.installAgent(containerId!, cliTool as any);
    if (!install.success) {
      throw new Error(install.message);
    }
    const result = await provisioner.executeAgentTask(containerId!, cliTool as any, prompt, apiKey);

    await taskRepo.update(id, {
      status: result.success ? "running" : "error",
      containerId,
      volumeId,
      lastActivityAt: new Date(),
    });

    const runnerToolCalls = (result as { toolCalls?: ToolCall[] }).toolCalls ?? [];
    const toolCalls: ToolCall[] = [
      ...runnerToolCalls,
      {
        id: randomUUID(),
        type: "cli",
        name: cliTool,
        input: { prompt },
        output: result.output,
      },
    ];

    await messageRepo.create({
      taskId: id,
      role: "assistant",
      content: result.output ?? "",
      toolCalls,
    });

    return NextResponse.json({
      success: result.success,
      exitCode: result.exitCode,
      output: result.output,
      installed: install.success,
      version: install.version,
      fallback: install.usedFallback,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to run task", message }, { status: 500 });
  }
}
