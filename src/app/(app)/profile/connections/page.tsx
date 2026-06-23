"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { ConnectionsGrid } from "@/components/profile/connections-grid";

export default function ConnectionsPage() {
  const store = useAppStore();

  if (!store.hydrated) {
    return <div className="h-96 animate-pulse rounded-2xl bg-white/5" />;
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/profile"
          className="mb-2 inline-flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Profile
        </Link>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold tracking-tight">
          Connections
        </h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Strava auto-imports your activities; your calendar helps plan around
          meetings. More integrations coming soon.
        </p>
      </div>

      <ConnectionsGrid devices={store.connections} />

      <p className="text-center text-xs text-[var(--muted)]">
        Don&rsquo;t see your device?{" "}
        <span className="text-[var(--accent)]">Let us know</span> and we&rsquo;ll
        prioritise it.
      </p>
    </div>
  );
}
