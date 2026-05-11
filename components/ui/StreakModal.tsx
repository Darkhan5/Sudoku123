"use client";

import type { Player } from "@/types";
import { buildStreakCalendar } from "@/lib/domain/streak";

interface StreakModalProps {
  open: boolean;
  player: Player | null;
  streakOverride?: number;
  playedDatesOverride?: string[];
  onClose: () => void;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function StreakModal({ open, player, streakOverride, playedDatesOverride, onClose }: StreakModalProps) {
  if (!open) return null;

  const playedDates = playedDatesOverride?.length ? playedDatesOverride : player?.playedDates ?? (player?.lastPlayedDate ? [player.lastPlayedDate] : []);
  const calendar = buildStreakCalendar(playedDates);
  const streak = streakOverride ?? player?.streak ?? 0;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Стрик</p>
            <h2 className="text-2xl font-black text-slate-950">{streak} дней подряд</h2>
            <p className="mt-1 text-sm text-slate-500">Не прерывай серию: реши хотя бы одну головоломку сегодня.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть стрик">
            x
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-black capitalize text-slate-950">{calendar.monthLabel}</span>
            <span className="text-xs font-semibold text-slate-500">{calendar.days.filter((day) => day.played).length} активных дней</span>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {calendar.days.map((day) => (
              <span
                key={day.date}
                className={`streak-day ${day.inMonth ? "" : "streak-day-muted"} ${day.played ? "streak-day-played" : ""}`}
                title={day.date}
              >
                {day.day}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm font-semibold text-slate-700">
          Стрик растёт, когда ты заходишь и решаешь хотя бы одну головоломку каждый день подряд.
        </p>
      </section>
    </div>
  );
}
