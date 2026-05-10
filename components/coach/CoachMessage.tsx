"use client";

import { useState } from "react";

interface CoachMessageProps {
  text: string;
  time: string;
  answer?: number;
  error?: boolean;
}

export function CoachMessage({ text, time, answer, error = false }: CoachMessageProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article className={`flex gap-3 rounded-xl p-3 ${error ? "bg-red-50 text-red-700" : "bg-white text-slate-700"}`}>
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-100 text-lg" aria-hidden>
        ИИ
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-6">{text}</p>
        {answer ? (
          <button
            type="button"
            className={`answer-fog mt-3 ${revealed ? "answer-fog-revealed" : ""}`}
            onClick={() => setRevealed(true)}
            aria-label={revealed ? `Правильный ответ ${answer}` : "Показать правильный ответ"}
          >
            <span className="text-xs font-bold uppercase tracking-wide">Правильный ответ</span>
            <strong>{answer}</strong>
            {!revealed ? <span className="answer-fog-hint">Нажми, чтобы увидеть</span> : null}
          </button>
        ) : null}
        <time className="mt-2 block text-xs text-slate-400">{time}</time>
      </div>
    </article>
  );
}
