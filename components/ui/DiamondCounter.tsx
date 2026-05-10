"use client";

import { useEffect, useRef, useState } from "react";
import { DiamondWalletModal } from "@/components/ui/DiamondWalletModal";
import { claimDailyLoginDiamonds } from "@/lib/storage/economy";
import { getPlayer } from "@/lib/storage/player";

export function DiamondCounter() {
  const [diamonds, setDiamonds] = useState(0);
  const [delta, setDelta] = useState(0);
  const [open, setOpen] = useState(false);
  const previous = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    const loginClaimed = claimDailyLoginDiamonds();

    function sync() {
      const next = getPlayer()?.diamonds ?? 0;
      if (!initialized.current) {
        previous.current = loginClaimed ? next - 1 : next;
        initialized.current = true;
      }
      if (next > previous.current) {
        setDelta(next - previous.current);
        window.setTimeout(() => setDelta(0), 850);
      }
      previous.current = next;
      setDiamonds(next);
    }

    sync();
    window.addEventListener("sl:player", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("sl:player", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm"
        onClick={() => setOpen(true)}
        title="Алмазы"
      >
        <span aria-hidden>💎</span>
        <span>{diamonds.toLocaleString("ru-RU")}</span>
        {delta > 0 ? (
          <span className="diamond-earn pointer-events-none absolute -top-2 right-0 text-xs font-bold text-cyan-500">
            +{delta}
          </span>
        ) : null}
      </button>
      <DiamondWalletModal open={open} diamonds={diamonds} onClose={() => setOpen(false)} />
    </>
  );
}
