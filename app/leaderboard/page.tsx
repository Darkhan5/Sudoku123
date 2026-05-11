"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import type { LeaderboardEntry, Player } from "@/types";
import { LEADERBOARD_SCOPES } from "@/lib/domain/leaderboard";
import { fetchLeaderboard, type LeaderboardTab } from "@/lib/storage/leaderboard";
import { getPlayer, initPlayer } from "@/lib/storage/player";
import { formatTime, todayIso } from "@/lib/utils/date";

export default function LeaderboardPage() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [tab, setTab] = useState<LeaderboardTab>("city");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentRank, setCurrentRank] = useState<number | null>(null);
  const [leaderboardDate, setLeaderboardDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setPlayer(getPlayer() ?? initPlayer());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!player) return;
      setLoading(true);
      setError("");
      try {
        const response = await fetchLeaderboard(tab, player.id, player.city, todayIso());
        if (cancelled) return;
        setLeaderboardDate(response.date);
        setCurrentRank(response.currentRank);
        setEntries(
          response.entries.map((entry) => ({
            ...entry,
            isCurrentUser: entry.playerId === player.id
          }))
        );
      } catch (error) {
        if (!cancelled) setError(error instanceof Error ? error.message : "Рейтинг временно недоступен.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [player, tab]);

  return (
    <main className="page-shell">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-primary">Рейтинг</p>
          <h1 className="text-2xl font-black text-slate-950 md:text-3xl">Рейтинг задачи дня</h1>
        </div>
        <div className="segmented-control sm:grid-cols-2" role="tablist" aria-label="Фильтр рейтинга">
          {LEADERBOARD_SCOPES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? "segmented-active" : ""}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <section className="leaderboard-table">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold text-slate-950">{tab === "city" ? `Сегодня в городе ${player?.city ?? ""}` : "Сегодня в Казахстане"}</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">{leaderboardDate || "Сегодня"}</span>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? <div className="px-4 py-8 text-center text-sm text-slate-500">Загружаем рейтинг...</div> : null}
          {error ? <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div> : null}
          {!loading && !error && entries.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              Результатов пока нет. Реши задачу дня, и твой результат появится здесь.
            </div>
          ) : null}
          {!loading && !error
            ? entries.slice(0, 20).map((entry) => (
                <div key={entry.id ?? `${entry.rank}-${entry.name}`} className={`leaderboard-row ${entry.isCurrentUser ? "leaderboard-current" : ""}`}>
                  <span className="w-9 text-sm font-black text-slate-400">#{entry.rank}</span>
                  <div className="relative h-11 w-11 shrink-0">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="h-11 w-11 rounded-full object-cover" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-xl" aria-hidden>
                        {entry.icon}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-slate-950">{entry.name}</p>
                    <p className="truncate text-xs text-slate-500">
                      {entry.countryFlag ? `${entry.countryFlag} ` : ""}
                      {entry.city}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-950">{entry.score} очков</p>
                    <p className="text-xs text-slate-500">
                      {formatTime(entry.time)} · {entry.mistakes ?? 0} ош. · {entry.hintsUsed ?? 0} подсказ.
                    </p>
                  </div>
                </div>
              ))
            : null}
        </div>

        <div className="border-t border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          {currentRank
            ? `Твоё место сегодня ${tab === "city" ? "по городу" : "по Казахстану"}: #${currentRank}`
            : "Твоего результата за сегодня пока нет в этом рейтинге"}
        </div>
      </section>
    </main>
  );
}
