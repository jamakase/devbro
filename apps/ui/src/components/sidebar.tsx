"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Server, Settings, Activity, Plus, BookOpen, Database, Puzzle, Plug } from "lucide-react";
import { UserMenu } from "./user-menu";
import { ProjectsSection } from "./sidebar/projects-section";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Servers", href: "/servers", icon: Server },
  { name: "Settings", href: "/settings", icon: Settings },
];

const agentNavigation = [
  { name: "Specs", href: "/specs", icon: BookOpen },
  { name: "Knowledge Bases", href: "/knowledge-bases", icon: Database },
  { name: "Skills", href: "/skills", icon: Puzzle },
  { name: "MCPs", href: "/mcps", icon: Plug },
];

export function Sidebar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const renderNavItems = (items: typeof navigation) =>
    items.map((item) => {
      const isActive =
        pathname === item.href ||
        (item.href !== "/" && pathname.startsWith(item.href));

      return (
        <Link
          key={item.name}
          href={item.href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            isActive
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <item.icon className="h-4 w-4" />
          {item.name}
        </Link>
      );
    });

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-muted/40", className)}>
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Activity className="h-6 w-6" />
          <span>Agent Sandbox</span>
        </Link>
      </div>
      
      <div className="px-4 pt-4">
        <Button asChild className="w-full justify-start gap-2" size="sm">
          <Link href="/tasks/new" onClick={onNavigate}>
            <Plus className="h-4 w-4" />
            New Task
          </Link>
        </Button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-4">
        <ProjectsSection />

        <div className="space-y-2">
          <div className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Agent
          </div>
          <div className="space-y-1">{renderNavItems(agentNavigation)}</div>
        </div>

        <div className="space-y-2">
          <div className="px-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            System
          </div>
          <div className="space-y-1">{renderNavItems(navigation)}</div>
        </div>
      </nav>
      <UserMenu />
    </div>
  );
}
