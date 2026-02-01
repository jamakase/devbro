"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serverApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, RefreshCw, Server } from "lucide-react";
import type { ServerAuthType } from "@agent-sandbox/shared";

export default function ServersPage() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [port, setPort] = useState("22");
  const [username, setUsername] = useState("");
  const [authType, setAuthType] = useState<ServerAuthType>("ssh-agent");
  const [privateKey, setPrivateKey] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["servers"],
    queryFn: serverApi.list,
  });

  const createMutation = useMutation({
    mutationFn: serverApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["servers"] });
      toast({ title: "Server added successfully" });
      resetForm();
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
    setName("");
    setHost("");
    setPort("22");
    setUsername("");
    setAuthType("ssh-agent");
    setPrivateKey("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !host.trim() || !username.trim()) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      host: host.trim(),
      port: parseInt(port, 10),
      username: username.trim(),
      authType,
      privateKey: authType === "ssh-key" ? privateKey : undefined,
    });
  };

  const servers = data?.servers ?? [];

  const statusColors: Record<string, string> = {
    connected: "bg-green-500",
    disconnected: "bg-gray-400",
    connecting: "bg-yellow-500",
    error: "bg-red-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Remote Servers</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Server
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Remote Server</CardTitle>
            <CardDescription>
              Configure a remote server for running sandboxes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Production Server"
                    required
                  />
                </div>
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

              <div className="flex gap-4">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Adding..." : "Add Server"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
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
