"use client";

import { useEffect } from "react";
import { getSettings } from "@/lib/storage/settings";
import { markFirstStreakIntroSeen } from "@/lib/storage/streakIntro";
import { playFeedback } from "@/lib/utils/feedback";

interface FirstStreakIntroProps {
  open: boolean;
  onDone: () => void;
}

export function FirstStreakIntro({ open, onDone }: FirstStreakIntroProps) {
  useEffect(() => {
    if (!open) return;

    playFeedback(getSettings(), "success");
    const doneTimer = window.setTimeout(() => {
      markFirstStreakIntroSeen();
      onDone();
    }, 2300);

    return () => window.clearTimeout(doneTimer);
  }, [onDone, open]);

  if (!open) return null;

  return (
    <div className="first-streak-intro" role="status" aria-live="polite">
      <div className="first-streak-orbit">
        <span className="streak-flame-icon streak-flame-icon-xl first-streak-flame" aria-hidden />
        <strong>1 Day Streak!</strong>
      </div>
    </div>
  );
}
