"use client";

import { useEffect, useState } from "react";
import type { ThemeName } from "@/types";
import { DIAMOND_PLAN, getThemeCatalog } from "@/lib/domain/subscription";
import { getPlayer, updatePlayer } from "@/lib/storage/player";
import { setTheme } from "@/lib/storage/settings";

interface DiamondModalProps {
  open: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

const THEMES = getThemeCatalog();

export function DiamondModal({ open, onClose, onUpgrade }: DiamondModalProps) {
  const [choosingTheme, setChoosingTheme] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChoosingTheme(getPlayer()?.plan === "diamond");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  function activateDiamond() {
    updatePlayer({ plan: "diamond" });
    onUpgrade?.();
    setChoosingTheme(true);
  }

  function chooseTheme(theme: ThemeName) {
    setTheme(theme);
    onUpgrade?.();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="presentation"
    >
      <section
        className="w-full max-w-[720px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Подписка Diamond"
      >
        <div className="relative bg-slate-950 px-5 py-5 text-white">
          <button
            type="button"
            className="absolute right-3 top-3 grid min-h-11 min-w-11 place-items-center rounded-full text-xl text-white/90 transition hover:bg-white/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            onClick={onClose}
            aria-label="Закрыть"
          >
            x
          </button>
          <p className="text-sm font-semibold text-cyan-200">Қазақ Судоку</p>
          <h2 className="mt-1 text-3xl font-black">{choosingTheme ? "Выбери доску" : "Подписка"}</h2>
          <p className="mt-2 text-sm text-slate-300">
            {choosingTheme ? "Diamond открывает три читаемых стиля доски." : "Остаются только два варианта: Бесплатно и Diamond."}
          </p>
        </div>

        {!choosingTheme ? (
          <div className="grid gap-3 p-5 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase text-slate-400">Бесплатно</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">0 ₸</h3>
              <ul className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
                <li>Ежедневное судоку</li>
                <li>3 ИИ-подсказки в день</li>
                <li>Обычная доска</li>
                <li>Режим цифр</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
              <p className="text-xs font-black uppercase text-cyan-700">{DIAMOND_PLAN.name}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">Премиум</h3>
              <ul className="mt-4 grid gap-2 text-sm font-semibold text-slate-700">
                {DIAMOND_PLAN.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              <button type="button" className="btn-primary mt-5 w-full" onClick={activateDiamond}>
                Активировать Diamond
              </button>
            </section>
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {THEMES.map((theme) => (
              <button
                key={theme.id}
                type="button"
                className={`theme-choice theme-choice-${theme.id}`}
                onClick={() => chooseTheme(theme.id)}
              >
                <span className="theme-choice-board" aria-hidden>
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
                <span className="mt-3 block text-base font-black">{theme.name}</span>
                <span className="mt-1 block text-xs font-semibold opacity-75">{theme.description}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
