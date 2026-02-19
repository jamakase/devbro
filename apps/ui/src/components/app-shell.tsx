"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { ConnectionStatus } from "@/components/connection-status";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

const publicRoutePrefixes = ["/login", "/register"];

function isPublicRoute(pathname: string) {
  return publicRoutePrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isPublic = isPublicRoute(pathname);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isPublic) return;
    if (isLoading) return;
    if (!isAuthenticated) {
      const callbackUrl = pathname === "/" ? "/" : pathname;
      router.replace(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      router.refresh();
    }
  }, [isAuthenticated, isLoading, isPublic, pathname, router]);

  if (isPublic) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className="absolute inset-y-0 left-0 w-64"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar className="h-full" onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <ConnectionStatus />
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
