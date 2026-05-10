"use client";

import { ORNAMENTS } from "@/lib/domain/ornaments";
import { OrnamentSymbol } from "./OrnamentSymbol";

interface OrnamentPreviewProps {
  open: boolean;
  onClose: () => void;
  onOpenDiamond: () => void;
}

export function OrnamentPreview({ open, onClose, onOpenDiamond }: OrnamentPreviewProps) {
  if (!open) return null;

  const preview = ORNAMENTS.slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <p className="text-xs font-bold uppercase text-primary">Превью премиума</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">Режим Өрнек</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Премиум заменяет цифры на казахские орнаменты и открывает легенду с их смыслом.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {preview.map((ornament) => (
            <div key={ornament.value} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-white text-primary">
                <OrnamentSymbol value={ornament.value} />
              </div>
              <p className="mt-2 text-xs font-black text-slate-950">{ornament.kazakhName}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-2">
          <button type="button" className="btn-primary" onClick={onOpenDiamond}>
            Открыть премиум
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </section>
    </div>
  );
}
