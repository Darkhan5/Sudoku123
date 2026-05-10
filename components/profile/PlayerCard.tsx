"use client";

/* eslint-disable @next/next/no-img-element */

import type { Player } from "@/types";
import { formatTime } from "@/lib/utils/date";
import { getIconById } from "@/lib/data/icons";
import { countryFlag } from "@/lib/domain/leaderboard";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const activeIcon = getIconById(player.activeIcon);
  const flag = countryFlag(player.countryCode ?? "KZ");

  return (
    <section className="profile-summary">
      {player.avatarUrl ? (
        <img src={player.avatarUrl} alt="" className="h-16 w-16 rounded-2xl object-cover shadow-sm" />
      ) : (
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-4xl shadow-sm" aria-hidden>
          {activeIcon.emoji}
        </div>
      )}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-black text-slate-950">{player.name}</h1>
          <span className={`plan-badge ${player.plan === "diamond" ? "plan-diamond" : ""}`}>
            {player.plan === "diamond" ? "Diamond" : "Бесплатно"}
          </span>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {flag} {player.city}, {player.country}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="stat-pill">
          <span>Серия</span>
          <strong>{player.streak} 🔥</strong>
        </div>
        <div className="stat-pill">
          <span>Решено</span>
          <strong>{player.totalSolved}</strong>
        </div>
        <div className="stat-pill">
          <span>Среднее</span>
          <strong>{player.avgTime ? formatTime(player.avgTime) : "—"}</strong>
        </div>
        <div className="stat-pill">
          <span>Точность</span>
          <strong>{player.totalSolved ? `${player.accuracy}%` : "—"}</strong>
        </div>
      </div>
    </section>
  );
}
