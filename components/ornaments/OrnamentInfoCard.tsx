"use client";

import type { Ornament } from "@/lib/domain/ornaments";
import { OrnamentSymbol } from "./OrnamentSymbol";

interface OrnamentInfoCardProps {
  ornament: Ornament | null;
  onClose: () => void;
}

export function OrnamentInfoCard({ ornament, onClose }: OrnamentInfoCardProps) {
  if (!ornament) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl md:bottom-6">
      <div className="flex gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-cyan-50 text-primary">
          <OrnamentSymbol value={ornament.value} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-black text-slate-950">{ornament.kazakhName}</h3>
              <p className="text-sm font-semibold text-slate-500">{ornament.russianName}</p>
            </div>
            <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть описание орнамента">
              x
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-700">{ornament.description}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-800">{ornament.meaning}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{ornament.region}</p>
        </div>
      </div>
    </div>
  );
}
