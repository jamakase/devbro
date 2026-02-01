"use client";

import { useQuery } from "@tanstack/react-query";
import { healthApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["health"],
    queryFn: healthApi.check,
    refetchInterval: 30000,
    retry: 1,
  });

  const isConnected = data?.dockerAvailable && !isError;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          isLoading ? "bg-yellow-500 animate-pulse" : isConnected ? "bg-green-500" : "bg-red-500"
        )}
      />
      <span className="text-muted-foreground">
        {isLoading ? "Checking..." : isConnected ? "Docker Connected" : "Docker Unavailable"}
      </span>
    </div>
  );
}
