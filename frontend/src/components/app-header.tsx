"use client";

import { CalendarClock, LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const navigation = [
  { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/slots", label: "จัดการ Slot", icon: CalendarClock },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2.5 font-bold tracking-tight text-neutral-950">
          <span className="flex size-9 items-center justify-center rounded-lg bg-neutral-950 text-white">
            <CalendarClock aria-hidden="true" className="size-4" />
          </span>
          <span className="hidden sm:inline">QUEUE ADMIN</span>
        </Link>

        <nav aria-label="เมนูหลัก" className="flex items-center gap-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href === "/slots" && pathname === "/add-slot");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition",
                  isActive
                    ? "bg-neutral-100 text-neutral-950"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-950",
                )}
              >
                <Icon aria-hidden="true" className="size-4 sm:hidden" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="hidden text-right sm:block">
            <span className="block text-xs font-medium text-neutral-900">ผู้ดูแลระบบ</span>
            <span className="block text-[11px]">Admin</span>
          </span>
          <span className="flex size-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
            <UserRound aria-hidden="true" className="size-4" />
          </span>
        </div>
      </div>
    </header>
  );
}
