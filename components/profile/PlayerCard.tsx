"use client";

/* eslint-disable @next/next/no-img-element */

import type { Player } from "@/types";
import { formatTime } from "@/lib/utils/date";
import { getIconById } from "@/lib/data/icons";
import { rankLabel, rankProgressPercent, xpUntilNextRank } from "@/lib/domain/progression";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";

interface PlayerCardProps {
  player: Player;
}

export function PlayerCard({ player }: PlayerCardProps) {
  const activeIcon = getIconById(player.activeIcon);
  const xp = player.xp ?? 0;
  const rank = player.rank ?? "bronze-i";
  const xpLeft = xpUntilNextRank(xp);
  const xpProgress = rankProgressPercent(xp);

  return (
    <section className="profile-summary">
      <div className="profile-avatar-wrap">
        {player.avatarUrl ? (
          <img src={player.avatarUrl} alt="" className="profile-avatar" />
        ) : (
          <div className="profile-avatar" aria-hidden>
            {activeIcon.emoji}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="truncate text-2xl font-black text-slate-950">{player.name}</h1>
          {player.plan === "diamond" || player.plan === "sudoku-pass" ? (
            <span className="diamond-icon-badge" role="img" aria-label="Алмазная подписка">
              <DiamondGlyph className="diamond-glyph-sm" />
            </span>
          ) : null}
          <span className="rank-badge">{rankLabel(rank)}</span>
        </div>
        <p className="mt-1 text-sm font-semibold text-slate-600">{player.title ?? "Титул откроется после первой игры"}</p>
        <p className="mt-1 text-sm text-slate-500">{player.city || "Город не указан"}</p>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>{rankLabel(rank)}</span>
            <span>{xpLeft > 0 ? `До следующего ранга: ${xpLeft} XP` : "Максимальный ранг"}</span>
          </div>
          <div className="progress-rail mt-1" aria-label="Прогресс ранга">
            <span style={{ width: `${xpProgress}%` }} />
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500">{xp.toLocaleString("ru-RU")} XP всего</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="stat-pill">
          <span>Серия</span>
          <strong>{player.streak}</strong>
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
          <span>Уровень</span>
          <strong>{player.level ?? 1}</strong>
        </div>
      </div>
    </section>
  );
}
