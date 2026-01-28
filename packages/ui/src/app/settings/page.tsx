"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api";
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
import { CheckCircle, XCircle } from "lucide-react";

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [defaultMemory, setDefaultMemory] = useState("2g");
  const [defaultCpu, setDefaultCpu] = useState("2");

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30000, // Check every 30 seconds
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

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Settings</h2>

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
