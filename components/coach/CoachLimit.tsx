"use client";

import type { Plan } from "@/types";
import { getCoachLimit } from "@/lib/storage/coach";

interface CoachLimitProps {
  used: number;
  plan: Plan;
}

export function CoachLimit({ used, plan }: CoachLimitProps) {
  const limit = getCoachLimit(plan);

  return (
    <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
      {Number.isFinite(limit) ? `Подсказки сегодня: ${used} из ${limit}` : "Diamond: подсказки без лимита"}
    </p>
  );
}
