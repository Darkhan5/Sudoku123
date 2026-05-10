"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Player } from "@/types";
import { getPlayer, updatePlayer } from "@/lib/storage/player";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";

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
  fulfilled?: boolean;
  alreadyProcessed?: boolean;
  databasePlan?: string | null;
  fulfillmentReason?: string | null;
  error?: string;
}

type CheckoutState = "checking" | "complete" | "open" | "error";
type SuccessKind = "diamond_pack" | "subscription" | "unknown";

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
  const [message, setMessage] = useState("Проверяем оплату в Stripe...");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("Stripe не вернул session_id.");
      setDetail("Вернитесь в магазин и попробуйте открыть оплату ещё раз.");
      return;
    }

    let cancelled = false;
    const safeSessionId = sessionId;

    async function checkSession() {
      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(safeSessionId)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as SessionStatusResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось проверить Stripe-сессию.");
        }

        if (payload.status === "open") {
          if (!cancelled) {
            setState("open");
            setMessage("Оплата ещё не завершена.");
            setDetail("Если вы уже оплатили, подождите несколько секунд и обновите страницу.");
          }
          return;
        }

        if (payload.status !== "complete") {
          if (!cancelled) {
            setState("error");
            setMessage("Stripe-сессия не завершилась успешно.");
            setDetail(payload.fulfillmentReason ?? "Покупка не была активирована.");
          }
          return;
        }

        if (payload.purchase === "diamond_pack" && payload.diamonds && payload.diamonds > 0) {
          const alreadyProcessedLocally = isLocalSessionProcessed(safeSessionId);
          if (!alreadyProcessedLocally) {
            const currentDiamonds = getPlayer()?.diamonds ?? 0;
            updateLocalPlayer({
              diamonds: currentDiamonds + payload.diamonds
            });
            markLocalSessionProcessed(safeSessionId);
          }

          if (!cancelled) {
            setState("complete");
            setKind("diamond_pack");
            setMessage(alreadyProcessedLocally ? "Эта покупка уже была начислена." : `Начислено ${payload.diamonds.toLocaleString("ru-RU")} алмазов.`);
            setDetail(
              payload.fulfilled
                ? "Покупка сохранена на сервере и синхронизирована с вашим профилем."
                : payload.fulfillmentReason ?? "Оплата прошла, но серверная запись ещё ожидает webhook."
            );
          }
          return;
        }

        if (payload.plan === "diamond" || payload.databasePlan === "diamond") {
          updateLocalPlayer({ plan: "diamond" });

          if (!cancelled) {
            setState("complete");
            setKind("subscription");
            setMessage("Diamond активирован.");
            setDetail(
              payload.fulfilled
                ? "Подписка сохранена на сервере и включена в вашем профиле."
                : payload.fulfillmentReason ?? "Оплата прошла, но серверная запись ещё ожидает webhook."
            );
          }
          return;
        }

        if (!cancelled) {
          setState("error");
          setMessage("Оплата прошла, но товар не распознан.");
          setDetail(payload.fulfillmentReason ?? "Проверьте metadata Stripe Checkout-сессии.");
        }
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "Не удалось проверить Stripe-сессию.");
          setDetail("Проверьте dev-сервер и Stripe webhook.");
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const title = state === "checking" ? "Проверяем оплату" : state === "complete" ? "Покупка прошла успешно" : "Покупка не активирована";
  const badge = state === "complete" ? (kind === "subscription" ? "Diamond" : "Алмазы") : "Stripe Checkout";

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
          <Link href="/profile" className="btn-primary">
            Профиль
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
