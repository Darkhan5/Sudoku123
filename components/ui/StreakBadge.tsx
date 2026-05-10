"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/types";
import { getPlayer } from "@/lib/storage/player";
import { StreakModal } from "./StreakModal";

export function StreakBadge() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [streak, setStreak] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function sync() {
      const next = getPlayer();
      setPlayer(next);
      setStreak(next?.streak ?? 0);
    }

    sync();
    window.addEventListener("sl:player", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sl:player", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (streak <= 0) return null;

  const isMilestone = [7, 14, 30].includes(streak);

  return (
    <>
      <button
        type="button"
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm ${
          isMilestone ? "streak-milestone" : ""
        }`}
        title={isMilestone ? `${streak}-дневная серия!` : "Серия"}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden>🔥</span>
        <span>{streak}</span>
      </button>
      <StreakModal open={open} player={player} onClose={() => setOpen(false)} />
    </>
  );
}
