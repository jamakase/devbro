"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Server, Settings, Activity } from "lucide-react";
import { UserMenu } from "./user-menu";
import { ProjectsSection } from "./sidebar/projects-section";

const navigation = [
  { name: "Servers", href: "/servers", icon: Server },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-muted/40">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Activity className="h-6 w-6" />
          <span>Agent Sandbox</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-4">
        <ProjectsSection />

        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.name}
                href={item.href}
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
          })}
        </div>
      </nav>
      <UserMenu />
    </div>
  );
}
