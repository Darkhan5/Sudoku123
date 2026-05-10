"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DiamondCounter } from "@/components/ui/DiamondCounter";
import { StreakBadge } from "@/components/ui/StreakBadge";

const NAV_ITEMS = [
  { href: "/", label: "Сегодня", icon: "🏠" },
  { href: "/play", label: "Игра", icon: "🎮" },
  { href: "/leaderboard", label: "Рейтинг", icon: "🏆" },
  { href: "/profile", label: "Профиль", icon: "👤" }
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 hidden h-16 border-b border-slate-200 bg-white/90 backdrop-blur md:block">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-black text-slate-950" aria-label="Қазақ Судоку">
            Қазақ Судоку
          </Link>
          <nav className="flex items-center gap-1" aria-label="Основная навигация">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                  <span aria-hidden>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <StreakBadge />
            <DiamondCounter />
          </div>
        </div>
      </header>

      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:hidden">
        <Link href="/" className="text-base font-black text-slate-950" aria-label="Қазақ Судоку">
          Судоку
        </Link>
        <div className="flex items-center gap-2">
          <StreakBadge />
          <DiamondCounter />
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-4 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Основная навигация"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}>
              <span aria-hidden className="text-lg">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
