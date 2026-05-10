"use client";

import { ORNAMENTS } from "@/lib/domain/ornaments";
import { OrnamentSymbol } from "./OrnamentSymbol";

interface OrnamentIntroProps {
  open: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function OrnamentIntro({ open, onStart, onSkip }: OrnamentIntroProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/75 px-4 backdrop-blur-sm">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Возможность Diamond</p>
            <h2 className="mt-1 text-3xl font-black text-slate-950">Өрнек режимі</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Цифры заменены казахскими орнаментами. Логика та же, смысл глубже.
            </p>
          </div>
          <button type="button" className="icon-button" onClick={onSkip} aria-label="Пропустить">
            x
          </button>
        </div>

        <div className="mt-5 grid max-h-[45vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
          {ORNAMENTS.map((ornament) => (
            <div key={ornament.value} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-primary">
                  <OrnamentSymbol value={ornament.value} />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {ornament.value}. {ornament.kazakhName}
                  </p>
                  <p className="text-xs text-slate-500">{ornament.russianName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-4 rounded-xl bg-cyan-50 p-3 text-sm font-semibold text-slate-700">
          Удержи любой символ на доске, чтобы узнать его историю.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button type="button" className="btn-primary flex-1" onClick={onStart}>
            Начать
          </button>
          <button type="button" className="btn-secondary flex-1" onClick={onSkip}>
            Пропустить
          </button>
        </div>
      </section>
    </div>
  );
}
