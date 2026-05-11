"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Player } from "@/types";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";
import { consumeCompletedGameReviewReturn, reviewReturnHref } from "@/lib/storage/gameReview";
import { getPlayer, updatePlayer } from "@/lib/storage/player";
import { activateSudokuPassForCurrentSeason } from "@/lib/storage/sudokuPass";

interface SessionStatusResponse {
  status?: string;
  paymentStatus?: string;
  mode?: string;
  successUrl?: string | null;
  clientReferenceId?: string | null;
  plan?: string | null;
  purchase?: string | null;
  packId?: string | null;
  diamonds?: number | null;
  seasonId?: string | null;
  fulfilled?: boolean;
  alreadyProcessed?: boolean;
  databasePlan?: string | null;
  fulfillmentReason?: string | null;
  error?: string;
}

type CheckoutState = "checking" | "complete" | "open" | "error";
type SuccessKind = "diamond_pack" | "sudoku_pass" | "unknown";

function processedSessionKey(sessionId: string): string {
  return `sl_stripe_session_${sessionId}`;
}

function isLocalSessionProcessed(sessionId: string): boolean {
  try {
    return localStorage.getItem(processedSessionKey(sessionId)) === "1";
  } catch {
    return false;
  }
}

function markLocalSessionProcessed(sessionId: string): void {
  try {
    localStorage.setItem(processedSessionKey(sessionId), "1");
  } catch {
    // Local profile sync is best-effort; the webhook keeps the server-side purchase record.
  }
}

function updateLocalPlayer(partial: Partial<Player>): void {
  updatePlayer(partial);
}

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = useState<CheckoutState>("checking");
  const [kind, setKind] = useState<SuccessKind>("unknown");
  const [message, setMessage] = useState("Проверяем оплату Stripe...");
  const [detail, setDetail] = useState("");
  const [reviewHref, setReviewHref] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("Stripe не вернул идентификатор сессии.");
      setDetail("Вернись в магазин и попробуй открыть оплату ещё раз.");
      return;
    }

    let cancelled = false;
    let redirectTimer: number | undefined;
    const safeSessionId = sessionId;

    async function checkSession() {
      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(safeSessionId)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as SessionStatusResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось проверить сессию Stripe.");
        }

        if (payload.status === "open") {
          if (!cancelled) {
            setState("open");
            setMessage("Оплата ещё открыта.");
            setDetail("Если ты уже оплатил, подожди несколько секунд и обнови страницу.");
          }
          return;
        }

        if (payload.status !== "complete") {
          if (!cancelled) {
            setState("error");
            setMessage("Сессия Stripe не завершилась успешно.");
            setDetail(payload.fulfillmentReason ?? "Покупка не была активирована.");
          }
          return;
        }

        if (payload.purchase === "diamond_pack" && payload.diamonds && payload.diamonds > 0) {
          const alreadyProcessedLocally = isLocalSessionProcessed(safeSessionId);
          if (!alreadyProcessedLocally) {
            const currentDiamonds = getPlayer()?.diamonds ?? 0;
            updateLocalPlayer({ diamonds: currentDiamonds + payload.diamonds });
            markLocalSessionProcessed(safeSessionId);
          }

          if (!cancelled) {
            setState("complete");
            setKind("diamond_pack");
            setMessage(alreadyProcessedLocally ? "Покупка уже была начислена." : `Начислено алмазов: ${payload.diamonds.toLocaleString("ru-RU")}.`);
            setDetail(
              payload.fulfilled
                ? "Покупка сохранена на сервере и синхронизирована с профилем."
                : payload.fulfillmentReason ?? "Оплата прошла, серверное начисление ожидает вебхук."
            );
          }
          return;
        }

        if (
          payload.purchase === "sudoku_pass" ||
          payload.plan === "sudoku-pass" ||
          payload.databasePlan === "sudoku-pass" ||
          payload.plan === "diamond" ||
          payload.databasePlan === "diamond"
        ) {
          activateSudokuPassForCurrentSeason();
          updateLocalPlayer({ plan: "sudoku-pass" });
          const pendingReview = consumeCompletedGameReviewReturn();
          const pendingReviewHref = pendingReview ? reviewReturnHref(pendingReview) : "";

          if (!cancelled) {
            setState("complete");
            setKind("sudoku_pass");
            setMessage("Судоку Пасс активирован.");
            setReviewHref(pendingReviewHref);
            setDetail(
              pendingReviewHref
                ? "Возвращаем тебя к подробному анализу завершённой партии."
                : payload.fulfilled
                  ? `Премиум-трек активен для сезона ${payload.seasonId ?? "сейчас"}.`
                  : payload.fulfillmentReason ?? "Оплата прошла, серверное начисление ожидает вебхук."
            );
            if (pendingReviewHref) {
              redirectTimer = window.setTimeout(() => {
                window.location.assign(pendingReviewHref);
              }, 900);
            }
          }
          return;
        }

        if (!cancelled) {
          setState("error");
          setMessage("Оплата прошла, но продукт не распознан.");
          setDetail(payload.fulfillmentReason ?? "Проверь метаданные оплаты Stripe.");
        }
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "Не удалось проверить Stripe-сессию.");
          setDetail("Проверь локальный сервер и вебхук Stripe.");
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
      if (redirectTimer) window.clearTimeout(redirectTimer);
    };
  }, [sessionId]);

  const title = state === "checking" ? "Проверяем оплату" : state === "complete" ? "Покупка готова" : "Покупка не активирована";
  const badge = state === "complete" ? (kind === "sudoku_pass" ? "Судоку Пасс" : "Алмазы") : "Оплата Stripe";

  return (
    <main className="page-shell">
      <section className="info-panel text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-cyan-50">
          <DiamondGlyph className="diamond-glyph-xl" />
        </div>
        <p className="mt-4 text-xs font-black uppercase text-primary">{badge}</p>
        <h1 className="mt-1 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-600">{message}</p>
        {detail ? <p className="mx-auto mt-2 max-w-xl text-xs font-bold leading-5 text-slate-500">{detail}</p> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {reviewHref ? (
            <Link href={reviewHref} className="btn-primary">
              Вернуться к анализу
            </Link>
          ) : null}
          <Link href="/pass" className="btn-primary">
            Судоку Пасс
          </Link>
          <Link href="/play" className="btn-secondary">
            Играть
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="page-shell">Проверяем оплату...</main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
