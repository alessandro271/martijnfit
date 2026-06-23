import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { ChatWrapper } from "@/components/chat/chat-wrapper";
import { DashboardShell } from "@/components/shell/dashboard-shell";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <div className="min-h-screen pb-24 lg:pb-0">
        <header className="sticky top-0 z-40 border-b border-[var(--card-border)] bg-[var(--background)]/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
            <h1 className="font-[family-name:var(--font-heading)] text-lg font-bold tracking-tight">
              Martijn<span className="text-[var(--accent)]">fit</span>
            </h1>

            <TopNav />

            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)]/15 text-sm font-semibold text-[var(--accent)] ring-2 ring-transparent transition-all hover:ring-[var(--accent)]/30">
                M
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>

        <BottomNav />
      </div>
      <ChatWrapper />
    </DashboardShell>
  );
}
