"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { healthApi, githubApi } from "@/lib/api";
import { useSession, linkGitHubAccount } from "@/lib/auth-client";
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
import { CheckCircle, XCircle, Github, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [defaultMemory, setDefaultMemory] = useState("2g");
  const [defaultCpu, setDefaultCpu] = useState("2");
  const [isConnectingGitHub, setIsConnectingGitHub] = useState(false);

  const { data: session } = useSession();
  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30000, // Check every 30 seconds
  });

  const { data: githubStatus, refetch: refetchGitHubStatus } = useQuery({
    queryKey: ["github-status"],
    queryFn: githubApi.getStatus,
    enabled: !!session?.user,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("agent-sandbox-settings");
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        setAnthropicKey(settings.anthropicKey ?? "");
        setGithubToken(settings.githubToken ?? "");
        setDefaultMemory(settings.defaultMemory ?? "2g");
        setDefaultCpu(settings.defaultCpu ?? "2");
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  const handleSave = () => {
    const settings = {
      anthropicKey,
      githubToken,
      defaultMemory,
      defaultCpu,
    };
    localStorage.setItem("agent-sandbox-settings", JSON.stringify(settings));
    toast({ title: "Settings saved" });
  };

  const handleConnectGitHub = async () => {
    setIsConnectingGitHub(true);
    try {
      const result = await linkGitHubAccount();
      if (result.error) {
        toast({
          title: "Failed to connect GitHub",
          description: result.error.message || "Please try again",
          variant: "destructive",
        });
        setIsConnectingGitHub(false);
      }
      // On success, OAuth redirect will happen
    } catch (error) {
      toast({
        title: "Failed to connect GitHub",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsConnectingGitHub(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    try {
      await githubApi.disconnect();
      toast({ title: "GitHub disconnected" });
      refetchGitHubStatus();
    } catch (error) {
      toast({
        title: "Failed to disconnect GitHub",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Configure integrations and defaults for new runs.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Docker Status</CardTitle>
          <CardDescription>Local Docker daemon status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {health?.dockerAvailable ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Docker {health.dockerVersion} is available</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-destructive">
                  {health?.message ?? "Docker is not available"}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GitHub Connection</CardTitle>
          <CardDescription>
            Connect your GitHub account to access repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {githubStatus?.connected ? (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <Github className="h-5 w-5" />
                <div>
                  <p className="font-medium">Connected to GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    @{githubStatus.username}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectGitHub}
              >
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Github className="h-5 w-5" />
                <span>Not connected to GitHub</span>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleConnectGitHub}
                disabled={isConnectingGitHub}
              >
                {isConnectingGitHub ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    Connect GitHub
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure API keys for AI tools and GitHub
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anthropicKey">Anthropic API Key</Label>
            <Input
              id="anthropicKey"
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
            />
            <p className="text-xs text-muted-foreground">
              Required for Claude Code. Will be passed to sandboxes.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="githubToken">GitHub Personal Access Token</Label>
            <Input
              id="githubToken"
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_..."
            />
            <p className="text-xs text-muted-foreground">
              Optional. Used for cloning private repositories.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Resource Limits</CardTitle>
          <CardDescription>
            Default settings for new sandboxes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultMemory">Default Memory Limit</Label>
            <Select
              value={defaultMemory}
              onValueChange={(value: string) => setDefaultMemory(value)}
            >
              <SelectTrigger id="defaultMemory">
                <SelectValue placeholder="Select memory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1g">1 GB</SelectItem>
                <SelectItem value="2g">2 GB</SelectItem>
                <SelectItem value="4g">4 GB</SelectItem>
                <SelectItem value="8g">8 GB</SelectItem>
                <SelectItem value="16g">16 GB</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultCpu">Default CPU Cores</Label>
            <Select
              value={defaultCpu}
              onValueChange={(value: string) => setDefaultCpu(value)}
            >
              <SelectTrigger id="defaultCpu">
                <SelectValue placeholder="Select CPU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 Core</SelectItem>
                <SelectItem value="2">2 Cores</SelectItem>
                <SelectItem value="4">4 Cores</SelectItem>
                <SelectItem value="8">8 Cores</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave}>Save Settings</Button>
    </div>
  );
}
