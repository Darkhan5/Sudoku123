"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Player } from "@/types";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";
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
  const [message, setMessage] = useState("Checking Stripe payment...");
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!sessionId) {
      setState("error");
      setMessage("Stripe did not return a session_id.");
      setDetail("Return to the store and try opening checkout again.");
      return;
    }

    let cancelled = false;
    const safeSessionId = sessionId;

    async function checkSession() {
      try {
        const response = await fetch(`/api/stripe/session-status?session_id=${encodeURIComponent(safeSessionId)}`, { cache: "no-store" });
        const payload = (await response.json().catch(() => ({}))) as SessionStatusResponse;

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not verify the Stripe session.");
        }

        if (payload.status === "open") {
          if (!cancelled) {
            setState("open");
            setMessage("Payment is still open.");
            setDetail("If you already paid, wait a few seconds and refresh this page.");
          }
          return;
        }

        if (payload.status !== "complete") {
          if (!cancelled) {
            setState("error");
            setMessage("Stripe session did not complete successfully.");
            setDetail(payload.fulfillmentReason ?? "The purchase was not activated.");
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
            setMessage(alreadyProcessedLocally ? "This purchase was already credited." : `Credited ${payload.diamonds.toLocaleString("ru-RU")} diamonds.`);
            setDetail(
              payload.fulfilled
                ? "Purchase was saved on the server and synced to your local profile."
                : payload.fulfillmentReason ?? "Payment succeeded; server fulfillment is waiting for the webhook."
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

          if (!cancelled) {
            setState("complete");
            setKind("sudoku_pass");
            setMessage("Sudoku Pass activated.");
            setDetail(
              payload.fulfilled
                ? `Premium track is active for ${payload.seasonId ?? "the current season"}.`
                : payload.fulfillmentReason ?? "Payment succeeded; server fulfillment is waiting for the webhook."
            );
          }
          return;
        }

        if (!cancelled) {
          setState("error");
          setMessage("Payment succeeded, but the product was not recognized.");
          setDetail(payload.fulfillmentReason ?? "Check Stripe Checkout metadata.");
        }
      } catch (error) {
        if (!cancelled) {
          setState("error");
          setMessage(error instanceof Error ? error.message : "Could not verify the Stripe session.");
          setDetail("Check the dev server and Stripe webhook.");
        }
      }
    }

    checkSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const title = state === "checking" ? "Checking Payment" : state === "complete" ? "Purchase Complete" : "Purchase Not Activated";
  const badge = state === "complete" ? (kind === "sudoku_pass" ? "Sudoku Pass" : "Diamonds") : "Stripe Checkout";

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
          <Link href="/pass" className="btn-primary">
            Sudoku Pass
          </Link>
          <Link href="/play" className="btn-secondary">
            Play
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<main className="page-shell">Checking payment...</main>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}
