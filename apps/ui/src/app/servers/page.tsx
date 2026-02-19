"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Plus, Trash2, RefreshCw, Server, Copy, Check } from "lucide-react";
import type { ServerAuthType, ServerType } from "@agent-sandbox/shared";

export default function ServersPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [serverType, setServerType] = useState<ServerType>("ssh");
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState<ServerAuthType>("ssh-agent");
  const [privateKey, setPrivateKey] = useState("");
  const [kubeconfig, setKubeconfig] = useState("");
  const [k8sContext, setK8sContext] = useState("");
  const [k8sNamespace, setK8sNamespace] = useState("default");
  const [createdCredentials, setCreatedCredentials] = useState<{id: string, token: string} | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["servers"],
    queryFn: serverApi.list,
  });

  const createMutation = useMutation({
    mutationFn: serverApi.create,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      toast({ title: "Server added successfully" });
      
      if (response.server.type === "registered" && response.server.token) {
          setCreatedCredentials({
              id: response.server.id,
              token: response.server.token
          });
          // Don't reset form yet, so user can see credentials
      } else {
          resetForm();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to add server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: serverApi.test,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      if (data.result.success) {
        toast({
          title: "Connection successful",
          description: `Docker ${data.result.dockerVersion} available`,
        });
      } else {
        toast({
          title: "Connection failed",
          description: data.result.message,
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => serverApi.delete(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      toast({ title: "Server removed" });
    },
    onError: (error) => {
      toast({
        title: "Failed to remove server",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setShowAddForm(false);
    setServerType("ssh");
    setName("");
    setHost("");
    setPort("22");
    setUsername("");
    setAuthType("ssh-agent");
    setPrivateKey("");
    setKubeconfig("");
    setK8sContext("");
    setK8sNamespace("default");
    setCreatedCredentials(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (serverType === "ssh") {
        if (!host.trim() || !username.trim()) {
            toast({
                title: "Host and username are required for SSH servers",
                variant: "destructive",
            });
            return;
        }
    } else if (serverType === "kubernetes") {
        if (!kubeconfig.trim()) {
            toast({
                title: "Kubeconfig is required for Kubernetes servers",
                variant: "destructive",
            });
            return;
        }
    }

    createMutation.mutate({
      name: name.trim(),
      type: serverType,
      host: serverType === "registered" ? "agent" : (serverType === "kubernetes" ? "kubernetes" : host.trim()),
      port: (serverType === "registered" || serverType === "kubernetes") ? undefined : parseInt(port, 10),
      username: (serverType === "registered" || serverType === "kubernetes") ? undefined : username.trim(),
      authType: (serverType === "registered" || serverType === "kubernetes") ? undefined : authType,
      privateKey: serverType === "ssh" && authType === "ssh-key" ? privateKey : undefined,
      metadata: serverType === "kubernetes" ? {
          kubeconfig: kubeconfig.trim(),
          context: k8sContext.trim() || undefined,
          namespace: k8sNamespace.trim() || "default",
      } : undefined,
    });
  };

  const servers = data?.servers ?? [];

  const statusColors: Record<string, string> = {
    connected: "bg-green-500",
    disconnected: "bg-gray-400",
    connecting: "bg-yellow-500",
    error: "bg-red-500",
  };
  
  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold">Remote Servers</h2>
          <p className="text-sm text-muted-foreground">
            Manage agent runtimes and execution environments.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Server
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Server</CardTitle>
            <CardDescription>
              Configure a remote server or register a new agent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {createdCredentials ? (
                <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-md border border-green-200">
                        <div className="flex items-center gap-2 text-green-700 mb-2">
                            <Check className="h-5 w-5" />
                            <span className="font-semibold">Server Registered Successfully</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Run the following command on your server to connect the agent:
                        </p>
                        <div className="relative group">
                            <pre className="bg-black text-white p-3 rounded text-xs overflow-x-auto">
                                {`npx agent-cli connect --url ${window.location.origin} --serverId ${createdCredentials.id} --token ${createdCredentials.token}`}
                            </pre>
                            <Button 
                                size="icon" 
                                variant="ghost" 
                                className="absolute top-1 right-1 h-6 w-6 text-white hover:text-gray-300 hover:bg-transparent"
                                onClick={() => copyToClipboard(`npx agent-cli connect --url ${window.location.origin} --serverId ${createdCredentials.id} --token ${createdCredentials.token}`)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <Button onClick={resetForm}>Done</Button>
                </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serverType">Server Type</Label>
                <Select
                  value={serverType}
                  onValueChange={(value: string) =>
                    setServerType(value as ServerType)
                  }
                >
                  <SelectTrigger id="serverType">
                    <SelectValue placeholder="Server Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssh">SSH Server</SelectItem>
                    <SelectItem value="registered">Registered Agent</SelectItem>
                    <SelectItem value="kubernetes">Kubernetes Cluster</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={serverType === 'registered' ? "My Agent" : (serverType === 'kubernetes' ? "My Cluster" : "Production Server")}
                    required
                  />
              </div>

              {serverType === "kubernetes" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="kubeconfig">Kubeconfig</Label>
                      <Textarea
                        id="kubeconfig"
                        value={kubeconfig}
                        onChange={(e) => setKubeconfig(e.target.value)}
                        placeholder="Paste your kubeconfig here..."
                        className="font-mono text-xs"
                        rows={10}
                        required
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="context">Context (Optional)</Label>
                        <Input
                          id="context"
                          value={k8sContext}
                          onChange={(e) => setK8sContext(e.target.value)}
                          placeholder="Default from kubeconfig"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="namespace">Namespace</Label>
                        <Input
                          id="namespace"
                          value={k8sNamespace}
                          onChange={(e) => setK8sNamespace(e.target.value)}
                          placeholder="default"
                        />
                      </div>
                    </div>
                  </>
              )}

              {serverType === "ssh" && (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                        <Label htmlFor="host">Host</Label>
                        <Input
                            id="host"
                            value={host}
                            onChange={(e) => setHost(e.target.value)}
                            placeholder="server.example.com"
                            required
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="port">Port</Label>
                        <Input
                            id="port"
                            type="number"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            placeholder="22"
                        />
                        </div>
                        <div className="space-y-2">
                        <Label htmlFor="username">Username</Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="ubuntu"
                            required
                        />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="authType">Authentication</Label>
                        <Select
                        value={authType}
                        onValueChange={(value: string) =>
                            setAuthType(value as ServerAuthType)
                        }
                        >
                        <SelectTrigger id="authType">
                            <SelectValue placeholder="Authentication" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ssh-agent">SSH Agent</SelectItem>
                            <SelectItem value="ssh-key">SSH Private Key</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>

                    {authType === "ssh-key" && (
                        <div className="space-y-2">
                        <Label htmlFor="privateKey">Private Key</Label>
                        <textarea
                            id="privateKey"
                            value={privateKey}
                            onChange={(e) => setPrivateKey(e.target.value)}
                            placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
                        />
                        </div>
                    )}
                  </>
              )}

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Server"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
            )}
          </CardContent>
        </Card>
      )}

      {isError ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {(error as Error | null)?.message ?? "Failed to load servers."}
            </p>
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : servers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-32">
            <Server className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No remote servers configured</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {servers.map((server) => (
            <Card key={server.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg">{server.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      statusColors[server.status] ?? "bg-gray-400"
                    }`}
                  />
                  <span className="text-sm text-muted-foreground capitalize">
                    {server.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-1 text-sm">
                  {server.type === "registered" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="capitalize">Registered Agent</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span>
                          {server.metadata?.dockerVersion || "Unknown"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Seen</span>
                        <span>
                          {server.lastConnectedAt
                            ? new Date(server.lastConnectedAt).toLocaleString()
                            : "Never"}
                        </span>
                      </div>
                    </>
                  ) : server.type === "kubernetes" ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <span className="capitalize">Kubernetes Cluster</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Namespace</span>
                        <span>{server.metadata?.namespace || "default"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Context</span>
                        <span>{server.metadata?.context || "default"}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Host</span>
                        <span>
                          {server.host}:{server.port}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">User</span>
                        <span>{server.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Auth</span>
                        <span>{server.authType}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tasks</span>
                    <span>{server.taskCount}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testMutation.mutate(server.id)}
                    disabled={testMutation.isPending}
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-1 ${
                        testMutation.isPending ? "animate-spin" : ""
                      }`}
                    />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm(
                          "Are you sure you want to remove this server?"
                        )
                      ) {
                        deleteMutation.mutate(server.id);
                      }
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
