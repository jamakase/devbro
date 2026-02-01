import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/lib/query-provider";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { ConnectionStatus } from "@/components/connection-status";
import { ErrorBoundary } from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Agent Sandbox",
  description: "Isolated environments for AI coding assistants",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <div className="flex h-screen">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="flex items-center justify-end h-14 px-6 border-b">
                <ConnectionStatus />
              </header>
              <main className="flex-1 overflow-auto p-6">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
            </div>
          </div>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}
