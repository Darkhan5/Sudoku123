"use client";

import { useEffect, useState } from "react";
import type { DailyLoginClaim } from "@/lib/domain/dailyLogin";
import type { NumberStyle } from "@/types";
import { claimDailyLoginReward } from "@/lib/storage/economy";
import { getSettings } from "@/lib/storage/settings";
import { recordPassStreak } from "@/lib/storage/sudokuPass";
import { playFeedback } from "@/lib/utils/feedback";
import { DiamondGlyph } from "@/components/ui/DiamondGlyph";

export function DailyLoginRewardLayer() {
  const [claim, setClaim] = useState<DailyLoginClaim | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const nextClaim = claimDailyLoginReward();
    if (!nextClaim) return;

    recordPassStreak(nextClaim.state.streak);
    setClaim(nextClaim);
    window.setTimeout(() => {
      setVisible(true);
      playFeedback(getSettings(), nextClaim.reward.type === "chest" ? "victory" : "success");
    }, 450);
  }, []);

  if (!claim || !visible) return null;

  const previousStreak = Math.max(0, claim.state.streak - 1);
  const isChest = claim.reward.type === "chest";

  return (
    <div className="daily-login-screen" role="dialog" aria-modal="true" aria-label="Ежедневная серия">
      <section className={`daily-login-panel ${isChest ? "daily-login-panel-chest" : ""}`}>
        <div className="daily-fire-stage" aria-hidden>
          <span />
        </div>

        <p className="daily-login-kicker">День {claim.reward.cycleDay} из 7</p>
        <h2>Серия входа</h2>

        <div className="daily-streak-count" aria-label={`Серия выросла с ${previousStreak} до ${claim.state.streak}`}>
          <span className="daily-streak-number daily-streak-prev">{previousStreak}</span>
          <span className="daily-streak-arrow" aria-hidden />
          <span className="daily-streak-number daily-streak-next">{claim.state.streak}</span>
        </div>

        <p className="daily-streak-caption">
          {claim.state.streak} {pluralizeDays(claim.state.streak)} подряд. Заходи завтра, чтобы огонь стал сильнее.
        </p>

        <div className="daily-login-reward-card">
          <span>{isChest ? "Сундук серии" : "Награда за вход"}</span>
          <strong>
            +{claim.reward.diamonds}
            <DiamondGlyph className="diamond-glyph-sm" />
          </strong>
          {isChest && claim.reward.cosmetic ? <small>Новый стиль цифр: {numberStyleName(claim.reward.cosmetic)}</small> : null}
        </div>

        <button type="button" className="daily-login-claim-button" onClick={() => setVisible(false)}>
          Забрать
        </button>
      </section>
    </div>
  );
}

function numberStyleName(style: NumberStyle): string {
  if (style === "neon") return "Неон";
  if (style === "pixel") return "Пиксель";
  if (style === "handwritten") return "Рукописный";
  return "Классика";
}

function pluralizeDays(value: number): string {
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
