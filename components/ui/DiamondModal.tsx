"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { DIAMOND_STORE_PACKS, type DiamondStorePackId } from "@/lib/domain/economy";
import { SUDOKU_PASS_PLAN } from "@/lib/domain/subscription";
import { getPlayer } from "@/lib/storage/player";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";

interface DiamondModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

type CheckoutLoading = "sudoku_pass" | DiamondStorePackId | null;
type CheckoutRequestBody = {
  type: "sudoku_pass" | "diamond_pack";
  packId?: DiamondStorePackId;
  playerId?: string;
};

export function DiamondModal({ open, onClose }: DiamondModalProps) {
  const [notice, setNotice] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState<CheckoutLoading>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setNotice("");
    setCheckoutLoading(null);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    function resetCheckoutLoading() {
      setCheckoutLoading(null);
    }

    window.addEventListener("pageshow", resetCheckoutLoading);
    return () => window.removeEventListener("pageshow", resetCheckoutLoading);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !mounted) return null;

  async function startCheckout(body: { type: "sudoku_pass" } | { type: "diamond_pack"; packId: DiamondStorePackId }, loadingKey: CheckoutLoading) {
    setCheckoutLoading(loadingKey);
    setNotice("");

    try {
      const player = getPlayer();
      const checkoutBody: CheckoutRequestBody = {
        ...body,
        playerId: player?.id
      };
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(checkoutBody)
      });
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? "Stripe Checkout сейчас недоступен");
      }

      window.location.assign(payload.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось открыть Stripe Checkout");
      setCheckoutLoading(null);
    }
  }

  function startSubscriptionCheckout() {
    void startCheckout({ type: "sudoku_pass" }, "sudoku_pass");
  }

  function startPackCheckout(packId: DiamondStorePackId) {
    void startCheckout({ type: "diamond_pack", packId }, packId);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Магазин алмазов"
      >
        <div className="relative overflow-hidden bg-slate-950 px-5 py-5 text-white">
          <button
            type="button"
            className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-full text-xl text-white/90 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={onClose}
            aria-label="Закрыть"
          >
            x
          </button>
          <div className="flex items-start gap-4 pr-12">
            <span className="diamond-modal-mark" aria-hidden>
              <DiamondGlyph className="diamond-glyph-xl" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-cyan-200">Судоку</p>
              <h2 className="mt-1 text-3xl font-black">Магазин алмазов</h2>
              <p className="mt-2 text-sm text-slate-300">Судоку Пасс и наборы алмазов открываются через Stripe Checkout.</p>
            </div>
          </div>
        </div>

        <div className="grid min-h-0 gap-5 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-primary">Магазин алмазов</p>
                <h3 className="text-xl font-black text-slate-950">Получить алмазы</h3>
              </div>
              {notice ? <p className="rounded-full bg-amber-50 px-3 py-2 text-sm font-black text-amber-700">{notice}</p> : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {DIAMOND_STORE_PACKS.map((pack) => (
                <article key={pack.id} className="diamond-shop-pack">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4>{pack.name}</h4>
                      <p className="inline-flex items-center gap-2">
                        {pack.diamonds.toLocaleString("ru-RU")}
                        <DiamondGlyph className="diamond-glyph-sm" />
                      </p>
                    </div>
                    {pack.label ? <span>{pack.label}</span> : null}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm font-bold text-slate-600">
                    <small className="inline-flex items-center gap-1">
                      {pack.bonus > 0 ? (
                        <>
                          Бонус: +{pack.bonus}
                          <DiamondGlyph className="diamond-glyph-xs" />
                        </>
                      ) : (
                        "Базовый набор"
                      )}
                    </small>
                    <strong>{pack.price}</strong>
                  </div>
                  <button type="button" className="btn-primary mt-4 w-full" onClick={() => startPackCheckout(pack.id)} disabled={checkoutLoading !== null}>
                    {checkoutLoading === pack.id ? "Открываем Stripe..." : "Купить"}
                  </button>
                </article>
              ))}
            </div>
          </section>

          <aside className="diamond-membership-panel">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase text-cyan-700">Судоку Пасс</p>
              <DiamondGlyph className="diamond-glyph-lg" />
            </div>
            <h3>{SUDOKU_PASS_PLAN.name}</h3>
            <strong>{SUDOKU_PASS_PLAN.priceMonthly}</strong>
            <ul>
              {SUDOKU_PASS_PLAN.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button type="button" className="btn-primary mt-5 w-full" onClick={startSubscriptionCheckout} disabled={checkoutLoading !== null}>
              {checkoutLoading === "sudoku_pass" ? "Открываем Stripe..." : "Купить Судоку Пасс"}
            </button>
          </aside>
        </div>
      </section>
    </div>,
    document.body
  );
}
