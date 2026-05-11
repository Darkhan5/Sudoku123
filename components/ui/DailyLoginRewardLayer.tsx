"use client";

import { useEffect, useState } from "react";
import type { DailyLoginClaim } from "@/lib/domain/dailyLogin";
import { claimDailyLoginReward } from "@/lib/storage/economy";
import { recordPassStreak } from "@/lib/storage/sudokuPass";
import { playFeedback } from "@/lib/utils/feedback";
import { getSettings } from "@/lib/storage/settings";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";

interface DailyLoginRewardLayerProps {
  suppressDayOneToast?: boolean;
}

export function DailyLoginRewardLayer({ suppressDayOneToast = false }: DailyLoginRewardLayerProps) {
  const [claim, setClaim] = useState<DailyLoginClaim | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nextClaim = claimDailyLoginReward();
    if (!nextClaim) return;

    recordPassStreak(nextClaim.state.streak);
    if (nextClaim.reward.type === "diamonds" && nextClaim.reward.cycleDay === 1 && suppressDayOneToast) return;

    setClaim(nextClaim);
    window.setTimeout(() => {
      setVisible(true);
      playFeedback(getSettings(), nextClaim.reward.type === "chest" ? "victory" : "success");
    }, nextClaim.reward.type === "chest" ? 550 : 900);
  }, [suppressDayOneToast]);

  if (!claim || !visible) return null;

  if (claim.reward.type === "chest") {
    return (
      <div
        className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 px-4 backdrop-blur-sm"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setVisible(false);
        }}
      >
        <section className="daily-chest-modal" role="dialog" aria-modal="true" aria-label="Special Reward Chest">
          <div className="reward-chest reward-chest-open" aria-hidden>
            <span />
          </div>
          <p className="text-xs font-black uppercase text-amber-600">Day 7 Login</p>
          <h2>Special Reward Chest</h2>
          <div className="daily-chest-rewards">
            <span>
              +{claim.reward.diamonds} <DiamondGlyph className="diamond-glyph-xs" />
            </span>
            {claim.reward.cosmetic ? <span>{claim.reward.cosmetic} style</span> : null}
          </div>
          <button type="button" className="btn-primary mt-5 w-full" onClick={() => setVisible(false)}>
            Claim
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="daily-login-toast" role="status" aria-live="polite">
      <span className="streak-flame-icon" aria-hidden />
      <span>Day {claim.reward.cycleDay} Reward</span>
      <strong>
        +{claim.reward.diamonds}
        <DiamondGlyph className="diamond-glyph-xs" />
      </strong>
    </div>
  );
}
