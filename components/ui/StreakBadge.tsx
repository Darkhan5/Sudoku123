"use client";

import { useEffect, useState } from "react";
import type { Player } from "@/types";
import { getDailyLoginRewardState } from "@/lib/storage/economy";
import { getPlayer } from "@/lib/storage/player";
import { StreakModal } from "./StreakModal";

export function StreakBadge() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [streak, setStreak] = useState(0);
  const [loginDates, setLoginDates] = useState<string[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function sync() {
      const next = getPlayer();
      const loginState = getDailyLoginRewardState();
      setPlayer(next);
      setStreak(loginState.streak || next?.streak || 0);
      setLoginDates(loginState.claimedDates ?? []);
    }

    sync();
    window.addEventListener("sl:player", sync);
    window.addEventListener("sl:login-reward", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sl:player", sync);
      window.removeEventListener("sl:login-reward", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isMilestone = [7, 14, 30].includes(streak);

  return (
    <>
      <button
        type="button"
        className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm ${
          isMilestone ? "streak-milestone" : ""
        }`}
        title={isMilestone ? `${streak} дней серии!` : "Ежедневная серия"}
        onClick={() => setOpen(true)}
      >
        <span className="streak-flame-icon" aria-hidden />
        <span>{streak}</span>
      </button>
      <StreakModal open={open} player={player} streakOverride={streak} playedDatesOverride={loginDates} onClose={() => setOpen(false)} />
    </>
  );
}
