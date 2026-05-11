"use client";

import { useEffect, useRef, useState } from "react";
import { getPlayer } from "@/lib/storage/player";
import { DiamondModal } from "@/components/ui/DiamondModal";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";

export function DiamondCounter() {
  const [diamonds, setDiamonds] = useState(0);
  const [delta, setDelta] = useState(0);
  const [open, setOpen] = useState(false);
  const previous = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    function sync() {
      const player = getPlayer();
      const next = player?.diamonds ?? 0;
      if (!initialized.current) {
        previous.current = next;
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
        className="relative inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200 bg-white px-3 text-sm font-bold text-slate-900 shadow-sm"
        onClick={() => setOpen(true)}
        aria-label="Открыть магазин алмазов"
        title="Алмазы"
      >
        <DiamondGlyph className="diamond-glyph-sm" />
        <span>{diamonds.toLocaleString("ru-RU")}</span>
        {delta > 0 ? (
          <span className="diamond-earn pointer-events-none absolute -top-2 right-0 text-xs font-bold text-cyan-700">
            +{delta}
          </span>
        ) : null}
      </button>
      <DiamondModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
