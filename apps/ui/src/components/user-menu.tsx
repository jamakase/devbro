"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const router = useRouter();
  const { data } = useSession();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  if (!data?.user) {
    return null;
  }

  return (
    <div className="border-t p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium">{data.user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {data.user.email}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full justify-start gap-2"
        onClick={handleSignOut}
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  );
}
