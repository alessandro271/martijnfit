"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/tracker", label: "Tracker" },
  { href: "/plan", label: "Plan" },
  { href: "/log", label: "Log" },
  { href: "/profile", label: "Profile" },
] as const;

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/tracker"
            ? pathname === "/tracker"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)]"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
