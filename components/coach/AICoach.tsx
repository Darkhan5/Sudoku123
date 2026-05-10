"use client";

import { useEffect, useRef, useState } from "react";
import type { CellPosition, CoachResponse, Difficulty, Plan } from "@/types";
import { canUseCoach, getCoachUsage, incrementCoachUsage } from "@/lib/storage/coach";
import { CoachLimit } from "./CoachLimit";
import { CoachMessage } from "./CoachMessage";

interface AICoachProps {
  open: boolean;
  requestId: number;
  board: number[][];
  solution: number[][];
  selectedCell: CellPosition | null;
  difficulty: Difficulty;
  mistakes: number;
  plan: Plan;
  onClose: () => void;
  onLimit: () => void;
  onHintUsed: () => void;
}

interface Message {
  id: string;
  text: string;
  time: string;
  answer?: number;
  error?: boolean;
}

function nowTime(): string {
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

export function AICoach({
  open,
  requestId,
  board,
  solution,
  selectedCell,
  difficulty,
  mistakes,
  plan,
  onClose,
  onLimit,
  onHintUsed
}: AICoachProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState(0);
  const handledRequest = useRef(0);

  useEffect(() => {
    setUsage(getCoachUsage());
  }, [open]);

  useEffect(() => {
    if (!open || requestId === 0 || handledRequest.current === requestId) return;
    handledRequest.current = requestId;

    async function askCoach() {
      if (!selectedCell) {
        setMessages((current) => [
          {
            id: crypto.randomUUID(),
            text: "Выбери клетку, и я коротко объясню, какая цифра туда подходит.",
            time: nowTime()
          },
          ...current
        ]);
        return;
      }

      if (!canUseCoach(plan)) {
        if (plan === "free") onLimit();
        setMessages((current) => [
          {
            id: crypto.randomUUID(),
            text:
              plan === "free"
                ? "Сегодня бесплатные подсказки закончились. Diamond открывает подсказки без лимита."
                : "В Diamond подсказки без лимита. Попробуй ещё раз.",
            time: nowTime(),
            error: plan === "free"
          },
          ...current
        ]);
        return;
      }

      setLoading(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            board,
            solution,
            selectedCell,
            currentValue: board[selectedCell.row][selectedCell.col] || null,
            difficulty,
            mistakes
          }),
          signal: controller.signal
        });

        const payload = (await response.json()) as CoachResponse & { error?: string };
        if (!response.ok || !payload.explanation) {
          throw new Error(payload.error ?? "Подсказка сейчас недоступна.");
        }

        incrementCoachUsage();
        setUsage(getCoachUsage());
        onHintUsed();
        setMessages((current) => [
          {
            id: crypto.randomUUID(),
            text: payload.explanation,
            answer: payload.answer,
            time: nowTime()
          },
          ...current
        ]);
      } catch (error) {
        const isAbort = error instanceof DOMException && error.name === "AbortError";
        setMessages((current) => [
          {
            id: crypto.randomUUID(),
            text: isAbort ? "Подсказка не успела ответить. Попробуй ещё раз." : "Подсказка сейчас недоступна. Попробуй ещё раз.",
            time: nowTime(),
            error: true
          },
          ...current
        ]);
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
    }

    askCoach();
  }, [board, difficulty, mistakes, onHintUsed, onLimit, open, plan, requestId, selectedCell, solution]);

  if (!open) return null;

  return (
    <aside className="coach-panel fixed inset-x-0 bottom-0 z-40 max-h-[72vh] rounded-t-2xl bg-slate-50 p-4 shadow-2xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[360px] md:rounded-none md:border-l md:border-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-primary">ИИ-подсказка</p>
          <h2 className="text-lg font-bold text-slate-950">Коротко и по делу</h2>
        </div>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Закрыть подсказку">
          x
        </button>
      </div>

      <div className="mt-4">
        <CoachLimit used={usage} plan={plan} />
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white p-4 text-slate-500">
          <span className="dot-1 h-2 w-2 rounded-full bg-primary" />
          <span className="dot-2 h-2 w-2 rounded-full bg-primary" />
          <span className="dot-3 h-2 w-2 rounded-full bg-primary" />
        </div>
      ) : null}

      <div className="mt-4 flex max-h-[48vh] flex-col gap-3 overflow-y-auto pr-1 md:max-h-[calc(100vh-180px)]">
        {messages.length === 0 && !loading ? (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-500">Нажми «Подсказка», чтобы получить объяснение для выбранной клетки.</p>
        ) : null}
        {messages.map((message) => (
          <CoachMessage key={message.id} text={message.text} time={message.time} answer={message.answer} error={message.error} />
        ))}
      </div>
    </aside>
  );
}
