"use client";

import { useEffect, useState } from "react";
import type { CollectibleIcon, GameReport, Plan } from "@/types";
import type { Ornament } from "@/lib/domain/ornaments";
import { formatTime } from "@/lib/utils/date";
import { OrnamentSymbol } from "@/components/ornaments/OrnamentSymbol";
import { GameReviewDetails, GameReviewSummary } from "@/components/sudoku/GameReview";

interface CompletionModalProps {
  open: boolean;
  time: number;
  mistakes: number;
  hintsUsed: number;
  checksUsed?: number;
  reward: number;
  xpReward: number;
  iconReward: CollectibleIcon | null;
  rank: number | null;
  rankUpLabel?: string;
  awardedTitle?: string;
  plan: Plan;
  ornamentMode?: boolean;
  finalOrnament?: Ornament | null;
  report?: GameReport | null;
  initialDetailsOpen?: boolean;
  onClose: () => void;
  onOpenDiamond: () => void;
}

function hasSudokuPass(plan: Plan): boolean {
  return plan === "diamond" || plan === "sudoku-pass";
}

export function CompletionModal({
  open,
  time,
  mistakes,
  hintsUsed,
  checksUsed = 0,
  reward,
  xpReward,
  iconReward,
  rank,
  rankUpLabel = "",
  awardedTitle = "",
  plan,
  ornamentMode = false,
  finalOrnament = null,
  report = null,
  initialDetailsOpen = false,
  onClose,
  onOpenDiamond
}: CompletionModalProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRequested, setDetailsRequested] = useState(false);
  const detailsAllowed = hasSudokuPass(plan);

  useEffect(() => {
    if (open) {
      const shouldOpenDetails = Boolean(initialDetailsOpen && detailsAllowed && report);
      setDetailsOpen(shouldOpenDetails);
      setDetailsRequested(Boolean(initialDetailsOpen && !shouldOpenDetails));
    }
  }, [detailsAllowed, initialDetailsOpen, open, report]);

  useEffect(() => {
    if (!open || !detailsRequested || !detailsAllowed || !report) return;
    setDetailsOpen(true);
    setDetailsRequested(false);
  }, [detailsAllowed, detailsRequested, open, report]);

  if (!open) return null;

  function openDetails() {
    if (detailsAllowed) {
      setDetailsOpen(true);
      return;
    }

    setDetailsRequested(true);
    onOpenDiamond();
  }

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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-4">
      <section
        className={`flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl bg-white text-center shadow-2xl ${
          detailsOpen ? "max-w-6xl" : "max-w-[520px]"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <div className="min-h-0 overflow-y-auto p-5">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-cyan-100 text-3xl">✓</div>
          <h2 className="mt-3 text-2xl font-bold text-slate-950">Судоку решено</h2>
          <p className="mt-1 text-sm text-slate-500">Результат сохранён, награды начислены.</p>

          {detailsOpen && report ? (
            <div className="mt-5">
              <GameReviewDetails report={report} />
            </div>
          ) : (
            <>
              {report ? (
                <div className="mt-5">
                  <GameReviewSummary report={report} onOpenDetails={openDetails} detailsLocked={!detailsAllowed} />
                </div>
              ) : null}

              {awardedTitle ? (
                <div className="title-reward mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                  <p className="text-xs font-black uppercase text-amber-700">Новый титул</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-950">{awardedTitle}</h3>
                  <p className="mt-2 text-sm font-bold leading-5 text-amber-800">Титул выбран по стилю твоей первой задачи дня и сохранён в профиле.</p>
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

              {!report ? (
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-lg font-bold">{checksUsed}</div>
                    <div className="text-xs text-slate-500">проверки</div>
                  </div>
                </div>
              ) : null}

              <div className="mt-5 rounded-xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-sm font-semibold text-slate-600">Награда</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">+{reward} 💎</p>
                <p className="xp-gain mt-1 text-sm font-black text-primary">+{xpReward} опыт</p>
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
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end">
          {detailsOpen ? (
            <button type="button" className="btn-secondary" onClick={() => setDetailsOpen(false)}>
              Назад к итогам
            </button>
          ) : null}
          {plan === "free" ? (
            <button type="button" className="btn-secondary" onClick={onOpenDiamond}>
              Купить Судоку Пасс
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
