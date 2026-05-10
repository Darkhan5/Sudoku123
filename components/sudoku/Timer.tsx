"use client";

import { useEffect } from "react";
import { formatTime } from "@/lib/utils/date";

interface TimerProps {
  seconds: number;
  running: boolean;
  onTick: (seconds: number) => void;
}

export function Timer({ seconds, running, onTick }: TimerProps) {
  useEffect(() => {
    if (!running) return;

    const interval = window.setInterval(() => {
      if (!document.hidden) onTick(seconds + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [onTick, running, seconds]);

  return (
    <div className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-slate-900 shadow-sm">
      <span aria-hidden>⏱</span>
      <span>{formatTime(seconds)}</span>
    </div>
  );
}
