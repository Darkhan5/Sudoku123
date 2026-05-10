"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DiamondCounter } from "@/components/ui/DiamondCounter";
import { StreakBadge } from "@/components/ui/StreakBadge";

const NAV_ITEMS = [
  { href: "/", label: "Сегодня", icon: "today" },
  { href: "/play", label: "Игра", icon: "play" },
  { href: "/arena", label: "PvP", icon: "pvp" },
  { href: "/leaderboard", label: "Рейтинг", icon: "leaderboard" },
  { href: "/profile", label: "Профиль", icon: "profile" }
];

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  if (name === "today") {
    return (
      <svg {...common}>
        <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />
        <path d="M8 2v4M16 2v4M4 9h16" />
        <path d="M8 13h3M8 17h6" />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg {...common}>
        <path d="M8 5v14l11-7z" />
      </svg>
    );
  }

  if (name === "pvp") {
    return (
      <svg {...common}>
        <path d="M13 2 4 14h7l-1 8 10-13h-7z" />
      </svg>
    );
  }

  if (name === "leaderboard") {
    return (
      <svg {...common}>
        <path d="M4 19V9M12 19V5M20 19v-7" />
        <path d="M3 19h18" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function Navigation() {
  const pathname = usePathname();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 hidden h-16 border-b border-slate-200 bg-white/90 backdrop-blur md:block">
        <div className="mx-auto flex h-full max-w-6xl items-center justify-between px-6">
          <Link href="/" className="text-lg font-black text-slate-950" aria-label="Судоку">
            Судоку
          </Link>
          <nav className="flex items-center gap-1" aria-label="Основная навигация">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`}>
                  <span className="nav-icon">
                    <NavIcon name={item.icon} />
                  </span>
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
        <Link href="/" className="text-base font-black text-slate-950" aria-label="Судоку">
          Судоку
        </Link>
        <div className="flex items-center gap-2">
          <StreakBadge />
          <DiamondCounter />
        </div>
      </header>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-5 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Основная навигация"
      >
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className={`mobile-nav-link ${active ? "mobile-nav-link-active" : ""}`}>
              <span className="nav-icon">
                <NavIcon name={item.icon} />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
