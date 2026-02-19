import Docker from "dockerode";
import { DockerProvider } from "./provider.js";
import { SSHTunnel, type TunnelConfig } from "../ssh/tunnel.js";

export class RemoteDockerProvider extends DockerProvider {
  private tunnel: SSHTunnel;

  constructor(config: TunnelConfig) {
    super();
    this.tunnel = new SSHTunnel(config);
  }

  async connect(): Promise<void> {
    const localPort = await this.tunnel.connect();
    // Re-initialize docker client with local port
    this.docker = new Docker({
      host: "127.0.0.1",
      port: localPort,
    });
  }

  async disconnect(): Promise<void> {
    await this.tunnel.disconnect();
  }
}
