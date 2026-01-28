// Container configuration
export const DEFAULT_CONTAINER_IMAGE = "node:20-bookworm";
export const WORKSPACE_MOUNT_PATH = "/workspace";
export const VOLUME_NAME_PREFIX = "agent-sandbox-";

// Default resource limits
export const DEFAULT_MEMORY_LIMIT = "2g";
export const DEFAULT_CPU_LIMIT = 2;

// CLI tools
export const CLI_TOOLS = {
  "claude-code": {
    name: "Claude Code",
    installCommand: "npm install -g @anthropic-ai/claude-code@latest",
    fallbackVersion: "@anthropic-ai/claude-code@0.1.0",
    fallbackCommand: "npm install -g @anthropic-ai/claude-code@0.1.0",
    envVar: "ANTHROPIC_API_KEY",
  },
  opencode: {
    name: "OpenCode",
    installCommand: "npm install -g opencode-ai@latest",
    fallbackVersion: "opencode-ai@1.1.25",
    fallbackCommand: "npm install -g opencode-ai@1.1.25",
    envVar: "ANTHROPIC_API_KEY",
  },
} as const;

// SSH configuration
export const DEFAULT_SSH_PORT = 22;
export const SSH_KEEPALIVE_INTERVAL = 60000; // 60 seconds
export const SSH_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000]; // Exponential backoff

// Docker socket paths
export const DOCKER_SOCKET_UNIX = "/var/run/docker.sock";
export const DOCKER_SOCKET_WINDOWS = "//./pipe/docker_engine";

// Timeouts
export const CONTAINER_STOP_TIMEOUT = 30; // seconds before SIGKILL
export const HEALTH_CHECK_TIMEOUT = 5000; // ms

// Volume thresholds
export const VOLUME_SIZE_WARNING_THRESHOLD = 10 * 1024 * 1024 * 1024; // 10GB

// Server resource thresholds
export const SERVER_MEMORY_WARNING_PERCENT = 90;
export const SERVER_DISK_WARNING_PERCENT = 90;

// API
export const API_BASE_PATH = "/api";
