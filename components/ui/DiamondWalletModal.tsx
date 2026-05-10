"use client";

import { DIAMOND_EARNING_RULES, DIAMOND_SPEND_OPTIONS } from "@/lib/domain/economy";

interface DiamondWalletModalProps {
  open: boolean;
  diamonds: number;
  onClose: () => void;
}

export function DiamondWalletModal({ open, diamonds, onClose }: DiamondWalletModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Алмазы</p>
            <h2 className="text-3xl font-black text-slate-950">{diamonds.toLocaleString("ru-RU")}</h2>
            <p className="mt-1 text-sm text-slate-500">Внутренняя валюта за регулярную игру и сильные решения.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть алмазы">
            x
          </button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-black text-slate-950">Как заработать</h3>
            <div className="mt-2 grid gap-2">
              {DIAMOND_EARNING_RULES.map((rule) => (
                <div key={rule.id} className="diamond-wallet-row">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{rule.title}</p>
                    <p className="text-xs leading-5 text-slate-500">{rule.description}</p>
                  </div>
                  <span className="diamond-wallet-cost">+{rule.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-950">На что потратить</h3>
            <div className="mt-2 grid gap-2">
              {DIAMOND_SPEND_OPTIONS.map((option) => (
                <div key={option.id} className="diamond-wallet-row">
                  <div>
                    <p className="text-sm font-bold text-slate-950">{option.title}</p>
                    <p className="text-xs leading-5 text-slate-500">{option.description}</p>
                  </div>
                  <span className="diamond-wallet-cost">{option.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 rounded-xl bg-cyan-50 p-3 text-sm font-semibold text-slate-700">
          Лимит заработка защищает баланс: за день можно получить до 5 алмазов из игровых активностей.
        </p>
      </section>
    </div>
  );
}
