"use client";

import { useState } from "react";
import type { CollectibleIcon, Plan } from "@/types";
import type { Ornament } from "@/lib/domain/ornaments";
import { formatTime } from "@/lib/utils/date";
import { OrnamentSymbol } from "@/components/ornaments/OrnamentSymbol";

interface CompletionModalProps {
  open: boolean;
  time: number;
  mistakes: number;
  hintsUsed: number;
  reward: number;
  xpReward: number;
  iconReward: CollectibleIcon | null;
  rank: number | null;
  rankUpLabel?: string;
  needsTitleReward?: boolean;
  plan: Plan;
  ornamentMode?: boolean;
  finalOrnament?: Ornament | null;
  onClose: () => void;
  onOpenDiamond: () => void;
  onSaveTitle: (title: string) => void;
}

const TITLE_SUGGESTIONS = ["Новичок", "Первый ход", "Исследователь судоку"];

export function CompletionModal({
  open,
  time,
  mistakes,
  hintsUsed,
  reward,
  xpReward,
  iconReward,
  rank,
  rankUpLabel = "",
  needsTitleReward = false,
  plan,
  ornamentMode = false,
  finalOrnament = null,
  onClose,
  onOpenDiamond,
  onSaveTitle
}: CompletionModalProps) {
  const [titleDraft, setTitleDraft] = useState(TITLE_SUGGESTIONS[0]);

  if (!open) return null;

  function shareOrnamentResult() {
    const text = finalOrnament
      ? `Режим Өрнек — Судоку. Партия завершена орнаментом ${finalOrnament.kazakhName}: ${finalOrnament.meaning}`
      : "Режим Өрнек — Судоку.";
    if (navigator.share) {
      void navigator.share({ title: "Судоку", text });
      return;
    }
    void navigator.clipboard?.writeText(text);
  }

  function saveTitle() {
    const title = titleDraft.trim() || TITLE_SUGGESTIONS[0];
    onSaveTitle(title);
  }

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <section className="w-full max-w-[460px] rounded-2xl bg-white p-5 text-center shadow-2xl" role="dialog" aria-modal="true">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cyan-100 text-3xl">✓</div>
        <h2 className="mt-3 text-2xl font-bold text-slate-950">Судоку решено</h2>
        <p className="mt-1 text-sm text-slate-500">Результат сохранён, награды начислены.</p>

        {needsTitleReward ? (
          <div className="title-reward mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
            <p className="text-xs font-black uppercase text-amber-700">Новый титул</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Назови свой первый титул</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {TITLE_SUGGESTIONS.map((title) => (
                <button key={title} type="button" className="btn-secondary min-h-9 px-3" onClick={() => setTitleDraft(title)}>
                  {title}
                </button>
              ))}
            </div>
            <input className="input-control mt-3 w-full" value={titleDraft} maxLength={28} onChange={(event) => setTitleDraft(event.target.value)} />
            <button type="button" className="btn-primary mt-3 w-full" onClick={saveTitle}>
              Закрепить титул
            </button>
          </div>
        ) : null}

        {rankUpLabel ? (
          <div className="rank-up mt-5 rounded-xl border border-cyan-200 bg-cyan-50 p-4">
            <p className="text-sm font-semibold text-slate-600">Ранг повышен</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{rankUpLabel}</p>
          </div>
        ) : null}

        {ornamentMode && finalOrnament ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-white text-amber-800">
              <OrnamentSymbol value={finalOrnament.value} />
            </div>
            <h3 className="mt-3 text-xl font-black text-slate-950">{finalOrnament.kazakhName}</h3>
            <p className="text-sm font-semibold text-slate-600">{finalOrnament.russianName}</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">{finalOrnament.meaning}</p>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-lg font-bold">{formatTime(time)}</div>
            <div className="text-xs text-slate-500">время</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-lg font-bold">{mistakes}</div>
            <div className="text-xs text-slate-500">ошибки</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <div className="text-lg font-bold">{hintsUsed}</div>
            <div className="text-xs text-slate-500">подсказки</div>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-sm font-semibold text-slate-600">Награда</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">+{reward} 💎</p>
          <p className="xp-gain mt-1 text-sm font-black text-primary">+{xpReward} XP</p>
          {iconReward ? (
            <div className="icon-reveal mt-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm font-bold shadow-sm">
              <span className="text-2xl">{iconReward.emoji}</span>
              <span>{iconReward.name}</span>
            </div>
          ) : null}
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-700">
          {rank ? `Место в рейтинге Казахстана: #${rank}` : "Результат отправлен в рейтинг"}
        </p>

        <div className="mt-5 flex flex-col gap-2">
          {plan === "free" ? (
            <button type="button" className="btn-secondary" onClick={onOpenDiamond}>
              Открыть премиум
            </button>
          ) : null}
          {ornamentMode ? (
            <button type="button" className="btn-secondary" onClick={shareOrnamentResult}>
              Поделиться Өрнек
            </button>
          ) : null}
          <button type="button" className="btn-primary" onClick={onClose}>
            Продолжить
          </button>
        </div>
      </section>
    </div>
  );
}
