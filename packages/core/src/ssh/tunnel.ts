import { Client, type ConnectConfig } from "ssh2";
import { createServer, type Server as NetServer, type Socket } from "net";
import { SSH_KEEPALIVE_INTERVAL, SSH_RECONNECT_DELAYS, DOCKER_SOCKET_UNIX } from "@agent-sandbox/shared";
import type { ServerAuthType } from "@agent-sandbox/shared";

export interface TunnelConfig {
  host: string;
  port: number;
  username: string;
  authType: ServerAuthType;
  privateKey?: string;
}

export interface TunnelStatus {
  connected: boolean;
  localPort: number | null;
  remoteHost: string;
  error?: string;
}

export class SSHTunnel {
  private client: Client | null = null;
  private localServer: NetServer | null = null;
  private config: TunnelConfig;
  private localPort: number | null = null;
  private reconnectAttempt = 0;
  private keepaliveInterval: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(config: TunnelConfig) {
    this.config = config;
  }

  async connect(): Promise<number> {
    if (this.isDestroyed) {
      throw new Error("Tunnel has been destroyed");
    }

    return new Promise((resolve, reject) => {
      this.client = new Client();

      const connectConfig: ConnectConfig = {
        host: this.config.host,
        port: this.config.port,
        username: this.config.username,
        keepaliveInterval: SSH_KEEPALIVE_INTERVAL,
        keepaliveCountMax: 3,
      };

      if (this.config.authType === "ssh-key" && this.config.privateKey) {
        connectConfig.privateKey = this.config.privateKey;
      } else {
        // Use SSH agent
        connectConfig.agent = process.env["SSH_AUTH_SOCK"];
      }

      this.client.on("ready", async () => {
        try {
          this.localPort = await this.setupLocalServer();
          this.reconnectAttempt = 0;
          this.startKeepalive();
          resolve(this.localPort);
        } catch (error) {
          reject(error);
        }
      });

      this.client.on("error", (err) => {
        this.cleanup();
        reject(err);
      });

      this.client.on("close", () => {
        this.cleanup();
        if (!this.isDestroyed) {
          this.attemptReconnect();
        }
      });

      this.client.connect(connectConfig);
    });
  }

  async disconnect(): Promise<void> {
    this.isDestroyed = true;
    this.cleanup();
  }

  getStatus(): TunnelStatus {
    return {
      connected: this.client !== null && this.localPort !== null,
      localPort: this.localPort,
      remoteHost: this.config.host,
    };
  }

  getLocalPort(): number | null {
    return this.localPort;
  }

  private async setupLocalServer(): Promise<number> {
    return new Promise((resolve, reject) => {
      this.localServer = createServer((socket: Socket) => {
        if (!this.client) {
          socket.destroy();
          return;
        }

        this.client.forwardOut(
          "127.0.0.1",
          socket.remotePort ?? 0,
          DOCKER_SOCKET_UNIX,
          0,
          (err, stream) => {
            if (err) {
              socket.destroy();
              return;
            }

            socket.pipe(stream);
            stream.pipe(socket);

            socket.on("close", () => stream.destroy());
            stream.on("close", () => socket.destroy());
          }
        );
      });

      this.localServer.on("error", reject);

      // Listen on random available port
      this.localServer.listen(0, "127.0.0.1", () => {
        const address = this.localServer?.address();
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Failed to get local port"));
        }
      });
    });
  }

  private startKeepalive(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
    }

    this.keepaliveInterval = setInterval(() => {
      if (this.client) {
        // SSH keepalive is handled by ssh2 library via keepaliveInterval config
        // This is just for monitoring
      }
    }, SSH_KEEPALIVE_INTERVAL);
  }

  private cleanup(): void {
    if (this.keepaliveInterval) {
      clearInterval(this.keepaliveInterval);
      this.keepaliveInterval = null;
    }

    if (this.localServer) {
      this.localServer.close();
      this.localServer = null;
    }

    if (this.client) {
      this.client.end();
      this.client = null;
    }

    this.localPort = null;
  }

  private async attemptReconnect(): Promise<void> {
    if (this.isDestroyed) return;

    const delay = SSH_RECONNECT_DELAYS[this.reconnectAttempt] ?? SSH_RECONNECT_DELAYS[SSH_RECONNECT_DELAYS.length - 1];
    this.reconnectAttempt++;

    await new Promise((resolve) => setTimeout(resolve, delay));

    if (this.isDestroyed) return;

    try {
      await this.connect();
    } catch {
      // Reconnect failed, will try again on next close event
    }
  }
}

// RemoteDockerClient that uses SSH tunnel
import { DockerClient } from "../docker/client.js";

export class RemoteDockerClient extends DockerClient {
  private tunnel: SSHTunnel;

  constructor(tunnelConfig: TunnelConfig) {
    // Will set docker options after tunnel connects
    super();
    this.tunnel = new SSHTunnel(tunnelConfig);
  }

  async connect(): Promise<void> {
    const localPort = await this.tunnel.connect();

    // Reinitialize docker client with tunnel endpoint
    const Docker = (await import("dockerode")).default;
    this["docker"] = new Docker({
      host: "127.0.0.1",
      port: localPort,
    });
  }

  async disconnect(): Promise<void> {
    await this.tunnel.disconnect();
  }

  getTunnelStatus(): TunnelStatus {
    return this.tunnel.getStatus();
  }
}
