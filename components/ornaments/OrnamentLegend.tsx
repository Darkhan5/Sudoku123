"use client";

import { ORNAMENTS, type Ornament } from "@/lib/domain/ornaments";
import { OrnamentSymbol } from "./OrnamentSymbol";

interface OrnamentLegendProps {
  open: boolean;
  onClose: () => void;
  onSelect: (ornament: Ornament) => void;
}

export function OrnamentLegend({ open, onClose, onSelect }: OrnamentLegendProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="ml-auto flex h-full w-full max-w-sm flex-col gap-4 overflow-y-auto bg-white p-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Өрнек</p>
            <h2 className="text-xl font-black text-slate-950">Легенда орнаментов</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть легенду">
            x
          </button>
        </div>

        <div className="grid gap-2">
          {ORNAMENTS.map((ornament) => (
            <button
              key={ornament.value}
              type="button"
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left transition hover:border-cyan-300"
              onClick={() => onSelect(ornament)}
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-white text-primary">
                <OrnamentSymbol value={ornament.value} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-950">
                  {ornament.value}. {ornament.kazakhName}
                </span>
                <span className="block text-xs font-semibold text-slate-500">{ornament.russianName}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
