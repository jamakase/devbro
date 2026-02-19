import { ContainerProvider, DockerProvider, KubernetesProvider, RemoteDockerProvider } from "@agent-sandbox/core";
import { Server } from "@agent-sandbox/shared";

export class ProviderFactory {
  static getProvider(server: Server): ContainerProvider {
    switch (server.type) {
      case "kubernetes":
        if (!server.metadata?.kubeconfig) {
            throw new Error("Kubeconfig missing for Kubernetes server");
        }
        return new KubernetesProvider({
            kubeConfigContent: server.metadata.kubeconfig,
            namespace: server.metadata.namespace
        });
      case "registered":
        // For registered agents, we don't have a direct provider connection from the server side.
        // Operations are pulled by the agent.
        // However, if we need to return something, maybe throw or return a dummy?
        throw new Error("Cannot instantiate provider for Registered Agent directly. Agent must pull tasks.");
      case "ssh":
        if (server.host === "localhost" || server.host === "127.0.0.1") {
             // Local docker
             return new DockerProvider();
        }
        // Remote docker
        return new RemoteDockerProvider({
            host: server.host,
            port: server.port || 22,
            username: server.username || "root",
            authType: server.authType || "ssh-agent",
            privateKey: server.privateKey
        });
      default:
        // Default to local Docker for backward compatibility or unknown types if treated as local
        return new DockerProvider();
    }
  }
}
